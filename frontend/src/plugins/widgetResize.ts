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
  resizingClassName?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** 우하단 코너 히트 영역 크기(px) */
  cornerHitSize?: number;
}

const DEFAULT_WIDGET_SELECTOR = '[data-widget-type]';
const DEFAULT_RESIZING_CLASSNAME = 'widget-block--resizing';
const DEFAULT_MIN_WIDTH = 240;
const DEFAULT_MIN_HEIGHT = 160;
const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 900;
const DEFAULT_CORNER_HIT = 18;

type Cleanup = () => void;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Number.isFinite(max) ? max : Number.POSITIVE_INFINITY);

const toPx = (v: number) => `${Math.round(v)}px`;

const extractDimension = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d+(?:\.\d+)?)px$/i);
    if (m) return Number.parseFloat(m[1]);
  }
  return null;
};

const applyInlineSize = (el: HTMLElement, w: number, h: number) => {
  el.style.width = toPx(w);
  el.style.height = toPx(h);
};

const syncSizeFromConfig = (widget: HTMLElement) => {
  const config = parseWidgetConfig(widget.getAttribute('data-widget-config'));
  if (!config) {
    widget.style.width = '';
    widget.style.height = '';
    return;
  }
  const styleConfig = (config as { style?: unknown }).style;
  if (!isPlainObject(styleConfig)) {
    widget.style.width = '';
    widget.style.height = '';
    return;
  }
  const w = extractDimension(styleConfig.width);
  const h = extractDimension(styleConfig.height);
  widget.style.width = typeof w === 'number' ? toPx(w) : '';
  widget.style.height = typeof h === 'number' ? toPx(h) : '';
};

const commitSizeToConfig = (
  widget: HTMLElement,
  editor: TinyMceEditor,
  width: number,
  height: number,
) => {
  const config = parseWidgetConfig(widget.getAttribute('data-widget-config')) ?? {};
  const nextConfig: Record<string, unknown> = { ...config };
  const styleConfig = isPlainObject((nextConfig as { style?: unknown }).style)
    ? { ...((nextConfig as { style?: Record<string, unknown> }).style ?? {}) }
    : {};

  styleConfig.width = Math.round(width);
  styleConfig.height = Math.round(height);
  nextConfig.style = styleConfig;

  const serialised = serialiseWidgetConfig(nextConfig);
  if (serialised) widget.setAttribute('data-widget-config', serialised);

  applyInlineSize(widget, width, height);
  widget.dispatchEvent(new CustomEvent('widget:changed', { bubbles: true }));
  editor.fire?.('change');
  editor.setDirty?.(true);
  editor.nodeChanged?.();
};

const isInResizeCorner = (
  widget: HTMLElement,
  clientX: number,
  clientY: number,
  cornerSize: number,
): boolean => {
  const r = widget.getBoundingClientRect();
  return clientX >= r.right - cornerSize && clientY >= r.bottom - cornerSize;
};

export const attachWidgetResize = (
  editor: TinyMceEditor,
  options: WidgetResizeOptions = {},
): Cleanup => {
  const {
    widgetSelector = DEFAULT_WIDGET_SELECTOR,
    resizingClassName = DEFAULT_RESIZING_CLASSNAME,
    minWidth = DEFAULT_MIN_WIDTH,
    minHeight = DEFAULT_MIN_HEIGHT,
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    cornerHitSize = DEFAULT_CORNER_HIT,
  } = options;

  // 리스너 관리 (정리 위해 Map 사용)
  const startListeners = new Map<HTMLElement, (e: PointerEvent) => void>();

  const ensureForWidget = (widget: HTMLElement) => {
    widget.classList.add('widget-block');

    if (!startListeners.has(widget)) {
      const onPointerDown = (ev: PointerEvent): void => {
        if (!isInResizeCorner(widget, ev.clientX, ev.clientY, cornerHitSize)) return;

        ev.preventDefault();
        ev.stopPropagation();

        const doc: Document = widget.ownerDocument || document;
        widget.dispatchEvent(new CustomEvent('widget:resizing-start', { bubbles: true }));

        const rect: DOMRect = widget.getBoundingClientRect();
        const startX = ev.clientX;
        const startY = ev.clientY;
        const origW = rect.width;
        const origH = rect.height;

        let w = origW;
        let h = origH;

        const prevDraggable = widget.getAttribute('draggable');
        widget.setAttribute('draggable', 'false');
        widget.classList.add(resizingClassName);

        const onMove = (mv: PointerEvent): void => {
          mv.preventDefault();
          const dx = mv.clientX - startX;
          const dy = mv.clientY - startY;
          w = clamp(origW + dx, minWidth, maxWidth);
          h = clamp(origH + dy, minHeight, maxHeight);
          applyInlineSize(widget, w, h);
        };

        const onUp = (up: PointerEvent): void => {
          onMove(up);

          doc.removeEventListener('pointermove', onMove);
          doc.removeEventListener('pointerup', onUp);

          widget.classList.remove(resizingClassName);
          if (prevDraggable === null) widget.removeAttribute('draggable');
          else widget.setAttribute('draggable', prevDraggable);

          const changed = Math.abs(w - origW) > 0.5 || Math.abs(h - origH) > 0.5;
          if (changed) commitSizeToConfig(widget, editor, w, h);

          widget.dispatchEvent(new CustomEvent('widget:resizing-end', { bubbles: true }));
        };

        doc.addEventListener('pointermove', onMove);
        doc.addEventListener('pointerup', onUp);
      };

      // 캡처 단계에서 먼저 받아 TinyMCE 기본 동작보다 우선
      widget.addEventListener('pointerdown', onPointerDown, true);
      startListeners.set(widget, onPointerDown);
    }

    // 초기 사이즈 반영
    syncSizeFromConfig(widget);
  };

  const ensureAll = (): void => {
    const body = editor.getBody?.();
    if (!body) return;

    const widgets = Array.from(body.querySelectorAll<HTMLElement>(widgetSelector));
    const current = new Set<HTMLElement>(widgets);

    widgets.forEach((w: HTMLElement) => ensureForWidget(w));

    // 제거된 위젯 리스너 정리
    startListeners.forEach((listener: (e: PointerEvent) => void, el: HTMLElement) => {
      if (!current.has(el)) {
        el.removeEventListener('pointerdown', listener, true);
        startListeners.delete(el);
      }
    });
  };

  editor.on?.('init', ensureAll);
  editor.on?.('LoadContent', ensureAll);
  editor.on?.('SetContent', ensureAll);
  editor.on?.('NodeChange', ensureAll);
  editor.on?.('Change', ensureAll);
  editor.on?.('input', ensureAll);

  const cleanup: Cleanup = () => {
    startListeners.forEach((listener: (e: PointerEvent) => void, el: HTMLElement) => {
      el.removeEventListener('pointerdown', listener, true);
    });
    startListeners.clear();
  };

  editor.on?.('remove', cleanup);
  return cleanup;
};

export default attachWidgetResize;
