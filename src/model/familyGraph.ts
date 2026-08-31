import type { FamilyData, Person } from './types';

export interface FamilyGraph {
  data: FamilyData;
  persons: Record<string, Person>;
  /** parentId -> 자녀 id 목록 (출생년 → 이름 순 정렬) */
  childrenIndex: Map<string, string[]>;
}

function byBirthThenName(persons: Record<string, Person>) {
  return (a: string, b: string) => {
    const pa = persons[a];
    const pb = persons[b];
    const ya = pa.birthYear ?? Number.MAX_SAFE_INTEGER;
    const yb = pb.birthYear ?? Number.MAX_SAFE_INTEGER;
    if (ya !== yb) return ya - yb;
    return pa.name.localeCompare(pb.name, 'ko');
  };
}

export function buildGraph(data: FamilyData): FamilyGraph {
  const childrenIndex = new Map<string, string[]>();
  for (const p of Object.values(data.persons)) {
    for (const parentId of [p.fatherId, p.motherId]) {
      if (!parentId) continue;
      const list = childrenIndex.get(parentId) ?? [];
      list.push(p.id);
      childrenIndex.set(parentId, list);
    }
  }
  const cmp = byBirthThenName(data.persons);
  for (const list of childrenIndex.values()) list.sort(cmp);
  return { data, persons: data.persons, childrenIndex };
}

export function childrenOf(graph: FamilyGraph, id: string): string[] {
  return graph.childrenIndex.get(id) ?? [];
}

/** 두 사람이 부모를 하나라도 공유하는지 */
export function shareParent(a: Person, b: Person): boolean {
  return (
    (!!a.fatherId && a.fatherId === b.fatherId) ||
    (!!a.motherId && a.motherId === b.motherId)
  );
}

/** 가져오기 데이터 검증. 문제가 없으면 빈 배열 */
export function validateData(data: unknown): string[] {
  const errors: string[] = [];
  if (typeof data !== 'object' || data === null) return ['데이터 형식이 올바르지 않습니다.'];
  const d = data as Partial<FamilyData>;
  if (d.schemaVersion !== 1) errors.push('지원하지 않는 스키마 버전입니다.');
  if (typeof d.egoId !== 'string' || !d.persons || typeof d.persons !== 'object') {
    errors.push('필수 필드(egoId, persons)가 없습니다.');
    return errors;
  }
  const persons = d.persons as Record<string, Person>;
  if (!persons[d.egoId]) errors.push("'나'(egoId)에 해당하는 인물이 없습니다.");
  for (const [id, p] of Object.entries(persons)) {
    if (p.id !== id) errors.push(`인물 id 불일치: ${id}`);
    if (typeof p.name !== 'string' || (p.gender !== 'male' && p.gender !== 'female')) {
      errors.push(`인물 정보가 올바르지 않습니다: ${id}`);
      continue;
    }
    for (const ref of [p.fatherId, p.motherId, ...(p.spouseIds ?? [])]) {
      if (ref && !persons[ref]) errors.push(`존재하지 않는 인물을 참조합니다: ${p.name} → ${ref}`);
    }
    if (p.fatherId && persons[p.fatherId]?.gender !== 'male') errors.push(`${p.name}의 아버지 성별이 올바르지 않습니다.`);
    if (p.motherId && persons[p.motherId]?.gender !== 'female') errors.push(`${p.name}의 어머니 성별이 올바르지 않습니다.`);
  }
  return errors;
}
