import type { Gender } from '../model/types';

/**
 * 규칙 패턴 토큰: tokenizer의 RelToken에 더해 일반화 토큰을 허용한다.
 * - 'B'  : OB/YB 및 나이 미상 남자 형제 매칭
 * - 'Z'  : OZ/YZ 및 나이 미상 여자 형제 매칭
 * - 'C'  : S/D (성별 무관 자녀)
 */
export interface KinshipRule {
  /** '.' 조인 토큰 키. 예: 'F.OB', 'W.YZ.H', 'F.B.C' */
  pattern: string;
  /** 기준 인물 성별 조건 (없으면 무관) */
  egoGender?: Gender;
  /** 타겟 혼인 여부 조건 (도련님/서방님 구분) */
  targetMarried?: boolean;
  /** 일상 호칭 */
  casual: string;
  /** 공식(한자식) 호칭 — "일상 (공식)" 병기용 */
  formal?: string;
  /** 사촌급 형제 항렬: 기준·타겟 나이 비교로 '형/오빠/누나/언니/동생' 접미를 후처리로 붙임 */
  appendSiblingSuffix?: boolean;
}

export const RULES: KinshipRule[] = [
  // ── 직계 존속 ──────────────────────────────────────────
  { pattern: 'F', casual: '아버지', formal: '부친' },
  { pattern: 'M', casual: '어머니', formal: '모친' },
  { pattern: 'F.F', casual: '할아버지', formal: '조부' },
  { pattern: 'F.M', casual: '할머니', formal: '조모' },
  { pattern: 'M.F', casual: '외할아버지', formal: '외조부' },
  { pattern: 'M.M', casual: '외할머니', formal: '외조모' },
  { pattern: 'F.F.F', casual: '증조할아버지', formal: '증조부' },
  { pattern: 'F.F.M', casual: '증조할머니', formal: '증조모' },
  { pattern: 'M.F.F', casual: '외증조할아버지', formal: '외증조부' },
  { pattern: 'M.F.M', casual: '외증조할머니', formal: '외증조모' },
  { pattern: 'F.F.F.F', casual: '고조할아버지', formal: '고조부' },
  { pattern: 'F.F.F.M', casual: '고조할머니', formal: '고조모' },

  // ── 계부모 (부모의 배우자 ≠ 친부모) ────────────────────
  { pattern: 'M.H', casual: '새아버지', formal: '계부' },
  { pattern: 'F.W', casual: '새어머니', formal: '계모' },

  // ── 직계 비속 ──────────────────────────────────────────
  { pattern: 'S', casual: '아들' },
  { pattern: 'D', casual: '딸' },
  { pattern: 'S.S', casual: '손자', formal: '손' },
  { pattern: 'S.D', casual: '손녀' },
  { pattern: 'D.S', casual: '외손자', formal: '외손' },
  { pattern: 'D.D', casual: '외손녀' },
  { pattern: 'S.S.S', casual: '증손자', formal: '증손' },
  { pattern: 'S.S.D', casual: '증손녀' },

  // ── 배우자 ─────────────────────────────────────────────
  { pattern: 'H', casual: '남편', formal: '부군' },
  { pattern: 'W', casual: '아내', formal: '처' },

  // ── 며느리/사위/사돈 ───────────────────────────────────
  { pattern: 'S.W', casual: '며느리', formal: '자부' },
  { pattern: 'D.H', casual: '사위', formal: '서' },
  { pattern: 'S.W.F', casual: '사돈어른', formal: '바깥사돈' },
  { pattern: 'S.W.M', casual: '사부인', formal: '안사돈' },
  { pattern: 'D.H.F', casual: '사돈어른', formal: '바깥사돈' },
  { pattern: 'D.H.M', casual: '사부인', formal: '안사돈' },

  // ── 나의 형제자매 ──────────────────────────────────────
  { pattern: 'OB', egoGender: 'male', casual: '형', formal: '형님' },
  { pattern: 'OB', egoGender: 'female', casual: '오빠' },
  { pattern: 'OZ', egoGender: 'male', casual: '누나' },
  { pattern: 'OZ', egoGender: 'female', casual: '언니' },
  { pattern: 'YB', casual: '남동생', formal: '아우' },
  { pattern: 'YZ', casual: '여동생' },
  { pattern: 'B', casual: '형제' },
  { pattern: 'Z', casual: '자매' },

  // ── 형제자매의 배우자 ──────────────────────────────────
  { pattern: 'OB.W', egoGender: 'male', casual: '형수님', formal: '형수' },
  { pattern: 'OB.W', egoGender: 'female', casual: '새언니', formal: '올케' },
  { pattern: 'YB.W', egoGender: 'male', casual: '제수씨', formal: '제수' },
  { pattern: 'YB.W', egoGender: 'female', casual: '올케' },
  { pattern: 'OZ.H', egoGender: 'male', casual: '매형', formal: '자형' },
  { pattern: 'OZ.H', egoGender: 'female', casual: '형부' },
  { pattern: 'YZ.H', egoGender: 'male', casual: '매제', formal: '매부' },
  { pattern: 'YZ.H', egoGender: 'female', casual: '제부' },

  // ── 3촌: 삼촌/고모/이모 ────────────────────────────────
  { pattern: 'F.OB', casual: '큰아버지', formal: '백부' },
  { pattern: 'F.YB', casual: '작은아버지', formal: '숙부' },
  { pattern: 'F.B', casual: '삼촌', formal: '숙부' },
  { pattern: 'F.OB.W', casual: '큰어머니', formal: '백모' },
  { pattern: 'F.YB.W', casual: '작은어머니', formal: '숙모' },
  { pattern: 'F.B.W', casual: '숙모' },
  { pattern: 'F.Z', casual: '고모' },
  { pattern: 'F.Z.H', casual: '고모부', formal: '고숙' },
  { pattern: 'M.B', casual: '외삼촌', formal: '외숙부' },
  { pattern: 'M.B.W', casual: '외숙모' },
  { pattern: 'M.Z', casual: '이모' },
  { pattern: 'M.Z.H', casual: '이모부', formal: '이숙' },

  // ── 조부모의 형제 (4촌 존속) ───────────────────────────
  { pattern: 'F.F.OB', casual: '큰할아버지', formal: '종조부' },
  { pattern: 'F.F.YB', casual: '작은할아버지', formal: '종조부' },
  { pattern: 'F.F.B', casual: '종조할아버지', formal: '종조부' },
  { pattern: 'F.F.B.W', casual: '종조할머니', formal: '종조모' },
  { pattern: 'F.F.Z', casual: '고모할머니', formal: '대고모' },
  { pattern: 'M.M.Z', casual: '이모할머니' },

  // ── 4촌: 사촌 (형/동생 접미 후처리) ────────────────────
  { pattern: 'F.B.C', casual: '사촌', formal: '종형제', appendSiblingSuffix: true },
  { pattern: 'F.Z.C', casual: '고종사촌', formal: '고종', appendSiblingSuffix: true },
  { pattern: 'M.B.C', casual: '외사촌', formal: '외종', appendSiblingSuffix: true },
  { pattern: 'M.Z.C', casual: '이종사촌', formal: '이종', appendSiblingSuffix: true },

  // ── 5촌: 당숙/당고모/당질 ──────────────────────────────
  { pattern: 'F.F.B.S', casual: '당숙', formal: '종숙' },
  { pattern: 'F.F.B.S.W', casual: '당숙모', formal: '종숙모' },
  { pattern: 'F.F.B.D', casual: '당고모', formal: '종고모' },
  { pattern: 'F.B.C.S', casual: '오촌 조카', formal: '당질' },
  { pattern: 'F.B.C.D', casual: '오촌 조카딸', formal: '당질녀' },

  // ── 6촌: 재종 ──────────────────────────────────────────
  { pattern: 'F.F.B.S.C', casual: '육촌', formal: '재종', appendSiblingSuffix: true },

  // ── 조카 ───────────────────────────────────────────────
  { pattern: 'B.S', casual: '조카', formal: '질' },
  { pattern: 'B.D', casual: '조카딸', formal: '질녀' },
  { pattern: 'Z.S', egoGender: 'male', casual: '조카', formal: '생질' },
  { pattern: 'Z.D', egoGender: 'male', casual: '조카딸', formal: '생질녀' },
  { pattern: 'Z.S', egoGender: 'female', casual: '조카', formal: '이질' },
  { pattern: 'Z.D', egoGender: 'female', casual: '조카딸', formal: '이질녀' },
  { pattern: 'B.S.W', casual: '조카며느리', formal: '질부' },
  { pattern: 'B.D.H', casual: '조카사위', formal: '질서' },

  // ── 처가 (아내의 가족) ─────────────────────────────────
  { pattern: 'W.F', casual: '장인어른', formal: '장인' },
  { pattern: 'W.M', casual: '장모님', formal: '장모' },
  { pattern: 'W.OB', casual: '형님', formal: '손위 처남' },
  { pattern: 'W.YB', casual: '처남' },
  { pattern: 'W.B', casual: '처남' },
  { pattern: 'W.OZ', casual: '처형' },
  { pattern: 'W.YZ', casual: '처제' },
  { pattern: 'W.Z', casual: '처형·처제' },
  { pattern: 'W.B.W', casual: '처남댁' },
  { pattern: 'W.OZ.H', casual: '형님', formal: '손위 동서' },
  { pattern: 'W.YZ.H', casual: '동서' },
  { pattern: 'W.Z.H', casual: '동서' },
  { pattern: 'W.B.C', casual: '처조카' },
  { pattern: 'W.Z.C', casual: '처조카' },

  // ── 시가 (남편의 가족) ─────────────────────────────────
  { pattern: 'H.F', casual: '시아버지', formal: '시부' },
  { pattern: 'H.M', casual: '시어머니', formal: '시모' },
  { pattern: 'H.F.F', casual: '시할아버지', formal: '시조부' },
  { pattern: 'H.F.M', casual: '시할머니', formal: '시조모' },
  { pattern: 'H.OB', casual: '아주버님', formal: '시숙' },
  { pattern: 'H.YB', targetMarried: true, casual: '서방님', formal: '시동생' },
  { pattern: 'H.YB', targetMarried: false, casual: '도련님', formal: '시동생' },
  { pattern: 'H.OZ', casual: '형님', formal: '손위 시누이' },
  { pattern: 'H.YZ', casual: '아가씨', formal: '손아래 시누이' },
  { pattern: 'H.Z', casual: '시누이' },
  { pattern: 'H.OB.W', casual: '형님', formal: '손위 동서' },
  { pattern: 'H.YB.W', casual: '동서' },
  { pattern: 'H.B.W', casual: '동서' },
  { pattern: 'H.OZ.H', casual: '아주버님', formal: '시누이 남편' },
  { pattern: 'H.YZ.H', casual: '서방님', formal: '시누이 남편' },
  { pattern: 'H.B.C', casual: '조카', formal: '시조카' },
  { pattern: 'H.Z.C', casual: '조카', formal: '시조카' },
];

/** pattern → 규칙 목록 (선언 순서 유지) */
export function buildRuleMap(): Map<string, KinshipRule[]> {
  const map = new Map<string, KinshipRule[]>();
  for (const rule of RULES) {
    const list = map.get(rule.pattern) ?? [];
    list.push(rule);
    map.set(rule.pattern, list);
  }
  return map;
}
