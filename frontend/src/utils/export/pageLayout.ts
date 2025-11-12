import basePrintStyles from '../../styles/print.css?inline';

export interface PageLayoutMargin {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface PageLayoutConfig {
  width: string;
  height: string;
  margin: PageLayoutMargin;
  padding: string;
  gap: string;
  sectionPadding: string;
  sectionGap: string;
  backgroundColor: string;
  canvasColor: string;
  textColor: string;
  subTextColor: string;
  sectionRadius: string;
  sectionShadow: string;
  sectionBorder: string;
  highlightColor: string;
  highlightTextColor: string;
  mutedColor: string;
}

export type PageLayoutOverrides = Partial<Omit<PageLayoutConfig, 'margin'>> & {
  margin?: Partial<PageLayoutMargin>;
};

export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  width: '210mm',
  height: '297mm',
  margin: {
    top: '18mm',
    right: '16mm',
    bottom: '18mm',
    left: '16mm',
  },
  padding: '12mm',
  gap: '10mm',
  sectionPadding: '16mm',
  sectionGap: '6mm',
  backgroundColor: '#ffffff',
  canvasColor: '#e2e8f0',
  textColor: '#0f172a',
  subTextColor: '#475569',
  sectionRadius: '10px',
  sectionShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
  sectionBorder: '1px solid rgba(148, 163, 184, 0.32)',
  highlightColor: '#0ea5e9',
  highlightTextColor: '#0369a1',
  mutedColor: '#f1f5f9',
};

const mergeMargin = (margin?: Partial<PageLayoutMargin>): PageLayoutMargin => ({
  top: margin?.top ?? DEFAULT_PAGE_LAYOUT.margin.top,
  right: margin?.right ?? DEFAULT_PAGE_LAYOUT.margin.right,
  bottom: margin?.bottom ?? DEFAULT_PAGE_LAYOUT.margin.bottom,
  left: margin?.left ?? DEFAULT_PAGE_LAYOUT.margin.left,
});

export const resolvePageLayout = (overrides?: PageLayoutOverrides): PageLayoutConfig => ({
  ...DEFAULT_PAGE_LAYOUT,
  ...overrides,
  margin: mergeMargin(overrides?.margin),
});

const createCustomPropertyBlock = (layout: PageLayoutConfig): string => `:root {\n  --print-page-width: ${layout.width};\n  --print-page-height: ${layout.height};\n  --print-page-background: ${layout.backgroundColor};\n  --print-page-canvas: ${layout.canvasColor};\n  --print-page-ink: ${layout.textColor};\n  --print-page-sub-ink: ${layout.subTextColor};\n  --print-page-padding: ${layout.padding};\n  --print-page-gap: ${layout.gap};\n  --print-section-radius: ${layout.sectionRadius};\n  --print-section-shadow: ${layout.sectionShadow};\n  --print-section-border: ${layout.sectionBorder};\n  --print-section-padding: ${layout.sectionPadding};\n  --print-section-gap: ${layout.sectionGap};\n  --print-highlight: ${layout.highlightColor};\n  --print-highlight-ink: ${layout.highlightTextColor};\n  --print-muted: ${layout.mutedColor};\n}`;

const createPageRule = (layout: PageLayoutConfig): string =>
  `@page { size: ${layout.width} ${layout.height}; margin: ${layout.margin.top} ${layout.margin.right} ${layout.margin.bottom} ${layout.margin.left}; }`;

export interface PageLayoutStyles {
  layout: PageLayoutConfig;
  inlineStyles: string[];
}

export const createPageLayoutStyles = (overrides?: PageLayoutOverrides): PageLayoutStyles => {
  const layout = resolvePageLayout(overrides);
  const inlineStyles = [basePrintStyles, createCustomPropertyBlock(layout), createPageRule(layout)];

  return { layout, inlineStyles };
};

export const BASE_PRINT_STYLES = basePrintStyles;
