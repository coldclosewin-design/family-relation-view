import type { FamilyGraph } from '../model/familyGraph';

/** 부부(또는 단독 인물)를 하나의 배치 단위로 묶은 유닛 */
export interface CoupleUnit {
  id: string;
  /** 부부면 [남편, 아내] 순, 단독이면 1명 */
  members: string[];
  gen: number;
}

export function deriveCoupleUnits(
  graph: FamilyGraph,
  gens: Map<string, number>,
): { units: CoupleUnit[]; unitOf: Map<string, CoupleUnit> } {
  const units: CoupleUnit[] = [];
  const unitOf = new Map<string, CoupleUnit>();
  for (const p of Object.values(graph.persons)) {
    if (unitOf.has(p.id)) continue;
    const spouseId = p.spouseIds[0];
    const spouse = spouseId ? graph.persons[spouseId] : undefined;
    let members: string[];
    if (spouse && !unitOf.has(spouse.id)) {
      // 남편 왼쪽, 아내 오른쪽 관습
      members = [p.id, spouse.id];
      if (p.gender === 'female' && spouse.gender === 'male') members.reverse();
    } else {
      members = [p.id];
    }
    const unit: CoupleUnit = { id: members[0], members, gen: gens.get(p.id) ?? 0 };
    units.push(unit);
    for (const m of members) unitOf.set(m, unit);
  }
  return { units, unitOf };
}
