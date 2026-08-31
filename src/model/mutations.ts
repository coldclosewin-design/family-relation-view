import { compareSiblings } from './familyGraph';
import type { FamilyData, Gender, Person } from './types';

export type RelativeKind = 'father' | 'mother' | 'spouse' | 'child' | 'sibling';

/** 형제자매 추가 시 앵커 기준 손위/손아래 (미지정 = 순서 모름) */
export type SiblingPlacement = 'elder' | 'younger';

export interface PersonForm {
  name: string;
  gender: Gender;
  birthYear?: number;
}

export class MutationError extends Error {}

function newId(): string {
  return crypto.randomUUID();
}

function clone(data: FamilyData): FamilyData {
  return structuredClone(data);
}

export function createInitialData(form: PersonForm): FamilyData {
  const id = newId();
  return {
    schemaVersion: 1,
    egoId: id,
    persons: {
      [id]: { id, ...form, spouseIds: [] },
    },
  };
}

/** 추가 가능 여부 사전 검사 (다이얼로그 메뉴 비활성화용). 불가하면 사유 문자열 반환 */
export function canAddRelative(data: FamilyData, anchorId: string, kind: RelativeKind): string | null {
  const anchor = data.persons[anchorId];
  if (!anchor) return '대상 인물이 없습니다.';
  switch (kind) {
    case 'father':
      return anchor.fatherId ? '이미 아버지가 있습니다.' : null;
    case 'mother':
      return anchor.motherId ? '이미 어머니가 있습니다.' : null;
    case 'spouse':
      return anchor.spouseIds.length > 0 ? '이미 배우자가 있습니다.' : null;
    case 'sibling':
      return anchor.fatherId || anchor.motherId
        ? null
        : '먼저 부모를 추가해야 형제자매를 추가할 수 있습니다.';
    case 'child':
      return null;
  }
}

/** 같은 부모 조합을 가진 형제 그룹 (본인 포함), 표시 순서로 정렬 */
export function siblingGroupOf(data: FamilyData, personId: string): Person[] {
  const p = data.persons[personId];
  if (!p || (!p.fatherId && !p.motherId)) return [];
  return Object.values(data.persons)
    .filter((q) => q.fatherId === p.fatherId && q.motherId === p.motherId)
    .sort(compareSiblings);
}

export function addRelative(
  data: FamilyData,
  anchorId: string,
  kind: RelativeKind,
  form: PersonForm,
  placement?: SiblingPlacement,
): FamilyData {
  const reason = canAddRelative(data, anchorId, kind);
  if (reason) throw new MutationError(reason);

  const next = clone(data);
  const anchor = next.persons[anchorId];
  const person: Person = { id: newId(), ...form, spouseIds: [] };
  next.persons[person.id] = person;

  switch (kind) {
    case 'father': {
      person.gender = 'male';
      anchor.fatherId = person.id;
      // 어머니가 이미 있고 서로 배우자가 없으면 부부로 자동 연결
      const mother = anchor.motherId ? next.persons[anchor.motherId] : undefined;
      if (mother && mother.spouseIds.length === 0) {
        mother.spouseIds.push(person.id);
        person.spouseIds.push(mother.id);
      }
      break;
    }
    case 'mother': {
      person.gender = 'female';
      anchor.motherId = person.id;
      const father = anchor.fatherId ? next.persons[anchor.fatherId] : undefined;
      if (father && father.spouseIds.length === 0) {
        father.spouseIds.push(person.id);
        person.spouseIds.push(father.id);
      }
      break;
    }
    case 'spouse': {
      anchor.spouseIds.push(person.id);
      person.spouseIds.push(anchorId);
      // 앵커의 자녀 중 해당 부모 자리가 빈 아이는 새 배우자를 부모로 자동 연결
      // (아버지 추가 → 아버지의 배우자 추가 경로에서 어머니가 중복 생성되는 문제 방지)
      for (const child of Object.values(next.persons)) {
        if (child.fatherId !== anchorId && child.motherId !== anchorId) continue;
        if (person.gender === 'female' && !child.motherId) child.motherId = person.id;
        else if (person.gender === 'male' && !child.fatherId) child.fatherId = person.id;
      }
      break;
    }
    case 'child': {
      if (anchor.gender === 'male') person.fatherId = anchorId;
      else person.motherId = anchorId;
      // 배우자가 있으면 반대편 부모로 자동 연결
      const spouse = anchor.spouseIds[0] ? next.persons[anchor.spouseIds[0]] : undefined;
      if (spouse) {
        if (spouse.gender === 'male') person.fatherId = spouse.id;
        else person.motherId = spouse.id;
      }
      break;
    }
    case 'sibling': {
      person.fatherId = anchor.fatherId;
      person.motherId = anchor.motherId;
      if (placement) {
        // 앵커 바로 앞/뒤에 끼워 넣고 그룹 전체에 순서를 다시 부여
        const group = siblingGroupOf(next, anchorId).filter((p) => p.id !== person.id);
        const anchorIdx = group.findIndex((p) => p.id === anchorId);
        group.splice(placement === 'elder' ? anchorIdx : anchorIdx + 1, 0, person);
        group.forEach((p, i) => {
          p.siblingRank = i;
        });
      }
      break;
    }
  }
  return next;
}

/** 드래그 정렬 결과 반영: 형제 그룹 전체에 표시 순서대로 siblingRank 부여 */
export function setSiblingOrder(data: FamilyData, orderedIds: string[]): FamilyData {
  const next = clone(data);
  orderedIds.forEach((id, i) => {
    const p = next.persons[id];
    if (p) p.siblingRank = i;
  });
  return next;
}

export function updatePerson(
  data: FamilyData,
  id: string,
  patch: Partial<PersonForm>,
): FamilyData {
  if (!data.persons[id]) throw new MutationError('대상 인물이 없습니다.');
  const next = clone(data);
  Object.assign(next.persons[id], patch);
  return next;
}

/** 인물 삭제. '나'는 삭제 불가. 참조(자녀의 부모 링크, 배우자 링크)를 함께 정리 */
export function removePerson(data: FamilyData, id: string): FamilyData {
  if (id === data.egoId) throw new MutationError("'나'는 삭제할 수 없습니다.");
  if (!data.persons[id]) throw new MutationError('대상 인물이 없습니다.');
  const next = clone(data);
  delete next.persons[id];
  for (const p of Object.values(next.persons)) {
    if (p.fatherId === id) delete p.fatherId;
    if (p.motherId === id) delete p.motherId;
    p.spouseIds = p.spouseIds.filter((s) => s !== id);
  }
  return next;
}
