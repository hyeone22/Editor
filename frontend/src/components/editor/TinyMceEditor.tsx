import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureWidgetPlugin } from '../../plugins/widgetPlugin';
import attachWidgetDragDrop from '../../plugins/widgetDragDrop';
import attachWidgetResize from '../../plugins/widgetResize';

// 커스텀 위젯 렌더러 등록
import '../widgets/TextWidget';
import '../widgets/TableWidget';
import '../widgets/GraphWidget';
import '../widgets/PageBreakWidget';
// import attachWidgetDragFree from '../../plugins/widgetDragFree';

type EditorStatus = 'loading' | 'ready' | 'error';

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const DEFAULT_API_KEY = 'no-api-key';

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
}
interface TinyMceGlobal {
  init: (
    config: Record<string, unknown>,
  ) => Promise<TinyMceInstance | TinyMceInstance[]> | TinyMceInstance | TinyMceInstance[];
  PluginManager: TinyMcePluginManager;
}
declare global {
  interface Window {
    tinymce?: TinyMceGlobal;
  }
}

const TinyMceEditor: FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<TinyMceInstance | null>(null);
  const dragDropCleanupRef = useRef<(() => void) | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<EditorStatus>('loading');

  const apiKey =
    (import.meta.env.VITE_TINYMCE_API_KEY ?? DEFAULT_API_KEY).trim() || DEFAULT_API_KEY;

  // 샘플 configs
  const sampleTextWidgetConfig = useMemo(() => {
    const config = {
      content:
        '<p><strong>텍스트 위젯</strong>은 보고서에서 반복적으로 사용하는 설명이나 코멘트를 저장하는 데 사용할 수 있습니다.</p>',
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
        { id: 'col-quarter', label: '분기', align: 'left', format: 'text' },
        { id: 'col-revenue', label: '매출 (USD)', align: 'right', format: 'currency' },
        { id: 'col-growth', label: '성장률', align: 'right', format: 'percent' },
      ],
      rows: [
        {
          id: 'row-q1',
          cells: [
            { columnId: 'col-quarter', value: '2024 Q1' },
            { columnId: 'col-revenue', value: 12_500_000 },
            { columnId: 'col-growth', value: 0.12 },
          ],
        },
        {
          id: 'row-q2',
          cells: [
            { columnId: 'col-quarter', value: '2024 Q2' },
            { columnId: 'col-revenue', value: 14_800_000 },
            { columnId: 'col-growth', value: 0.18 },
          ],
        },
      ],
      summary: [{ label: '연간 누적', value: '$27.3M', align: 'right' }],
      footnote: '※ 모든 수치는 미감사 자료 기준입니다.',
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
        '<div data-widget-type="pageBreak" data-widget-title="페이지 나누기"></div>',
        `<div data-widget-type="text" data-widget-title="보고서 요약" data-widget-config='${sampleTextWidgetConfig}'></div>`,
      ].join(''),
    [sampleTextWidgetConfig, sampleTableWidgetConfig, sampleGraphWidgetConfig],
  );

  // 삽입 버튼 핸들러
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
      '<div data-widget-type="pageBreak" data-widget-title="페이지 나누기"></div>',
    );
    editor.focus?.();
  }, []);

  // iframe 내부 스타일 (모드 없이: 100%로 시작 → 리사이즈하면 옆으로 래핑)
  // 이미지 위젯도 컨테이너 리사이즈로 자연스럽게 줄어들도록 포함
  const contentStyle = useMemo(
    () =>
      [
        '/* ========= THEME TOKENS ========= */',
        ':root{ --card-bg:#f8fafc; --card-border:#e2e8f0; --card-grad:linear-gradient(180deg,rgba(148,163,184,.25),rgba(148,163,184,0)); --ink:#0f172a; --ink-sub:#475569; --accent:#0ea5e9; --accent-ink:#0369a1; --ring:0 0 0 3px rgba(14,165,233,.35); }',
        '@media (prefers-color-scheme: dark){ :root{ --card-bg:#0b1220; --card-border:#1f2937; --card-grad:linear-gradient(180deg,rgba(148,163,184,.18),rgba(148,163,184,0)); --ink:#e5e7eb; --ink-sub:#9ca3af; --accent:#22d3ee; --accent-ink:#67e8f9; --ring:0 0 0 3px rgba(34,211,238,.4); } }',

        "body{ font-family:'Noto Sans KR',system-ui,-apple-system,'Segoe UI',sans-serif; font-size:16px; color:var(--ink); position:relative; }",

        '/* ========= WIDGET HOST ========= */',
        '/* 모든 위젯은 흐름 아이템: 100%로 시작 → 폭을 줄이면 옆으로 래핑 */',
        '[data-widget-type]{',
        '  position: relative;',
        '  display: inline-block;', // 핵심: block → inline-block
        '  vertical-align: top;',
        '  width: 100%;', // 생성 시 전체 폭
        '  max-width: 100%;',
        '  min-width: 240px;', // 리사이즈 하한(필요시 조정)
        '  box-sizing: border-box;',
        '  margin: 10px;', // 위젯 간격
        '}',

        /* === FREE POSITION OVERRIDES === */
        /* 위젯이 data-position="free" 이면 흐름(100%) 규칙을 꺾고 절대배치로 전환 */
        '[data-widget-type][data-position="free"]{',
        'position: absolute !important;',
        'width: auto !important;' /* ← 100% 강제 해제 */,
        'max-width: none !important;',
        'min-width: 120px;' /* 필요 시 조절 */,
        'margin: 0;' /* 좌표를 left/top로만 제어 */,
        'box-sizing: border-box;',
        'z-index: 1;' /* 드래그 중 겹침 시 가시성 확보 */,
        '}',
        /* 카드 박스도 100% 규칙을 해제해야 px width/height가 그대로 적용됨 */
        '[data-widget-type][data-position="free"] .widget-block{',
        'width: auto !important;',
        '}',

        '/* 카드 박스는 호스트 폭 100%로 꽉 차게 */',
        '.widget-block{',
        '  background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; padding:16px;',
        '  box-shadow:0 1px 1px rgba(2,6,23,.04), 0 2px 4px rgba(2,6,23,.06);',
        '  width:100%; box-sizing:border-box;',
        '  overflow:hidden;', // 이미지/그래프가 튀어나오지 않도록
        '}',
        ".widget-block::before{ content:''; position:absolute; inset:0; border-radius:inherit; background:var(--card-grad); pointer-events:none; }",
        '.widget-block:hover{ box-shadow:0 4px 10px rgba(2,6,23,.08); transform:translateY(-1px); transition:box-shadow .15s ease, transform .15s ease; }',
        '.widget-block:focus-within{ box-shadow:var(--ring), 0 6px 14px rgba(2,6,23,.10); }',
        '.widget-block--dragging{ opacity:.85; cursor:grabbing; border-style:solid }',
        '.widget-block--resizing{ box-shadow:var(--ring); cursor:se-resize }',

        '/* 모서리 리사이즈 힌트(시각 표시) */',
        ".widget-block::after{ content:''; position:absolute; right:.6rem; bottom:.6rem; width:12px; height:12px; border-right:2px solid var(--accent); border-bottom:2px solid var(--accent); opacity:.85; pointer-events:none }",
        '.widget-block:hover::after{ opacity:1 }',

        '/* 실제 리사이즈 핸들(플러그인이 추가하는 span) */',
        '.widget-resize-handle{',
        '  position:absolute; right:.6rem; bottom:.6rem;',
        '  width:16px; height:16px; border:2px solid var(--accent); border-radius:4px; background:#fff;',
        '  display:flex; align-items:center; justify-content:center;',
        '  cursor:se-resize; z-index:1000; pointer-events:auto;',
        '}',

        '/* ========= IMAGE WIDGET ========= */',
        '/* 이미지 위젯은 컨테이너(위젯) 크기에 맞춰 유동적으로 축소/확대 */',
        '[data-widget-type="image"] img{',
        '  display:block;',
        '  width:100%;', // 컨테이너 너비에 맞춤(리사이즈 시 함께 변화)
        '  height:auto;', // 종횡비 유지
        '  max-width:100%;',
        '}',

        '/* ========= TITLES & META ========= */',
        '.widget-title{ font-weight:700; font-size:18px; margin:4px 0 12px; letter-spacing:-.01em }',
        '.widget-desc{ font-size:12px; color:var(--ink-sub); margin:-6px 0 8px }',

        '/* ========= TABLE WIDGET ========= */',
        '.table-widget{ display:grid; gap:12px }',
        '.table-widget__table-container{ overflow:auto; border-radius:10px; border:1px solid var(--card-border); background:linear-gradient(180deg,rgba(148,163,184,.08),rgba(148,163,184,0)) }',
        '.table-widget__table{ width:100%; border-collapse:collapse; min-width:520px }',
        '.table-widget__table thead th{ position:sticky; top:0; background:var(--card-bg); font-weight:700; font-size:13.5px; color:var(--ink-sub); letter-spacing:.02em; border-bottom:1px solid var(--card-border); padding:10px 12px; text-align:left }',
        '.table-widget__table tbody tr:nth-child(even){ background:rgba(148,163,184,.08) }',
        '.table-widget__table tbody td{ padding:10px 12px; border-bottom:1px dashed var(--card-border); vertical-align:top; font-size:14px }',
        '.table-widget__cell--align-right{text-align:right}',
        '.table-widget__cell--align-left{text-align:left}',
        '.table-widget__cell--align-center{text-align:center}',
        '.table-widget__summary{ display:grid; gap:6px; margin:4px 0 0 }',
        '.table-widget__summary-item{ display:flex; justify-content:space-between; font-weight:600 }',
        '.table-widget__footnote{ color:var(--ink-sub); font-size:12px; margin-top:6px }',

        '/* ========= GRAPH WIDGET ========= */',
        '.graph-widget{ display:grid; gap:10px }',
        '.graph-widget__canvas{ position:relative; height:320px; border:1px solid var(--card-border); border-radius:10px; background:linear-gradient(180deg,rgba(148,163,184,.08),rgba(148,163,184,0)) }',
        '.graph-widget__note{ margin-top:6px; font-size:12px; color:var(--ink-sub) }',

        '/* ========= PAGE BREAK WIDGET ========= */',
        '.page-break-widget-host{ display:block }',
        '.page-break-widget{ display:grid; gap:6px; padding:14px; border-radius:12px; background:rgba(14,165,233,.06); border:1px dashed var(--accent) }',
        '.page-break-widget__label{ font-weight:700; font-size:14px; color:var(--ink) }',
        '.page-break-widget__description{ font-size:12px; color:var(--accent-ink) }',
        '.page-break-widget__rule{ border-top:1px dashed var(--accent); margin-top:4px }',
        '.page-break-widget--spacing-none{ margin:0 }',
        '.page-break-widget--spacing-small{ margin:8px 0 }',
        '.page-break-widget--spacing-medium{ margin:16px 0 }',
        '.page-break-widget--spacing-large{ margin:32px 0 }',

        '/* ========= PRINT ========= */',
        '@media print{',
        "  [data-page-break='true']{ break-after:page; page-break-after:always }",
        "  [data-page-break='true'][data-keep-with-next='true']{ break-inside:avoid; page-break-inside:avoid }",
        "  [data-page-break='true'][data-keep-with-next='true'] + *{ break-before:avoid-page; page-break-before:auto }",
        '  .page-break-widget{ border:0; padding:0; color:transparent; background:none }',
        '}',
      ].join('\n'),
    [],
  );

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
        /* eslint-disable @typescript-eslint/no-explicit-any */
        ensureWidgetPlugin(window.tinymce as any);
        /* eslint-enable */

        const result = await window.tinymce.init({
          target,
          menubar: false,
          plugins: 'lists link table code widgetBlocks',
          toolbar:
            'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | table | link | code',
          height: 480,
          branding: false,
          resize: true,
          content_style: contentStyle,
          extended_valid_elements:
            'div[data-widget-type|data-widget-id|data-widget-config|data-widget-title|data-widget-version|data-widget-order|data-page-break|data-keep-with-next|data-spacing|data-display-label],' +
            'span[class|role|aria-hidden|contenteditable|tabindex|style|data-mce-bogus|draggable|unselectable]',
          setup: (editor: TinyMceInstance) => {
            editorRef.current = editor;

            // 플러그인 장착
            dragDropCleanupRef.current?.();
            dragDropCleanupRef.current = attachWidgetDragDrop(editor);
            resizeCleanupRef.current?.();
            resizeCleanupRef.current = attachWidgetResize(editor, { cornerHitSize: 22 });

            editor.on('init', () => {
              setStatusSafe('ready');
              // console.log('[TinyMCE] init fired, attaching resize...');
              attachWidgetResize(editor);
              // attachWidgetDragFree(editor);
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

            // 키보드 접근성
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

    // TinyMCE 로딩
    const CHANNEL = 'stable';
    const scriptUrl = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/${CHANNEL}/tinymce.min.js`;
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
      script.addEventListener('load', handleScriptLoad);
      script.addEventListener('error', handleScriptError);
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      cleanupAll();
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
            '에디터를 초기화하지 못했습니다. 네트워크와 API 키 설정을 확인해주세요.'}
        </p>
      )}

      <textarea ref={textareaRef} defaultValue={initialContent} aria-label="보고서 에디터" />

      <div className="editor-widget-actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
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
        <span style={{ color: '#64748b' }}>위젯을 더블클릭(또는 Enter/Space)하면 편집합니다.</span>
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
