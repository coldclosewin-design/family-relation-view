import { useCallback, useRef, useState } from 'react';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_W = 200;
const MAX_W = 30000;

/**
 * SVG viewBox 기반 팬/줌. Pointer Events로 마우스 드래그·터치 팬·핀치 줌 통합.
 * 노드 클릭은 각 노드에서 stopPropagation으로 구분한다.
 */
export function usePanZoom(initial: ViewBox) {
  const [viewBox, setViewBox] = useState<ViewBox>(initial);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; viewBox: ViewBox } | null>(null);
  const moved = useRef(false);

  const clientToRatio = (el: SVGSVGElement, cx: number, cy: number) => {
    const rect = el.getBoundingClientRect();
    return { rx: (cx - rect.left) / rect.width, ry: (cy - rect.top) / rect.height };
  };

  const zoomAt = useCallback((el: SVGSVGElement, cx: number, cy: number, factor: number) => {
    setViewBox((vb) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, vb.w * factor));
      const scale = w / vb.w;
      const h = vb.h * scale;
      const { rx, ry } = clientToRatio(el, cx, cy);
      return {
        x: vb.x + vb.w * rx - w * rx,
        y: vb.y + vb.h * ry - h * ry,
        w,
        h,
      };
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      // delta 크기에 비례한 줌 (한 노치 ≈ deltaY 100 → 약 1.13배)
      const factor = Math.pow(1.0012, e.deltaY);
      zoomAt(e.currentTarget, e.clientX, e.clientY, factor);
    },
    [zoomAt],
  );

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // setPointerCapture는 노드의 click 이벤트까지 svg로 가로채므로 쓰지 않는다
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setViewBox((vb) => {
        pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), viewBox: vb };
        return vb;
      });
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0) {
        const start = pinchStart.current;
        const el = e.currentTarget;
        const factor = start.dist / dist;
        const w = Math.min(MAX_W, Math.max(MIN_W, start.viewBox.w * factor));
        const h = start.viewBox.h * (w / start.viewBox.w);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const rect = el.getBoundingClientRect();
        const rx = (midX - rect.left) / rect.width;
        const ry = (midY - rect.top) / rect.height;
        setViewBox({
          x: start.viewBox.x + start.viewBox.w * rx - w * rx,
          y: start.viewBox.y + start.viewBox.h * ry - h * ry,
          w,
          h,
        });
      }
      return;
    }

    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setViewBox((vb) => ({
      ...vb,
      x: vb.x - dx * (vb.w / rect.width),
      y: vb.y - dy * (vb.h / rect.height),
    }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }, []);

  /** 콘텐츠 영역이 화면에 들어오도록 viewBox 맞춤 */
  const fit = useCallback(
    (bounds: { minX: number; minY: number; maxX: number; maxY: number }, aspect: number) => {
      const pad = 60;
      let w = bounds.maxX - bounds.minX + pad * 2;
      let h = bounds.maxY - bounds.minY + pad * 2;
      let x = bounds.minX - pad;
      let y = bounds.minY - pad;
      if (w / h < aspect) {
        const nw = h * aspect;
        x -= (nw - w) / 2;
        w = nw;
      } else {
        const nh = w / aspect;
        y -= (nh - h) / 2;
        h = nh;
      }
      setViewBox({ x, y, w: Math.max(w, MIN_W), h: Math.max(h, MIN_W / aspect) });
    },
    [],
  );

  /** 드래그 직후 click 이벤트에서 배경 클릭(선택 해제)과 팬을 구분 */
  const wasDragged = useCallback(() => moved.current, []);

  return { viewBox, onWheel, onPointerDown, onPointerMove, onPointerUp, fit, wasDragged };
}
