export interface ExportPdfRequest {
  html: string;
  filename?: string;
  pdfOptions?: {
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  };
}

export interface ExportPdfResult {
  blob: Blob;
  filename: string;
}

const DEFAULT_FILENAME = 'document.pdf';

const parseContentDisposition = (headerValue: string | null): string | undefined => {
  if (!headerValue) {
    return undefined;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // ignore decoding issues and fall back to other strategies
    }
  }

  const asciiMatch = /filename="?([^";]+)"?/i.exec(headerValue);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1];
  }

  return undefined;
};

const normaliseFilename = (filename?: string): string => {
  if (!filename || filename.trim().length === 0) {
    return DEFAULT_FILENAME;
  }

  const trimmed = filename.trim();
  return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
};

export const exportPdf = async ({ html, filename, pdfOptions }: ExportPdfRequest): Promise<ExportPdfResult> => {
  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html, filename, pdfOptions }),
  });

  if (!response.ok) {
    let message = 'PDF 파일을 생성하지 못했습니다.';

    try {
      const data = (await response.json()) as { message?: string } | undefined;
      if (data?.message) {
        message = data.message;
      }
    } catch {
      // ignore JSON parsing errors and use the default message
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const dispositionFilename = parseContentDisposition(response.headers.get('Content-Disposition'));
  const finalFilename = normaliseFilename(dispositionFilename ?? filename);

  return {
    blob,
    filename: finalFilename,
  };
};
