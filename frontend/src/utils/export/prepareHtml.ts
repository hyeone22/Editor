import {
  createPageLayoutStyles,
  type PageLayoutConfig,
  type PageLayoutOverrides,
} from './pageLayout';
import { serializeWidgets } from './serializeWidgets';

export interface PrepareHtmlOptions {
  /** Optional title used for the generated HTML document. */
  title?: string;
  /** A list of external stylesheet URLs to inject into the export document. */
  stylesheets?: string[];
  /** Inline CSS blocks that should be appended to the export document's head section. */
  inlineStyles?: string[];
  /**
   * Controls whether the default print stylesheet and page layout variables
   * should be injected into the export document. Enabled by default so that
   * the PDF output mirrors the in-app layout.
   */
  includePrintStyles?: boolean;
  /** Optional overrides applied to the default page layout tokens. */
  pageLayout?: PageLayoutOverrides;
  /**
   * HTML meta charset value. Pass `null` to skip emitting the charset meta tag.
   * Defaults to `utf-8`.
   */
  charset?: string | null;
}

export interface PrepareHtmlResult {
  /** Fully serialised HTML string including the document type declaration. */
  html: string;
  /** The cloned body element after widget serialisation. */
  body: HTMLElement;
  /** The export document instance that was generated. */
  document: Document;
  /** The page layout configuration that was resolved for this export. */
  pageLayout: PageLayoutConfig;
}

const createDocument = (source: HTMLElement, title?: string): Document => {
  const owner = source.ownerDocument;
  const doc = owner?.implementation
    ? owner.implementation.createHTMLDocument(title ?? owner.title ?? 'Document Export')
    : document.implementation.createHTMLDocument(title ?? 'Document Export');

  doc.title = title ?? owner?.title ?? doc.title;
  return doc;
};

const collectInlineStyles = ({
  inlineStyles = [],
  includePrintStyles = true,
  pageLayout,
}: PrepareHtmlOptions): { inlineStyles: string[]; layout: PageLayoutConfig } => {
  const layoutStyles = createPageLayoutStyles(pageLayout);

  if (!includePrintStyles) {
    return { inlineStyles: [...inlineStyles], layout: layoutStyles.layout };
  }

  return {
    inlineStyles: [...layoutStyles.inlineStyles, ...inlineStyles],
    layout: layoutStyles.layout,
  };
};

const injectHeadAssets = (
  doc: Document,
  stylesheets: string[],
  inlineStyles: string[],
  charset: PrepareHtmlOptions['charset'],
) => {
  const head = doc.head ?? doc.getElementsByTagName('head')[0];

  if (charset !== null) {
    const meta = doc.createElement('meta');
    meta.setAttribute('charset', (charset ?? 'utf-8').toLowerCase());
    head.appendChild(meta);
  }

  stylesheets.forEach((href) => {
    if (!href) {
      return;
    }
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    head.appendChild(link);
  });

  inlineStyles.forEach((css) => {
    if (!css) {
      return;
    }
    const style = doc.createElement('style');
    style.type = 'text/css';
    style.appendChild(doc.createTextNode(css));
    head.appendChild(style);
  });
};

export const prepareHtml = async (
  sourceBody: HTMLElement,
  options: PrepareHtmlOptions = {},
): Promise<PrepareHtmlResult> => {
  const exportDocument = createDocument(sourceBody, options.title);
  const clonedBody = sourceBody.cloneNode(true) as HTMLElement;

  exportDocument.body.replaceChildren(clonedBody);
  const stylesheets = options.stylesheets ?? [];
  const { inlineStyles, layout } = collectInlineStyles(options);
  injectHeadAssets(exportDocument, stylesheets, inlineStyles, options.charset);

  await serializeWidgets({
    sourceRoot: sourceBody,
    targetRoot: clonedBody,
    document: exportDocument,
  });

  const doctype = '<!DOCTYPE html>';
  const html = `${doctype}\n${exportDocument.documentElement.outerHTML}`;

  return {
    html,
    body: clonedBody,
    document: exportDocument,
    pageLayout: layout,
  };
};

