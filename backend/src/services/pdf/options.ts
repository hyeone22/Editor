import type { PDFOptions } from 'puppeteer';

export const DEFAULT_PDF_MARGIN = {
  top: '18mm',
  right: '16mm',
  bottom: '18mm',
  left: '16mm',
} as const;

export const DEFAULT_PDF_DIMENSIONS = {
  width: '210mm',
  height: '297mm',
} as const;

export const DEFAULT_PDF_OPTIONS: PDFOptions = {
  ...DEFAULT_PDF_DIMENSIONS,
  format: 'A4',
  printBackground: true,
  margin: { ...DEFAULT_PDF_MARGIN },
};

const mergeMargin = (margin?: PDFOptions['margin']) => ({
  top: margin?.top ?? DEFAULT_PDF_MARGIN.top,
  right: margin?.right ?? DEFAULT_PDF_MARGIN.right,
  bottom: margin?.bottom ?? DEFAULT_PDF_MARGIN.bottom,
  left: margin?.left ?? DEFAULT_PDF_MARGIN.left,
});

export const buildPdfOptions = (overrides?: PDFOptions): PDFOptions => {
  const margin = mergeMargin(overrides?.margin);

  return {
    ...DEFAULT_PDF_OPTIONS,
    ...overrides,
    margin,
    printBackground: overrides?.printBackground ?? true,
  };
};
