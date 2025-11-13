// TinyMceEditor.tsx
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureWidgetPlugin } from '../../plugins/widgetPlugin';
import attachWidgetDragDrop from '../../plugins/widgetDragDrop';
import attachWidgetResize from '../../plugins/widgetResize';
import ExportButton from './ExportButton';

// 커스텀 위젯 렌더러 등록(에디터용 런타임은 기존처럼 유지)
import '../widgets/TextWidget';
import '../widgets/TableWidget';
import '../widgets/GraphWidget';
import '../widgets/PageBreakWidget';

type EditorStatus = 'loading' | 'ready' | 'error';

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const DEFAULT_API_KEY = 'no-api-key';
// ✅ 프리미엄 애드온 사용을 위해 TinyMCE v8 채널 사용
const TINYMCE_CHANNEL = '8';

// === Upload ===
const UPLOADCARE_PUBLIC_KEY = 'a3920bdf61b6edc8ea74';

interface TinyMcePluginManager {
  add: (name: string, callback: (editor: unknown) => void) => void;
}
interface TinyMceEvent {
  key?: string;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}
interface TinyMceInstance {
  remove: () => void;
  on: <T = TinyMceEvent>(eventName: string, callback: (event: T) => void) => void;
  off?: (eventName: string, callback: (event: TinyMceEvent) => void) => void;
  insertContent: (content: string) => void;
  focus?: () => void;
  selection?: { getNode?: () => HTMLElement | null };
  getBody?: () => HTMLElement | null;
  fire?: (eventName: string, data?: Record<string, unknown>) => void;
  nodeChanged?: () => void;
  setDirty?: (state: boolean) => void;
  execCommand?: (cmd: string, ui?: boolean, value?: unknown) => void;
}
interface TinyMceGlobal {
  init: (
    config: Record<string, unknown>,
  ) => Promise<TinyMceInstance | TinyMceInstance[]> | TinyMceInstance | TinyMceInstance[];
  PluginManager: TinyMcePluginManager;
}
declare global {
  interface Window {
    tinymce?: TinyMceGlobal & { majorVersion?: string; minorVersion?: string };
    uploadcare?: any;
  }
}

/* -----------------------------
   프리뷰 전용 위젯 프리렌더러
--------------------------------*/
function mountAllWidgets(doc: Document) {
  const hosts = Array.from(doc.querySelectorAll<HTMLElement>('[data-widget-type]'));
  hosts.forEach((host) => {
    const type = host.getAttribute('data-widget-type');
    const cfgRaw = host.getAttribute('data-widget-config');
    let cfg: any = null;
    try {
      cfg = cfgRaw ? JSON.parse(cfgRaw.replaceAll('&apos;', "'").replaceAll('&#39;', "'")) : null;
    } catch {
      cfg = null;
    }

    host.innerHTML = '';

    if (type === 'text') {
      renderTextWidget(host, cfg);
    } else if (type === 'table') {
      renderTableWidget(host, cfg);
    } else if (type === 'graph') {
      renderGraphWidget(host, cfg);
    } else if (type === 'pageBreak') {
      renderPageBreak(host);
    }
  });
}

function renderTextWidget(host: HTMLElement, cfg: any) {
  const wrapper = host.ownerDocument.createElement('div');
  wrapper.className = 'widget-block text-widget';
  wrapper.innerHTML =
    cfg?.content ?? '<p class="text-widget__placeholder">텍스트 위젯 내용이 없습니다.</p>';
  host.appendChild(wrapper);
}

