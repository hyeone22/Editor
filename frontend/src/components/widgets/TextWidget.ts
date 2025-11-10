import type { TextAlignment, FontWeight, TextWidgetStyle } from '../../types/Widget';
import {
  serialiseWidgetConfig,
  widgetRendererRegistry,
  type WidgetRenderDescriptor,
} from '../../utils/widgetRenderer';

type TextWidgetConfig = {
  content: string;
  richText: boolean;
  style?: TextWidgetStyle;
};

interface TextWidgetInstance {
  destroy: () => void;
}

const DEFAULT_CONFIG: TextWidgetConfig = {
  content: '<p>새 텍스트 위젯 내용을 입력하세요.</p>',
  richText: true,
};

const TEXT_WIDGET_INSTANCE_KEY = '__textWidgetInstance__';

type TextWidgetHostElement = HTMLElement & {
  [TEXT_WIDGET_INSTANCE_KEY]?: TextWidgetInstance;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAlignment = (value: unknown): value is TextAlignment =>
  value === 'left' || value === 'center' || value === 'right' || value === 'justify';

const isFontWeight = (value: unknown): value is FontWeight =>
  value === 'light' ||
  value === 'normal' ||
  value === 'medium' ||
  value === 'semibold' ||
  value === 'bold';

const isTextWidgetStyle = (value: unknown): value is TextWidgetStyle => {
  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).every(([key, styleValue]) => {
    switch (key) {
      case 'alignment':
        return isAlignment(styleValue);
      case 'fontSize':
      case 'lineHeight':
      case 'letterSpacing':
        return typeof styleValue === 'number' && Number.isFinite(styleValue);
      case 'color':
      case 'backgroundColor':
        return typeof styleValue === 'string';
      case 'fontWeight':
        return isFontWeight(styleValue);
      default:
        return false;
    }
  });
};

const toTextWidgetConfig = (descriptor: WidgetRenderDescriptor): TextWidgetConfig => {
  const base: TextWidgetConfig = { ...DEFAULT_CONFIG };
  const config = descriptor.config;
  if (!config || !isPlainObject(config)) {
    return base;
  }

  const content = config['content'];
  const richText = config['richText'];
  const style = config['style'];

  if (typeof content === 'string' && content.trim().length > 0) {
    base.content = content;
  }

  if (typeof richText === 'boolean') {
    base.richText = richText;
  }

  if (isTextWidgetStyle(style)) {
    base.style = style;
  }

  return base;
};

const applyStyle = (element: HTMLElement, style: TextWidgetStyle | undefined) => {
  element.removeAttribute('style');
  if (!style) {
    return;
  }

  if (style.alignment) {
    element.style.textAlign = style.alignment;
  }

  if (typeof style.fontSize === 'number' && Number.isFinite(style.fontSize)) {
    element.style.fontSize = `${style.fontSize}px`;
  }

  if (typeof style.lineHeight === 'number' && Number.isFinite(style.lineHeight)) {
    element.style.lineHeight = `${style.lineHeight}`;
  }

  if (typeof style.letterSpacing === 'number' && Number.isFinite(style.letterSpacing)) {
    element.style.letterSpacing = `${style.letterSpacing}px`;
  }

  if (style.fontWeight) {
    element.style.fontWeight = style.fontWeight;
  }

  if (style.color) {
    element.style.color = style.color;
  }

  if (style.backgroundColor) {
    element.style.backgroundColor = style.backgroundColor;
  }
};

const updateElementConfig = (element: HTMLElement, config: TextWidgetConfig) => {
  const payload: Record<string, unknown> = {
    content: config.content,
    richText: config.richText,
  };

  if (config.style) {
    payload.style = config.style;
  }

  const serialised = serialiseWidgetConfig(payload);
  if (serialised) {
    element.setAttribute('data-widget-config', serialised);
  } else {
    element.removeAttribute('data-widget-config');
  }
};

const createTextWidget = (
  hostElement: TextWidgetHostElement,
  descriptor: WidgetRenderDescriptor,
): TextWidgetInstance => {
  const config = toTextWidgetConfig(descriptor);

  const container = document.createElement('div');
  container.className = 'text-widget';
  container.tabIndex = 0;
  container.setAttribute('role', 'button');
  container.setAttribute(
    'aria-label',
    `${descriptor.title ?? '텍스트 위젯'} 편집 (더블 클릭 또는 Enter 키)`,
  );

  const contentElement = document.createElement('div');
  contentElement.className = 'text-widget__content';
  if (config.richText) {
    contentElement.innerHTML = config.content;
  } else {
    contentElement.textContent = config.content;
  }
  applyStyle(contentElement, config.style);

  const hint = document.createElement('span');
  hint.className = 'text-widget__hint';
  hint.textContent = '더블 클릭하거나 Enter 키를 눌러 편집하세요';

  container.append(contentElement, hint);

  const editContent = () => {
    const currentValue = config.richText
      ? contentElement.innerHTML
      : contentElement.textContent ?? '';
    const nextValue = window.prompt('텍스트 위젯 내용을 입력하세요.', currentValue);
    if (nextValue === null) {
      return;
    }

    const trimmed = config.richText ? nextValue : nextValue.trim();
    if (config.richText) {
      contentElement.innerHTML = trimmed;
    } else {
      contentElement.textContent = trimmed;
    }
    config.content = trimmed;
    updateElementConfig(hostElement, config);
  };

  const handleDoubleClick = () => {
    editContent();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      editContent();
    }
  };

  container.addEventListener('dblclick', handleDoubleClick);
  container.addEventListener('keydown', handleKeyDown);

  hostElement.replaceChildren(container);

  return {
    destroy: () => {
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('keydown', handleKeyDown);
    },
  };
};

const renderTextWidget = ({ element, data }: { element: HTMLElement; data: WidgetRenderDescriptor }) => {
  const hostElement = element as TextWidgetHostElement;
  const previousInstance = hostElement[TEXT_WIDGET_INSTANCE_KEY];
  if (previousInstance) {
    previousInstance.destroy();
    delete hostElement[TEXT_WIDGET_INSTANCE_KEY];
  }

  const instance = createTextWidget(hostElement, data);
  hostElement[TEXT_WIDGET_INSTANCE_KEY] = instance;
};

if (typeof window !== 'undefined') {
  widgetRendererRegistry.unregister('text');
  widgetRendererRegistry.register('text', renderTextWidget);
}

export {};
