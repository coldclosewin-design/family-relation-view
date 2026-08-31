import { childrenOf, type FamilyGraph } from '../model/familyGraph';

export type StepKind = 'up' | 'down' | 'spouse';

export interface PathStep {
  kind: StepKind;
  toId: string;
}

/**
 * 기준 → 타겟 최단 친족 경로 BFS.
 * 이웃 확장 순서를 아버지 → 어머니 → 자녀(출생년순) → 배우자로 고정해
 * 동일 길이 경로 중 혈연 우선·결정론적 결과를 보장한다.
 */
export function findKinPath(
  graph: FamilyGraph,
  fromId: string,
  toId: string,
): PathStep[] | null {
  if (fromId === toId) return [];
  if (!graph.persons[fromId] || !graph.persons[toId]) return null;

  const prev = new Map<string, { id: string; kind: StepKind }>();
  const visited = new Set<string>([fromId]);
  let queue = [fromId];

  const neighbors = (id: string): Array<{ id: string; kind: StepKind }> => {
    const p = graph.persons[id];
    const out: Array<{ id: string; kind: StepKind }> = [];
    if (p.fatherId) out.push({ id: p.fatherId, kind: 'up' });
    if (p.motherId) out.push({ id: p.motherId, kind: 'up' });
    for (const c of childrenOf(graph, id)) out.push({ id: c, kind: 'down' });
    for (const s of p.spouseIds) out.push({ id: s, kind: 'spouse' });
    return out;
  };

  while (queue.length > 0) {
    const nextQueue: string[] = [];
    for (const cur of queue) {
      for (const n of neighbors(cur)) {
        if (visited.has(n.id)) continue;
        visited.add(n.id);
        prev.set(n.id, { id: cur, kind: n.kind });
        if (n.id === toId) {
          const path: PathStep[] = [];
          let walk = toId;
          while (walk !== fromId) {
            const p = prev.get(walk)!;
            path.unshift({ kind: p.kind, toId: walk });
            walk = p.id;
          }
          return path;
        }
        nextQueue.push(n.id);
      }
    }
    queue = nextQueue;
  }
  return null;
}
