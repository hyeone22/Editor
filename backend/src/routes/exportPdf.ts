import type { Express, Request, Response } from 'express';
import type { PDFOptions, PuppeteerLifeCycleEvent } from 'puppeteer';
import { generatePdf, type GeneratePdfOptions } from '../services/pdf/generatePdf';

type ExportPdfRequestBody = {
  html?: unknown;
  pdfOptions?: PDFOptions;
  waitUntil?: PuppeteerLifeCycleEvent;
  options?: GeneratePdfOptions;
  filename?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const buildGenerateOptions = (
  body: ExportPdfRequestBody,
): GeneratePdfOptions => {
  const { options, pdfOptions, waitUntil } = body;

  const finalOptions: GeneratePdfOptions = {};

  if (isObject(options)) {
    if (isObject(options.pdf)) {
      finalOptions.pdf = options.pdf as PDFOptions;
    }

    if (typeof options.waitUntil === 'string') {
      finalOptions.waitUntil = options.waitUntil as PuppeteerLifeCycleEvent;
    }
  }

  if (isObject(pdfOptions)) {
    finalOptions.pdf = pdfOptions;
  }

  if (typeof waitUntil === 'string') {
    finalOptions.waitUntil = waitUntil as PuppeteerLifeCycleEvent;
  }

  return finalOptions;
};

const getFilename = (body: ExportPdfRequestBody): string => {
  const { filename } = body;

  if (typeof filename === 'string' && filename.trim().length > 0) {
    return filename.trim().endsWith('.pdf') ? filename.trim() : `${filename.trim()}.pdf`;
  }

  return 'document.pdf';
};

const sendValidationError = (res: Response, message: string) => {
  res.status(400).json({ message });
};

export const registerExportPdfRoute = (app: Express) => {
  app.post('/api/export/pdf', async (req: Request<unknown, unknown, ExportPdfRequestBody>, res: Response) => {
    const { html } = req.body ?? {};

    if (typeof html !== 'string' || html.trim().length === 0) {
      return sendValidationError(res, 'HTML content is required.');
    }

    try {
      const options = buildGenerateOptions(req.body ?? {});
      const pdfBuffer = await generatePdf(html, options);
      const filename = getFilename(req.body ?? {});

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate PDF.';
      return res.status(500).json({ message });
    }
  });
};
