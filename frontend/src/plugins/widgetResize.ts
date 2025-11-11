// plugins/widgetResize.ts
import { parseWidgetConfig, serialiseWidgetConfig } from '../utils/widgetRenderer';

interface TinyMceEditor {
  getBody?: () => HTMLElement | null;
  on?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  off?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  fire?: (eventName: string, data?: Record<string, unknown>) => void;
  setDirty?: (state: boolean) => void;
  nodeChanged?: () => void;
}

export interface WidgetResizeOptions {
  widgetSelector?: string;
  handleClassName?: string;
  resizingClassName?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_WIDGET_SELECTOR = '[data-widget-type]';
const DEFAULT_HANDLE_CLASSNAME = 'widget-resize-handle';
const DEFAULT_RESIZING_CLASSNAME = 'widget-block--resizing';
const DEFAULT_MIN_WIDTH = 240;
const DEFAULT_MIN_HEIGHT = 160;
const DEFAULT_MAX_WIDTH = 4000;
const DEFAULT_MAX_HEIGHT = 4000;

type Cleanup = () => void;
type Dir = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

const toPx = (n: number) => `${Math.round(n)}px`;
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const parsePx = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
    if (m) return Number.parseFloat(m[1]);
  }
  return null;
};

const cfgGet = (el: HTMLElement) => parseWidgetConfig(el.getAttribute('data-widget-config')) ?? {};
const cfgSet = (el: HTMLElement, next: Record<string, unknown>) => {
  const s = serialiseWidgetConfig(next);
  if (s) el.setAttribute('data-widget-config', s);
};

const getInlineSize = (el: HTMLElement) => {
  const c = cfgGet(el);
  const st = (c as Record<string, unknown>).style as Record<string, unknown> | undefined;
  const w = parsePx(st?.width);
  const h = parsePx(st?.height);
  const rect = el.getBoundingClientRect();
  return {
    width: typeof w === 'number' ? w : Math.round(rect.width),
    height: typeof h === 'number' ? h : Math.round(rect.height),
  };
};

const getInlinePos = (el: HTMLElement) => {
  const c = cfgGet(el);
  const st = (c as Record<string, unknown>).style as Record<string, unknown> | undefined;
  const left = parsePx(st?.left) ?? parsePx(el.style.left) ?? null;
  const top = parsePx(st?.top) ?? parsePx(el.style.top) ?? null;
  return { left, top };
};

const applyInlineSize = (el: HTMLElement, width: number, height: number) => {
  el.style.width = toPx(width);
  el.style.height = toPx(height);
};

const applyInlinePos = (el: HTMLElement, left: number, top: number) => {
  el.style.left = toPx(left);
  el.style.top = toPx(top);
};

const commitSizeAndPos = (
  el: HTMLElement,
  editor: TinyMceEditor,
  width: number,
  height: number,
  pos?: { left: number; top: number },
) => {
  const c = cfgGet(el);
  const st = isPlainObject((c as Record<string, unknown>).style)
    ? { ...((c as Record<string, unknown>).style as Record<string, unknown>) }
    : {};
  (st as Record<string, unknown>).width = Math.round(width);
  (st as Record<string, unknown>).height = Math.round(height);
  if (pos) {
    (st as Record<string, unknown>).left = Math.round(pos.left);
    (st as Record<string, unknown>).top = Math.round(pos.top);
  }
  (c as Record<string, unknown>).style = st;
  cfgSet(el, c);

  el.dispatchEvent(new CustomEvent('widget:changed', { bubbles: true }));
  editor.fire?.('change');
  editor.setDirty?.(true);
  editor.nodeChanged?.();
};

const DIRS: Dir[] = ['e', 's', 'se', 'w', 'n', 'ne', 'sw', 'nw'];

// 오버레이 레이어 하나 생성(iframe 문서의 body 위)
const makeOverlayRoot = (doc: Document) => {
  const root = doc.createElement('div');
  Object.assign(root.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none', // 기본 막고, 핸들만 이벤트 허용
    zIndex: '2147483647', // 최상단
  } as CSSStyleDeclaration);
  doc.body.appendChild(root);
  return root;
};

