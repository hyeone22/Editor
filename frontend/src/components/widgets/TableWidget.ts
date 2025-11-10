import type {
  TableCellAlignment,
  TableColumnConfig,
  TableRowData,
  TableSummaryRow,
  TableValueFormat,
} from '../../types/Widget';
import { widgetRendererRegistry, type WidgetRenderDescriptor } from '../../utils/widgetRenderer';

type TableWidgetConfig = {
  columns: TableColumnConfig[];
  rows: TableRowData[];
  showHeader: boolean;
  summary?: TableSummaryRow[];
  footnote?: string;
  responsive?: boolean;
};

const DEFAULT_COLUMNS: TableColumnConfig[] = [
  { id: 'col-metric', label: '항목', align: 'left', format: 'text' },
  { id: 'col-value', label: '값', align: 'right', format: 'number' },
];

const DEFAULT_ROWS: TableRowData[] = [
  {
    id: 'row-example',
    cells: [
      { columnId: 'col-metric', value: '예시 항목' },
      { columnId: 'col-value', value: 100 },
    ],
  },
];

const DEFAULT_CONFIG: TableWidgetConfig = {
  columns: DEFAULT_COLUMNS,
  rows: DEFAULT_ROWS,
  showHeader: true,
  responsive: true,
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isAlignment = (v: unknown): v is TableCellAlignment =>
  v === 'left' || v === 'center' || v === 'right';

const isValueFormat = (v: unknown): v is TableValueFormat =>
  v === 'text' ||
  v === 'currency' ||
  v === 'percent' ||
  v === 'number' ||
  v === 'date' ||
  v === 'rating';

const cloneColumns = (cols: TableColumnConfig[]): TableColumnConfig[] =>
  cols.map((c) => ({ ...c }));

const cloneRows = (rows: TableRowData[]): TableRowData[] =>
  rows.map((r) => ({
    id: r.id,
    cells: r.cells.map((c) => ({ ...c })),
    expandableContent: r.expandableContent,
  }));

const parseColumnConfig = (value: unknown): TableColumnConfig | null => {
  if (!isPlainObject(value)) return null;
  const idValue = value['id'];
  const labelValue = value['label'];
  if (typeof idValue !== 'string' || !idValue.trim()) return null;
  if (typeof labelValue !== 'string' || !labelValue.trim()) return null;

  const column: TableColumnConfig = { id: idValue, label: labelValue };

  const widthValue = value['width'];
  if (typeof widthValue === 'number' && Number.isFinite(widthValue)) column.width = widthValue;

  const alignValue = value['align'];
  if (isAlignment(alignValue)) column.align = alignValue;

  const formatValue = value['format'];
  if (isValueFormat(formatValue)) column.format = formatValue;

  const emphasisValue = value['emphasis'];
  if (emphasisValue === 'primary' || emphasisValue === 'secondary' || emphasisValue === 'muted') {
    column.emphasis = emphasisValue;
  }

  return column;
};

const parseColumns = (value: unknown): TableColumnConfig[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((c) => parseColumnConfig(c))
    .filter((c): c is TableColumnConfig => Boolean(c));
  return parsed.length > 0 ? parsed : null;
};

const parseCell = (value: unknown): TableRowData['cells'][number] | null => {
  if (!isPlainObject(value)) return null;

  const columnIdValue = value['columnId'];
  if (typeof columnIdValue !== 'string' || !columnIdValue.trim()) return null;

  const cell = {
    columnId: columnIdValue,
    value: value['value'] ?? null,
  } as TableRowData['cells'][number];

  const colspanValue = value['colspan'];
  if (typeof colspanValue === 'number' && Number.isInteger(colspanValue) && colspanValue > 0) {
    cell.colspan = colspanValue;
  }

  const rowspanValue = value['rowspan'];
  if (typeof rowspanValue === 'number' && Number.isInteger(rowspanValue) && rowspanValue > 0) {
    cell.rowspan = rowspanValue;
  }

  const emphasisValue = value['emphasis'];
  if (emphasisValue === 'positive' || emphasisValue === 'negative' || emphasisValue === 'neutral') {
    cell.emphasis = emphasisValue;
  }

  const tooltipValue = value['tooltip'];
  if (typeof tooltipValue === 'string' && tooltipValue.trim()) {
    cell.tooltip = tooltipValue;
  }

  return cell;
};

const parseRow = (value: unknown): TableRowData | null => {
  if (!isPlainObject(value)) return null;

  const idValue = value['id'];
  if (typeof idValue !== 'string' || !idValue.trim()) return null;

  const cellsValue = value['cells'];
  if (!Array.isArray(cellsValue)) return null;

  const cells = cellsValue
    .map((c) => parseCell(c))
    .filter((c): c is TableRowData['cells'][number] => Boolean(c));
  if (cells.length === 0) return null;

  const row: TableRowData = { id: idValue, cells };

  const expandableContent = value['expandableContent'];
  if (typeof expandableContent === 'string' && expandableContent.trim()) {
    row.expandableContent = expandableContent;
  }

  return row;
};

const parseRows = (value: unknown): TableRowData[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((r) => parseRow(r)).filter((r): r is TableRowData => Boolean(r));
  return parsed.length > 0 ? parsed : null;
};

const parseSummaryRow = (value: unknown): TableSummaryRow | null => {
  if (!isPlainObject(value)) return null;

  const labelValue = value['label'];
  const summaryValue = value['value'];
  if (typeof labelValue !== 'string' || !labelValue.trim()) return null;
  if (
    (typeof summaryValue !== 'string' || !summaryValue.trim()) &&
    typeof summaryValue !== 'number'
  )
    return null;

  const summary: TableSummaryRow = { label: labelValue, value: summaryValue };

  const alignValue = value['align'];
  if (isAlignment(alignValue)) summary.align = alignValue;

  return summary;
};

const parseSummary = (value: unknown): TableSummaryRow[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value
    .map((v) => parseSummaryRow(v))
    .filter((s): s is TableSummaryRow => Boolean(s));
  return parsed.length > 0 ? parsed : null;
};

const toTableWidgetConfig = (descriptor: WidgetRenderDescriptor): TableWidgetConfig => {
  const base: TableWidgetConfig = {
    columns: cloneColumns(DEFAULT_CONFIG.columns),
    rows: cloneRows(DEFAULT_CONFIG.rows),
    showHeader: DEFAULT_CONFIG.showHeader,
    responsive: DEFAULT_CONFIG.responsive,
  };

  const config = descriptor.config;
  if (!config || !isPlainObject(config)) return base;

  const parsedColumns = parseColumns(config['columns']);
  if (parsedColumns) base.columns = parsedColumns;

  const parsedRows = parseRows(config['rows']);
  if (parsedRows) base.rows = parsedRows;

  if (typeof config['showHeader'] === 'boolean') base.showHeader = config['showHeader'];

  const parsedSummary = parseSummary(config['summary']);
  if (parsedSummary) base.summary = parsedSummary;

  if (typeof config['footnote'] === 'string' && config['footnote'].trim())
    base.footnote = config['footnote'];

  if (typeof config['responsive'] === 'boolean') base.responsive = config['responsive'];

  return base;
};

const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2, ...options }).format(value);

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatCellValue = (value: unknown, format: TableValueFormat | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && !value.trim()) return '—';

  switch (format) {
    case 'currency':
      if (typeof value === 'number')
        return formatNumber(value, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        });
      break;
    case 'percent':
      if (typeof value === 'number') return formatPercent(value);
      break;
    case 'number':
      if (typeof value === 'number') return formatNumber(value);
      break;
    case 'date':
      if (typeof value === 'string' || value instanceof Date) {
        const d = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(d.getTime())) return new Intl.DateTimeFormat('ko-KR').format(d);
      }
      break;
    case 'rating':
      if (typeof value === 'number') {
        const n = Math.max(0, Math.min(5, Math.round(value)));
        return '★'.repeat(n).padEnd(5, '☆');
      }
      break;
    default:
      break;
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const applyAlignment = (el: HTMLElement, alignment?: TableCellAlignment) => {
  if (!alignment) return;
  el.classList.add(`table-widget__cell--align-${alignment}`);
};

