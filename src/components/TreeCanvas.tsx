import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGraph } from '../model/familyGraph';
import { layoutFamily, H_GAP, LEVEL_H, NODE_H, NODE_W } from '../layout/treeLayout';
import { findKinPath } from '../kinship/pathFinder';
import { computeKinship } from '../kinship/resolver';
import { usePanZoom } from '../hooks/usePanZoom';
import { useFamilyStore } from '../store/familyStore';
import { PersonNode } from './PersonNode';
import type { FamilyData } from '../model/types';

const BUS_OFFSET = 18;
const DRAG_THRESHOLD_PX = 6;

interface DragState {
  personId: string;
  pointerId: number;
  /** 형제 그룹 (표시 순서, 드래그 대상 포함) */
  groupIds: string[];
  /** groupIds와 짝을 이루는 카드 중심 x */
  slotCenters: number[];
  rowY: number;
  /** 포인터(svg 좌표) - 카드 좌상단 오프셋 */
  offsetX: number;
  offsetY: number;
  pointer: { x: number; y: number };
  startClient: { x: number; y: number };
  active: boolean;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function genLabel(g: number): string {
  if (g === 0) return '나';
  if (g === -1) return '부모';
  if (g === -2) return '조부모';
  if (g === -3) return '증조부모';
  if (g === -4) return '고조부모';
  if (g === 1) return '자녀';
  if (g === 2) return '손주';
  if (g === 3) return '증손';
  return g < 0 ? `${-g}세대 위` : `${g}세대 아래`;
}

export function TreeCanvas({ data }: { data: FamilyData }) {
  const baseId = useFamilyStore((s) => s.baseId);
  const targetId = useFamilyStore((s) => s.targetId);
  const labelMode = useFamilyStore((s) => s.labelMode);
  const focusRequest = useFamilyStore((s) => s.focusRequest);
  const selectPerson = useFamilyStore((s) => s.selectPerson);
  const clearSelection = useFamilyStore((s) => s.clearSelection);
  const openDialog = useFamilyStore((s) => s.openDialog);
  const reorderSiblings = useFamilyStore((s) => s.reorderSiblings);

  const graph = useMemo(() => buildGraph(data), [data]);
  const layout = useMemo(() => layoutFamily(graph), [graph]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { viewBox, onWheel, onPointerDown, onPointerMove, onPointerUp, fit, centerOn, wasDragged } =
    usePanZoom({ x: -200, y: -100, w: 1200, h: 800 });
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  const personCount = Object.keys(data.persons).length;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const fitAll = () => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      fitRef.current(layoutRef.current.bounds, rect.width / rect.height);
    }
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    // 마운트 직후에는 svg 크기가 0일 수 있으므로 측정될 때까지 다음 프레임에 재시도
    let raf = 0;
    const tryFit = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fitRef.current(layoutRef.current.bounds, rect.width / rect.height);
      } else {
        raf = requestAnimationFrame(tryFit);
      }
    };
    tryFit();
    return () => cancelAnimationFrame(raf);
  }, [personCount]);

  // ── 검색/버튼으로 특정 인물에 포커스 ────────────────
  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusRequest) return;
    const pos = layoutRef.current.positions.get(focusRequest.id);
    if (!pos) return;
    centerOn(pos.x + NODE_W / 2, pos.y + NODE_H / 2);
    setFlashId(focusRequest.id);
    const t = setTimeout(() => setFlashId(null), 1800);
    return () => clearTimeout(t);
  }, [focusRequest, centerOn]);

  // ── 기준·상대 사이 관계 경로 하이라이트 ─────────────
  const pathInfo = useMemo(() => {
    if (!baseId || !targetId || baseId === targetId) return null;
    const path = findKinPath(graph, baseId, targetId);
    if (!path) return null;
    const ids = [baseId, ...path.map((s) => s.toId)];
    const pairs = new Set<string>();
    for (let i = 0; i < ids.length - 1; i++) pairs.add(pairKey(ids[i], ids[i + 1]));
    return { ids: new Set(ids), pairs };
  }, [graph, baseId, targetId]);

  const unitMembers = (unitId: string): string[] => {
    const spouse = data.persons[unitId]?.spouseIds[0];
    return spouse ? [unitId, spouse] : [unitId];
  };
  const linkOnPath = (aIds: string[], b: string): boolean =>
    pathInfo !== null && aIds.some((a) => pathInfo.pairs.has(pairKey(a, b)));

  // ── '호칭 보기' 라벨 ────────────────────────────────
  const termMap = useMemo(() => {
    if (!labelMode) return null;
    const m = new Map<string, string>();
    for (const id of Object.keys(data.persons)) {
      if (id === data.egoId) continue;
      m.set(id, computeKinship(graph, data.egoId, id).casual);
    }
    return m;
  }, [labelMode, graph, data]);

  // ── 세대 가이드 밴드 ────────────────────────────────
  const genBands = useMemo(() => {
    const gens = new Set<number>();
    for (const a of layout.unitAnchors.values()) gens.add(a.gen);
    return [...gens].sort((a, b) => a - b).map((g) => ({
      gen: g,
      y: layout.genToY(g) - (LEVEL_H - NODE_H) / 2,
      label: genLabel(g),
    }));
  }, [layout]);
  const bandX = layout.bounds.minX - 2000;
  const bandW = layout.bounds.maxX - layout.bounds.minX + 4000;

  // ── 형제 드래그 정렬 ─────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const suppressClick = useRef(false);

  const clientToSvg = (cx: number, cy: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const vb = viewBoxRef.current;
    return {
      x: vb.x + ((cx - rect.left) / rect.width) * vb.w,
      y: vb.y + ((cy - rect.top) / rect.height) * vb.h,
    };
  };

  const onNodeDragStart = (personId: string, e: React.PointerEvent) => {
    // 형제 그룹(같은 부모 유닛의 혈연 자녀)이 2명 이상일 때만 정렬 드래그.
    // 아니면 이벤트를 흘려보내 배경 팬으로 처리
    const myLink = layout.childLinks.find((l) => l.childId === personId);
    if (!myLink) return;
    const siblings = layout.childLinks
      .filter((l) => l.parentUnitId === myLink.parentUnitId)
      .map((l) => l.childId);
    if (siblings.length < 2) return;
    e.stopPropagation();
    const withCenters = siblings
      .map((id) => ({ id, cx: layout.positions.get(id)!.x + NODE_W / 2 }))
      .sort((a, b) => a.cx - b.cx);
    const pos = layout.positions.get(personId)!;
    const pt = clientToSvg(e.clientX, e.clientY);
    setDrag({
      personId,
      pointerId: e.pointerId,
      groupIds: withCenters.map((s) => s.id),
      slotCenters: withCenters.map((s) => s.cx),
      rowY: pos.y,
      offsetX: pt.x - pos.x,
      offsetY: pt.y - pos.y,
      pointer: pt,
      startClient: { x: e.clientX, y: e.clientY },
      active: false,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dist = Math.hypot(e.clientX - d.startClient.x, e.clientY - d.startClient.y);
      const active = d.active || dist > DRAG_THRESHOLD_PX;
      setDrag({ ...d, pointer: clientToSvg(e.clientX, e.clientY), active });
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.active) {
        // 드래그 직후 발생하는 click으로 선택이 바뀌지 않도록 억제
        suppressClick.current = true;
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
        const others = d.groupIds
          .map((id, i) => ({ id, cx: d.slotCenters[i] }))
          .filter((s) => s.id !== d.personId);
        const insertIdx = others.filter((s) => s.cx < d.pointer.x).length;
        const newOrder = others.map((s) => s.id);
        newOrder.splice(insertIdx, 0, d.personId);
        if (newOrder.join() !== d.groupIds.join()) reorderSiblings(newOrder);
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  // 삽입 위치 표시선 x 좌표
  const indicatorX = (() => {
    if (!drag?.active) return null;
    const others = drag.groupIds
      .map((id, i) => ({ id, cx: drag.slotCenters[i] }))
      .filter((s) => s.id !== drag.personId);
    const idx = others.filter((s) => s.cx < drag.pointer.x).length;
    if (others.length === 0) return null;
    if (idx === 0) return others[0].cx - NODE_W / 2 - H_GAP / 2;
    if (idx === others.length) return others[others.length - 1].cx + NODE_W / 2 + H_GAP / 2;
    return (others[idx - 1].cx + others[idx].cx) / 2;
  })();

  // ── 연결선 좌표 ──────────────────────────────────────
  const couplePaths = layout.couples.map(({ a, b }) => {
    const pa = layout.positions.get(a)!;
    const pb = layout.positions.get(b)!;
    const y = pa.y + NODE_H / 2;
    return { key: `${a}-${b}`, x1: pa.x + NODE_W, x2: pb.x, y, onPath: linkOnPath([a], b) };
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
      onPath: linkOnPath(unitMembers(parentUnitId), childId),
    };
  });

  const inLawPaths = layout.inLawLinks.map(({ memberId, parentUnitId }) => {
    const member = layout.positions.get(memberId)!;
    const anchor = layout.unitAnchors.get(parentUnitId)!;
    const parentBottom = layout.genToY(anchor.gen) + NODE_H;
    const mx = member.x + NODE_W / 2;
    const busY = member.y - BUS_OFFSET + 6;
    return {
      key: `i-${memberId}`,
      d: `M ${mx} ${member.y} V ${busY} H ${anchor.x} V ${parentBottom}`,
      onPath: linkOnPath(unitMembers(parentUnitId), memberId),
    };
  });

  const guardedSelect = (id: string) => {
    if (!wasDragged() && !suppressClick.current) selectPerson(id);
  };
  const guardedOpenDialog = (id: string) => {
    if (!wasDragged() && !suppressClick.current) openDialog(id);
  };

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        className={`tree-canvas ${pathInfo ? 'path-mode' : ''}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (!wasDragged() && !suppressClick.current) clearSelection();
        }}
      >
        <defs>
          <linearGradient id="grad-male" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f2f7fe" />
            <stop offset="1" stopColor="#d9e9fb" />
          </linearGradient>
          <linearGradient id="grad-female" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fef4f7" />
            <stop offset="1" stopColor="#fbdde7" />
          </linearGradient>
        </defs>
        <g className="gen-bands">
          {genBands.map((b, i) => (
            <g key={b.gen}>
              {i % 2 === 0 && (
                <rect x={bandX} y={b.y} width={bandW} height={LEVEL_H} className="gen-band" />
              )}
              <text
                className="gen-band-label"
                x={layout.bounds.minX - 24}
                y={b.y + LEVEL_H / 2 + 4}
                textAnchor="end"
              >
                {b.label}
              </text>
            </g>
          ))}
        </g>
        <g className="edges">
          {couplePaths.map((c) => (
            <g key={c.key} className={`couple-line ${c.onPath ? 'on-path' : ''}`}>
              <line x1={c.x1} y1={c.y - 2} x2={c.x2} y2={c.y - 2} />
              <line x1={c.x1} y1={c.y + 2} x2={c.x2} y2={c.y + 2} />
            </g>
          ))}
          {childPaths.map((p) => (
            <path key={p.key} className={`child-line ${p.onPath ? 'on-path' : ''}`} d={p.d} />
          ))}
          {inLawPaths.map((p) => (
            <path key={p.key} className={`inlaw-line ${p.onPath ? 'on-path' : ''}`} d={p.d} />
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
              dimmed={drag?.active === true && pos.id === drag.personId}
              onPath={pathInfo?.ids.has(pos.id) === true}
              flash={pos.id === flashId}
              subLabel={termMap?.get(pos.id)}
              onSelect={guardedSelect}
              onOpenDialog={guardedOpenDialog}
              onDragStart={onNodeDragStart}
            />
          ))}
        </g>
        {drag?.active && indicatorX !== null && (
          <line
            className="insert-indicator"
            x1={indicatorX}
            y1={drag.rowY - 8}
            x2={indicatorX}
            y2={drag.rowY + NODE_H + 8}
          />
        )}
        {drag?.active && (
          <PersonNode
            person={data.persons[drag.personId]}
            x={drag.pointer.x - drag.offsetX}
            y={drag.pointer.y - drag.offsetY}
            isEgo={drag.personId === data.egoId}
            selection={null}
            ghost
          />
        )}
      </svg>
      <div className="canvas-controls">
        <button title="전체 보기" onClick={fitAll}>⛶</button>
        <button
          title="나에게 이동"
          onClick={() => {
            const pos = layout.positions.get(data.egoId);
            if (pos) centerOn(pos.x + NODE_W / 2, pos.y + NODE_H / 2);
          }}
        >
          나
        </button>
      </div>
    </div>
  );
}
