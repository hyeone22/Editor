// apps/frontend/src/widgets/GraphWidget.ts
import { Chart, type ChartConfiguration, type ChartOptions } from 'chart.js';
import type {
  ChartDataset as GraphDataset,
  ChartType,
  GraphWidgetOptions,
} from '../../types/Widget';
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
type GraphWidgetHostElement = HTMLElement & { __graphWidgetInstance__?: GraphWidgetInstance };

const PALETTE = [
  { solid: 'rgba(59,130,246,1)', fill: 'rgba(59,130,246,.25)' },
  { solid: 'rgba(16,185,129,1)', fill: 'rgba(16,185,129,.25)' },
  { solid: 'rgba(249,115,22,1)', fill: 'rgba(249,115,22,.25)' },
  { solid: 'rgba(99,102,241,1)', fill: 'rgba(99,102,241,.25)' },
  { solid: 'rgba(236,72,153,1)', fill: 'rgba(236,72,153,.2)' },
];

const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && !!v && !Array.isArray(v);
const isChartType = (v: unknown): v is ChartType => typeof v === 'string';
const asSupported = (t: ChartType): SupportedChartType =>
  t === 'bar' || t === 'line' ? t : 'line';

const parseNums = (v: unknown): number[] | null => {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (const it of v) {
    if (typeof it === 'number' && Number.isFinite(it)) out.push(it);
    else if (typeof it === 'string' && it.trim().length) {
      const n = Number(it);
      if (!Number.isFinite(n)) return null;
      out.push(n);
    } else return null;
  }
  return out.length ? out : null;
};

const parseDataset = (v: unknown): GraphDataset | null => {
  if (!isPlain(v)) return null;
  const id = v['id'];
  const label = v['label'];
  const data = v['data'];
  if (typeof id !== 'string' || !id.trim()) return null;
  if (typeof label !== 'string' || !label.trim()) return null;
  const nums = parseNums(data);
  if (!nums) return null;
  const ds: GraphDataset = { id, label, data: nums };
  if (typeof v['backgroundColor'] === 'string') ds.backgroundColor = v['backgroundColor'] as string;
  if (typeof v['borderColor'] === 'string') ds.borderColor = v['borderColor'] as string;
  if (typeof v['fill'] === 'boolean') ds.fill = v['fill'] as boolean;
  return ds;
};

const toConfig = (d: WidgetRenderDescriptor): GraphWidgetConfig => {
  const base: GraphWidgetConfig = {
    chartType: 'line',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        id: 'default',
        label: 'Series',
        data: [10, 20, 30, 25],
        borderColor: PALETTE[0].solid,
        backgroundColor: PALETTE[0].fill,
        fill: true,
      },
    ],
    options: { legend: true, showGrid: true },
  };

  const c = d.config;
  if (!isPlain(c)) return base;

  if (Array.isArray(c['labels'])) {
    const labels = (c['labels'] as unknown[]).filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0,
    );
    if (labels.length) base.labels = labels;
  }

  if (Array.isArray(c['datasets'])) {
    const datasets = (c['datasets'] as unknown[])
      .map(parseDataset)
      .filter(Boolean) as GraphDataset[];
    if (datasets.length) base.datasets = datasets;
  }

  if (isChartType(c['chartType'])) {
    base.chartType = c['chartType'];
  }

  if (isPlain(c['options'])) {
    const o = c['options'] as Record<string, unknown>;
    base.options = {
      ...base.options,
      legend: typeof o['legend'] === 'boolean' ? (o['legend'] as boolean) : base.options?.legend,
      stacked:
        typeof o['stacked'] === 'boolean' ? (o['stacked'] as boolean) : base.options?.stacked,
      showGrid:
        typeof o['showGrid'] === 'boolean' ? (o['showGrid'] as boolean) : base.options?.showGrid,
      xAxisLabel:
        typeof o['xAxisLabel'] === 'string'
          ? (o['xAxisLabel'] as string)
          : base.options?.xAxisLabel,
      yAxisLabel:
        typeof o['yAxisLabel'] === 'string'
          ? (o['yAxisLabel'] as string)
          : base.options?.yAxisLabel,
      precision:
        typeof o['precision'] === 'number' ? (o['precision'] as number) : base.options?.precision,
    };
  }

  return base;
};

const tickFormatter = (precision?: number) =>
  typeof precision === 'number' && Number.isFinite(precision)
    ? (v: unknown) => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n.toFixed(Math.max(0, Math.floor(precision))) : String(v);
      }
    : undefined;

