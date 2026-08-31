import type { ExportedFamilyData, FamilyData } from '../model/types';
import { validateData } from '../model/familyGraph';

export function downloadJson(data: FamilyData): void {
  const exported: ExportedFamilyData = { ...data, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(exported, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `가족관계도-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<FamilyData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다.');
  }
  const errors = validateData(parsed);
  if (errors.length > 0) {
    throw new Error(`올바르지 않은 데이터입니다: ${errors[0]}`);
  }
  const d = parsed as ExportedFamilyData;
  return { schemaVersion: 1, egoId: d.egoId, persons: d.persons };
}
