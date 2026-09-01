import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type { FamilyData } from '../model/types';
import { validateData } from '../model/familyGraph';

/** 가족 데이터 → URL 해시에 담을 수 있는 압축 문자열 */
export function encodeShareData(data: FamilyData): string {
  return compressToEncodedURIComponent(JSON.stringify(data));
}

/** 압축 문자열 → 가족 데이터 (손상·위조 시 null) */
export function decodeShareData(payload: string): FamilyData | null {
  try {
    const json = decompressFromEncodedURIComponent(payload);
    if (!json) return null;
    const parsed: unknown = JSON.parse(json);
    if (validateData(parsed).length > 0) return null;
    const d = parsed as FamilyData;
    return { schemaVersion: 1, egoId: d.egoId, persons: d.persons };
  } catch {
    return null;
  }
}

export function buildShareUrl(data: FamilyData): string {
  return `${location.origin}${location.pathname}#d=${encodeShareData(data)}`;
}

/** 주소의 공유 해시 존재 여부와 해석 결과 */
export function readShareHash(): { present: boolean; data: FamilyData | null } {
  const m = location.hash.match(/^#d=(.+)$/);
  if (!m) return { present: false, data: null };
  return { present: true, data: decodeShareData(m[1]) };
}

export function clearShareHash(): void {
  history.replaceState(null, '', location.pathname + location.search);
}
