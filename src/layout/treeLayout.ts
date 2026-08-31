import { compareSiblings, type FamilyGraph } from '../model/familyGraph';
import { assignGenerations, bloodDistances } from './generations';
import { deriveCoupleUnits, type CoupleUnit } from './coupleUnits';

export const NODE_W = 88;
export const NODE_H = 48;
export const COUPLE_GAP = 12;
export const H_GAP = 22;
export const LEVEL_H = 112;
export const TREE_GAP = 60;

interface LayoutUnit extends CoupleUnit {
  x: number; // 유닛 중심
  children: LayoutUnit[];
  parent?: LayoutUnit;
  /** 주 부모 유닛과 연결되는 자녀 멤버 */
  connectingChildId?: string;
}

export interface PersonPos {
  id: string;
  x: number; // 카드 좌상단
  y: number;
}

export interface LayoutResult {
  positions: Map<string, PersonPos>;
  /** 부부선: [왼쪽, 오른쪽] 멤버 */
  couples: Array<{ a: string; b: string }>;
  /** 족보식 실선: 부모 유닛 → 혈연 자녀 */
  childLinks: Array<{ parentUnitId: string; childId: string }>;
  /** 점선: 배우자 → 그 원가족(부모) 유닛 */
  inLawLinks: Array<{ memberId: string; parentUnitId: string }>;
  /** 유닛 id → 중심 x, gen (연결선 앵커 계산용) */
  unitAnchors: Map<string, { x: number; gen: number; isCouple: boolean }>;
  genToY: (gen: number) => number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function unitWidth(unit: CoupleUnit): number {
  return unit.members.length === 2 ? NODE_W * 2 + COUPLE_GAP : NODE_W;
}

export function layoutFamily(graph: FamilyGraph): LayoutResult {
  const gens = assignGenerations(graph);
  const blood = bloodDistances(graph);
  const { units, unitOf } = deriveCoupleUnits(graph, gens);

  const lunits = new Map<string, LayoutUnit>();
  for (const u of units) lunits.set(u.id, { ...u, x: 0, children: [] });

  const inLawLinks: LayoutResult['inLawLinks'] = [];

  // 주 부모 유닛 결정: 부모가 있는 멤버 중 ego와 혈연으로 가장 가까운 쪽
  for (const u of lunits.values()) {
    const candidates = u.members
      .map((m) => {
        const p = graph.persons[m];
        const parentId = p.fatherId ?? p.motherId;
        return parentId ? { member: m, parentUnit: lunits.get(unitOf.get(parentId)!.id)! } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (candidates.length === 0) continue;
    candidates.sort(
      (a, b) => (blood.get(a.member) ?? Infinity) - (blood.get(b.member) ?? Infinity),
    );
    const primary = candidates[0];
    u.parent = primary.parentUnit;
    u.connectingChildId = primary.member;
    primary.parentUnit.children.push(u);
    for (const other of candidates.slice(1)) {
      inLawLinks.push({ memberId: other.member, parentUnitId: other.parentUnit.id });
    }
  }

  // 자녀 유닛 정렬: 연결 멤버의 siblingRank → 출생년 → 이름
  for (const u of lunits.values()) {
    u.children.sort((a, b) =>
      compareSiblings(graph.persons[a.connectingChildId!], graph.persons[b.connectingChildId!]),
    );
  }

  // 트리(루트) 수집: ego가 속한 트리 먼저
  const roots = [...lunits.values()].filter((u) => !u.parent);
  const egoUnit = lunits.get(unitOf.get(graph.data.egoId)!.id)!;
  let egoRoot = egoUnit;
  while (egoRoot.parent) egoRoot = egoRoot.parent;
  roots.sort((a, b) => (a === egoRoot ? -1 : b === egoRoot ? 1 : 0));

  // 트리별 tidy 레이아웃 (세대별 커서 + 서브트리 시프트)
  const layoutTree = (root: LayoutUnit): { minX: number; maxX: number } => {
    const nextX = new Map<number, number>();
    const shift = (u: LayoutUnit, dx: number) => {
      u.x += dx;
      nextX.set(u.gen, Math.max(nextX.get(u.gen) ?? 0, u.x + unitWidth(u) / 2 + H_GAP));
      for (const c of u.children) shift(c, dx);
    };
    const place = (u: LayoutUnit) => {
      for (const c of u.children) place(c);
      const w = unitWidth(u);
      const cursor = nextX.get(u.gen) ?? 0;
      if (u.children.length === 0) {
        u.x = cursor + w / 2;
      } else {
        const center = (u.children[0].x + u.children[u.children.length - 1].x) / 2;
        const minX = cursor + w / 2;
        if (center < minX) {
          for (const c of u.children) shift(c, minX - center);
          u.x = minX;
        } else {
          u.x = center;
        }
      }
      nextX.set(u.gen, u.x + w / 2 + H_GAP);
    };
    place(root);
    let minX = Infinity;
    let maxX = -Infinity;
    const walk = (u: LayoutUnit) => {
      minX = Math.min(minX, u.x - unitWidth(u) / 2);
      maxX = Math.max(maxX, u.x + unitWidth(u) / 2);
      u.children.forEach(walk);
    };
    walk(root);
    return { minX, maxX };
  };

  let xBase = 0;
  for (const root of roots) {
    const { minX, maxX } = layoutTree(root);
    const dx = xBase - minX;
    const translate = (u: LayoutUnit) => {
      u.x += dx;
      u.children.forEach(translate);
    };
    translate(root);
    xBase += maxX - minX + TREE_GAP;
  }

  // 좌표 산출
  const minGen = Math.min(...[...gens.values()], 0);
  const genToY = (gen: number) => (gen - minGen) * LEVEL_H;

  const positions = new Map<string, PersonPos>();
  const couples: LayoutResult['couples'] = [];
  const childLinks: LayoutResult['childLinks'] = [];
  const unitAnchors: LayoutResult['unitAnchors'] = new Map();

  for (const u of lunits.values()) {
    const y = genToY(u.gen);
    unitAnchors.set(u.id, { x: u.x, gen: u.gen, isCouple: u.members.length === 2 });
    if (u.members.length === 2) {
      const w = unitWidth(u);
      positions.set(u.members[0], { id: u.members[0], x: u.x - w / 2, y });
      positions.set(u.members[1], { id: u.members[1], x: u.x + w / 2 - NODE_W, y });
      couples.push({ a: u.members[0], b: u.members[1] });
    } else {
      positions.set(u.members[0], { id: u.members[0], x: u.x - NODE_W / 2, y });
    }
    if (u.parent) {
      childLinks.push({ parentUnitId: u.parent.id, childId: u.connectingChildId! });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of positions.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  if (positions.size === 0) {
    minX = minY = maxX = maxY = 0;
  }

  return { positions, couples, childLinks, inLawLinks, unitAnchors, genToY, bounds: { minX, minY, maxX, maxY } };
}
