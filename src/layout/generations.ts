import { childrenOf, type FamilyGraph } from '../model/familyGraph';

/** ego=0, 부모 -1, 자녀 +1, 배우자 동일 세대. BFS로 전파 */
export function assignGenerations(graph: FamilyGraph): Map<string, number> {
  const gens = new Map<string, number>();
  const egoId = graph.data.egoId;
  if (!graph.persons[egoId]) return gens;
  gens.set(egoId, 0);
  const queue = [egoId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const gen = gens.get(id)!;
    const p = graph.persons[id];
    const visit = (nid: string | undefined, g: number) => {
      if (!nid || gens.has(nid)) return;
      gens.set(nid, g);
      queue.push(nid);
    };
    visit(p.fatherId, gen - 1);
    visit(p.motherId, gen - 1);
    for (const c of childrenOf(graph, id)) visit(c, gen + 1);
    for (const s of p.spouseIds) visit(s, gen);
  }
  // 연결되지 않은 인물(비정상 데이터)도 렌더는 되게 0세대로
  for (const id of Object.keys(graph.persons)) {
    if (!gens.has(id)) gens.set(id, 0);
  }
  return gens;
}

/** 혈연 엣지(부모/자녀)만으로 ego까지의 거리. 인척은 Infinity */
export function bloodDistances(graph: FamilyGraph): Map<string, number> {
  const dist = new Map<string, number>();
  const egoId = graph.data.egoId;
  if (!graph.persons[egoId]) return dist;
  dist.set(egoId, 0);
  const queue = [egoId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = dist.get(id)!;
    const p = graph.persons[id];
    const visit = (nid: string | undefined) => {
      if (!nid || dist.has(nid)) return;
      dist.set(nid, d + 1);
      queue.push(nid);
    };
    visit(p.fatherId);
    visit(p.motherId);
    for (const c of childrenOf(graph, id)) visit(c);
  }
  return dist;
}
