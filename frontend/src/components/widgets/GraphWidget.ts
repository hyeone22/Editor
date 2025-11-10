import { Chart, type ChartConfiguration, type ChartOptions } from 'chart.js';
import type { ChartDataset as GraphDataset, ChartType, GraphWidgetOptions } from '../../types/Widget';
import { widgetRendererRegistry, type WidgetRenderDescriptor } from '../../utils/widgetRenderer';
import { ensureChartJsRegistered } from '../charts/chartSetup';

ensureChartJsRegistered();

type SupportedChartType = 'bar' | 'line';

type GraphWidgetConfig = {
  chartType: ChartType;
  labels: string[];
  datasets: GraphDataset[];
  options?: GraphWidgetOptions;
};

interface GraphWidgetInstance {
  destroy: () => void;
}

const GRAPH_WIDGET_INSTANCE_KEY = '__graphWidgetInstance__';

const DEFAULT_PALETTE: Array<{ solid: string; fill: string }> = [
  { solid: 'rgba(59, 130, 246, 1)', fill: 'rgba(59, 130, 246, 0.3)' },
  { solid: 'rgba(16, 185, 129, 1)', fill: 'rgba(16, 185, 129, 0.25)' },
  { solid: 'rgba(249, 115, 22, 1)', fill: 'rgba(249, 115, 22, 0.25)' },
  { solid: 'rgba(99, 102, 241, 1)', fill: 'rgba(99, 102, 241, 0.25)' },
  { solid: 'rgba(236, 72, 153, 1)', fill: 'rgba(236, 72, 153, 0.2)' },
];

const DEFAULT_CONFIG: GraphWidgetConfig = {
  chartType: 'line',
  labels: ['1분기', '2분기', '3분기', '4분기'],
  datasets: [
    {
      id: 'default-revenue',
      label: '매출',
      data: [320, 410, 460, 520],
      backgroundColor: 'rgba(59, 130, 246, 0.25)',
      borderColor: 'rgba(59, 130, 246, 1)',
      fill: true,
    },
  ],
  options: {
    legend: true,
    stacked: false,
    showGrid: true,
    yAxisLabel: '억원',
    xAxisLabel: '분기',
  },
};

type GraphWidgetHostElement = HTMLElement & {
  [GRAPH_WIDGET_INSTANCE_KEY]?: GraphWidgetInstance;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isChartType = (value: unknown): value is ChartType =>
  value === 'bar' ||
  value === 'line' ||
  value === 'pie' ||
  value === 'doughnut' ||
  value === 'radar';

const ensureSupportedChartType = (value: ChartType): SupportedChartType =>
  value === 'bar' || value === 'line' ? value : 'line';

const cloneDataset = (dataset: GraphDataset): GraphDataset => ({
  ...dataset,
  data: dataset.data.slice(),
});

const cloneOptions = (options: GraphWidgetOptions | undefined): GraphWidgetOptions | undefined =>
  options ? { ...options } : undefined;

const parseLabels = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const labels = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return labels.length > 0 ? labels : null;
};

