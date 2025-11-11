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
  widgetSelector?: string; // 기본: [data-widget-type]
  handleClassName?: string; // 기본: widget-resize-handle
  resizingClassName?: string; // 기본: widget-block--resizing
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  cornerHitSize?: number; // 우하단 모서리 히트존(px)
}

const DEFAULT_WIDGET_SELECTOR = '[data-widget-type]';
const DEFAULT_HANDLE_CLASSNAME = 'widget-resize-handle';
const DEFAULT_RESIZING_CLASSNAME = 'widget-block--resizing';
const DEFAULT_MIN_WIDTH = 240;
const DEFAULT_MIN_HEIGHT = 160;
const DEFAULT_MAX_WIDTH = 4000;
const DEFAULT_MAX_HEIGHT = 4000;
const DEFAULT_HIT = 20;

type Cleanup = () => void;

const toPx = (n: number) => `${Math.round(n)}px`;
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const parsePx = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d+(?:\.\d+)?)px$/i);
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

const applyInlineSize = (el: HTMLElement, width: number, height: number) => {
  el.style.width = toPx(width);
  el.style.height = toPx(height);
};

const commitSize = (el: HTMLElement, editor: TinyMceEditor, width: number, height: number) => {
  const c = cfgGet(el);
  const st = isPlainObject((c as Record<string, unknown>).style)
    ? { ...((c as Record<string, unknown>).style as Record<string, unknown>) }
    : {};
  (st as Record<string, unknown>).width = Math.round(width);
  (st as Record<string, unknown>).height = Math.round(height);
  (c as Record<string, unknown>).style = st;
  cfgSet(el, c);

  el.dispatchEvent(new CustomEvent('widget:changed', { bubbles: true }));
  editor.fire?.('change');
  editor.setDirty?.(true);
  editor.nodeChanged?.();
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
    cornerHitSize = DEFAULT_HIT,
  } = options;

  const body = editor.getBody?.();
  if (!body) {
    // init 이전에 호출된 경우
    // eslint-disable-next-line no-console
    console.warn('[Resize] no body found');
    return () => {};
  }

  type Rec = {
    handle: HTMLElement;
    onHandleDown: (e: PointerEvent | MouseEvent) => void;
    onCornerDown: (e: PointerEvent | MouseEvent) => void;
  };
  const records = new Map<HTMLElement, Rec>();

  // 디버그: 현재 상태 요약
  const debugSummary = () => {
    const widgetCount = body.querySelectorAll(widgetSelector).length;
    const handleCount = body.querySelectorAll(`.${handleClassName}`).length;
    // eslint-disable-next-line no-console
    console.log(`[Resize] Found ${widgetCount} widgets, ${handleCount} handles`);
  };

  const startResize = (
    widget: HTMLElement,
    ev: PointerEvent | MouseEvent,
    from: 'handle' | 'corner',
  ) => {
    const r = widget.getBoundingClientRect();
    const clientX = 'clientX' in ev ? ev.clientX : r.right;
    const clientY = 'clientY' in ev ? ev.clientY : r.bottom;

    // 핸들이 아닌 경우: 우하단 모서리 히트 여부 체크
    if (from === 'corner') {
      const hit = clientX >= r.right - cornerHitSize && clientY >= r.bottom - cornerHitSize;
      if (!hit) return;
    }

    // eslint-disable-next-line no-console
    console.log(`[Resize] pointerdown (${from}) on`, widget);

    if ('preventDefault' in ev) ev.preventDefault();
    if ('stopPropagation' in ev) ev.stopPropagation();

    const start = { x: clientX, y: clientY };
    const startSize = getInlineSize(widget);
    widget.classList.add(resizingClassName);

    const doc = widget.ownerDocument || document;

    const onMove = (mv: PointerEvent | MouseEvent) => {
      if ('preventDefault' in mv) mv.preventDefault();
      const mx = 'clientX' in mv ? mv.clientX : start.x;
      const my = 'clientY' in mv ? mv.clientY : start.y;
      const dx = mx - start.x;
      const dy = my - start.y;

      const w = Math.min(Math.max(startSize.width + dx, minWidth), maxWidth);
      const h = Math.min(Math.max(startSize.height + dy, minHeight), maxHeight);

      applyInlineSize(widget, w, h);
      // eslint-disable-next-line no-console
      console.log('[Resize] moving:', { w, h });
    };

    const onUp = (up: PointerEvent | MouseEvent) => {
      onMove(up);
      doc.removeEventListener('pointermove', onMove as EventListener, true);
      doc.removeEventListener('pointerup', onUp as EventListener, true);
      doc.removeEventListener('mousemove', onMove as EventListener, true);
      doc.removeEventListener('mouseup', onUp as EventListener, true);

      widget.classList.remove(resizingClassName);
      const rect = widget.getBoundingClientRect();
      commitSize(widget, editor, rect.width, rect.height);
      // eslint-disable-next-line no-console
      console.log('[Resize] pointerup → final size:', { w: rect.width, h: rect.height });
    };

    if (window.PointerEvent) {
      doc.addEventListener(
        'pointermove',
        onMove as EventListener,
        { capture: true, passive: false } as AddEventListenerOptions,
      );
      doc.addEventListener(
        'pointerup',
        onUp as EventListener,
        { capture: true, passive: false } as AddEventListenerOptions,
      );
    } else {
      doc.addEventListener('mousemove', onMove as EventListener, true);
      doc.addEventListener('mouseup', onUp as EventListener, true);
    }
  };

  const ensureHandle = (widget: HTMLElement) => {
    if (records.has(widget)) return;

    // 핸들 DOM
    let handle = widget.querySelector<HTMLElement>(`.${handleClassName}`);
    if (!handle) {
      handle = widget.ownerDocument!.createElement('span');
      handle.className = handleClassName;
      widget.appendChild(handle);
      // eslint-disable-next-line no-console
      console.log('[Resize] handle created for', widget);
    } else {
      // eslint-disable-next-line no-console
      console.log('[Resize] handle found for', widget);
    }

    // 핸들 스타일(클릭 레이어 강화)
    Object.assign(handle.style, {
      position: 'absolute',
      right: '8px',
      bottom: '8px',
      width: '16px',
      height: '16px',
      border: '2px solid #0ea5e9',
      borderRadius: '4px',
      background: '#fff',
      cursor: 'se-resize',
      zIndex: '9999',
      pointerEvents: 'auto',
    } as CSSStyleDeclaration);

    // 터치 스크롤 차단
    (handle.style as unknown as { touchAction?: string }).touchAction = 'none';

    // 디버그 클릭
    handle.addEventListener('click', () => {
      // eslint-disable-next-line no-console
      console.log('[Resize] handle clicked', widget);
    });

    const onHandleDown = (ev: PointerEvent | MouseEvent) => startResize(widget, ev, 'handle');
    const onCornerDown = (ev: PointerEvent | MouseEvent) => startResize(widget, ev, 'corner');

    // 캡처 단계에서 잡아 내부 캔버스/차트가 가로채는 문제 방지
    handle.addEventListener('pointerdown', onHandleDown as EventListener, { capture: true });
    handle.addEventListener('mousedown', onHandleDown as EventListener, { capture: true });
    widget.addEventListener('pointerdown', onCornerDown as EventListener, { capture: true });
    widget.addEventListener('mousedown', onCornerDown as EventListener, { capture: true });

    records.set(widget, { handle, onHandleDown, onCornerDown });
  };

  const ensureAll = () => {
    const widgets = Array.from(body.querySelectorAll<HTMLElement>(widgetSelector));
    const current = new Set(widgets);
    widgets.forEach(ensureHandle);

    // 제거된 위젯 정리
    records.forEach((rec, el) => {
      if (!current.has(el)) {
        rec.handle.removeEventListener(
          'pointerdown',
          rec.onHandleDown as EventListener,
          { capture: true } as unknown as boolean,
        );
        rec.handle.removeEventListener(
          'mousedown',
          rec.onHandleDown as EventListener,
          { capture: true } as unknown as boolean,
        );
        el.removeEventListener(
          'pointerdown',
          rec.onCornerDown as EventListener,
          { capture: true } as unknown as boolean,
        );
        el.removeEventListener(
          'mousedown',
          rec.onCornerDown as EventListener,
          { capture: true } as unknown as boolean,
        );
        rec.handle.remove();
        records.delete(el);
      }
    });

    debugSummary();
  };

  // 초기 및 TinyMCE 훅
  ensureAll();
  editor.on?.('init', ensureAll);
  editor.on?.('SetContent', ensureAll);
  editor.on?.('NodeChange', ensureAll);

  const cleanup = () => {
    records.forEach((rec, el) => {
      rec.handle.removeEventListener(
        'pointerdown',
        rec.onHandleDown as EventListener,
        { capture: true } as unknown as boolean,
      );
      rec.handle.removeEventListener(
        'mousedown',
        rec.onHandleDown as EventListener,
        { capture: true } as unknown as boolean,
      );
      el.removeEventListener(
        'pointerdown',
        rec.onCornerDown as EventListener,
        { capture: true } as unknown as boolean,
      );
      el.removeEventListener(
        'mousedown',
        rec.onCornerDown as EventListener,
        { capture: true } as unknown as boolean,
      );
      rec.handle.remove();
    });
    records.clear();
    editor.off?.('init', ensureAll);
    editor.off?.('SetContent', ensureAll);
    editor.off?.('NodeChange', ensureAll);
    // eslint-disable-next-line no-console
    console.log('[Resize] cleanup');
  };

  editor.on?.('remove', cleanup);
  return cleanup;
}
