import { useRef, useState } from 'react';
import { downloadJson, readJsonFile } from '../utils/importExport';
import { buildShareUrl } from '../utils/shareLink';
import { useFamilyStore } from '../store/familyStore';

export function Toolbar() {
  const data = useFamilyStore((s) => s.data);
  const labelMode = useFamilyStore((s) => s.labelMode);
  const toggleLabelMode = useFamilyStore((s) => s.toggleLabelMode);
  const genLimitOn = useFamilyStore((s) => s.genLimitOn);
  const toggleGenLimit = useFamilyStore((s) => s.toggleGenLimit);
  const focusPerson = useFamilyStore((s) => s.focusPerson);
  const importData = useFamilyStore((s) => s.importData);
  const reset = useFamilyStore((s) => s.reset);
  const setError = useFamilyStore((s) => s.setError);
  const setHelpOpen = useFamilyStore((s) => s.setHelpOpen);
  const requestExportImage = useFamilyStore((s) => s.requestExportImage);
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

  const onShare = async () => {
    if (!data) return;
    const url = buildShareUrl(data);
    if (url.length > 15000) {
      setError('가족 인원이 많아 링크가 너무 깁니다. 내보내기(JSON 파일)로 공유해주세요.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: '가족 호칭 계산기', url });
        return;
      } catch (e) {
        // 사용자가 공유 시트를 닫은 경우는 조용히 종료
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setError('공유 링크가 복사되었습니다. 붙여넣기로 전달하세요!');
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
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
            className={genLimitOn ? 'toggled' : ''}
            title="조부모~손주 범위만 표시 (그 너머 세대와 곁가지 숨김)"
            onClick={toggleGenLimit}
          >
            3대
          </button>
        )}
        {data && (
          <button
            className={labelMode ? 'toggled' : ''}
            title="모든 카드에 '나' 기준 호칭 표시"
            onClick={toggleLabelMode}
          >
            호칭
          </button>
        )}
        {data && (
          <button title="링크 하나로 가족과 관계도 공유" onClick={onShare}>
            공유
          </button>
        )}
        {data && (
          <button title="관계도를 PNG 이미지로 저장" onClick={requestExportImage}>
            이미지
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
