import { useRef, useState } from 'react';
import { downloadJson, readJsonFile } from '../utils/importExport';
import { useFamilyStore } from '../store/familyStore';

export function Toolbar() {
  const data = useFamilyStore((s) => s.data);
  const labelMode = useFamilyStore((s) => s.labelMode);
  const toggleLabelMode = useFamilyStore((s) => s.toggleLabelMode);
  const focusPerson = useFamilyStore((s) => s.focusPerson);
  const importData = useFamilyStore((s) => s.importData);
  const reset = useFamilyStore((s) => s.reset);
  const setError = useFamilyStore((s) => s.setError);
  const setHelpOpen = useFamilyStore((s) => s.setHelpOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const cycleRef = useRef(0);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      importData(await readJsonFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : '가져오기에 실패했습니다.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const jumpToMatch = () => {
    if (!data) return;
    const q = query.trim();
    if (!q) return;
    const matches = Object.values(data.persons).filter((p) => p.name.includes(q));
    if (matches.length === 0) {
      setError(`'${q}' 이름을 찾을 수 없습니다.`);
      return;
    }
    // 같은 검색어로 반복하면 다음 매치로 순환
    const m = matches[cycleRef.current % matches.length];
    cycleRef.current += 1;
    focusPerson(m.id);
  };

  return (
    <header className="toolbar">
      <h1 className="app-title">👪 가족 호칭 계산기</h1>
      {data && (
        <div className="toolbar-search">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              cycleRef.current = 0;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jumpToMatch();
            }}
            placeholder="이름 검색"
            aria-label="이름 검색"
          />
          <button onClick={jumpToMatch} title="찾기">🔍</button>
        </div>
      )}
      <div className="toolbar-actions">
        <button className="help-btn" title="사용 가이드" onClick={() => setHelpOpen(true)}>
          ?
        </button>
        {data && (
          <button
            className={labelMode ? 'toggled' : ''}
            title="모든 카드에 '나' 기준 호칭 표시"
            onClick={toggleLabelMode}
          >
            호칭
          </button>
        )}
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
