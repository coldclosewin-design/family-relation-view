import type { Person } from '../model/types';
import { NODE_H, NODE_W } from '../layout/treeLayout';

interface Props {
  person: Person;
  x: number;
  y: number;
  isEgo: boolean;
  selection: 'base' | 'target' | null;
  onSelect: (id: string) => void;
  onOpenDialog: (id: string) => void;
}

export function PersonNode({ person, x, y, isEgo, selection, onSelect, onOpenDialog }: Props) {
  const cls = [
    'person-node',
    person.gender,
    selection === 'base' ? 'sel-base' : '',
    selection === 'target' ? 'sel-target' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={cls}
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(person.id);
      }}
    >
      <rect className="person-card" width={NODE_W} height={NODE_H} rx={10} />
      <text className="person-name" x={NODE_W / 2} y={27} textAnchor="middle">
        {person.name}
      </text>
      <text className="person-year" x={NODE_W / 2} y={47} textAnchor="middle">
        {person.birthYear ? `${person.birthYear}년생` : ' '}
      </text>
      {isEgo && (
        <g className="ego-badge" transform="translate(10, -8)">
          <rect width={26} height={16} rx={8} />
          <text x={13} y={12} textAnchor="middle">나</text>
        </g>
      )}
      <g
        className="add-btn"
        transform={`translate(${NODE_W - 2}, 2)`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDialog(person.id);
        }}
      >
        <circle r={11} />
        <text y={4} textAnchor="middle">+</text>
      </g>
    </g>
  );
}
