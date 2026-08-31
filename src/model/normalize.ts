import type { FamilyData } from './types';

/**
 * 과거 버전에서 만들어진 반쪽 연결을 복구한다:
 * 부모 한쪽만 연결된 사람에게 그 부모의 배우자가 있으면 빈 부모 자리를 채운다.
 * (장인의 배우자로만 등록된 장모가 아내의 어머니로 연결되지 않아
 *  '처가 쪽 새어머니'처럼 계산되던 문제의 데이터 보정)
 * v1은 배우자가 1명뿐이므로 이 보정이 항상 안전하다.
 */
export function normalizeParentLinks(data: FamilyData): FamilyData {
  let changed = false;
  const persons = { ...data.persons };
  for (const p of Object.values(persons)) {
    const fixed = { ...p };
    if (fixed.fatherId && !fixed.motherId) {
      const spouseId = persons[fixed.fatherId]?.spouseIds[0];
      if (spouseId && persons[spouseId]?.gender === 'female') {
        fixed.motherId = spouseId;
        changed = true;
      }
    }
    if (fixed.motherId && !fixed.fatherId) {
      const spouseId = persons[fixed.motherId]?.spouseIds[0];
      if (spouseId && persons[spouseId]?.gender === 'male') {
        fixed.fatherId = spouseId;
        changed = true;
      }
    }
    persons[p.id] = fixed;
  }
  return changed ? { ...data, persons } : data;
}
