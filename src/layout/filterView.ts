import { buildGraph, childrenOf } from '../model/familyGraph';
import { assignGenerations } from './generations';
import type { FamilyData, Person } from '../model/types';

/**
 * '나' 기준 세대 범위(위 up세대 ~ 아래 down세대) 밖의 인물을 표시에서 제외한
 * FamilyData 사본을 만든다. 범위 밖 인물을 거쳐야만 닿는 곁가지(증조 라인의
 * 당숙·재종 등)도 자연히 함께 빠진다. 표시 전용 — 원본 데이터는 그대로.
 */
export function filterByGenerationWindow(
  data: FamilyData,
  up: number,
  down: number,
): FamilyData {
  if (!data.persons[data.egoId]) return data;
  const graph = buildGraph(data);
  const gens = assignGenerations(graph);
  const inWindow = (id: string) => {
    const g = gens.get(id) ?? 0;
    return g >= -up && g <= down;
  };

  const keep = new Set<string>([data.egoId]);
  const queue = [data.egoId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const p = data.persons[id];
    for (const n of [p.fatherId, p.motherId, ...childrenOf(graph, id), ...p.spouseIds]) {
      if (!n || keep.has(n) || !inWindow(n)) continue;
      keep.add(n);
      queue.push(n);
    }
  }
  if (keep.size === Object.keys(data.persons).length) return data;

  const persons: Record<string, Person> = {};
  for (const id of keep) {
    const p = data.persons[id];
    persons[id] = {
      ...p,
      fatherId: p.fatherId && keep.has(p.fatherId) ? p.fatherId : undefined,
      motherId: p.motherId && keep.has(p.motherId) ? p.motherId : undefined,
      spouseIds: p.spouseIds.filter((s) => keep.has(s)),
    };
  }
  return { ...data, persons };
}
