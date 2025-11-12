import { useCallback, useState } from 'react';
import { exportPdf } from '../../api/exportPdf';
import { prepareHtml, type PrepareHtmlOptions } from '../../utils/export/prepareHtml';

interface ExportButtonProps {
  getSourceBody: () => HTMLElement | null;
  disabled?: boolean;
  filename?: string;
  documentTitle?: string;
  inlineStyles?: PrepareHtmlOptions['inlineStyles'];
  stylesheets?: PrepareHtmlOptions['stylesheets'];
}

const ExportButton = ({
  getSourceBody,
  disabled = false,
  filename,
  documentTitle,
  inlineStyles,
  stylesheets,
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = useCallback(async () => {
    if (isExporting) {
      return;
    }

    const sourceBody = getSourceBody();

    if (!sourceBody) {
      window.alert('에디터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsExporting(true);

    try {
      const { html, pageLayout } = await prepareHtml(sourceBody, {
        title: documentTitle,
        inlineStyles,
        stylesheets,
      });

      const { blob, filename: downloadName } = await exportPdf({
        html,
        filename,
        pdfOptions: {
          margin: pageLayout.margin,
        },
      });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'PDF 내보내기 중 알 수 없는 오류가 발생했습니다.';
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
  }, [documentTitle, filename, getSourceBody, inlineStyles, isExporting, stylesheets]);

  return (
    <button type="button" onClick={handleClick} disabled={disabled || isExporting}>
      {isExporting ? '내보내는 중...' : 'PDF로 내보내기'}
    </button>
  );
};

export default ExportButton;
