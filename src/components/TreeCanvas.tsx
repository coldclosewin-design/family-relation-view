import { useEffect, useMemo, useRef } from 'react';
import { buildGraph } from '../model/familyGraph';
import { layoutFamily, NODE_H, NODE_W } from '../layout/treeLayout';
import { usePanZoom } from '../hooks/usePanZoom';
import { useFamilyStore } from '../store/familyStore';
import { PersonNode } from './PersonNode';
import type { FamilyData } from '../model/types';

const BUS_OFFSET = 26;

export function TreeCanvas({ data }: { data: FamilyData }) {
  const baseId = useFamilyStore((s) => s.baseId);
  const targetId = useFamilyStore((s) => s.targetId);
  const selectPerson = useFamilyStore((s) => s.selectPerson);
  const clearSelection = useFamilyStore((s) => s.clearSelection);
  const openDialog = useFamilyStore((s) => s.openDialog);

  const graph = useMemo(() => buildGraph(data), [data]);
  const layout = useMemo(() => layoutFamily(graph), [graph]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { viewBox, onWheel, onPointerDown, onPointerMove, onPointerUp, fit, wasDragged } =
    usePanZoom({ x: -200, y: -100, w: 1200, h: 800 });

  const personCount = Object.keys(data.persons).length;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const boundsRef = useRef(layout.bounds);
  boundsRef.current = layout.bounds;

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    // 마운트 직후에는 svg 크기가 0일 수 있으므로 측정될 때까지 다음 프레임에 재시도
    let raf = 0;
    const tryFit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fitRef.current(boundsRef.current, rect.width / rect.height);
      } else {
        raf = requestAnimationFrame(tryFit);
      }
    };
    tryFit();
    return () => cancelAnimationFrame(raf);
  }, [personCount]);

  const couplePaths = layout.couples.map(({ a, b }) => {
    const pa = layout.positions.get(a)!;
    const pb = layout.positions.get(b)!;
    const y = pa.y + NODE_H / 2;
    return { key: `${a}-${b}`, x1: pa.x + NODE_W, x2: pb.x, y };
  });

  const childPaths = layout.childLinks.map(({ parentUnitId, childId }) => {
    const anchor = layout.unitAnchors.get(parentUnitId)!;
    const parentY = layout.genToY(anchor.gen);
    const startY = anchor.isCouple ? parentY + NODE_H / 2 : parentY + NODE_H;
    const child = layout.positions.get(childId)!;
    const cx = child.x + NODE_W / 2;
    const busY = child.y - BUS_OFFSET;
    return {
      key: `c-${childId}`,
      d: `M ${anchor.x} ${startY} V ${busY} H ${cx} V ${child.y}`,
    };
  });

  const inLawPaths = layout.inLawLinks.map(({ memberId, parentUnitId }) => {
    const member = layout.positions.get(memberId)!;
    const anchor = layout.unitAnchors.get(parentUnitId)!;
    const parentBottom = layout.genToY(anchor.gen) + NODE_H;
    const mx = member.x + NODE_W / 2;
    const busY = member.y - BUS_OFFSET + 8;
    return {
      key: `i-${memberId}`,
      d: `M ${mx} ${member.y} V ${busY} H ${anchor.x} V ${parentBottom}`,
    };
  });

  return (
    <svg
      ref={svgRef}
      className="tree-canvas"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        if (!wasDragged()) clearSelection();
      }}
    >
      <g className="edges">
        {couplePaths.map((c) => (
          <g key={c.key} className="couple-line">
            <line x1={c.x1} y1={c.y - 2.5} x2={c.x2} y2={c.y - 2.5} />
            <line x1={c.x1} y1={c.y + 2.5} x2={c.x2} y2={c.y + 2.5} />
          </g>
        ))}
        {childPaths.map((p) => (
          <path key={p.key} className="child-line" d={p.d} />
        ))}
        {inLawPaths.map((p) => (
          <path key={p.key} className="inlaw-line" d={p.d} />
        ))}
      </g>
      <g className="nodes">
        {[...layout.positions.values()].map((pos) => (
          <PersonNode
            key={pos.id}
            person={data.persons[pos.id]}
            x={pos.x}
            y={pos.y}
            isEgo={pos.id === data.egoId}
            selection={pos.id === baseId ? 'base' : pos.id === targetId ? 'target' : null}
            onSelect={(id) => {
              if (!wasDragged()) selectPerson(id);
            }}
            onOpenDialog={(id) => {
              if (!wasDragged()) openDialog(id);
            }}
          />
        ))}
      </g>
    </svg>
  );
}
