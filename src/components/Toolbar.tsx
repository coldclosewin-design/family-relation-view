import { useRef } from 'react';
import { downloadJson, readJsonFile } from '../utils/importExport';
import { useFamilyStore } from '../store/familyStore';

export function Toolbar() {
  const data = useFamilyStore((s) => s.data);
  const importData = useFamilyStore((s) => s.importData);
  const reset = useFamilyStore((s) => s.reset);
  const setError = useFamilyStore((s) => s.setError);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      importData(await readJsonFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <header className="toolbar">
      <h1 className="app-title">👪 가족 호칭 계산기</h1>
      <div className="toolbar-actions">
        <button onClick={() => fileRef.current?.click()}>가져오기</button>
        {data && <button onClick={() => downloadJson(data)}>내보내기</button>}
        {data && (
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('모든 가족 데이터를 삭제하고 처음부터 시작할까요?')) reset();
            }}
          >
            초기화
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    </header>
  );
}
