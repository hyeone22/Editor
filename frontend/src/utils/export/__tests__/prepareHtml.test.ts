import { describe, expect, it, vi } from 'vitest';
import { prepareHtml } from '../prepareHtml';

describe('prepareHtml', () => {
  const buildSource = () => {
    const liveDoc = document.implementation.createHTMLDocument('Source');
    const widget = liveDoc.createElement('div');
    widget.setAttribute('data-widget-type', 'graph');
    widget.setAttribute('data-widget-id', 'widget-graph-1');
    widget.setAttribute('data-widget-title', 'Quarterly Trend');

    const canvasWrapper = liveDoc.createElement('div');
    canvasWrapper.className = 'graph-widget__canvas';

    const canvas = liveDoc.createElement('canvas');
    Object.defineProperty(canvas, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/png;base64,prepared-html'),
    });

    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 400 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 200 });

    canvasWrapper.appendChild(canvas);
    widget.appendChild(canvasWrapper);

    liveDoc.body.appendChild(widget);

    return { liveDoc, widget };
  };

  it('returns a fully serialised HTML document with widget snapshots applied', async () => {
    const { widget } = buildSource();

    const { html, body, document: exportDocument } = await prepareHtml(widget, {
      title: 'PDF Export',
      stylesheets: ['https://example.com/print.css'],
      inlineStyles: ['body { background: #fff; }'],
    });

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(exportDocument.title).toBe('PDF Export');

    const image = body.querySelector('img[data-widget-static="graph"]');
    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe('data:image/png;base64,prepared-html');

    const link = exportDocument.head.querySelector('link[rel="stylesheet"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('https://example.com/print.css');

    const styles = exportDocument.head.querySelectorAll('style');
    expect(styles.length).toBeGreaterThanOrEqual(3);
    expect(Array.from(styles).some((style) => style.textContent?.includes('background: #fff'))).toBe(
      true,
    );
    expect(Array.from(styles).some((style) => style.textContent?.includes('@page { size: 210mm'))).toBe(
      true,
    );
  });
});

