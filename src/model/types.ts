export type Gender = 'male' | 'female';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  /** 형/동생, 연상/연하 판단용. 미입력 시 중립 호칭으로 폴백 */
  birthYear?: number;
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
