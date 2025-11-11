import createSortable from '../utils/dom/dragDrop';

interface TinyMceEventEmitter {
  on?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  off?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  fire?: (eventName: string, data?: Record<string, unknown>) => void;
  setDirty?: (state: boolean) => void;
  nodeChanged?: () => void;
  getBody?: () => HTMLElement | null;
}

export interface WidgetDragDropOptions {
  widgetSelector?: string;
  draggingClassName?: string;
  orderAttribute?: string;
}

const DEFAULT_WIDGET_SELECTOR = '[data-widget-type]';
const DEFAULT_DRAGGING_CLASS = 'widget-block--dragging';
const DEFAULT_ORDER_ATTRIBUTE = 'data-widget-order';

type Cleanup = () => void;

const updateOrderAttribute = (widgets: HTMLElement[], orderAttribute: string) => {
  widgets.forEach((element, index) => {
    const value = String(index);
    const previous = element.getAttribute(orderAttribute);
    if (previous !== value) element.setAttribute(orderAttribute, value);

    if (element.dataset.widgetOrder !== value) element.dataset.widgetOrder = value;

    if (previous !== value) {
      element.dispatchEvent(
        new CustomEvent('widget:order-change', {
          bubbles: true,
          detail: { order: index, element },
        }),
      );
    }
  });
};

export const attachWidgetDragDrop = (
  editor: TinyMceEventEmitter,
  options: WidgetDragDropOptions = {},
): Cleanup => {
  const {
    widgetSelector = DEFAULT_WIDGET_SELECTOR,
    draggingClassName = DEFAULT_DRAGGING_CLASS,
    orderAttribute = DEFAULT_ORDER_ATTRIBUTE,
  } = options;

  let sortableController: { destroy: () => void } | null = null;
  let currentContainer: HTMLElement | null = null;

  const ensureSortable = () => {
    const body = editor.getBody?.();
    if (!body) return;

    if (currentContainer !== body) {
      sortableController?.destroy();
      sortableController = null;
      currentContainer = null;
    }
    if (!sortableController) {
      sortableController = createSortable({
        container: body,
        itemSelector: widgetSelector,
        draggingClassName,
        onReorder: (widgets: HTMLElement[]) => {
          updateOrderAttribute(widgets, orderAttribute);
          editor.fire?.('change');
          editor.setDirty?.(true);
          editor.nodeChanged?.();
        },
      });
      currentContainer = body;
    }

    const widgets = Array.from(body.querySelectorAll<HTMLElement>(widgetSelector));
    updateOrderAttribute(widgets, orderAttribute);
  };

  const disableSortableTemporarily = () => {
    sortableController?.destroy();
    sortableController = null;
  };

  const handleContentUpdate = () => ensureSortable();

  editor.on?.('init', ensureSortable);
  editor.on?.('SetContent', handleContentUpdate);
  editor.on?.('NodeChange', handleContentUpdate);

  // 리사이즈 동안 sortable 비활성 → 종료 후 재활성
  const body = editor.getBody?.();
  const onResizingStart = () => disableSortableTemporarily();
  const onResizingEnd = () => ensureSortable();

  body?.addEventListener('widget:resizing-start', onResizingStart, true);
  body?.addEventListener('widget:resizing-end', onResizingEnd, true);

  const cleanup = () => {
    sortableController?.destroy();
    sortableController = null;
    currentContainer = null;

    if (editor.off) {
      editor.off('init', ensureSortable);
      editor.off('SetContent', handleContentUpdate);
      editor.off('NodeChange', handleContentUpdate);
    }

    body?.removeEventListener('widget:resizing-start', onResizingStart, true);
    body?.removeEventListener('widget:resizing-end', onResizingEnd, true);
  };

  editor.on?.('remove', cleanup);

  return cleanup;
};

export default attachWidgetDragDrop;
