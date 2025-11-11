import type { PDFOptions, PuppeteerLifeCycleEvent, Page } from 'puppeteer';
import { getBrowser } from '../../config/puppeteer';

export interface GeneratePdfOptions {
  pdf?: PDFOptions;
  waitUntil?: PuppeteerLifeCycleEvent;
}

const DEFAULT_WAIT_UNTIL: PuppeteerLifeCycleEvent = 'networkidle0';

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: 'A4',
  printBackground: true,
};

export const generatePdf = async (
  html: string,
  { pdf, waitUntil }: GeneratePdfOptions = {},
): Promise<Buffer> => {
  if (!html) {
    throw new Error('HTML content is required to generate a PDF.');
  }

  let page: Page | null = null;

  const browser = await getBrowser();

  try {
    page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: waitUntil ?? DEFAULT_WAIT_UNTIL,
    });

    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      ...DEFAULT_PDF_OPTIONS,
      ...pdf,
    });
    return pdfBuffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const wrappedError = new Error(`Failed to generate PDF: ${message}`);
    Object.assign(wrappedError, { cause: error });
    throw wrappedError;
  } finally {
    if (page) {
      await page.close().catch(() => undefined);
    }
  }
};
