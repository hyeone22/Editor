/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */

import {
  parseWidgetConfig,
  serialiseWidgetConfig,
  widgetRendererRegistry,
} from '../utils/widgetRenderer';
import type { WidgetRenderDescriptor, WidgetRendererRegistry } from '../utils/widgetRenderer';
import type { WidgetType } from '../types/Widget';

const PLUGIN_NAME = 'widgetBlocks';
const DEFAULT_WIDGET_SELECTOR = '[data-widget-type]';
const DEFAULT_WIDGET_CLASSNAME = 'widget-block';

interface TinyMcePluginManager {
  add: (name: string, callback: (editor: TinyMceEditor, url: string) => void) => void;
}

interface TinyMceEditor {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
  getBody: () => HTMLElement | null;
  schema: { addValidElements: (rule: string) => void };
  parser: { addNodeFilter: (selector: string, callback: (nodes: TinyMceNode[]) => void) => void };
  serializer: {
    addNodeFilter: (selector: string, callback: (nodes: TinyMceNode[]) => void) => void;
  };
}

interface TinyMceNode {
  attr: (name: string, value?: string | null) => string | undefined | null;
  attrKeys?: () => string[];
  attrGet?: (name: string) => string | undefined;
  attrSet?: (name: string, value: string | null) => void;
  attrMap?: Record<string, string>;
}

interface TinyMceGlobal {
  PluginManager: TinyMcePluginManager;
}

export interface WidgetPluginOptions {
  registry?: WidgetRendererRegistry;
  widgetSelector?: string;
  widgetClassName?: string;
}

let isRegistered = false;
let widgetIdSequence = 0;

const toArray = <T>(list: ArrayLike<T>): T[] => Array.prototype.slice.call(list);

const safeAttr = (node: TinyMceNode, name: string): string | null => {
  if (typeof node.attr === 'function') {
    return (node.attr(name) as string | null) ?? null;
  }

  if (node.attrGet) {
    return node.attrGet(name) ?? null;
  }

  if (node.attrMap && name in node.attrMap) {
    return node.attrMap[name];
  }

  return null;
};

const setAttr = (node: TinyMceNode, name: string, value: string | null) => {
  if (typeof node.attr === 'function') {
    node.attr(name, value);
    return;
  }

  if (node.attrSet) {
    node.attrSet(name, value);
    return;
  }

  if (!node.attrMap) {
    node.attrMap = {};
  }

  if (value === null) {
    delete node.attrMap[name];
  } else {
    node.attrMap[name] = value;
  }
};

const ensureWidgetId = (element: HTMLElement, order: number): string => {
  const existing = element.getAttribute('data-widget-id');
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const generated = `widget-${Date.now()}-${(widgetIdSequence += 1)}-${order}`;
  element.setAttribute('data-widget-id', generated);
  return generated;
};

const parseWidgetDescriptor = (
  element: HTMLElement,
  order: number,
): WidgetRenderDescriptor | null => {
  const typeValue = element.getAttribute('data-widget-type');
  if (!typeValue) {
    return null;
  }

  const widgetType = typeValue as WidgetType;
  const rawConfig = element.getAttribute('data-widget-config');
  const config = parseWidgetConfig(rawConfig);
  if (config) {
    const normalised = serialiseWidgetConfig(config);
    if (normalised) {
      element.setAttribute('data-widget-config', normalised);
    }
  } else if (rawConfig && rawConfig.trim().length > 0) {
    element.setAttribute('data-widget-config', rawConfig.trim());
  }

  const dataset = { ...element.dataset } as Record<string, string>;
  dataset.widgetOrder = String(order);

  return {
    id: ensureWidgetId(element, order),
    type: widgetType,
    title: element.getAttribute('data-widget-title') ?? undefined,
    version: element.getAttribute('data-widget-version') ?? undefined,
    order,
    config,
    dataset,
  };
};

const markAsWidget = (element: HTMLElement, className: string) => {
  element.setAttribute('contenteditable', 'false');
  element.setAttribute('data-mce-noneditable', 'true');
  element.setAttribute('data-mce-resizable', 'false');
  element.setAttribute('draggable', 'true');
  element.classList.add(className);
};

const refreshWidgetBlocks = (
  editor: TinyMceEditor,
  registry: WidgetRendererRegistry,
  widgetSelector: string,
  widgetClassName: string,
) => {
  const body = editor.getBody();
  if (!body) {
    return;
  }

  const widgets = body.querySelectorAll<HTMLElement>(widgetSelector);
  widgets.forEach((element, index) => {
    markAsWidget(element, widgetClassName);
    const descriptor = parseWidgetDescriptor(element, index);
    if (!descriptor) {
      return;
    }

    element.setAttribute('data-widget-order', String(index));
    element.dataset.widgetOrder = String(index);
    registry.render({
      element,
      data: descriptor,
    });
  });
};

const normaliseWidgetAttributes = (node: TinyMceNode) => {
  const typeValue = safeAttr(node, 'data-widget-type');
  if (!typeValue) {
    return;
  }

  setAttr(node, 'data-mce-noneditable', null);
  setAttr(node, 'data-mce-resizable', null);
  setAttr(node, 'contenteditable', null);

  const configValue = safeAttr(node, 'data-widget-config');
  if (configValue) {
    const config = parseWidgetConfig(configValue);
    const serialised = serialiseWidgetConfig(config);
    if (serialised) {
      setAttr(node, 'data-widget-config', serialised);
    }
  }

  const orderValue = safeAttr(node, 'data-widget-order');
  if (typeof orderValue === 'string') {
    const trimmed = orderValue.trim();
    setAttr(node, 'data-widget-order', trimmed.length > 0 ? trimmed : null);
  }
};

export const ensureWidgetPlugin = (
  tinyMCE: TinyMceGlobal | undefined,
  options: WidgetPluginOptions = {},
) => {
  if (!tinyMCE || isRegistered) {
    return;
  }

  const {
    registry = widgetRendererRegistry,
    widgetSelector = DEFAULT_WIDGET_SELECTOR,
    widgetClassName = DEFAULT_WIDGET_CLASSNAME,
  } = options;

  tinyMCE.PluginManager.add(
    PLUGIN_NAME,
    function (editor: TinyMceEditor /*: any*/, _url: any /*: string*/) {
      editor.on('PreInit', () => {
        editor.schema.addValidElements(
          'div[data-widget-type|data-widget-id|data-widget-config|data-widget-title|data-widget-version|data-widget-order]',
        );

        editor.parser.addNodeFilter('div', (nodes: TinyMceNode[]) => {
          toArray(nodes).forEach(normaliseWidgetAttributes);
        });

        editor.serializer.addNodeFilter('div', (nodes: TinyMceNode[]) => {
          toArray(nodes).forEach(normaliseWidgetAttributes);
        });
      });

      const refresh = () => refreshWidgetBlocks(editor, registry, widgetSelector, widgetClassName);

      editor.on('init', refresh);
      editor.on('SetContent', refresh);
      editor.on('NodeChange', refresh);
      editor.on('BeforeGetContent', refresh);
    },
  );

  isRegistered = true;
};

export default ensureWidgetPlugin;
