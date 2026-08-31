export type Gender = 'male' | 'female';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  /** 형/동생, 연상/연하 판단용. 미입력 시 중립 호칭으로 폴백 */
  birthYear?: number;
  /**
   * 형제 그룹 내 순서 (작을수록 손위). 출생년도를 몰라도 형/동생을
   * 표현할 수 있도록 사용자가 명시(추가 시 관계 선택, 드래그 정렬)했을 때만 부여
   */
  siblingRank?: number;
  fatherId?: string;
  motherId?: string;
  /** v1은 최대 1명만 사용. 재혼 확장 대비 배열 */
  spouseIds: string[];
}

export interface FamilyData {
  schemaVersion: 1;
  /** '나' */
  egoId: string;
  persons: Record<string, Person>;
}

export interface ExportedFamilyData extends FamilyData {
  exportedAt: string;
}
