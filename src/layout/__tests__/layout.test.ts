import { describe, expect, it } from 'vitest';
import type { FamilyData, Gender, Person } from '../../model/types';
import { buildGraph } from '../../model/familyGraph';
import { layoutFamily, NODE_H, NODE_W } from '../treeLayout';

/** 친가 + 외가 + 처가가 있는 픽스처 */
function makeFixture(): FamilyData {
  const persons: Record<string, Person> = {};
  const add = (
    id: string,
    name: string,
    gender: Gender,
    birthYear?: number,
    fatherId?: string,
    motherId?: string,
  ) => {
    persons[id] = { id, name, gender, birthYear, fatherId, motherId, spouseIds: [] };
  };
  const marry = (a: string, b: string) => {
    persons[a].spouseIds.push(b);
    persons[b].spouseIds.push(a);
  };
  add('gfa', '할아버지', 'male', 1930);
  add('gmo', '할머니', 'female', 1933);
  marry('gfa', 'gmo');
  add('father', '아버지', 'male', 1960, 'gfa', 'gmo');
  add('uncle', '큰아버지', 'male', 1955, 'gfa', 'gmo');
  add('mgfa', '외할아버지', 'male', 1932);
  add('mgmo', '외할머니', 'female', 1935);
  marry('mgfa', 'mgmo');
  add('mother', '어머니', 'female', 1963, 'mgfa', 'mgmo');
  marry('father', 'mother');
  add('muncle', '외삼촌', 'male', 1958, 'mgfa', 'mgmo');
  add('maunt', '이모', 'female', 1968, 'mgfa', 'mgmo');
  add('ego', '나', 'male', 1990, 'father', 'mother');
  add('wF', '장인', 'male', 1962);
  add('wM', '장모', 'female', 1965);
  marry('wF', 'wM');
  add('wife', '아내', 'female', 1991, 'wF', 'wM');
  marry('ego', 'wife');
  // 형 + 형수의 원가족 (인척 트리가 여러 개 경쟁하는 상황)
  add('brother', '형', 'male', 1988, 'father', 'mother');
  add('bwF', '사돈댁아버지', 'male', 1958);
  add('bwM', '사돈댁어머니', 'female', 1961);
  marry('bwF', 'bwM');
  add('brotherW', '형수', 'female', 1989, 'bwF', 'bwM');
  marry('brother', 'brotherW');
  return { schemaVersion: 1, egoId: 'ego', persons };
}

const graph = buildGraph(makeFixture());

const centerX = (layout: ReturnType<typeof layoutFamily>, id: string) =>
  layout.positions.get(id)!.x + NODE_W / 2;

describe('인접 배치 (P1)', () => {
  const layout = layoutFamily(graph);

  it('카드끼리 겹치지 않는다', () => {
    const all = [...layout.positions.values()];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const overlap =
          a.x < b.x + NODE_W && a.x + NODE_W > b.x && a.y < b.y + NODE_H && a.y + NODE_H > b.y;
        expect(overlap, `${a.id} vs ${b.id}`).toBe(false);
      }
    }
  });

  it('외가는 어머니 근처, 처가는 아내 근처, 형수 원가족은 형수 근처에 배치된다', () => {
    expect(Math.abs(centerX(layout, 'mgfa') - centerX(layout, 'mother'))).toBeLessThan(700);
    expect(Math.abs(centerX(layout, 'wF') - centerX(layout, 'wife'))).toBeLessThan(700);
    expect(Math.abs(centerX(layout, 'bwF') - centerX(layout, 'brotherW'))).toBeLessThan(700);
  });

  it('모든 인물이 렌더된다 (접힘 없음)', () => {
    expect(layout.positions.size).toBe(Object.keys(graph.persons).length);
    for (const t of layout.inLawToggles) expect(t.collapsed).toBe(false);
  });
});

describe('인척 트리 접기 (P2)', () => {
  it('어머니 원가족을 접으면 외가 인원이 레이아웃에서 빠진다', () => {
    const layout = layoutFamily(graph, new Set(['mother']));
    for (const id of ['mgfa', 'mgmo', 'muncle', 'maunt']) {
      expect(layout.positions.has(id), id).toBe(false);
    }
    // 어머니 본인(부부 유닛)과 나머지는 그대로
    expect(layout.positions.has('mother')).toBe(true);
    expect(layout.positions.has('wF')).toBe(true);
    const toggle = layout.inLawToggles.find((t) => t.memberId === 'mother');
    expect(toggle).toMatchObject({ collapsed: true, count: 4 });
  });

  it("ego가 속한 트리는 접을 수 없다", () => {
    // 아버지를 접기 대상으로 지정해도 (비정상 입력) ego 트리는 항상 보임
    const layout = layoutFamily(graph, new Set(['father', 'ego']));
    expect(layout.positions.has('ego')).toBe(true);
    expect(layout.positions.has('father')).toBe(true);
  });
});
