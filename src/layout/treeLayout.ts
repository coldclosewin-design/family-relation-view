import { compareSiblings, type FamilyGraph } from '../model/familyGraph';
import { assignGenerations, bloodDistances } from './generations';
import { deriveCoupleUnits, type CoupleUnit } from './coupleUnits';

export const NODE_W = 88;
export const NODE_H = 48;
export const COUPLE_GAP = 12;
export const H_GAP = 22;
export const LEVEL_H = 112;
export const TREE_GAP = 60;
/** 트리 블록 사이 최소 여백 (인접 배치 충돌 판정용) */
const BLOCK_MARGIN = 48;

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

/** 인척(배우자 원가족) 트리 접기/펼치기 토글 정보 */
export interface InLawToggle {
  /** 원가족을 가진 배우자 멤버 (토글이 붙는 카드) */
  memberId: string;
  /** 해당 원가족 트리의 인원 수 */
  count: number;
  collapsed: boolean;
}

export interface LayoutResult {
  positions: Map<string, PersonPos>;
  couples: Array<{ a: string; b: string }>;
  childLinks: Array<{ parentUnitId: string; childId: string }>;
  inLawLinks: Array<{ memberId: string; parentUnitId: string }>;
  unitAnchors: Map<string, { x: number; gen: number; isCouple: boolean }>;
  inLawToggles: InLawToggle[];
  genToY: (gen: number) => number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function unitWidth(unit: CoupleUnit): number {
  return unit.members.length === 2 ? NODE_W * 2 + COUPLE_GAP : NODE_W;
}

export function layoutFamily(
  graph: FamilyGraph,
  collapsed: ReadonlySet<string> = new Set(),
): LayoutResult {
  const gens = assignGenerations(graph);
  const blood = bloodDistances(graph);
  const { units, unitOf } = deriveCoupleUnits(graph, gens);

  const lunits = new Map<string, LayoutUnit>();
  for (const u of units) lunits.set(u.id, { ...u, x: 0, children: [] });
  const unitOfPerson = (personId: string) => lunits.get(unitOf.get(personId)!.id)!;

  const rawInLawLinks: Array<{ memberId: string; parentUnitId: string }> = [];

  // 주 부모 유닛 결정: 부모가 있는 멤버 중 ego와 혈연으로 가장 가까운 쪽
  for (const u of lunits.values()) {
    const candidates = u.members
      .map((m) => {
        const p = graph.persons[m];
        const parentId = p.fatherId ?? p.motherId;
        return parentId ? { member: m, parentUnit: unitOfPerson(parentId) } : null;
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
      rawInLawLinks.push({ memberId: other.member, parentUnitId: other.parentUnit.id });
    }
  }

  for (const u of lunits.values()) {
    u.children.sort((a, b) =>
      compareSiblings(graph.persons[a.connectingChildId!], graph.persons[b.connectingChildId!]),
    );
  }

  // ── 트리(연결 요소) 수집 ──────────────────────────────
  const roots = [...lunits.values()].filter((u) => !u.parent);
  const rootOf = new Map<LayoutUnit, LayoutUnit>();
  const treeUnits = new Map<LayoutUnit, LayoutUnit[]>();
  for (const root of roots) {
    const list: LayoutUnit[] = [];
    const walk = (u: LayoutUnit) => {
      list.push(u);
      rootOf.set(u, root);
      u.children.forEach(walk);
    };
    walk(root);
    treeUnits.set(root, list);
  }
  const egoUnit = unitOfPerson(graph.data.egoId);
  const egoRoot = rootOf.get(egoUnit)!;
  const rootOfMember = (memberId: string) => rootOf.get(unitOfPerson(memberId))!;

  // 트리별 인척 연결부 (트리 내부의 parentUnit ← 외부 배우자 member)
  const connectorsOf = new Map<LayoutUnit, Array<{ memberId: string; parentUnit: LayoutUnit }>>();
  for (const link of rawInLawLinks) {
    const parentUnit = lunits.get(link.parentUnitId)!;
    const root = rootOf.get(parentUnit)!;
    const list = connectorsOf.get(root) ?? [];
    list.push({ memberId: link.memberId, parentUnit });
    connectorsOf.set(root, list);
  }

  // ── 접기 상태에 따른 트리 가시성 (연결부가 모두 접히면 연쇄적으로 숨김) ──
  const visibleRoots = new Set<LayoutUnit>([egoRoot]);
  for (const root of roots) {
    if ((connectorsOf.get(root) ?? []).length === 0) visibleRoots.add(root);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const root of roots) {
      if (visibleRoots.has(root)) continue;
      const ok = (connectorsOf.get(root) ?? []).some(
        (c) => !collapsed.has(c.memberId) && visibleRoots.has(rootOfMember(c.memberId)),
      );
      if (ok) {
        visibleRoots.add(root);
        changed = true;
      }
    }
  }

  const treePersonCount = (root: LayoutUnit) =>
    treeUnits.get(root)!.reduce((n, u) => n + u.members.length, 0);

  const inLawToggles: InLawToggle[] = [];
  for (const root of roots) {
    for (const c of connectorsOf.get(root) ?? []) {
      if (!visibleRoots.has(rootOfMember(c.memberId))) continue;
      inLawToggles.push({
        memberId: c.memberId,
        count: treePersonCount(root),
        collapsed: !visibleRoots.has(root),
      });
    }
  }

  // ── 트리별 tidy 레이아웃 (로컬 좌표) ─────────────────
  const layoutTree = (root: LayoutUnit) => {
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
  };

  /** 트리의 세대별 [min,max] 구간 (dx 이동 반영) */
  const treeExtents = (root: LayoutUnit, dx: number): Map<number, [number, number]> => {
    const ext = new Map<number, [number, number]>();
    for (const u of treeUnits.get(root)!) {
      const a = u.x + dx - unitWidth(u) / 2;
      const b = u.x + dx + unitWidth(u) / 2;
      const cur = ext.get(u.gen);
      ext.set(u.gen, cur ? [Math.min(cur[0], a), Math.max(cur[1], b)] : [a, b]);
    }
    return ext;
  };

  // ── 인접 배치: ego 트리를 먼저, 인척 트리는 연결 인물 근처에 ──
  const occupied = new Map<number, Array<[number, number]>>();
  const addToOccupied = (root: LayoutUnit, dx: number) => {
    for (const [g, iv] of treeExtents(root, dx)) {
      const list = occupied.get(g) ?? [];
      list.push(iv);
      occupied.set(g, list);
    }
  };
  const translateTree = (root: LayoutUnit, dx: number) => {
    for (const u of treeUnits.get(root)!) u.x += dx;
  };

  /** dx 위치에서 충돌 해소에 필요한 오른쪽/왼쪽 이동량 (0이면 충돌 없음) */
  const overlapShift = (root: LayoutUnit, dx: number, dir: 1 | -1): number => {
    let need = 0;
    for (const [g, [a, b]] of treeExtents(root, dx)) {
      for (const [c, d] of occupied.get(g) ?? []) {
        if (a < d + BLOCK_MARGIN && b > c - BLOCK_MARGIN) {
          need = Math.max(need, dir === 1 ? d + BLOCK_MARGIN - a : b - (c - BLOCK_MARGIN));
        }
      }
    }
    return need;
  };

  const resolveCollision = (root: LayoutUnit, desired: number): number => {
    let dxR = desired;
    for (let i = 0; i < 30; i++) {
      const need = overlapShift(root, dxR, 1);
      if (need <= 0) break;
      dxR += need;
    }
    let dxL = desired;
    for (let i = 0; i < 30; i++) {
      const need = overlapShift(root, dxL, -1);
      if (need <= 0) break;
      dxL -= need;
    }
    return Math.abs(dxR - desired) <= Math.abs(desired - dxL) ? dxR : dxL;
  };

  const memberCenterX = (memberId: string): number => {
    const u = unitOfPerson(memberId);
    if (u.members.length === 1) return u.x;
    const w = unitWidth(u);
    return u.members[0] === memberId ? u.x - w / 2 + NODE_W / 2 : u.x + w / 2 - NODE_W / 2;
  };

  for (const root of visibleRoots) layoutTree(root);

  const placedRoots = new Set<LayoutUnit>([egoRoot]);
  addToOccupied(egoRoot, 0);
  let farRight = Math.max(
    ...[...treeExtents(egoRoot, 0).values()].map(([, b]) => b),
    0,
  );

  const pending = [...visibleRoots].filter((r) => r !== egoRoot);
  while (pending.length > 0) {
    // 연결 인물이 이미 배치된 트리를 우선 선택
    let idx = pending.findIndex((r) =>
      (connectorsOf.get(r) ?? []).some(
        (c) => !collapsed.has(c.memberId) && placedRoots.has(rootOfMember(c.memberId)),
      ),
    );
    let dx: number;
    if (idx === -1) {
      // 연결부 없는 트리(비정상 데이터 등)는 오른쪽 끝에 순차 배치
      idx = 0;
      const root = pending[idx];
      const minX = Math.min(...[...treeExtents(root, 0).values()].map(([a]) => a));
      dx = farRight + TREE_GAP - minX;
    } else {
      const root = pending[idx];
      const conn = (connectorsOf.get(root) ?? []).find(
        (c) => !collapsed.has(c.memberId) && placedRoots.has(rootOfMember(c.memberId)),
      )!;
      const desired = memberCenterX(conn.memberId) - conn.parentUnit.x;
      dx = resolveCollision(root, desired);
    }
    const root = pending.splice(idx, 1)[0];
    translateTree(root, dx);
    addToOccupied(root, 0);
    farRight = Math.max(
      farRight,
      ...[...treeExtents(root, 0).values()].map(([, b]) => b),
    );
    placedRoots.add(root);
  }

  // ── 좌표 산출 (보이는 유닛만) ─────────────────────────
  const visibleUnits = [...visibleRoots].flatMap((r) => treeUnits.get(r)!);
  const minGen = Math.min(...[...gens.values()], 0);
  const genToY = (gen: number) => (gen - minGen) * LEVEL_H;

  const positions = new Map<string, PersonPos>();
  const couples: LayoutResult['couples'] = [];
  const childLinks: LayoutResult['childLinks'] = [];
  const unitAnchors: LayoutResult['unitAnchors'] = new Map();

  for (const u of visibleUnits) {
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

  const inLawLinks = rawInLawLinks.filter(
    (l) =>
      positions.has(l.memberId) && visibleRoots.has(rootOf.get(lunits.get(l.parentUnitId)!)!),
  );

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

  return {
    positions,
    couples,
    childLinks,
    inLawLinks,
    unitAnchors,
    inLawToggles,
    genToY,
    bounds: { minX, minY, maxX, maxY },
  };
}
