import type { WidgetType } from '../../types/Widget';

const WIDGET_SELECTOR = '[data-widget-type]';

export interface SerializeWidgetsParams {
  /** The live DOM tree that contains fully rendered widgets. */
  sourceRoot: ParentNode;
  /** The cloned DOM tree that will be mutated to contain static fallbacks. */
  targetRoot: ParentNode;
  /**
   * Document instance used to create new DOM nodes while mutating the cloned tree.
   * Defaults to the target root's owner document and falls back to the global document.
   */
  document?: Document;
}

interface WidgetSerializationContext {
  readonly source: HTMLElement;
  readonly target: HTMLElement;
  readonly document: Document;
}

type WidgetSerializer = (ctx: WidgetSerializationContext) => Promise<void> | void;

const guardDocument = (doc: Document | undefined): Document => {
  if (doc) {
    return doc;
  }

  if (typeof window !== 'undefined' && window.document) {
    return window.document;
  }

  throw new Error('A document instance is required to serialise widgets.');
};

export const safeToDataUrl = (canvas: HTMLCanvasElement): string | null => {
  try {
    const result = canvas.toDataURL('image/png');
    return typeof result === 'string' && result.length > 0 ? result : null;
  } catch (error) {
    console.warn('[serializeWidgets] Failed to capture canvas snapshot.', error);
    return null;
  }
};

const applyImageSizing = (image: HTMLImageElement, canvas: HTMLCanvasElement) => {
  const width = canvas.clientWidth || Number(canvas.getAttribute('width')) || 0;
  const height = canvas.clientHeight || Number(canvas.getAttribute('height')) || 0;

  if (width > 0) {
    image.style.width = `${width}px`;
  } else if (canvas.style.width) {
    image.style.width = canvas.style.width;
  } else {
    image.style.width = '100%';
  }

  if (height > 0) {
    image.style.height = `${height}px`;
  } else if (canvas.style.height) {
    image.style.height = canvas.style.height;
  }

  image.style.display = 'block';
  image.style.objectFit = 'contain';
  image.style.maxWidth = '100%';
};

const graphWidgetSerializer: WidgetSerializer = ({ source, target, document }) => {
  const sourceCanvas = source.querySelector('canvas');
  if (!sourceCanvas) {
    return;
  }

  const dataUrl = safeToDataUrl(sourceCanvas);
  if (!dataUrl) {
    return;
  }

  const canvasHost = target.querySelector('.graph-widget__canvas') ?? target;

  const snapshotImage = document.createElement('img');
  snapshotImage.src = dataUrl;
  snapshotImage.alt = target.getAttribute('data-widget-title') ?? '그래프 미리보기';
  snapshotImage.setAttribute('data-widget-static', 'graph');
  snapshotImage.decoding = 'async';
  snapshotImage.loading = 'lazy';
  applyImageSizing(snapshotImage, sourceCanvas);

  canvasHost.replaceChildren(snapshotImage);
};

const registry = new Map<WidgetType, WidgetSerializer>([
  ['graph', graphWidgetSerializer],
]);

const collectWidgets = (root: ParentNode): Map<string, HTMLElement> => {
  const map = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>(WIDGET_SELECTOR).forEach((element) => {
    const id = element.getAttribute('data-widget-id');
    if (!id) {
      return;
    }
    map.set(id, element);
  });
  return map;
};

const resolveDocument = (node: ParentNode | null | undefined): Document | undefined => {
  if (!node) {
    return undefined;
  }

  if (node instanceof Document) {
    return node;
  }

  const rootNode = node as Node;
  if ('ownerDocument' in rootNode && rootNode.ownerDocument) {
    return rootNode.ownerDocument;
  }

  return undefined;
};

export const serializeWidgets = async ({
  sourceRoot,
  targetRoot,
  document,
}: SerializeWidgetsParams): Promise<void> => {
  const doc = guardDocument(
    document ?? resolveDocument(targetRoot) ?? resolveDocument(sourceRoot) ?? undefined,
  );

  const sourceWidgets = collectWidgets(sourceRoot);
  if (sourceWidgets.size === 0) {
    return;
  }

  const targetWidgets = collectWidgets(targetRoot);
  if (targetWidgets.size === 0) {
    return;
  }

  const tasks: Promise<void>[] = [];

  sourceWidgets.forEach((sourceWidget, widgetId) => {
    const targetWidget = targetWidgets.get(widgetId);
    if (!targetWidget) {
      return;
    }

    const widgetType = sourceWidget.getAttribute('data-widget-type') as WidgetType | null;
    if (!widgetType) {
      return;
    }

    const serializer = registry.get(widgetType);
    if (!serializer) {
      return;
    }

    const maybePromise = serializer({
      source: sourceWidget,
      target: targetWidget,
      document: doc,
    });

    if (maybePromise && typeof maybePromise.then === 'function') {
      tasks.push(maybePromise);
    }
  });

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
};

export const registerWidgetSerializer = (type: WidgetType, serializer: WidgetSerializer) => {
  registry.set(type, serializer);
};

export const unregisterWidgetSerializer = (type: WidgetType) => {
  registry.delete(type);
};

