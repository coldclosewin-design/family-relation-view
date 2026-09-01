import { useFamilyStore } from '../store/familyStore';

interface Item {
  icon: string;
  title: string;
  body: React.ReactNode;
}

const ITEMS: Item[] = [
  {
    icon: '➕',
    title: '가족 추가',
    body: (
      <>
        카드 오른쪽 위 <b>＋</b>를 누르면 아버지·어머니·배우자·자녀·형제자매를 추가할 수
        있어요. 형제자매는 <b>형/누나/동생</b> 관계를 골라 출생년도 없이도 순서를 정할 수 있어요.
      </>
    ),
  },
  {
    icon: '👆',
    title: '호칭 알아보기',
    body: (
      <>
        <span className="chip base">기준 인물</span>을 먼저,{' '}
        <span className="chip target">상대 인물</span>을 이어서 클릭하면 호칭이 나와요.{' '}
        <b>⇄</b> 버튼으로 기준과 상대를 뒤집을 수 있어요.
      </>
    ),
  },
  {
    icon: '🔄',
    title: '선택 바꾸기 · 해제',
    body: (
      <>
        다른 카드를 누르면 <b>상대만 바뀌어요</b>. 같은 카드를 다시 누르면 그 선택이 해제되고,{' '}
        <b>빈 배경을 누르면 전부 해제</b>돼요. 새 기준으로 시작하려면 배경 클릭 후 다시
        선택하세요.
      </>
    ),
  },
  {
    icon: '↔️',
    title: '형제 순서 바꾸기',
    body: <>카드를 좌우로 드래그하면 형제 순서가 바뀌고, 형/동생 판정에도 반영돼요.</>,
  },
  {
    icon: '🌿',
    title: '가지 접기',
    body: (
      <>
        카드 <b>아래 ▾</b>는 그 사람의 배우자·후손 전체를, 카드 <b>위 −</b>는 배우자의
        원가족(외가·처가)을 접어요. 접힌 <b>+N</b> 배지를 누르면 다시 펼쳐져요. 상단{' '}
        <b>3대</b> 버튼을 켜면 조부모~손주 범위만 간단히 볼 수 있어요.
      </>
    ),
  },
  {
    icon: '🗺️',
    title: '화면 탐색',
    body: (
      <>
        배경 드래그로 이동, 휠·핀치로 확대/축소해요. 오른쪽 아래 <b>⛶</b>는 전체 보기,{' '}
        <b>나</b>는 내 카드로 이동이에요. 이름 검색으로 특정 인물을 바로 찾을 수도 있어요.
      </>
    ),
  },
  {
    icon: '🏷️',
    title: '호칭 라벨 · 저장',
    body: (
      <>
        상단 <b>호칭</b> 버튼을 켜면 모든 카드에 나 기준 호칭이 표시돼요. 데이터는 이
        브라우저에 자동 저장되고, <b>내보내기/가져오기</b>로 백업할 수 있어요.
      </>
    ),
  },
  {
    icon: '💌',
    title: '가족과 공유',
    body: (
      <>
        <b>공유</b>는 관계도가 담긴 링크를 만들어요 — 받은 사람은 열자마자 같은 관계도를
        볼 수 있어요. <b>이미지</b>는 관계도 전체를 PNG 그림 파일로 저장해요.
      </>
    ),
  },
];

export function HelpDialog() {
  const helpOpen = useFamilyStore((s) => s.helpOpen);
  const setHelpOpen = useFamilyStore((s) => s.setHelpOpen);
  if (!helpOpen) return null;

  return (
    <div className="dialog-overlay" onClick={() => setHelpOpen(false)}>
      <div className="dialog help-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">👪 이렇게 사용해요</h3>
        <ul className="help-list">
          {ITEMS.map((item) => (
            <li key={item.title}>
              <span className="help-icon">{item.icon}</span>
              <div>
                <p className="help-item-title">{item.title}</p>
                <p className="help-item-body">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <button className="primary dialog-close" onClick={() => setHelpOpen(false)}>
          시작하기
        </button>
      </div>
    </div>
  );
}