function renderTableWidget(host: HTMLElement, cfg: any) {
  const d = host.ownerDocument;
  const wrap = d.createElement('div');
  wrap.className = 'widget-block table-widget';

  const title = host.getAttribute('data-widget-title');
  if (title) {
    const h = d.createElement('div');
    h.style.fontWeight = '700';
    h.style.marginBottom = '8px';
    h.textContent = String(title);
    wrap.appendChild(h);
  }

  const container = d.createElement('div');
  container.className = 'table-widget__table-container';

  const table = d.createElement('table');
  table.className = 'table-widget__table';

  if (cfg?.showHeader !== false && Array.isArray(cfg?.columns)) {
    const thead = d.createElement('thead');
    const tr = d.createElement('tr');
    cfg.columns.forEach((c: any) => {
      const th = d.createElement('th');
      th.textContent = c?.label ?? '';
      th.style.textAlign = c?.align ?? 'left';
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  const tbody = d.createElement('tbody');
  (cfg?.rows ?? []).forEach((row: any) => {
    const tr = d.createElement('tr');
    (row?.cells ?? []).forEach((cell: any, i: number) => {
      const td = d.createElement('td');
      const col = cfg?.columns?.[i];
      td.style.textAlign = col?.align ?? 'left';
      td.textContent = formatCell(cell?.value, col?.format);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
  wrap.appendChild(container);

  if (Array.isArray(cfg?.summary) && cfg.summary.length) {
    const sum = d.createElement('div');
    sum.className = 'table-widget__summary';
    cfg.summary.forEach((s: any) => {
      const line = d.createElement('div');
      line.style.textAlign = s?.align ?? 'right';
      line.textContent = `${s?.label ?? ''} ${s?.value ?? ''}`.trim();
      sum.appendChild(line);
    });
    wrap.appendChild(sum);
  }

  if (cfg?.footnote) {
    const note = d.createElement('div');
    note.className = 'table-widget__footnote';
    note.textContent = String(cfg.footnote);
    wrap.appendChild(note);
  }

  host.appendChild(wrap);
}

function formatCell(v: any, format?: string) {
  if (format === 'currency' && typeof v === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(v);
  }
  if (format === 'percent' && typeof v === 'number') {
    return `${(v * 100).toFixed(1)}%`;
  }
  return String(v ?? '');
}

function renderGraphWidget(host: HTMLElement, cfg: any) {
  const d = host.ownerDocument;
  const wrap = d.createElement('div');
  wrap.className = 'widget-block graph-widget';

  const title = host.getAttribute('data-widget-title');
  if (title) {
    const h = d.createElement('div');
    h.style.fontWeight = '700';
    h.style.marginBottom = '8px';
    h.textContent = String(title);
    wrap.appendChild(h);
  }

  const w = 760;
  const h = 320;
  const pad = 32;

  const svg = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  svg.classList.add('graph-widget__canvas');

  const labels: string[] = cfg?.labels ?? [];
  const datasets: Array<{ id?: string; label?: string; data: number[] }> = cfg?.datasets ?? [];

  const allValues = datasets.flatMap((ds) => ds.data);
  const minV = Math.min(...allValues, 0);
  const maxV = Math.max(...allValues, 1);
  const yScale = (val: number) => h - pad - ((val - minV) / (maxV - minV || 1)) * (h - pad * 2);
  const xScale = (i: number) => pad + (i * (w - pad * 2)) / Math.max(labels.length - 1, 1);

  const axis = d.createElementNS(svg.namespaceURI, 'g');
  const xLine = d.createElementNS(svg.namespaceURI, 'line');
  xLine.setAttribute('x1', String(pad));
  xLine.setAttribute('y1', String(h - pad));
  xLine.setAttribute('x2', String(w - pad));
  xLine.setAttribute('y2', String(h - pad));
  xLine.setAttribute('stroke', 'currentColor');
  xLine.setAttribute('opacity', '0.3');
  axis.appendChild(xLine);

  const yLine = d.createElementNS(svg.namespaceURI, 'line');
  yLine.setAttribute('x1', String(pad));
  yLine.setAttribute('y1', String(pad));
  yLine.setAttribute('x2', String(pad));
  yLine.setAttribute('y2', String(h - pad));
  yLine.setAttribute('stroke', 'currentColor');
  yLine.setAttribute('opacity', '0.3');
  axis.appendChild(yLine);
  svg.appendChild(axis);

  labels.forEach((lab, i) => {
    const tx = d.createElementNS(svg.namespaceURI, 'text');
    tx.textContent = lab;
    tx.setAttribute('x', String(xScale(i)));
    tx.setAttribute('y', String(h - pad + 18));
    tx.setAttribute('text-anchor', 'middle');
    tx.setAttribute('font-size', '12');
    tx.setAttribute('fill', 'currentColor');
    tx.setAttribute('opacity', '0.6');
    svg.appendChild(tx);
  });

  const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  datasets.forEach((ds, idx) => {
    if ((cfg?.chartType ?? 'line') === 'bar') {
      const barW = Math.min(36, (w - pad * 2) / (labels.length * (datasets.length + 1)));
      ds.data.forEach((v, i) => {
        const x = xScale(i) - (datasets.length / 2) * barW + idx * barW;
        const y = yScale(v);
        const rect = d.createElementNS(svg.namespaceURI, 'rect');
        rect.setAttribute('x', String(x - barW / 2));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(barW));
        rect.setAttribute('height', String(h - pad - y));
        rect.setAttribute('fill', palette[idx % palette.length]);
        rect.setAttribute('opacity', '0.85');
        svg.appendChild(rect);
      });
    } else {
      const path = d.createElementNS(svg.namespaceURI, 'path');
      const dStr = ds.data
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
        .join(' ');
      path.setAttribute('d', dStr);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', palette[idx % palette.length]);
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);

      ds.data.forEach((v, i) => {
        const circle = d.createElementNS(svg.namespaceURI, 'circle');
        circle.setAttribute('cx', String(xScale(i)));
        circle.setAttribute('cy', String(yScale(v)));
        circle.setAttribute('r', '3.5');
        circle.setAttribute('fill', palette[idx % palette.length]);
        svg.appendChild(circle);
      });
    }
  });

  wrap.appendChild(svg);

  if (cfg?.options?.yAxisLabel || cfg?.options?.xAxisLabel) {
    const note = d.createElement('div');
    note.className = 'graph-widget__note';
    note.textContent = [cfg?.options?.xAxisLabel, cfg?.options?.yAxisLabel]
      .filter(Boolean)
      .join(' / ');
    wrap.appendChild(note);
  }

  host.appendChild(wrap);
}

function renderPageBreak(host: HTMLElement) {
  host.setAttribute('data-page-break', 'true');
  const d = host.ownerDocument;
  const wrap = d.createElement('div');
  wrap.className = 'widget-block page-break-widget';
  wrap.textContent = '페이지 나누기 — 여기서 새 페이지가 시작됩니다';
  host.appendChild(wrap);
}

/* -----------------------------
   에디터 컴포넌트
--------------------------------*/
const TinyMceEditor: FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<TinyMceInstance | null>(null);
  const dragDropCleanupRef = useRef<(() => void) | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<EditorStatus>('loading');

  const apiKey =
    (import.meta.env.VITE_TINYMCE_API_KEY ?? DEFAULT_API_KEY).trim() || DEFAULT_API_KEY;

  // ===== 샘플 configs =====
  const sampleTextWidgetConfig = useMemo(() => {
    const config = {
      content:
        '<p><strong>재무 요약</strong> — 당사는 최근 매출이 30.5% 증가하였으나 현금성자산 감소로…</p><ul><li>표·그림·텍스트 위젯 배치/정렬 가능</li><li>순서 변경, 크기/위치 조정 가능</li></ul>',
      richText: true,
      style: { alignment: 'left', fontSize: 15, lineHeight: 1.6 },
    };
    return JSON.stringify(config).replace(/'/g, '&#39;');
  }, []);
  const sampleTableWidgetConfig = useMemo(() => {
    const config = {
      showHeader: true,
      responsive: true,
      columns: [
        { id: 'col-name', label: '기업명', align: 'left', format: 'text' },
        { id: 'col-ceo', label: '대표자', align: 'left', format: 'text' },
        { id: 'col-since', label: '설립일자', align: 'left', format: 'text' },
        { id: 'col-addr', label: '본사주소', align: 'left', format: 'text' },
      ],
      rows: [
        {
          id: 'row-1',
          cells: [
            { columnId: 'col-name', value: '한국기업 주식회사' },
            { columnId: 'col-ceo', value: '홍길동' },
            { columnId: 'col-since', value: '2001-03-12' },
            { columnId: 'col-addr', value: '서울특별시 …' },
          ],
        },
        {
          id: 'row-2',
          cells: [
            { columnId: 'col-name', value: '한국기업 주식회사' },
            { columnId: 'col-ceo', value: '홍길동' },
            { columnId: 'col-since', value: '2001-03-12' },
            { columnId: 'col-addr', value: '서울특별시 …' },
          ],
        },
        {
          id: 'row-3',
          cells: [
            { columnId: 'col-name', value: '한국기업 주식회사' },
            { columnId: 'col-ceo', value: '홍길동' },
            { columnId: 'col-since', value: '2001-03-12' },
            { columnId: 'col-addr', value: '서울특별시 …' },
          ],
        },
        {
          id: 'row-4',
          cells: [
            { columnId: 'col-name', value: '한국기업 주식회사' },
            { columnId: 'col-ceo', value: '홍길동' },
            { columnId: 'col-since', value: '2001-03-12' },
            { columnId: 'col-addr', value: '서울특별시 …' },
          ],
        },
      ],
      summary: [],
      footnote: '',
    };
    return JSON.stringify(config).replace(/'/g, '&#39;');
  }, []);
  const sampleGraphWidgetConfig = useMemo(() => {
    const config = {
      chartType: 'line',
      labels: ['2023 Q1', '2023 Q2', '2023 Q3', '2023 Q4'],
      datasets: [
        { id: 'growth-actual', label: '실제 성장률', data: [12.5, 14.2, 16.1, 18.4] },
        { id: 'growth-target', label: '목표 성장률', data: [11, 13, 15, 17] },
      ],
      options: { legend: true, showGrid: true, yAxisLabel: '%', xAxisLabel: '분기', precision: 1 },
    };
    return JSON.stringify(config).replace(/'/g, '&#39;');
  }, []);

  // ===== 초기 콘텐츠 =====
  const initialContent = useMemo(
    () =>
      [
        '<h2>재무 보고서 초안</h2>',
        '<p>이 영역은 TinyMCE 에디터가 로딩된 뒤 자유롭게 편집할 수 있는 콘텐츠 영역입니다.</p>',
        '<ul>',
        '<li><strong>굵게</strong>, <em>기울임꼴</em>, <u>밑줄</u>과 같은 서식을 적용해 보세요.</li>',
        '<li>목록, 링크, 표 등 TinyMCE 기본 기능이 정상 동작하는지 확인할 수 있습니다.</li>',
        '</ul>',
        `<div data-widget-type="table" data-widget-title="분기별 매출" data-widget-config='${sampleTableWidgetConfig}'></div>`,
        `<div data-widget-type="graph" data-widget-title="분기별 성장률" data-widget-config='${sampleGraphWidgetConfig}'></div>`,
        '<div data-widget-type="pageBreak" data-widget-title="페이지 나누기" data-page-break="true"></div>',
        `<div data-widget-type="text" data-widget-title="보고서 요약" data-widget-config='${sampleTextWidgetConfig}'></div>`,
      ].join(''),
    [sampleTextWidgetConfig, sampleTableWidgetConfig, sampleGraphWidgetConfig],
  );

  // ===== 위젯 삽입 버튼 =====
  const handleInsertTextWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const config = {
      content: '<p>새 텍스트 위젯 내용을 입력하세요.</p>',
      richText: true,
      style: { alignment: 'left', lineHeight: 1.6 },
    };
    const serialised = JSON.stringify(config).replace(/'/g, '&#39;');
    editor.insertContent(
      `<div data-widget-type="text" data-widget-title="새 텍스트" data-widget-config='${serialised}'></div>`,
    );
    editor.focus?.();
  }, []);
  const handleInsertTableWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const cfg = {
      showHeader: true,
      responsive: true,
      columns: [
        { id: 'q', label: '분기', align: 'left', format: 'text' },
        { id: 'rev', label: '매출', align: 'right', format: 'currency' },
      ],
      rows: [
        {
          id: 'r1',
          cells: [
            { columnId: 'q', value: '2024 Q3' },
            { columnId: 'rev', value: 16_000_000 },
          ],
        },
      ],
      summary: [{ label: '합계', value: '$16.0M', align: 'right' }],
      footnote: '테스트 삽입',
    };
    const payload = JSON.stringify(cfg).replace(/'/g, '&#39;');
    editor.insertContent(
      `<div data-widget-type="table" data-widget-title="테스트 테이블" data-widget-config='${payload}'></div>`,
    );
    editor.focus?.();
  }, []);
  const handleInsertGraphWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const config = {
      chartType: 'bar',
      labels: ['제품 A', '제품 B', '제품 C'],
      datasets: [{ id: 'sales', label: '매출', data: [120, 95, 135] }],
      options: { legend: true, showGrid: true, yAxisLabel: '단위: 억원' },
    };
    const payload = JSON.stringify(config).replace(/'/g, '&#39;');
    editor.insertContent(
      `<div data-widget-type="graph" data-widget-title="제품별 매출" data-widget-config='${payload}'></div>`,
    );
    editor.focus?.();
  }, []);
  const handleInsertPageBreakWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.insertContent(
      '<div data-widget-type="pageBreak" data-widget-title="페이지 나누기" data-page-break="true"></div>',
    );
    editor.focus?.();
  }, []);

  // ===== iframe 내부 스타일 =====
  const contentStyle = useMemo(
    () =>
      [
        '/* ========= THEME TOKENS ========= */',
        ':root{ --card-bg:#f8fafc; --card-border:#e2e8f0; --card-grad:linear-gradient(180deg,rgba(148,163,184,.25),rgba(148,163,184,0)); --ink:#0f172a; --ink-sub:#475569; --accent:#0ea5e9; --accent-ink:#0369a1; --ring:0 0 0 3px rgba(14,165,233,.35); }',
        '@media (prefers-color-scheme: dark){ :root{ --card-bg:#0b1220; --card-border:#1f2937; --card-grad:linear-gradient(180deg,rgba(148,163,184,.18),rgba(148,163,184,0)); --ink:#e5e7eb; --ink-sub:#9ca3af; --accent:#22d3ee; --accent-ink:#67e8f9; --ring:0 0 0 3px rgba(34,211,238,.4); } }',
        "body{ font-family:'Noto Sans KR',system-ui,-apple-system,'Segoe UI',sans-serif; font-size:16px; color:var(--ink); position:relative; }",
        '[data-widget-type]{ cursor: default !important; }',
        '.widget-block{ cursor: default !important; }',

        /* ========= WIDGET HOST: block으로 고정 (정렬용) ========= */
        '[data-widget-type]{ position:relative; display:block; width:100%; max-width:100%; min-width:220px; box-sizing:border-box; margin:10px 12px 10px 0; break-inside:avoid; -webkit-column-break-inside:avoid; }',

        /* free 모드일 때만 절대배치 */
        '[data-widget-type][data-position="free"]{ position:absolute !important; width:auto !important; max-width:none !important; min-width:120px; margin:0; box-sizing:border-box; z-index:1; }',
        '[data-widget-type][data-position="free"] .widget-block{ width:auto !important; }',

        /* 카드 스타일 */
        '.widget-block{position:relative;background:transparent;border:2px solid #6025E1;border-radius:14px;padding:16px;width:100%;box-sizing:border-box;overflow:hidden;color:#000;transition:border-color .2s ease,box-shadow .2s ease;}',
        '.widget-block::before{content:none;}',
        '.widget-block:hover{border-color:#7a3df5;box-shadow:0 0 0 3px rgba(96,37,225,0.15);}',
        '.widget-block:focus-within{border-color:#7a3df5;box-shadow:0 0 0 3px rgba(96,37,225,0.25);}',
        '.widget-block--dragging{opacity:.9;cursor:grabbing;border-style:solid;}',
        '.widget-block--resizing{cursor:se-resize;border-color:#6025E1;box-shadow:0 0 0 2px rgba(96,37,225,0.25);}',
        ".widget-block::after{content:'';position:absolute;right:.6rem;bottom:.6rem;width:12px;height:12px;border-right:2px solid #6025E1;border-bottom:2px solid #6025E1;opacity:.8;pointer-events:none;}",

        /* 리사이즈 핸들 */
        '.widget-resize-handle{ position:absolute; width:12px; height:12px; background:#fff; border:2px solid #0ea5e9; border-radius:4px; z-index:1000; pointer-events:auto; }',
        '.widget-resize-handle--se{ right:6px; bottom:6px; cursor:nwse-resize; }',
        '.widget-resize-handle--ne{ right:6px; top:6px;    cursor:nesw-resize; }',
        '.widget-resize-handle--sw{ left:6px;  bottom:6px; cursor:nesw-resize; }',
        '.widget-resize-handle--nw{ left:6px;  top:6px;    cursor:nwse-resize; }',
        '.widget-resize-handle--e{  right:-6px; top:50%; transform:translateY(-50%); cursor:ew-resize; }',
        '.widget-resize-handle--w{  left:-6px;  top:50%; transform:translateY(-50%); cursor:ew-resize; }',
        '.widget-resize-handle--s{  bottom:-6px; left:50%; transform:translateX(-50%); cursor:ns-resize; }',
        '.widget-resize-handle--n{  top:-6px;    left:50%; transform:translateX(-50%); cursor:ns-resize; }',

        /* 표/그래프 */
        '.table-widget{ display:grid; gap:12px }',
        '.table-widget__table-container{ overflow:auto; border-radius:10px; border:1px solid #e2e8f0; background:linear-gradient(180deg,rgba(148,163,184,.08),rgba(148,163,184,0)) }',
        '.table-widget__table{ width:100%; border-collapse:collapse; min-width:520px }',
        '.table-widget__table thead th{ position:sticky; top:0; background:#fff; font-weight:700; font-size:13.5px; color:#475569; letter-spacing:.02em; border-bottom:1px solid #e2e8f0; padding:10px 12px; text-align:left }',
        '.table-widget__table tbody tr:nth-child(even){ background:rgba(148,163,184,.08) }',
        '.table-widget__table tbody td{ padding:10px 12px; border-bottom:1px dashed #e2e8f0; vertical-align:top; font-size:14px }',
        '.table-widget__summary{ display:grid; gap:6px; margin:4px 0 0 }',
        '.table-widget__footnote{ color:#64748b; font-size:12px; margin-top:6px }',
        '.graph-widget{ display:grid; gap:10px }',
        '.graph-widget__canvas{ background:#fff; border:1px solid #e2e8f0; border-radius:10px; }',
        '.graph-widget__note{ margin-top:6px; font-size:12px; color:#64748b }',

        /* ===== 정렬: host 자체 이동 ===== */
        '[data-widget-type]:not([data-position="free"])[data-align="left"]  { margin-left:0;    margin-right:auto; }',
        '[data-widget-type]:not([data-position="free"])[data-align="center"]{ margin-left:auto; margin-right:auto; }',
        '[data-widget-type]:not([data-position="free"])[data-align="right"] { margin-left:auto; margin-right:0; }',

        /* 레이아웃 */
        '.report-header{ display:grid; grid-template-columns: 1.2fr 1fr 1.1fr; grid-template-areas:"brand title meta" ". corp  meta"; gap:6px 24px; align-items:end; margin:6px 2px 18px;}',
        '.report-header .brand{ grid-area:brand; font-weight:700; font-size:20px; letter-spacing:.2px;}',
        '.report-header .report-title{ grid-area:title; margin:0; font-size:28px; font-weight:800;}',
        '.report-header .corp-name{ grid-area:corp; font-size:20px; font-weight:800;}',
        '.report-header .meta{ grid-area:meta; justify-self:end; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; min-width:360px; background:#fff;}',
        '.section{ margin-top:2px;}',
        '.section-title{ font-size:22px; font-weight:800; margin:10px 0 14px;}',
        '.subsection-title{ font-size:18px; font-weight:800; margin:8px 0 10px;}',
        '.metrics-grid{ display:grid; grid-template-columns: 1.1fr .9fr; gap:16px; align-items:start; }',
        '.widget-tag{ display:inline-block; background:#6d28d9; color:#fff; font-weight:800; font-size:14px; line-height:1; padding:8px 14px; border-radius:10px 10px 0 0; margin:8px 0 -2px 0; }',

        '.meta-dl{ margin:0; display:grid; gap:10px; }',
        '.meta-dl .row{ display:grid; grid-template-columns: 1fr 1fr; align-items:center; column-gap:24px; }',
        '.meta-dl dt{ margin:0; color:#9aa3b2; font-weight:800; font-size:28px; line-height:1.1; text-align:right; letter-spacing:-0.2px;}',
        '.meta-dl dd{ margin:0; color:#0f172a; font-weight:800; font-size:28px; line-height:1.1; }',

        '@media print{',
        "  [data-page-break='true']{ break-after:page; page-break-after:always }",
        "  [data-page-break='true'][data-keep-with-next='true']{ break-inside:avoid; page-break-inside:avoid }",
        "  [data-page-break='true'][data-keep-with-next='true'] + *{ break-before:avoid-page; page-break-before:auto }",
        '  .page-break-widget{ border:0; padding:0; color:transparent; background:none }',
        '  .report-header .meta{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }',

        '  /* === 내보내기 시 에디터 장식/핸들 숨김 === */',
        '  .widget-resize-handle,',
        '  .widget-block--dragging,',
        '  .widget-block--resizing,',
        '  .widget-block::after,',
        '  [data-widget-type]::before,',
        '  [data-widget-type]::after{',
        '    display:none !important;',
        '    content:none !important;',
        '  }',

        '  /* 인쇄용으로 테두리/그림자 정리 */',
        '  .widget-block{',
        '    border:1px solid #e5e7eb !important;',
        '    box-shadow:none !important;',
        '    background:#fff !important;',
        '  }',

        '  /* free 배치도 인쇄에선 문서 흐름으로 */',
        '  [data-widget-type][data-position="free"]{',
        '    position:static !important;',
        '    transform:none !important;',
        '    left:auto !important; top:auto !important;',
        '  }',

        '  /* 포커스/아웃라인 제거 */',
        '  [data-widget-type]{ outline:none !important; }',
        '}',
      ].join('\n'),
    [],
  );

  const exportInlineStyles = useMemo(() => [contentStyle], [contentStyle]);
  const getEditorBody = useCallback(() => editorRef.current?.getBody?.() ?? null, []);

  // ===== 업로드(Uploadcare → base64) =====
  async function uploadViaUploadcare(): Promise<string | null> {
    try {
      if (!window.uploadcare || !UPLOADCARE_PUBLIC_KEY) return null;
      const dialog = window.uploadcare.openDialog(null, {
        publicKey: UPLOADCARE_PUBLIC_KEY,
        multiple: false,
        imagesOnly: true,
        crop: 'free',
      });
      const file = await dialog.done();
      const fileInfo = await file.promise();
      return fileInfo?.cdnUrl || null;
    } catch {
      return null;
    }
  }

  async function images_upload_handler(blobInfo: any) {
    if (window.uploadcare) {
      const maybe = await uploadViaUploadcare();
      if (maybe) return maybe;
    }
    return blobInfo.base64(); // fallback
  }

  const file_picker_callback = async (
    cb: (url: string, meta?: Record<string, any>) => void,
    _value: string,
    meta: { filetype: 'image' | 'media' | 'file' },
  ) => {
    if (meta.filetype !== 'image') return;

    const fromUploadcare = await uploadViaUploadcare();
    if (fromUploadcare) {
      cb(fromUploadcare, { alt: 'image' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => cb(String(reader.result), { alt: file.name });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;

    let isMounted = true;
    const setStatusSafe = (v: EditorStatus) => isMounted && setStatus(v);

    const cleanupAll = () => {
      dragDropCleanupRef.current?.();
      dragDropCleanupRef.current = null;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      editorRef.current?.remove();
      editorRef.current = null;
    };

    const initialiseEditor = async () => {
      if (!window.tinymce) {
        setStatusSafe('error');
        return;
      }
      try {
        // 커스텀 플러그인 보장
        ensureWidgetPlugin(window.tinymce as any);

        const result = await window.tinymce.init({
          target,
          height: 1080,
          branding: false,

          // ⬇ 커스텀 요소를 TinyMCE가 제대로 블록으로 인식하도록
          custom_elements: 'div[data-widget-type]',
          valid_children: '+body[div],+div[div]',

          // ✅ v8 + 프리미엄 애드온
          plugins: [
            'advlist autolink lists link table code preview searchreplace visualblocks fullscreen insertdatetime',
            'importcss',
            'image media',
            'pagebreak',
            'charmap codesample',
            'wordcount',
            'quickbars',
            'help',
            'widgetBlocks',
            'importword exportword exportpdf',
          ].join(' '),

          menubar: 'file edit view insert format tools table help',
          toolbar_mode: 'wrap',
          toolbar_sticky: true,

          // ===== 이미지/URL 설정 =====
          automatic_uploads: true,
          images_reuse_filename: true,
          // data URL 본문 삽입 방지(권장)
          paste_data_images: false,
          // Tiny가 URL을 변환하지 않도록
          convert_urls: false,
          urlconverter_callback: (url: string) => url,

          file_picker_types: 'image',
          file_picker_callback,
          images_upload_handler,

          toolbar: [
            'undo redo | blocks fontfamily fontsize lineheight | bold italic underline forecolor backcolor |',
            'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent |',
            'link table | image media | codesample charmap pagebreak | searchreplace |',
            'importword exportword exportpdf | removeformat | preview fullscreen | code | help',
          ].join(' '),

          menu: {
            file: {
              title: 'File',
              items:
                'preview print | newdocument restoredraft | fullscreen | importword exportword exportpdf',
            },
            edit: {
              title: 'Edit',
              items: 'undo redo | cut copy paste | selectall | searchreplace',
            },
            view: { title: 'View', items: 'visualaid visualblocks | preview fullscreen' },
            insert: {
              title: 'Insert',
              items: 'link image media table charmap pagebreak codesample',
            },
            format: {
              title: 'Format',
              items:
                'bold italic underline strikethrough forecolor backcolor | blocks fontfamily fontsize lineheight | removeformat',
            },
            tools: { title: 'Tools', items: 'code | wordcount' },
            table: {
              title: 'Table',
              items: 'inserttable | cell row column | tableprops deletetable',
            },
            help: { title: 'Help', items: 'help' },
          },

          quickbars_selection_toolbar:
            'bold italic underline | quicklink | forecolor backcolor | blocks',
          quickbars_insert_toolbar: 'image media table',

          object_resizing: false,

          font_family_formats:
            'Inter=Inter,system-ui,sans-serif;' +
            'Noto Sans KR=Noto Sans KR,Apple SD Gothic Neo,Malgun Gothic,sans-serif;' +
            'Serif=Georgia,Times New Roman,serif;' +
            'Monospace=Menlo,Consolas,monospace',
          fontsize_formats: '12px 14px 16px 18px 20px 24px 32px 48px',
          lineheight_formats: '1 1.15 1.2 1.4 1.6 1.8 2',

          content_style: contentStyle,
          resize: true,

          extended_valid_elements:
            'div[data-widget-type|data-align|data-widget-id|data-widget-config|data-widget-title|data-widget-version|data-widget-order|data-page-break|data-keep-with-next|data-spacing|data-display-label|data-position],' +
            'span[class|role|aria-hidden|contenteditable|tabindex|style|data-mce-bogus|draggable|unselectable]',

          setup: (editor: TinyMceInstance) => {
            editorRef.current = editor;

            // 프리뷰 열릴 때 스타일/위젯 주입
            editor.on('PreviewOpen', () => {
              const iframe = document.querySelector(
                '.tox-dialog__body-preview iframe',
              ) as HTMLIFrameElement | null;
              const doc = iframe?.contentDocument;
              if (!doc) return;

              const styleEl = doc.createElement('style');
              styleEl.textContent =
                contentStyle +
                `
                body { color: var(--ink, #0f172a) !important; }
                .widget-block { color: inherit !important; }
              `;
              doc.head.appendChild(styleEl);

              try {
                mountAllWidgets(doc);
              } catch (err) {
                console.error('Preview widget mount error', err);
              }
            });

            // ===== 위젯 정렬 브리지 =====
            const applyWidgetAlign = (cmd: string) => {
              const anchor = editor.selection?.getNode?.();
              const host = anchor?.closest?.('[data-widget-type]') as HTMLElement | null;
              if (!host) return false;
              if (host.getAttribute('data-position') === 'free') return false;

              let align: 'left' | 'center' | 'right' | 'justify' = 'left';
              if (cmd === 'JustifyCenter') align = 'center';
              else if (cmd === 'JustifyRight') align = 'right';
              else if (cmd === 'JustifyFull') align = 'justify';

              host.setAttribute('data-align', align === 'justify' ? 'left' : align);
              editor.fire?.('change');
              editor.setDirty?.(true);
              editor.nodeChanged?.();
              return true;
            };

            editor.on('BeforeExecCommand', (e: any) => {
              if (!/^Justify(Left|Center|Right|Full)$/.test(e.command)) return;
              if (applyWidgetAlign(e.command)) {
                e.preventDefault?.();
                e.stopPropagation?.();
              }
            });

            editor.on('init', () => {
              setStatusSafe('ready');

              // 드래그/리사이즈 플러그인 장착
              dragDropCleanupRef.current?.();
              dragDropCleanupRef.current = attachWidgetDragDrop(editor);
              resizeCleanupRef.current?.();
              resizeCleanupRef.current = attachWidgetResize(editor);

              // 더블클릭/Enter/Space → edit
              const body = editor.getBody?.();
              const doc = body?.ownerDocument;
              if (doc) {
                const handleDbl = (ev: MouseEvent) => {
                  const t = ev.target as HTMLElement | null;
                  const host = t?.closest?.('[data-widget-type]');
                  if (!host) return;
                  host.dispatchEvent(new CustomEvent('widget:edit', { bubbles: true }));
                  ev.preventDefault();
                  ev.stopPropagation();
                };
                const handleClick = (ev: MouseEvent) => {
                  if (ev.detail === 2) handleDbl(ev);
                };
                doc.addEventListener('dblclick', handleDbl, true);
                doc.addEventListener('click', handleClick, true);

                const handleWidgetChanged = () => {
                  editor.fire?.('change');
                  editor.setDirty?.(true);
                  editor.nodeChanged?.();
                };
                doc.addEventListener('widget:changed', handleWidgetChanged, true);

                editor.on('remove', () => {
                  dragDropCleanupRef.current?.();
                  dragDropCleanupRef.current = null;
                  resizeCleanupRef.current?.();
                  resizeCleanupRef.current = null;
                  doc.removeEventListener('dblclick', handleDbl, true);
                  doc.removeEventListener('click', handleClick, true);
                  doc.removeEventListener('widget:changed', handleWidgetChanged, true);
                });
              }
            });

            editor.on('KeyDown', (ev) => {
              if (ev.key !== 'Enter' && ev.key !== ' ') return;
              const anchor = editor.selection?.getNode?.();
              const host = anchor?.closest?.('[data-widget-type]');
              if (!host) return;
              host.dispatchEvent(new CustomEvent('widget:edit', { bubbles: true }));
              ev.preventDefault?.();
              ev.stopPropagation?.();
            });
          },
        });

        const instance = Array.isArray(result) ? result[0] : result;
        if (instance) editorRef.current = instance;
        else setStatusSafe('error');
      } catch (e) {
        console.error('TinyMCE 초기화 오류', e);
        setStatusSafe('error');
      }
    };

    // ===== TinyMCE 스크립트 로딩 =====
    const scriptUrl = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/${TINYMCE_CHANNEL}/tinymce.min.js`;
    const handleScriptLoad = () => void initialiseEditor();
    const handleScriptError = () => setStatusSafe('error');

    const existing = document.getElementById(TINYMCE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.tinymce) void initialiseEditor();
      else {
        existing.addEventListener('load', handleScriptLoad);
        existing.addEventListener('error', handleScriptError);
      }
    } else {
      const script = document.createElement('script');
      script.id = TINYMCE_SCRIPT_ID;
      script.src = scriptUrl;
      script.referrerPolicy = 'origin';
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
      document.head.appendChild(script);
    }

    return () => {
      dragDropCleanupRef.current?.();
      dragDropCleanupRef.current = null;
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
      editorRef.current?.remove();
      editorRef.current = null;
      isMounted = false;

      const el = document.getElementById(TINYMCE_SCRIPT_ID);
      el?.removeEventListener('load', handleScriptLoad);
      el?.removeEventListener('error', handleScriptError);
    };
  }, [apiKey, contentStyle]);

  return (
    <div className="tiny-editor">
      {status !== 'ready' && (
        <p className={`editor-status editor-status--${status}`}>
          {status === 'loading' && 'TinyMCE 스크립트를 불러오는 중입니다...'}
          {status === 'error' &&
            '에디터를 초기화하지 못했습니다. 네트워크와 API 키/도메인 설정을 확인해주세요.'}
        </p>
      )}

      <textarea ref={textareaRef} defaultValue={initialContent} aria-label="보고서 에디터" />

      <div
        className="editor-widget-actions"
        style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <button type="button" onClick={handleInsertTextWidget} disabled={status !== 'ready'}>
          텍스트 위젯 삽입
        </button>
        <button type="button" onClick={handleInsertTableWidget} disabled={status !== 'ready'}>
          테이블 위젯 삽입
        </button>
        <button type="button" onClick={handleInsertGraphWidget} disabled={status !== 'ready'}>
          그래프 위젯 삽입
        </button>
        <button type="button" onClick={handleInsertPageBreakWidget} disabled={status !== 'ready'}>
          페이지 나누기 삽입
        </button>
        <ExportButton
          getSourceBody={getEditorBody}
          disabled={status !== 'ready'}
          filename="tinymce-export"
          documentTitle={document.title}
          inlineStyles={exportInlineStyles}
        />
        <span style={{ color: '#64748b' }}>
          위젯 더블클릭(또는 Enter/Space) → 편집 • 프리뷰에서도 그래프/표가 보이도록 재렌더링합니다.
        </span>
      </div>

      {apiKey === DEFAULT_API_KEY && (
        <p className="editor-helper" style={{ marginTop: 8, color: '#475569' }}>
          <strong>안내:</strong> 현재 기본 공개 키(<code>{DEFAULT_API_KEY}</code>)로 TinyMCE CDN을
          사용 중입니다. 별도 Tiny Cloud API 키가 있다면 <code>VITE_TINYMCE_API_KEY</code>를
          설정하세요.
        </p>
      )}
    </div>
  );
};

export default TinyMceEditor;
