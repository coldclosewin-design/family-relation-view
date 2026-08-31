import type { FamilyGraph } from '../model/familyGraph';
import type { Person } from '../model/types';
import { findKinPath } from './pathFinder';
import { computeChon, isInLaw, tokenizePath, type RelStep, type RelToken } from './tokenizer';
import { buildRuleMap, type KinshipRule } from './rules';

export interface KinshipResult {
  kind: 'self' | 'term' | 'fallback' | 'none';
  /** 일상 호칭 (폴백 시 "N촌 친척" 등) */
  casual: string;
  /** 공식(한자식) 호칭 */
  formal?: string;
  /** 한국어 경로 설명. 예: "아버지의 형" */
  description: string;
  chon: number | null;
  inLaw: boolean;
  tokens: RelToken[];
}

const ruleMap = buildRuleMap();

/** 각 토큰이 매칭될 수 있는 패턴 형태 (구체 → 일반 순) */
const FORMS: Record<RelToken, string[]> = {
  F: ['F'], M: ['M'], H: ['H'], W: ['W'],
  S: ['S', 'C'], D: ['D', 'C'],
  OB: ['OB', 'B'], YB: ['YB', 'B'], OZ: ['OZ', 'Z'], YZ: ['YZ', 'Z'],
  B: ['B'], Z: ['Z'],
};

/** 토큰 시퀀스에서 매칭 후보 키를 구체적인 것부터 순서대로 생성 */
export function candidateKeys(tokens: RelToken[]): string[] {
  let combos: Array<{ key: string[]; generalized: number }> = [{ key: [], generalized: 0 }];
  for (const token of tokens) {
    const forms = FORMS[token];
    const next: typeof combos = [];
    for (const combo of combos) {
      forms.forEach((form, idx) => {
        next.push({ key: [...combo.key, form], generalized: combo.generalized + (idx > 0 ? 1 : 0) });
      });
    }
    combos = next;
  }
  return combos
    .sort((a, b) => a.generalized - b.generalized)
    .map((c) => c.key.join('.'));
}

function matchRule(tokens: RelToken[], ego: Person, target: Person): KinshipRule | null {
  const married = target.spouseIds.length > 0;
  for (const key of candidateKeys(tokens)) {
    const rules = ruleMap.get(key);
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.egoGender && rule.egoGender !== ego.gender) continue;
      if (rule.targetMarried !== undefined && rule.targetMarried !== married) continue;
      return rule;
    }
  }
  return null;
}

/** 사촌급 형제 항렬 접미: 기준 vs 타겟 나이 비교 */
function siblingSuffix(ego: Person, target: Person): string {
  if (ego.birthYear == null || target.birthYear == null || ego.birthYear === target.birthYear) return '';
  if (target.birthYear < ego.birthYear) {
    if (target.gender === 'male') return ego.gender === 'male' ? ' 형' : ' 오빠';
    return ego.gender === 'male' ? ' 누나' : ' 언니';
  }
  return ' 동생';
}

function describePath(graph: FamilyGraph, baseId: string, steps: RelStep[]): string {
  const words: string[] = [];
  let anchorId = baseId;
  for (const step of steps) {
    const anchorMale = graph.persons[anchorId].gender === 'male';
    let word: string;
    switch (step.token) {
      case 'F': word = '아버지'; break;
      case 'M': word = '어머니'; break;
      case 'H': word = '남편'; break;
      case 'W': word = '아내'; break;
      case 'S': word = '아들'; break;
      case 'D': word = '딸'; break;
      case 'OB': word = anchorMale ? '형' : '오빠'; break;
      case 'OZ': word = anchorMale ? '누나' : '언니'; break;
      case 'YB': word = '남동생'; break;
      case 'YZ': word = '여동생'; break;
      case 'B': word = '남자 형제'; break;
      case 'Z': word = '여자 형제'; break;
    }
    words.push(word);
    anchorId = step.personId;
  }
  return words.join('의 ');
}

export function computeKinship(
  graph: FamilyGraph,
  baseId: string,
  targetId: string,
): KinshipResult {
  if (baseId === targetId) {
    return { kind: 'self', casual: '본인', description: '', chon: 0, inLaw: false, tokens: [] };
  }
  const path = findKinPath(graph, baseId, targetId);
  if (path === null) {
    return { kind: 'none', casual: '관계 없음', description: '가족 관계로 연결되어 있지 않습니다.', chon: null, inLaw: false, tokens: [] };
  }
  const steps = tokenizePath(graph, baseId, path);
  const tokens = steps.map((s) => s.token);
  const chon = computeChon(tokens);
  const inLaw = isInLaw(tokens);
  const description = describePath(graph, baseId, steps);
  const ego = graph.persons[baseId];
  const target = graph.persons[targetId];

  const rule = matchRule(tokens, ego, target);
  if (rule) {
    const suffix = rule.appendSiblingSuffix ? siblingSuffix(ego, target) : '';
    return {
      kind: 'term',
      casual: rule.casual + suffix,
      formal: rule.formal,
      description,
      chon,
      inLaw,
      tokens,
    };
  }
  return {
    kind: 'fallback',
    casual: inLaw ? '배우자 쪽 친척' : `${chon}촌 친척`,
    description,
    chon,
    inLaw,
    tokens,
  };
}
