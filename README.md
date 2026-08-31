# 가족 호칭 계산기 (family-relation-view)

가족 정보를 입력해 전통 가계도를 그리고, 두 사람을 골라 **서로 부르는 호칭**을 알려주는 웹 서비스.

**▶ 사용하기: https://coldclosewin-design.github.io/family-relation-view/**

## 기능

- **관계 기반 입력**: '나'에서 시작해 카드의 `+` 버튼으로 아버지/어머니/배우자/자녀/형제자매를 추가
- **전통 가계도 렌더링**: 세대별 계층 배치, 부부 나란히, 족보식 연결선. 시가/처가는 점선으로 연결
- **호칭 계산**: 기준 인물 클릭(파란 테두리) → 상대 인물 클릭(주황 테두리) → 호칭 표시
  - 일상 호칭 + 공식(한자식) 병기: `큰아버지 (백부)`
  - 6촌(재종)까지 규칙 매핑, 그 이상은 촌수 폴백(`7촌 친척`)
  - 시가/처가/사돈, 나이·성별·혼인 여부 조건(매형/형부, 도련님/서방님 등) 지원
  - 관계 경로 설명(`아버지의 형`)과 촌수 배지 병기
- **⇄ 역전**: 기준/상대를 통째로 뒤집어 반대 방향 호칭 확인 (양방향 동시 표시)
- **저장**: localStorage 자동 저장 + JSON 내보내기/가져오기
- **팬/줌**: 마우스 휠·드래그, 모바일 핀치/드래그

## 개발

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:5173/family-relation-view/)
npm test        # vitest — 호칭 엔진 단위 테스트
npm run build   # 타입체크 + 프로덕션 빌드
```

## 구조

```
src/
├─ model/     데이터 모델(Person, FamilyData), 그래프 파생, 추가/수정/삭제 순수 함수
├─ kinship/   호칭 엔진: BFS 경로 탐색 → 토큰 정규화 → 규칙 테이블 매칭 → 폴백
├─ layout/    세대 배정 → 부부 유닛 → 족보식 트리 레이아웃(SVG 좌표)
├─ store/     zustand + persist (localStorage)
├─ components/ Toolbar, TreeCanvas, PersonNode, AddRelativeDialog, ResultPanel, Onboarding
└─ utils/     JSON 내보내기/가져오기 + 검증
```

호칭 규칙은 [src/kinship/rules.ts](src/kinship/rules.ts)의 선언적 테이블 하나로 관리합니다.
경로 토큰(예: `F.OB` = 아버지의 형)에 일상/공식 호칭을 매핑하며, 규칙 추가만으로 커버리지를 넓힐 수 있습니다.

## 배포

`main` 브랜치 푸시 시 GitHub Actions가 테스트 → 빌드 → GitHub Pages 배포를 자동 수행합니다.