const barOptions = (opt?: GraphWidgetOptions): ChartOptions<'bar'> => {
  const t = tickFormatter(opt?.precision);
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: opt?.legend !== false, position: 'top' } },
    scales: {
      x: {
        stacked: !!opt?.stacked,
        grid: { display: opt?.showGrid !== false },
        title: opt?.xAxisLabel ? { display: true, text: opt.xAxisLabel } : undefined,
      },
      y: {
        stacked: !!opt?.stacked,
        beginAtZero: true,
        grid: { display: opt?.showGrid !== false },
        title: opt?.yAxisLabel ? { display: true, text: opt.yAxisLabel } : undefined,
        ticks: t ? { callback: (v) => t(v) } : undefined,
      },
    },
  };
};
const lineOptions = (opt?: GraphWidgetOptions): ChartOptions<'line'> => {
  const t = tickFormatter(opt?.precision);
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: opt?.legend !== false, position: 'top' } },
    scales: {
      x: {
        grid: { display: opt?.showGrid !== false },
        title: opt?.xAxisLabel ? { display: true, text: opt.xAxisLabel } : undefined,
      },
      y: {
        beginAtZero: true,
        grid: { display: opt?.showGrid !== false },
        title: opt?.yAxisLabel ? { display: true, text: opt.yAxisLabel } : undefined,
        ticks: t ? { callback: (v) => t(v) } : undefined,
      },
    },
  };
};

const barConfig = (cfg: GraphWidgetConfig): ChartConfiguration<'bar'> => ({
  type: 'bar',
  data: {
    labels: cfg.labels,
    datasets: cfg.datasets.map((ds, i) => {
      const p = PALETTE[i % PALETTE.length];
      return {
        label: ds.label,
        data: ds.data as number[],
        backgroundColor: ds.backgroundColor ?? p.fill,
        borderColor: ds.borderColor ?? p.solid,
        borderRadius: 6,
      };
    }),
  },
  options: barOptions(cfg.options),
});

const lineConfig = (cfg: GraphWidgetConfig): ChartConfiguration<'line'> => ({
  type: 'line',
  data: {
    labels: cfg.labels,
    datasets: cfg.datasets.map((ds, i) => {
      const p = PALETTE[i % PALETTE.length];
      return {
        label: ds.label,
        data: ds.data as number[],
        borderColor: ds.borderColor ?? p.solid,
        backgroundColor: ds.backgroundColor ?? p.fill,
        fill: ds.fill ?? true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    }),
  },
  options: lineOptions(cfg.options),
});

const placeholder = (msg: string) => {
  const div = document.createElement('div');
  div.className = 'graph-widget__empty';
  div.textContent = msg;
  return div;
};

const createGraphWidget = (
  host: GraphWidgetHostElement,
  desc: WidgetRenderDescriptor,
  cfg: GraphWidgetConfig,
): GraphWidgetInstance => {
  const root = document.createElement('div');
  root.className = 'graph-widget';

  if (desc.title?.trim()) {
    const h = document.createElement('h3');
    h.className = 'graph-widget__title';
    h.textContent = desc.title!;
    root.appendChild(h);
  }

  const area = document.createElement('div');
  area.className = 'graph-widget__canvas';
  area.style.position = 'relative';
  area.style.height = '320px';
  area.style.width = '100%';

  // 먼저 DOM 트리 구성
  root.appendChild(area);
  host.replaceChildren(root);

  let chart: Chart | null = null;
  let rafId: number | null = null;

  const hasData = (cfg.labels?.length ?? 0) > 0 && (cfg.datasets?.length ?? 0) > 0;
  if (!hasData) {
    area.appendChild(placeholder('표시할 데이터가 없습니다.'));
    return {
      destroy: () => {
        /* noop */
      },
    };
  }

  // 캔버스 생성 후 즉시 DOM에 붙인다
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  area.appendChild(canvas);

  try {
    const type = asSupported(cfg.chartType);
    const conf = type === 'bar' ? barConfig(cfg) : lineConfig(cfg);

    // DOM에 붙은 상태에서 차트 생성
    chart = new Chart(canvas, conf);

    // 다음 프레임에 레이아웃이 잡힌 뒤 안전하게 리사이즈
    rafId = window.requestAnimationFrame(() => {
      // 위젯이 재렌더로 분리되어 있으면 스킵
      if (!canvas.isConnected) return;
      try {
        chart?.resize();
        chart?.update();
      } catch {
        /* DOM 분리 타이밍 이슈 방지 */
      }
    });
  } catch (err) {
    console.error('[GraphWidget] render error', err, { cfg });
    // 실패 시 플레이스홀더 교체
    area.replaceChildren(placeholder('차트를 렌더링하는 중 오류가 발생했습니다.'));
  }

  return {
    destroy: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      chart?.destroy();
      chart = null;
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
  const host = element as GraphWidgetHostElement;
  host.__graphWidgetInstance__?.destroy();
  delete host.__graphWidgetInstance__;

  const cfg = toConfig(data);
  const inst = createGraphWidget(host, data, cfg);
  host.__graphWidgetInstance__ = inst;
};

if (typeof window !== 'undefined') {
  widgetRendererRegistry.unregister('graph');
  widgetRendererRegistry.register('graph', renderGraphWidget);
}
export {};
