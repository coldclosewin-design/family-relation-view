import { describe, expect, it } from 'vitest';
import { addRelative, canAddRelative, createInitialData, setSiblingOrder } from '../mutations';
import { buildGraph } from '../familyGraph';
import { normalizeParentLinks } from '../normalize';
import type { FamilyData, Person } from '../types';
import { computeKinship } from '../../kinship/resolver';

/** 출생년도 없이 관계 선택(placement)만으로 형/동생이 판정되는지 */
describe('출생년도 없는 형제 순서', () => {
  const base = () => {
    let d = createInitialData({ name: '나', gender: 'male' });
    const ego = d.egoId;
    d = addRelative(d, ego, 'father', { name: '아버지', gender: 'male' });
    d = addRelative(d, ego, 'mother', { name: '어머니', gender: 'female' });
    return { d, ego };
  };
  const idOf = (d: ReturnType<typeof createInitialData>, name: string) =>
    Object.values(d.persons).find((p) => p.name === name)!.id;

  it('placement=elder로 추가한 형제는 형으로 판정', () => {
    let { d, ego } = { ...base() };
    d = addRelative(d, ego, 'sibling', { name: '형', gender: 'male' }, 'elder');
    const g = buildGraph(d);
    expect(computeKinship(g, ego, idOf(d, '형')).casual).toBe('형');
    expect(computeKinship(g, idOf(d, '형'), ego).casual).toBe('남동생');
  });

  it('placement=younger 여동생 → 여동생/오빠', () => {
    let { d, ego } = { ...base() };
    d = addRelative(d, ego, 'sibling', { name: '동생', gender: 'female' }, 'younger');
    const g = buildGraph(d);
    expect(computeKinship(g, ego, idOf(d, '동생')).casual).toBe('여동생');
    expect(computeKinship(g, idOf(d, '동생'), ego).casual).toBe('오빠');
  });

  it('placement 없이 추가하면 순서 미상(형제)으로 폴백', () => {
    let { d, ego } = { ...base() };
    d = addRelative(d, ego, 'sibling', { name: '아무개', gender: 'male' });
    const g = buildGraph(d);
    expect(computeKinship(g, ego, idOf(d, '아무개')).casual).toBe('형제');
  });

  it('setSiblingOrder(드래그 정렬)로 순서를 바꾸면 호칭이 뒤집힌다', () => {
    let { d, ego } = { ...base() };
    d = addRelative(d, ego, 'sibling', { name: '형', gender: 'male' }, 'elder');
    const sibId = idOf(d, '형');
    // 드래그로 [나, 형] 순서로 재배치 → 이제 그가 동생
    d = setSiblingOrder(d, [ego, sibId]);
    const g = buildGraph(d);
    expect(computeKinship(g, ego, sibId).casual).toBe('남동생');
  });

  it('아버지의 배우자로 추가한 사람이 자동으로 나의 어머니가 된다 (중복 방지)', () => {
    let d = createInitialData({ name: '나', gender: 'male' });
    const ego = d.egoId;
    d = addRelative(d, ego, 'father', { name: '아버지', gender: 'male' });
    const fatherId = idOf(d, '아버지');
    d = addRelative(d, fatherId, 'spouse', { name: '어머니', gender: 'female' });
    const momId = idOf(d, '어머니');
    expect(d.persons[ego].motherId).toBe(momId);
    // '어머니 추가' 메뉴가 비활성화되어 중복 생성이 막힌다
    expect(canAddRelative(d, ego, 'mother')).not.toBeNull();
    const g = buildGraph(d);
    expect(computeKinship(g, ego, momId).casual).toBe('어머니');
  });

  it('출생년도가 있으면 년도가 순서보다 우선', () => {
    let { d, ego } = { ...base() };
    d = { ...d };
    d.persons[ego].birthYear = 1990;
    d = addRelative(d, ego, 'sibling', { name: '형', gender: 'male', birthYear: 1988 }, 'younger');
    const g = buildGraph(d);
    expect(computeKinship(g, ego, idOf(d, '형')).casual).toBe('형');
  });
});

describe('반쪽 부모 연결 정규화 (과거 버그 데이터 복구)', () => {
  /** 장모가 장인의 배우자로만 등록되고 아내의 어머니로는 연결되지 않은 형태 */
  const legacyData = (): FamilyData => {
    const p = (partial: Partial<Person> & Pick<Person, 'id' | 'name' | 'gender'>): Person => ({
      spouseIds: [],
      ...partial,
    });
    return {
      schemaVersion: 1,
      egoId: 'ego',
      persons: {
        ego: p({ id: 'ego', name: '나', gender: 'male', spouseIds: ['wife'] }),
        wife: p({ id: 'wife', name: '아내', gender: 'female', fatherId: 'wF', spouseIds: ['ego'] }),
        wF: p({ id: 'wF', name: '장인', gender: 'male', spouseIds: ['wM'] }),
        wM: p({ id: 'wM', name: '장모', gender: 'female', spouseIds: ['wF'] }),
      },
    };
  };

  it('장모가 아내의 어머니로 복구되어 장모님으로 계산된다', () => {
    const raw = legacyData();
    const g0 = buildGraph(raw);
    // 복구 전에는 폴백 표현이 나온다
    expect(computeKinship(g0, 'ego', 'wM').casual).toBe('처가 쪽 새어머니');

    const fixed = normalizeParentLinks(raw);
    expect(fixed.persons['wife'].motherId).toBe('wM');
    const g = buildGraph(fixed);
    expect(computeKinship(g, 'ego', 'wM')).toMatchObject({ casual: '장모님', formal: '장모' });
  });

  it('고칠 것이 없으면 원본 객체를 그대로 반환한다', () => {
    const fixed = normalizeParentLinks(legacyData());
    expect(normalizeParentLinks(fixed)).toBe(fixed);
  });
});