export default function attachWidgetResize(
  editor: TinyMceEditor,
  options: WidgetResizeOptions = {},
): Cleanup {
  const {
    widgetSelector = DEFAULT_WIDGET_SELECTOR,
    handleClassName = DEFAULT_HANDLE_CLASSNAME,
    resizingClassName = DEFAULT_RESIZING_CLASSNAME,
    minWidth = DEFAULT_MIN_WIDTH,
    minHeight = DEFAULT_MIN_HEIGHT,
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
  } = options;

  const body = editor.getBody?.();
  if (!body) return () => {};

  const doc = body.ownerDocument || document;
  const overlayRoot = makeOverlayRoot(doc);

  type HandleEls = Partial<Record<Dir, HTMLSpanElement>>;
  const records = new Map<HTMLElement, HandleEls>();

  const placeHandles = (widget: HTMLElement) => {
    const rect = widget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const setPos = (el: HTMLElement, left: number, top: number) => {
      el.style.left = toPx(left);
      el.style.top = toPx(top);
    };

    const hs = records.get(widget)!;

    // 각 방향 좌표 계산 (overlay는 fixed라서 viewport 기준)
    hs.e && setPos(hs.e, rect.right, cy);
    hs.s && setPos(hs.s, cx, rect.bottom);
    hs.se && setPos(hs.se, rect.right, rect.bottom);
    hs.w && setPos(hs.w, rect.left, cy);
    hs.n && setPos(hs.n, cx, rect.top);
    hs.ne && setPos(hs.ne, rect.right, rect.top);
    hs.sw && setPos(hs.sw, rect.left, rect.bottom);
    hs.nw && setPos(hs.nw, rect.left, rect.top);
  };

  const beginResize = (widget: HTMLElement, dir: Dir, ev: PointerEvent | MouseEvent) => {
    const free = widget.getAttribute('data-position') === 'free';
    if (!free && (dir === 'w' || dir === 'n' || dir === 'nw' || dir === 'ne' || dir === 'sw')) {
      return; // flow 모드 제한
    }

    ev.preventDefault?.();
    ev.stopPropagation?.();

    const prevUserSelect = (doc.body as HTMLElement).style.userSelect;
    (doc.body as HTMLElement).style.userSelect = 'none';

    const start = { x: (ev as PointerEvent).clientX, y: (ev as PointerEvent).clientY };
    const startSize = getInlineSize(widget);
    const startPosRaw = getInlinePos(widget);
    const startPos = {
      left: startPosRaw.left ?? widget.offsetLeft,
      top: startPosRaw.top ?? widget.offsetTop,
    };
    const aspect = startSize.width / Math.max(1, startSize.height);

    widget.classList.add(resizingClassName);

    const onMove = (mv: PointerEvent | MouseEvent) => {
      mv.preventDefault?.();
      const mx = (mv as PointerEvent).clientX;
      const my = (mv as PointerEvent).clientY;
      let dx = mx - start.x;
      let dy = my - start.y;

      const keepRatio = (mv as PointerEvent).shiftKey;

      let newW = startSize.width;
      let newH = startSize.height;
      let newLeft = startPos.left;
      let newTop = startPos.top;

      if (dir.includes('e')) newW = startSize.width + dx;
      if (dir.includes('s')) newH = startSize.height + dy;
      if (free) {
        if (dir.includes('w')) {
          newW = startSize.width - dx;
          newLeft = startPos.left + dx;
        }
        if (dir.includes('n')) {
          newH = startSize.height - dy;
          newTop = startPos.top + dy;
        }
      }

      if (keepRatio) {
        if (dir === 'e' || dir === 'w') newH = newW / aspect;
        else if (dir === 's' || dir === 'n') newW = newH * aspect;
        else {
          if (Math.abs(newW - startSize.width) > Math.abs(newH - startSize.height))
            newH = newW / aspect;
          else newW = newH * aspect;
        }
        if (free && dir.includes('w')) newLeft = startPos.left + (startSize.width - newW);
        if (free && dir.includes('n')) newTop = startPos.top + (startSize.height - newH);
      }

      newW = Math.min(Math.max(newW, minWidth), maxWidth);
      newH = Math.min(Math.max(newH, minHeight), maxHeight);

      if (free) {
        if (dir.includes('w')) newLeft = startPos.left + (startSize.width - newW);
        if (dir.includes('n')) newTop = startPos.top + (startSize.height - newH);
      }

      applyInlineSize(widget, newW, newH);
      if (free) applyInlinePos(widget, newLeft, newTop);

      // 위젯 박스가 변했으니 핸들 위치 갱신
      placeHandles(widget);
    };

    const onUp = (up: PointerEvent | MouseEvent) => {
      onMove(up);
      doc.removeEventListener('pointermove', onMove as EventListener, true);
      doc.removeEventListener('pointerup', onUp as EventListener, true);
      doc.removeEventListener('mousemove', onMove as EventListener, true);
      doc.removeEventListener('mouseup', onUp as EventListener, true);

      widget.classList.remove(resizingClassName);
      (doc.body as HTMLElement).style.userSelect = prevUserSelect || '';

      const r = widget.getBoundingClientRect();
      const pos =
        widget.getAttribute('data-position') === 'free'
          ? {
              left: parsePx(widget.style.left) ?? widget.offsetLeft,
              top: parsePx(widget.style.top) ?? widget.offsetTop,
            }
          : undefined;
      commitSizeAndPos(widget, editor, r.width, r.height, pos);
    };

    if (window.PointerEvent) {
      doc.addEventListener('pointermove', onMove as EventListener, {
        capture: true,
        passive: false,
      });
      doc.addEventListener('pointerup', onUp as EventListener, { capture: true, passive: false });
    } else {
      doc.addEventListener('mousemove', onMove as EventListener, true);
      doc.addEventListener('mouseup', onUp as EventListener, true);
    }
  };

  const ensureHandlesFor = (widget: HTMLElement) => {
    if (records.has(widget)) return;

    const free = widget.getAttribute('data-position') === 'free';
    const dirs = free ? DIRS : (['e', 's', 'se'] as Dir[]);
    const handleMap: HandleEls = {};

    dirs.forEach((dir) => {
      const el = doc.createElement('span');
      el.className = `${handleClassName} ${handleClassName}--${dir}`;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('data-mce-bogus', 'all'); // TinyMCE 직렬화 제외

      // overlay는 pointerEvents:none이므로 핸들만 이벤트 허용
      Object.assign(el.style, {
        position: 'fixed',
        width: '16px',
        height: '16px',
        border: '2px solid #0ea5e9',
        borderRadius: '4px',
        background: '#fff',
        zIndex: '2147483647',
        cursor:
          dir === 'e'
            ? 'ew-resize'
            : dir === 'w'
              ? 'ew-resize'
              : dir === 'n'
                ? 'ns-resize'
                : dir === 's'
                  ? 'ns-resize'
                  : dir === 'se'
                    ? 'nwse-resize'
                    : dir === 'nw'
                      ? 'nwse-resize'
                      : 'nesw-resize',
        pointerEvents: 'auto',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 0 2px rgba(14,165,233,.15)',
      } as CSSStyleDeclaration);

      const down = (e: PointerEvent | MouseEvent) => {
        if ('pointerId' in e && (e as PointerEvent).pointerId != null) {
          try {
            (e.target as Element)?.setPointerCapture?.((e as PointerEvent).pointerId);
          } catch {}
        }
        beginResize(widget, dir, e);
      };

      el.addEventListener('pointerdown', down, { capture: true, passive: false });
      el.addEventListener('mousedown', down, { capture: true, passive: false });

      overlayRoot.appendChild(el);
      (handleMap as any)[dir] = el;
    });

    records.set(widget, handleMap);
    placeHandles(widget);
  };

  const syncAll = () => {
    const widgets = Array.from(body.querySelectorAll<HTMLElement>(widgetSelector));
    const alive = new Set(widgets);

    widgets.forEach(ensureHandlesFor);
    // 위치 업데이트
    widgets.forEach(placeHandles);

    // 제거 정리
    records.forEach((hs, el) => {
      if (!alive.has(el)) {
        Object.values(hs).forEach((h) => h?.remove());
        records.delete(el);
      }
    });
  };

  // 스크롤/리사이즈/노드변경에 맞춰 위치 갱신
  const onScroll = () => records.forEach((_, w) => placeHandles(w));
  const onResize = () => records.forEach((_, w) => placeHandles(w));

  syncAll();
  editor.on?.('init', syncAll);
  editor.on?.('SetContent', syncAll);
  editor.on?.('NodeChange', syncAll);
  doc.addEventListener('scroll', onScroll, true);
  doc.defaultView?.addEventListener('resize', onResize);

  const cleanup = () => {
    doc.removeEventListener('scroll', onScroll, true);
    doc.defaultView?.removeEventListener('resize', onResize);
    records.forEach((hs) => Object.values(hs).forEach((h) => h?.remove()));
    records.clear();
    overlayRoot.remove();
    editor.off?.('init', syncAll);
    editor.off?.('SetContent', syncAll);
    editor.off?.('NodeChange', syncAll);
  };
  editor.on?.('remove', cleanup);
  return cleanup;
}
