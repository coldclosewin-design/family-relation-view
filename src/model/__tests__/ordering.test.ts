import { describe, expect, it } from 'vitest';
import { addRelative, canAddRelative, createInitialData, setSiblingOrder } from '../mutations';
import { buildGraph } from '../familyGraph';
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
