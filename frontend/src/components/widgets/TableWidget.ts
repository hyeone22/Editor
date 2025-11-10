import type {
  TableCellAlignment,
  TableColumnConfig,
  TableRowData,
  TableSummaryRow,
  TableValueFormat,
} from '../../types/Widget';
import {
  widgetRendererRegistry,
  type WidgetRenderDescriptor,
} from '../../utils/widgetRenderer';

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAlignment = (value: unknown): value is TableCellAlignment =>
  value === 'left' || value === 'center' || value === 'right';

const isValueFormat = (value: unknown): value is TableValueFormat =>
  value === 'text' ||
  value === 'currency' ||
  value === 'percent' ||
  value === 'number' ||
  value === 'date' ||
  value === 'rating';

const cloneColumns = (columns: TableColumnConfig[]): TableColumnConfig[] =>
  columns.map((column) => ({ ...column }));

const cloneRows = (rows: TableRowData[]): TableRowData[] =>
  rows.map((row) => ({
    id: row.id,
    cells: row.cells.map((cell) => ({ ...cell })),
    expandableContent: row.expandableContent,
  }));

const parseColumnConfig = (value: unknown): TableColumnConfig | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const idValue = value['id'];
  const labelValue = value['label'];
  if (typeof idValue !== 'string' || idValue.trim().length === 0) {
    return null;
  }
  if (typeof labelValue !== 'string' || labelValue.trim().length === 0) {
    return null;
  }

  const column: TableColumnConfig = {
    id: idValue,
    label: labelValue,
  };

  const widthValue = value['width'];
  if (typeof widthValue === 'number' && Number.isFinite(widthValue)) {
    column.width = widthValue;
  }

  const alignValue = value['align'];
  if (isAlignment(alignValue)) {
    column.align = alignValue;
  }

  const formatValue = value['format'];
  if (isValueFormat(formatValue)) {
    column.format = formatValue;
  }

  const emphasisValue = value['emphasis'];
  if (
    emphasisValue === 'primary' ||
    emphasisValue === 'secondary' ||
    emphasisValue === 'muted'
  ) {
    column.emphasis = emphasisValue;
  }

  return column;
};

const parseColumns = (value: unknown): TableColumnConfig[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value
    .map((column) => parseColumnConfig(column))
    .filter((column): column is TableColumnConfig => Boolean(column));

  return parsed.length > 0 ? parsed : null;
};

const parseCell = (
  value: unknown,
): TableRowData['cells'][number] | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const columnIdValue = value['columnId'];
  if (typeof columnIdValue !== 'string' || columnIdValue.trim().length === 0) {
    return null;
  }

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
  if (
    emphasisValue === 'positive' ||
    emphasisValue === 'negative' ||
    emphasisValue === 'neutral'
  ) {
    cell.emphasis = emphasisValue;
  }

  const tooltipValue = value['tooltip'];
  if (typeof tooltipValue === 'string' && tooltipValue.trim().length > 0) {
    cell.tooltip = tooltipValue;
  }

  return cell;
};

const parseRow = (value: unknown): TableRowData | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const idValue = value['id'];
  if (typeof idValue !== 'string' || idValue.trim().length === 0) {
    return null;
  }

  const cellsValue = value['cells'];
  if (!Array.isArray(cellsValue)) {
    return null;
  }

  const cells = cellsValue
    .map((cell) => parseCell(cell))
    .filter((cell): cell is TableRowData['cells'][number] => Boolean(cell));

  if (cells.length === 0) {
    return null;
  }

  const row: TableRowData = {
    id: idValue,
    cells,
  };

  const expandableContent = value['expandableContent'];
  if (typeof expandableContent === 'string' && expandableContent.trim().length > 0) {
    row.expandableContent = expandableContent;
  }

  return row;
};

const parseRows = (value: unknown): TableRowData[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value
    .map((row) => parseRow(row))
    .filter((row): row is TableRowData => Boolean(row));

  return parsed.length > 0 ? parsed : null;
};

const parseSummaryRow = (value: unknown): TableSummaryRow | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const labelValue = value['label'];
  const summaryValue = value['value'];

  if (typeof labelValue !== 'string' || labelValue.trim().length === 0) {
    return null;
  }

  if (
    (typeof summaryValue !== 'string' || summaryValue.trim().length === 0) &&
    typeof summaryValue !== 'number'
  ) {
    return null;
  }

  const summary: TableSummaryRow = {
    label: labelValue,
    value: summaryValue,
  };

  const alignValue = value['align'];
  if (isAlignment(alignValue)) {
    summary.align = alignValue;
  }

  return summary;
};

