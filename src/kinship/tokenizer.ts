import type { FamilyGraph } from '../model/familyGraph';
import type { Person } from '../model/types';
import type { PathStep } from './pathFinder';

/**
 * F/M 부모, H/W 배우자, S/D 자녀,
 * OB/YB/OZ/YZ 손위·손아래 형제(출생년 비교), B/Z 나이 미상 형제
 */
export type RelToken =
  | 'F' | 'M'
  | 'H' | 'W'
  | 'S' | 'D'
  | 'OB' | 'YB' | 'OZ' | 'YZ'
  | 'B' | 'Z';

export interface RelStep {
  token: RelToken;
  personId: string;
}

function siblingToken(anchor: Person, sib: Person): RelToken {
  const male = sib.gender === 'male';
  if (anchor.birthYear != null && sib.birthYear != null && anchor.birthYear !== sib.birthYear) {
    const elder = sib.birthYear < anchor.birthYear;
    if (male) return elder ? 'OB' : 'YB';
    return elder ? 'OZ' : 'YZ';
  }
  return male ? 'B' : 'Z';
}

/**
 * 원시 경로(엣지 리스트) → 의미 토큰 시퀀스.
 * UP 직후 DOWN(같은 부모를 거쳐 다른 자녀로) 패턴은 형제 토큰 하나로 축약한다.
 */
export function tokenizePath(
  graph: FamilyGraph,
  fromId: string,
  path: PathStep[],
): RelStep[] {
  const out: RelStep[] = [];
  let anchorId = fromId;
  let i = 0;
  while (i < path.length) {
    const step = path[i];
    if (step.kind === 'up' && i + 1 < path.length && path[i + 1].kind === 'down') {
      const sibId = path[i + 1].toId;
      out.push({
        token: siblingToken(graph.persons[anchorId], graph.persons[sibId]),
        personId: sibId,
      });
      anchorId = sibId;
      i += 2;
      continue;
    }
    const target = graph.persons[step.toId];
    let token: RelToken;
    if (step.kind === 'up') token = target.gender === 'male' ? 'F' : 'M';
    else if (step.kind === 'spouse') token = target.gender === 'male' ? 'H' : 'W';
    else token = target.gender === 'male' ? 'S' : 'D';
    out.push({ token, personId: step.toId });
    anchorId = step.toId;
    i += 1;
  }
  return out;
}

const CHON: Record<RelToken, number> = {
  F: 1, M: 1, S: 1, D: 1,
  OB: 2, YB: 2, OZ: 2, YZ: 2, B: 2, Z: 2,
  H: 0, W: 0,
};

export function computeChon(tokens: RelToken[]): number {
  return tokens.reduce((sum, t) => sum + CHON[t], 0);
}

export function isInLaw(tokens: RelToken[]): boolean {
  return tokens.some((t) => t === 'H' || t === 'W');
}
