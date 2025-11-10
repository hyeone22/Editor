import type { WidgetType } from '../types/Widget';

export interface WidgetRenderDescriptor {
  id: string;
  type: WidgetType;
  title?: string;
  version?: string;
  order?: number;
  config: Record<string, unknown> | null;
  dataset: Record<string, string>;
}

export interface WidgetRenderArgs {
  element: HTMLElement;
  data: WidgetRenderDescriptor;
}

export type WidgetRenderer = (args: WidgetRenderArgs) => void;

export class WidgetRendererRegistry {
  private renderers = new Map<WidgetType, WidgetRenderer>();

  private fallbackRenderer: WidgetRenderer = ({ element, data }) => {
    const placeholder = document.createElement('div');
    placeholder.className = 'widget-block__placeholder';

    const label = document.createElement('span');
    label.className = 'widget-block__label';
    label.textContent = data.title ?? '커스텀 위젯';

    const type = document.createElement('span');
    type.className = 'widget-block__type';
    type.textContent = data.type;

    placeholder.append(label, type);

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    element.appendChild(placeholder);
  };

  register(type: WidgetType, renderer: WidgetRenderer) {
    this.renderers.set(type, renderer);
  }

  unregister(type: WidgetType) {
    this.renderers.delete(type);
  }

  setFallback(renderer: WidgetRenderer) {
    this.fallbackRenderer = renderer;
  }

  render(args: WidgetRenderArgs) {
    const renderer = this.renderers.get(args.data.type) ?? this.fallbackRenderer;
    renderer(args);
  }
}

export const widgetRendererRegistry = new WidgetRendererRegistry();

export const parseWidgetConfig = (
  rawValue: string | null,
): Record<string, unknown> | null => {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn('위젯 설정을 파싱하지 못했습니다.', error);
    return null;
  }
};

export const serialiseWidgetConfig = (
  value: Record<string, unknown> | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('위젯 설정을 문자열로 직렬화하지 못했습니다.', error);
    return null;
  }
};
