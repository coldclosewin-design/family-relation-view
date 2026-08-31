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
      <rect className="person-card" width={NODE_W} height={NODE_H} rx={NODE_H / 2} />
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
  );
}