const parseNumberArray = (value: unknown): number[] | null => {
  if (!Array.isArray(value)) return null;
  const numbers: number[] = [];
  for (const item of value) {
    if (typeof item === 'number' && Number.isFinite(item)) {
      numbers.push(item);
    } else if (typeof item === 'string' && item.trim().length > 0) {
      const parsed = Number(item);
      if (Number.isFinite(parsed)) {
        numbers.push(parsed);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  return numbers.length > 0 ? numbers : null;
};

const parseDataset = (value: unknown): GraphDataset | null => {
  if (!isPlainObject(value)) return null;

  const id = value['id'];
  const label = value['label'];
  const data = value['data'];

  if (typeof id !== 'string' || !id.trim()) return null;
  if (typeof label !== 'string' || !label.trim()) return null;

  const numbers = parseNumberArray(data);
  if (!numbers) return null;

  const dataset: GraphDataset = {
    id,
    label,
    data: numbers,
  };

  const backgroundColor = value['backgroundColor'];
  if (typeof backgroundColor === 'string' && backgroundColor.trim()) {
    dataset.backgroundColor = backgroundColor;
  }

  const borderColor = value['borderColor'];
  if (typeof borderColor === 'string' && borderColor.trim()) {
    dataset.borderColor = borderColor;
  }

  const fill = value['fill'];
  if (typeof fill === 'boolean') {
    dataset.fill = fill;
  }

  return dataset;
};

const parseDatasets = (value: unknown): GraphDataset[] | null => {
  if (!Array.isArray(value)) return null;
  const datasets = value
    .map((item) => parseDataset(item))
    .filter((item): item is GraphDataset => Boolean(item));
  return datasets.length > 0 ? datasets : null;
};

const parseOptions = (value: unknown): GraphWidgetOptions | null => {
  if (!isPlainObject(value)) return null;

  const options: GraphWidgetOptions = {};

  if (typeof value['stacked'] === 'boolean') {
    options.stacked = value['stacked'];
  }

  if (typeof value['legend'] === 'boolean') {
    options.legend = value['legend'];
  }

  if (typeof value['showGrid'] === 'boolean') {
    options.showGrid = value['showGrid'];
  }

  const xAxisLabel = value['xAxisLabel'];
  if (typeof xAxisLabel === 'string' && xAxisLabel.trim()) {
    options.xAxisLabel = xAxisLabel;
  }

  const yAxisLabel = value['yAxisLabel'];
  if (typeof yAxisLabel === 'string' && yAxisLabel.trim()) {
    options.yAxisLabel = yAxisLabel;
  }

  const precision = value['precision'];
  if (typeof precision === 'number' && Number.isFinite(precision)) {
    options.precision = precision;
  }

  return Object.keys(options).length > 0 ? options : {};
};

const toGraphWidgetConfig = (descriptor: WidgetRenderDescriptor): GraphWidgetConfig => {
  const base: GraphWidgetConfig = {
    chartType: DEFAULT_CONFIG.chartType,
    labels: DEFAULT_CONFIG.labels.slice(),
    datasets: DEFAULT_CONFIG.datasets.map((dataset) => cloneDataset(dataset)),
    options: cloneOptions(DEFAULT_CONFIG.options),
  };

  const config = descriptor.config;
  if (!config || !isPlainObject(config)) {
    return base;
  }

  const chartType = config['chartType'];
  if (isChartType(chartType)) {
    base.chartType = chartType;
  }

  const labels = parseLabels(config['labels']);
  if (labels) {
    base.labels = labels;
  }

  const datasets = parseDatasets(config['datasets']);
  if (datasets) {
    base.datasets = datasets.map((dataset) => cloneDataset(dataset));
  }

  const options = parseOptions(config['options']);
  if (options) {
    base.options = { ...(base.options ?? {}), ...options };
  }

  return base;
};

const createTickFormatter = (precision: number | undefined) => {
  if (typeof precision !== 'number' || !Number.isFinite(precision)) {
    return undefined;
  }

  const digits = Math.max(0, Math.floor(precision));
  return (value: number | string) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numeric)) {
      return numeric.toFixed(digits);
    }
    return String(value);
  };
};

const createBarChartOptions = (options?: GraphWidgetOptions): ChartOptions<'bar'> => {
  const formatter = createTickFormatter(options?.precision);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: options?.legend !== false,
        position: 'top',
      },
    },
    scales: {
      x: {
        stacked: options?.stacked === true,
        grid: {
          display: options?.showGrid !== false,
        },
        title: options?.xAxisLabel
          ? {
              display: true,
              text: options.xAxisLabel,
            }
          : undefined,
      },
      y: {
        stacked: options?.stacked === true,
        beginAtZero: true,
        grid: {
          display: options?.showGrid !== false,
        },
        title: options?.yAxisLabel
          ? {
              display: true,
              text: options.yAxisLabel,
            }
          : undefined,
        ticks:
          formatter
            ? ({
                callback: (value) => formatter(value as number | string),
              } as ChartOptions<'bar'>['scales']['y']['ticks'])
            : undefined,
      },
    },
  };
};

