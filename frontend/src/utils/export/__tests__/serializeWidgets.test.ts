import { describe, expect, it, vi } from 'vitest';
import { safeToDataUrl, serializeWidgets } from '../serializeWidgets';

describe('serializeWidgets', () => {
  const createGraphWidget = (doc: Document, id: string) => {
    const widget = doc.createElement('div');
    widget.setAttribute('data-widget-type', 'graph');
    widget.setAttribute('data-widget-id', id);
    widget.setAttribute('data-widget-title', 'Test Graph');

    const wrapper = doc.createElement('div');
    wrapper.className = 'graph-widget__canvas';

    const canvas = doc.createElement('canvas');
    Object.defineProperty(canvas, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/png;base64,test-image'),
    });
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 240 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 160 });

    wrapper.appendChild(canvas);
    widget.appendChild(wrapper);

    return { widget, canvas };
  };

  it('replaces the canvas of graph widgets with a static image snapshot', async () => {
    const liveDoc = document.implementation.createHTMLDocument('Live');
    const exportDoc = document.implementation.createHTMLDocument('Export');

    const { widget: sourceWidget } = createGraphWidget(liveDoc, 'widget-1');
    const { widget: clonedWidget } = createGraphWidget(exportDoc, 'widget-1');

    liveDoc.body.appendChild(sourceWidget);
    exportDoc.body.appendChild(clonedWidget);

    await serializeWidgets({
      sourceRoot: liveDoc.body,
      targetRoot: exportDoc.body,
      document: exportDoc,
    });

    const image = exportDoc.body.querySelector('img[data-widget-static="graph"]');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe('data:image/png;base64,test-image');
    expect(image?.getAttribute('alt')).toBe('Test Graph');
    expect(image?.style.width).toBe('240px');
    expect(image?.style.height).toBe('160px');
    expect(image?.style.maxWidth).toBe('100%');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
  });

  it('skips widgets when a serializer is not registered', async () => {
    const docA = document.implementation.createHTMLDocument('Live');
    const docB = document.implementation.createHTMLDocument('Export');

    const widgetA = docA.createElement('div');
    widgetA.setAttribute('data-widget-id', 'widget-2');
    widgetA.setAttribute('data-widget-type', 'text');

    const widgetB = docB.createElement('div');
    widgetB.setAttribute('data-widget-id', 'widget-2');
    widgetB.setAttribute('data-widget-type', 'text');

    docA.body.appendChild(widgetA);
    docB.body.appendChild(widgetB);

    await serializeWidgets({
      sourceRoot: docA.body,
      targetRoot: docB.body,
      document: docB,
    });

    expect(docB.body.querySelector('div[data-widget-type="text"]')).toBe(widgetB);
  });
});

describe('safeToDataUrl', () => {
  it('returns null when toDataURL throws and logs a warning', () => {
    const canvas = document.createElement('canvas');
    const error = new Error('conversion failed');
    Object.defineProperty(canvas, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => {
        throw error;
      }),
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(safeToDataUrl(canvas)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      '[serializeWidgets] Failed to capture canvas snapshot.',
      error,
    );

    warnSpy.mockRestore();
  });
});

