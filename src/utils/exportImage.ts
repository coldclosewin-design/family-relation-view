/** CSS 클래스로 입혀진 스타일을 인라인으로 복사할 속성들 */
const STYLE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'font-size',
  'font-family',
  'font-weight',
  'opacity',
  'filter',
];

const MAX_SIDE = 8000;

/**
 * 현재 관계도 SVG를 전체 트리 범위의 PNG로 저장한다.
 * 외부 스타일시트는 직렬화되지 않으므로 계산된 스타일을 인라인으로 복사하고,
 * +버튼·접기 배지 같은 UI 요소는 이미지에서 제외한다.
 */
export async function exportSvgToPng(
  svg: SVGSVGElement,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  filename: string,
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;

  const srcEls = [svg, ...svg.querySelectorAll('*')];
  const dstEls = [clone, ...clone.querySelectorAll('*')];
  srcEls.forEach((el, i) => {
    if (!(el instanceof Element)) return;
    const cs = getComputedStyle(el);
    let style = '';
    for (const prop of STYLE_PROPS) {
      const v = cs.getPropertyValue(prop);
      if (v) style += `${prop}:${v};`;
    }
    (dstEls[i] as Element).setAttribute('style', style);
  });

  clone
    .querySelectorAll('.add-btn, .inlaw-toggle, .desc-toggle, .insert-indicator, .drag-ghost')
    .forEach((el) => el.remove());

  const pad = 40;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = bounds.maxX - bounds.minX + pad * 2;
  const h = bounds.maxY - bounds.minY + pad * 2;
  let scale = 2;
  if (w * scale > MAX_SIDE || h * scale > MAX_SIDE) {
    scale = Math.max(1, Math.min(MAX_SIDE / w, MAX_SIDE / h));
  }

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(x));
  bg.setAttribute('y', String(y));
  bg.setAttribute('width', String(w));
  bg.setAttribute('height', String(h));
  bg.setAttribute('fill', '#f6f4ef');
  clone.insertBefore(bg, clone.firstChild);

  clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  clone.setAttribute('width', String(Math.round(w * scale)));
  clone.setAttribute('height', String(Math.round(h * scale)));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const svgStr = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG 렌더링 실패'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
