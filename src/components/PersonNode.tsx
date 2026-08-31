import type { Person } from '../model/types';
import { NODE_H, NODE_W } from '../layout/treeLayout';

interface Props {
  person: Person;
  x: number;
  y: number;
  isEgo: boolean;
  selection: 'base' | 'target' | null;
  /** 드래그 중 원래 자리 표시용 */
  dimmed?: boolean;
  /** 드래그 중 포인터를 따라다니는 고스트 */
  ghost?: boolean;
  /** 관계 경로 하이라이트 대상 */
  onPath?: boolean;
  /** 검색 점프 후 강조 애니메이션 */
  flash?: boolean;
  /** 드롭 직후 안착 바운스 */
  dropped?: boolean;
  /** 카드 아래 작은 호칭 라벨 ('호칭 보기' 모드) */
  subLabel?: string;
  /** 드래그 젤리 변형 등 내부 래퍼에 적용할 스타일 */
  innerStyle?: React.CSSProperties;
  onSelect?: (id: string) => void;
  onOpenDialog?: (id: string) => void;
  onDragStart?: (id: string, e: React.PointerEvent) => void;
}

export function PersonNode({
  person,
  x,
  y,
  isEgo,
  selection,
  dimmed,
  ghost,
  onPath,
  flash,
  dropped,
  subLabel,
  innerStyle,
  onSelect,
  onOpenDialog,
  onDragStart,
}: Props) {
  const cls = [
    'person-node',
    person.gender,
    selection === 'base' ? 'sel-base' : '',
    selection === 'target' ? 'sel-target' : '',
    dimmed ? 'drag-source' : '',
    ghost ? 'drag-ghost' : '',
    onPath ? 'on-path' : '',
    flash ? 'flash' : '',
    dropped ? 'dropped' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasYear = person.birthYear != null;
  // 알약형 카드의 곡면을 피해, 긴 이름은 카드 폭에 맞춰 압축
  const nameLenProps =
    person.name.length > 4
      ? { textLength: NODE_W - 26, lengthAdjust: 'spacingAndGlyphs' as const }
      : {};

  return (
    <g
      className={cls}
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(person.id);
      }}
      onPointerDown={(e) => onDragStart?.(person.id, e)}
    >
      <g className="node-inner" style={innerStyle}>
        <rect className="person-card" width={NODE_W} height={NODE_H} rx={NODE_H / 2} />
        <rect
          className="gloss"
          x={10}
          y={4}
          width={NODE_W - 20}
          height={NODE_H * 0.4}
          rx={NODE_H * 0.2}
        />
        <text
          className="person-name"
          x={NODE_W / 2}
          y={hasYear ? 20 : NODE_H / 2 + 5}
          textAnchor="middle"
          {...nameLenProps}
        >
          {person.name}
        </text>
        {hasYear && (
          <text className="person-year" x={NODE_W / 2} y={37} textAnchor="middle">
            {person.birthYear}년생
          </text>
        )}
        {subLabel && (
          <text className="kin-label" x={NODE_W / 2} y={NODE_H + 13} textAnchor="middle">
            {subLabel}
          </text>
        )}
        {isEgo && (
          <g className="ego-badge" transform="translate(12, -6)">
            <rect width={22} height={14} rx={7} />
            <text x={11} y={11} textAnchor="middle">나</text>
          </g>
        )}
        {!ghost && (
          <g
            className="add-btn"
            transform={`translate(${NODE_W - 10}, 4)`}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDialog?.(person.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <circle r={9} />
            <text y={4} textAnchor="middle">+</text>
          </g>
        )}
      </g>
    </g>
  );
}
