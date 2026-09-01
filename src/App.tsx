import { useEffect } from 'react';
import { useFamilyStore } from './store/familyStore';
import { Toolbar } from './components/Toolbar';
import { TreeCanvas } from './components/TreeCanvas';
import { ResultPanel } from './components/ResultPanel';
import { AddRelativeDialog } from './components/AddRelativeDialog';
import { HelpDialog } from './components/HelpDialog';
import { Onboarding } from './components/Onboarding';
import { clearShareHash, readShareHash } from './utils/shareLink';

function Toast() {
  const error = useFamilyStore((s) => s.error);
  const setError = useFamilyStore((s) => s.setError);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);
  if (!error) return null;
  return (
    <div className="toast" onClick={() => setError(null)}>
      {error}
    </div>
  );
}

export default function App() {
  const data = useFamilyStore((s) => s.data);
  const dialogAnchorId = useFamilyStore((s) => s.dialogAnchorId);
  const hasSeenHelp = useFamilyStore((s) => s.hasSeenHelp);
  const setHelpOpen = useFamilyStore((s) => s.setHelpOpen);

  // 첫 가족 생성 직후 사용 가이드를 한 번만 자동 표시
  const hasData = data !== null;
  useEffect(() => {
    if (hasData && !hasSeenHelp) setHelpOpen(true);
  }, [hasData, hasSeenHelp, setHelpOpen]);

  // 공유 링크(#d=...)로 접속한 경우 처리
  useEffect(() => {
    const { present, data: shared } = readShareHash();
    if (!present) return;
    const store = useFamilyStore.getState();
    if (!shared) {
      store.setError('공유 링크를 읽을 수 없습니다.');
    } else if (
      !store.data ||
      window.confirm(
        '공유받은 가족 관계도를 열까요?\n현재 저장된 데이터는 대체됩니다. (기존 데이터가 필요하면 취소 후 내보내기로 백업하세요)',
      )
    ) {
      store.importData(shared);
    }
    clearShareHash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <Toolbar />
      {data ? (
        <main className="main">
          <TreeCanvas data={data} />
          <ResultPanel data={data} />
        </main>
      ) : (
        <Onboarding />
      )}
      {data && dialogAnchorId && <AddRelativeDialog data={data} anchorId={dialogAnchorId} />}
      <HelpDialog />
      <Toast />
    </div>
  );
}