const parseSummary = (value: unknown): TableSummaryRow[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed = value
    .map((summaryRow) => parseSummaryRow(summaryRow))
    .filter((summaryRow): summaryRow is TableSummaryRow => Boolean(summaryRow));

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
  if (!config || !isPlainObject(config)) {
    return base;
  }

  const columnsValue = config['columns'];
  const rowsValue = config['rows'];
  const showHeaderValue = config['showHeader'];
  const summaryValue = config['summary'];
  const footnoteValue = config['footnote'];
  const responsiveValue = config['responsive'];

  const parsedColumns = parseColumns(columnsValue);
  if (parsedColumns) {
    base.columns = parsedColumns;
  }

  const parsedRows = parseRows(rowsValue);
  if (parsedRows) {
    base.rows = parsedRows;
  }

  if (typeof showHeaderValue === 'boolean') {
    base.showHeader = showHeaderValue;
  }

  const parsedSummary = parseSummary(summaryValue);
  if (parsedSummary) {
    base.summary = parsedSummary;
  }

  if (typeof footnoteValue === 'string' && footnoteValue.trim().length > 0) {
    base.footnote = footnoteValue;
  }

  if (typeof responsiveValue === 'boolean') {
    base.responsive = responsiveValue;
  }

  return base;
};

const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

const formatCellValue = (value: unknown, format: TableValueFormat | undefined): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return '—';
  }

  switch (format) {
    case 'currency':
      if (typeof value === 'number') {
        return formatNumber(value, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      }
      break;
    case 'percent':
      if (typeof value === 'number') {
        return formatPercent(value);
      }
      break;
    case 'number':
      if (typeof value === 'number') {
        return formatNumber(value);
      }
      break;
    case 'date':
      if (typeof value === 'string' || value instanceof Date) {
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return new Intl.DateTimeFormat('ko-KR').format(date);
        }
      }
      break;
    case 'rating':
      if (typeof value === 'number') {
        const normalised = Math.max(0, Math.min(5, Math.round(value)));
        return '★'.repeat(normalised).padEnd(5, '☆');
      }
      break;
    default:
      break;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
};

const applyAlignment = (element: HTMLElement, alignment: TableCellAlignment | undefined) => {
  if (!alignment) {
    return;
  }

  element.classList.add(`table-widget__cell--align-${alignment}`);
};

const applyColumnEmphasis = (element: HTMLElement, emphasis: TableColumnConfig['emphasis']) => {
  if (!emphasis) {
    return;
  }

  element.classList.add(`table-widget__header--${emphasis}`);
};

const applyCellEmphasis = (element: HTMLElement, emphasis: TableRowData['cells'][number]['emphasis']) => {
  if (!emphasis) {
    return;
  }

  element.classList.add(`table-widget__cell--${emphasis}`);
};

const buildTableElement = (config: TableWidgetConfig): HTMLDivElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-widget';

  const tableContainer = document.createElement('div');
  tableContainer.className = 'table-widget__table-container';
  if (config.responsive) {
    tableContainer.classList.add('table-widget__table-container--responsive');
  }

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
      if (typeof column.width === 'number') {
        th.style.width = `${column.width}px`;
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  const tbody = document.createElement('tbody');
  config.rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.cells.forEach((cell) => {
      const column = config.columns.find((item) => item.id === cell.columnId);
      const td = document.createElement('td');
      applyAlignment(td, column?.align);
      applyCellEmphasis(td, cell.emphasis);
      if (typeof cell.colspan === 'number') {
        td.colSpan = cell.colspan;
      }
      if (typeof cell.rowspan === 'number') {
        td.rowSpan = cell.rowspan;
      }
      if (cell.tooltip) {
        td.title = cell.tooltip;
      }
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
    config.summary.forEach((summaryRow) => {
      const item = document.createElement('div');
      item.className = 'table-widget__summary-item';

      const label = document.createElement('dt');
      label.className = 'table-widget__summary-label';
      label.textContent = summaryRow.label;

      const value = document.createElement('dd');
      value.className = 'table-widget__summary-value';
      applyAlignment(value, summaryRow.align);
      value.textContent =
        typeof summaryRow.value === 'number'
          ? formatNumber(summaryRow.value)
          : String(summaryRow.value);

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