const createLineChartOptions = (options?: GraphWidgetOptions): ChartOptions<'line'> => {
  const formatter = createTickFormatter(options?.precision);
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: options?.legend !== false,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: options?.showGrid !== false,
        },
        title: options?.xAxisLabel
          ? {
              display: true,
              text: options.xAxisLabel,
            }
          : undefined,
      },
      y: {
        beginAtZero: true,
        grid: {
          display: options?.showGrid !== false,
        },
        title: options?.yAxisLabel
          ? {
              display: true,
              text: options.yAxisLabel,
            }
          : undefined,
        ticks:
          formatter
            ? ({
                callback: (value) => formatter(value as number | string),
              } as ChartOptions<'line'>['scales']['y']['ticks'])
            : undefined,
      },
    },
  };
};

const getPalette = (index: number) => DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];

const createBarChartConfig = (config: GraphWidgetConfig): ChartConfiguration<'bar'> => {
  const options = createBarChartOptions(config.options);
  const datasets = config.datasets.map((dataset, index) => {
    const palette = getPalette(index);
    return {
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.backgroundColor ?? palette.fill,
      borderColor: dataset.borderColor ?? palette.solid,
      borderRadius: 6,
    };
  });

  return {
    type: 'bar',
    data: {
      labels: config.labels,
      datasets,
    },
    options,
  };
};

const createLineChartConfig = (config: GraphWidgetConfig): ChartConfiguration<'line'> => {
  const options = createLineChartOptions(config.options);
  const datasets = config.datasets.map((dataset, index) => {
    const palette = getPalette(index);
    return {
      label: dataset.label,
      data: dataset.data,
      borderColor: dataset.borderColor ?? palette.solid,
      backgroundColor: dataset.backgroundColor ?? palette.fill,
      fill: dataset.fill ?? true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  return {
    type: 'line',
    data: {
      labels: config.labels,
      datasets,
    },
    options,
  };
};

const createPlaceholder = (message: string): HTMLDivElement => {
  const placeholder = document.createElement('div');
  placeholder.className = 'graph-widget__empty';
  placeholder.textContent = message;
  return placeholder;
};

const createGraphWidget = (
  host: GraphWidgetHostElement,
  descriptor: WidgetRenderDescriptor,
  config: GraphWidgetConfig,
): GraphWidgetInstance => {
  const wrapper = document.createElement('div');
  wrapper.className = 'graph-widget';

  if (descriptor.title && descriptor.title.trim()) {
    const heading = document.createElement('h3');
    heading.className = 'graph-widget__title';
    heading.textContent = descriptor.title;
    wrapper.appendChild(heading);
  }

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'graph-widget__canvas';
  canvasContainer.style.position = 'relative';
  canvasContainer.style.height = '320px';
  canvasContainer.style.width = '100%';

  const supportedType = ensureSupportedChartType(config.chartType);
  let chart: Chart | null = null;

  const hasData = config.labels.length > 0 && config.datasets.length > 0;

  if (hasData) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const chartConfig =
        supportedType === 'bar' ? createBarChartConfig(config) : createLineChartConfig(config);
      chart = new Chart(context, chartConfig);
      canvasContainer.appendChild(canvas);
    } else {
      canvasContainer.appendChild(createPlaceholder('차트를 초기화할 수 없습니다.'));
    }
  } else {
    canvasContainer.appendChild(createPlaceholder('표시할 데이터가 없습니다.'));
  }

  wrapper.appendChild(canvasContainer);

  if (config.chartType !== supportedType) {
    const note = document.createElement('p');
    note.className = 'graph-widget__note';
    note.textContent = `지원되지 않는 차트 유형(${config.chartType})이어서 ${supportedType} 차트로 표시됩니다.`;
    wrapper.appendChild(note);
  }

  host.replaceChildren(wrapper);

  return {
    destroy: () => {
      chart?.destroy();
    },
  };
};

const renderGraphWidget = ({
  element,
  data,
}: {
  element: HTMLElement;
  data: WidgetRenderDescriptor;
}) => {
  const hostElement = element as GraphWidgetHostElement;
  hostElement[GRAPH_WIDGET_INSTANCE_KEY]?.destroy();
  delete hostElement[GRAPH_WIDGET_INSTANCE_KEY];

  const config = toGraphWidgetConfig(data);
  const instance = createGraphWidget(hostElement, data, config);
  hostElement[GRAPH_WIDGET_INSTANCE_KEY] = instance;
};

if (typeof window !== 'undefined') {
  widgetRendererRegistry.unregister('graph');
  widgetRendererRegistry.register('graph', renderGraphWidget);
}

export {};
