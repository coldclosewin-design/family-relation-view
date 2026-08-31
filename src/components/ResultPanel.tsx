import { useMemo } from 'react';
import { buildGraph } from '../model/familyGraph';
import { computeKinship } from '../kinship/resolver';
import { useFamilyStore } from '../store/familyStore';
import type { FamilyData } from '../model/types';

/** 받침 유무에 따른 조사 선택 */
function josa(word: string, withJong: string, withoutJong: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 > 0 ? withJong : withoutJong;
  }
  return withJong;
}

function TermLine({ casual, formal }: { casual: string; formal?: string }) {
  return (
    <span>
      <strong>{casual}</strong>
      {formal && formal !== casual && <span className="formal"> ({formal})</span>}
    </span>
  );
}

export function ResultPanel({ data }: { data: FamilyData }) {
  const baseId = useFamilyStore((s) => s.baseId);
  const targetId = useFamilyStore((s) => s.targetId);
  const swapSelection = useFamilyStore((s) => s.swapSelection);

  const graph = useMemo(() => buildGraph(data), [data]);

  if (!baseId) {
    return (
      <aside className="result-panel empty">
        <p className="hint-title">호칭 알아보기</p>
        <div className="hint-steps">
          <span className="hint-step">
            <span className="step-no">1</span>
            <span className="chip base">기준 인물</span> 클릭
          </span>
          <span className="step-arrow">→</span>
          <span className="hint-step">
            <span className="step-no">2</span>
            <span className="chip target">상대 인물</span> 클릭
          </span>
        </div>
        <p className="hint sub">가족 추가는 카드의 ＋ 버튼</p>
      </aside>
    );
  }

  const base = data.persons[baseId];
  if (!targetId) {
    return (
      <aside className="result-panel empty">
        <div className="hint-steps">
          <span className="hint-step">
            <span className="chip base">{base.name}</span>
          </span>
          <span className="step-arrow">→</span>
          <span className="hint-step">
            <span className="chip target">상대 인물</span> 클릭
          </span>
        </div>
        <p className="hint sub">상대를 고르면 호칭을 알려드려요</p>
      </aside>
    );
  }

  const target = data.persons[targetId];
  const forward = computeKinship(graph, baseId, targetId);
  const reverse = computeKinship(graph, targetId, baseId);

  return (
    <aside className="result-panel">
      <div className="pair-row">
        <span className="chip base">{base.name}</span>
        <button
          className="swap-btn"
          title="기준/상대 뒤집기"
          onClick={swapSelection}
        >
          ⇄
        </button>
        <span className="chip target">{target.name}</span>
      </div>

      <div className="result-main">
        <p className="result-caption">
          {base.name}
          {josa(base.name, '이', '가')} {target.name}
          {josa(target.name, '을', '를')} 부르는 말
        </p>
        <p className="result-term">
          <TermLine casual={forward.casual} formal={forward.formal} />
        </p>
        {forward.description && (
          <p className="result-desc">
            {forward.description}
            {forward.chon !== null && forward.chon > 0 && (
              <span className="chon-badge">
                {forward.inLaw ? '배우자 쪽 · ' : ''}
                {forward.chon}촌
              </span>
            )}
          </p>
        )}
      </div>

      <div className="result-reverse">
        <span className="reverse-label">반대로 {target.name} → {base.name}</span>
        <TermLine casual={reverse.casual} formal={reverse.formal} />
      </div>
    </aside>
  );
}