const applyColumnEmphasis = (el: HTMLElement, emphasis?: TableColumnConfig['emphasis']) => {
  if (!emphasis) return;
  el.classList.add(`table-widget__header--${emphasis}`);
};

const applyCellEmphasis = (
  el: HTMLElement,
  emphasis?: TableRowData['cells'][number]['emphasis'],
) => {
  if (!emphasis) return;
  el.classList.add(`table-widget__cell--${emphasis}`);
};

const buildTableElement = (config: TableWidgetConfig): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-widget';

  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-widget__table-container';
  if (config.responsive) tableContainer.classList.add('table-widget__table-container--responsive');

  const table = document.createElement('table');
  table.className = 'table-widget__table';

  if (config.showHeader) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    config.columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      applyAlignment(th, column.align);
      applyColumnEmphasis(th, column.emphasis);
      if (typeof column.width === 'number') th.style.width = `${column.width}px`;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  const tbody = document.createElement('tbody');
  config.rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.cells.forEach((cell) => {
      const column = config.columns.find((c) => c.id === cell.columnId);
      const td = document.createElement('td');
      applyAlignment(td, column?.align);
      applyCellEmphasis(td, cell.emphasis);
      if (typeof cell.colspan === 'number') td.colSpan = cell.colspan;
      if (typeof cell.rowspan === 'number') td.rowSpan = cell.rowspan;
      if (cell.tooltip) td.title = cell.tooltip;
      td.textContent = formatCellValue(cell.value, column?.format);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  tableContainer.appendChild(table);
  wrapper.appendChild(tableContainer);

  if (config.summary && config.summary.length > 0) {
    const summaryList = document.createElement('dl');
    summaryList.className = 'table-widget__summary';
    config.summary.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'table-widget__summary-item';

      const label = document.createElement('dt');
      label.className = 'table-widget__summary-label';
      label.textContent = s.label;

      const value = document.createElement('dd');
      value.className = 'table-widget__summary-value';
      applyAlignment(value, s.align);
      value.textContent = typeof s.value === 'number' ? formatNumber(s.value) : String(s.value);

      item.append(label, value);
      summaryList.appendChild(item);
    });
    wrapper.appendChild(summaryList);
  }

  if (config.footnote) {
    const footnote = document.createElement('p');
    footnote.className = 'table-widget__footnote';
    footnote.textContent = config.footnote;
    wrapper.appendChild(footnote);
  }

  return wrapper;
};

const renderTableWidget = ({
  element,
  data,
}: {
  element: HTMLElement;
  data: WidgetRenderDescriptor;
}) => {
  const config = toTableWidgetConfig(data);
  const tableElement = buildTableElement(config);

  if (data.title && data.title.trim().length > 0) {
    const heading = document.createElement('h3');
    heading.className = 'table-widget__title';
    heading.textContent = data.title;
    tableElement.prepend(heading);
  }

  element.replaceChildren(tableElement);
};

if (typeof window !== 'undefined') {
  widgetRendererRegistry.unregister('table');
  widgetRendererRegistry.register('table', renderTableWidget);
}

export {};
