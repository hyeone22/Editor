import { describe, expect, it } from 'vitest';
import { createPageLayoutStyles, DEFAULT_PAGE_LAYOUT } from '../pageLayout';

describe('pageLayout', () => {
  it('returns default styles when no overrides are provided', () => {
    const { layout, inlineStyles } = createPageLayoutStyles();

    expect(layout).toEqual(DEFAULT_PAGE_LAYOUT);
    expect(inlineStyles).toHaveLength(3);
    expect(inlineStyles[0]).toContain('--print-page-width');
    expect(inlineStyles[1]).toContain('--print-page-width');
    expect(inlineStyles[2]).toContain('@page { size: 210mm');
  });

  it('merges overrides with the default layout', () => {
    const { layout, inlineStyles } = createPageLayoutStyles({
      width: '216mm',
      margin: { top: '24mm' },
    });

    expect(layout.width).toBe('216mm');
    expect(layout.margin.top).toBe('24mm');
    expect(layout.margin.right).toBe(DEFAULT_PAGE_LAYOUT.margin.right);
    expect(inlineStyles[2]).toContain('24mm');
    expect(inlineStyles[1]).toContain('216mm');
  });
});
