import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureWidgetPlugin } from '../../plugins/widgetPlugin';

// 커스텀 위젯 렌더러 등록 (Text, Table, Graph)
import '../widgets/TextWidget';
import '../widgets/TableWidget';
import '../widgets/GraphWidget';

type EditorStatus = 'loading' | 'ready' | 'error';

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const DEFAULT_API_KEY = 'no-api-key';

interface TinyMcePluginManager {
  add: (name: string, callback: (editor: unknown) => void) => void;
}

interface TinyMceEvent {
  target?: Element | null;
  key?: string;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

interface TinyMceInstance {
  remove: () => void;
  on: <T = TinyMceEvent>(eventName: string, callback: (event: T) => void) => void;
  insertContent: (content: string) => void;
  focus?: () => void;
  selection?: {
    getNode?: () => HTMLElement | null;
    getRng?: () => Range | null;
  };
  getBody?: () => HTMLElement | null;

  // TinyMCE 내부 API(존재하면 사용)
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

const TinyMceEditor = () => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<TinyMceInstance | null>(null);
  const [status, setStatus] = useState<EditorStatus>('loading');

  const apiKey =
    (import.meta.env.VITE_TINYMCE_API_KEY ?? DEFAULT_API_KEY).trim() || DEFAULT_API_KEY;

  // 샘플 텍스트 위젯 설정
  const sampleTextWidgetConfig = useMemo(() => {
    const config = {
      content:
        '<p><strong>텍스트 위젯</strong>은 보고서에서 반복적으로 사용하는 설명이나 코멘트를 저장하는 데 사용할 수 있습니다.</p>',
      richText: true,
      style: {
        alignment: 'left',
        fontSize: 15,
        lineHeight: 1.6,
      },
    };
    return JSON.stringify(config).replace(/'/g, '&#39;');
  }, []);

  // 샘플 테이블 위젯 설정
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

  // 샘플 그래프 위젯 설정
  const sampleGraphWidgetConfig = useMemo(() => {
    const config = {
      chartType: 'line',
      labels: ['2023 Q1', '2023 Q2', '2023 Q3', '2023 Q4'],
      datasets: [
        {
          id: 'growth-actual',
          label: '실제 성장률',
          data: [12.5, 14.2, 16.1, 18.4],
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          borderColor: 'rgba(59, 130, 246, 1)',
          fill: true,
        },
        {
          id: 'growth-target',
          label: '목표 성장률',
          data: [11, 13, 15, 17],
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 1)',
          fill: true,
        },
      ],
      options: {
        legend: true,
        showGrid: true,
        yAxisLabel: '%',
        xAxisLabel: '분기',
        precision: 1,
      },
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
        `<div data-widget-type="text" data-widget-title="보고서 요약" data-widget-config='${sampleTextWidgetConfig}'></div>`,
      ].join(''),
    [sampleTextWidgetConfig, sampleTableWidgetConfig, sampleGraphWidgetConfig],
  );

  // 텍스트 위젯 삽입(테스트용)
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

  // 테이블 위젯 삽입(테스트용)
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

  // 그래프 위젯 삽입(테스트용)
  const handleInsertGraphWidget = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const config = {
      chartType: 'bar',
      labels: ['제품 A', '제품 B', '제품 C'],
      datasets: [
        {
          id: 'sales',
          label: '매출',
          data: [120, 95, 135],
          backgroundColor: 'rgba(99, 102, 241, 0.35)',
          borderColor: 'rgba(99, 102, 241, 1)',
        },
      ],
      options: {
        legend: true,
        showGrid: true,
        yAxisLabel: '단위: 억원',
      },
    };
    const payload = JSON.stringify(config).replace(/'/g, '&#39;');
    editor.insertContent(
      `<div data-widget-type="graph" data-widget-title="제품별 매출" data-widget-config='${payload}'></div>`,
    );
    editor.focus?.();
  }, []);

  // 에디터 내용 CSS (테이블 위젯용 기본 스타일 포함)
  const contentStyle = useMemo(
    () =>
      [
        "body { font-family: 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; color: #0f172a; }",
        // 공통 위젯 박스
        '.widget-block { display: block; border: 1px dashed #94a3b8; border-radius: 12px; padding: 16px; background: #f8fafc; position: relative; }',
        // 테이블 위젯
        '.table-widget__title{font-weight:700;font-size:18px;margin:8px 0 12px}',
        '.table-widget__table{width:100%;border-collapse:collapse}',
        '.table-widget__table thead th{font-weight:600;border-bottom:2px solid #cbd5e1;padding:8px 10px;text-align:left}',
        '.table-widget__table tbody td{padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}',
        '.table-widget__table-container--responsive{overflow-x:auto}',
        '.table-widget__cell--align-right{text-align:right}',
        '.table-widget__cell--align-left{text-align:left}',
        '.table-widget__cell--align-center{text-align:center}',
        '.table-widget__summary{display:grid;gap:4px;margin-top:8px}',
        '.table-widget__summary .table-widget__summary-item{display:flex;justify-content:space-between}',
        '.table-widget__summary-label{color:#334155}',
        '.table-widget__summary-value{}',
        '.table-widget__footnote{color:#475569;font-size:12px;margin-top:6px}',
        '.graph-widget{display:flex;flex-direction:column;gap:12px}',
        '.graph-widget__title{font-weight:700;font-size:18px;margin:8px 0 4px;color:#0f172a}',
        '.graph-widget__canvas{position:relative;height:320px}',
        '.graph-widget__empty{display:flex;align-items:center;justify-content:center;height:240px;background:#e2e8f0;color:#475569;border-radius:8px;font-size:14px}',
        '.graph-widget__note{margin-top:8px;font-size:12px;color:#0f172a}',
      ].join('\n'),
    [],
  );

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;

    let isMounted = true;
    const setStatusSafe = (v: EditorStatus) => isMounted && setStatus(v);

    setStatusSafe('loading');

    const cleanup = () => {
      if (editorRef.current) {
        editorRef.current.remove();
        editorRef.current = null;
      }
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
            'div[data-widget-type|data-widget-id|data-widget-config|data-widget-title|data-widget-version]',
          setup: (editor: TinyMceInstance) => {
            editorRef.current = editor;

            editor.on('init', () => {
              setStatusSafe('ready');

              // 더블클릭을 네이티브로 먼저 가로채서 widget:edit 트리거
              const body = editor.getBody?.();
              const doc = body?.ownerDocument;
              if (doc) {
                const handleDbl = (ev: MouseEvent) => {
                  const t = ev.target as HTMLElement | null;
                  const host = t?.closest?.('[data-widget-type]');
                  if (host) {
                    host.dispatchEvent(new CustomEvent('widget:edit', { bubbles: true }));
                    ev.preventDefault();
                    ev.stopPropagation();
                  }
                };
                const handleClick = (ev: MouseEvent) => {
                  if (ev.detail === 2) handleDbl(ev);
                };

                doc.addEventListener('dblclick', handleDbl, true);
                doc.addEventListener('click', handleClick, true);

                // 변경 감지 → TinyMCE에 dirty/state 전달
                const handleWidgetChanged = () => {
                  editor.fire?.('change');
                  editor.setDirty?.(true);
                  editor.nodeChanged?.();
                };
                doc.addEventListener('widget:changed', handleWidgetChanged, true);

                editor.on('remove', () => {
                  doc.removeEventListener('dblclick', handleDbl, true);
                  doc.removeEventListener('click', handleClick, true);
                  doc.removeEventListener('widget:changed', handleWidgetChanged, true);
                });
              }
            });

            // 키보드 접근성: Enter/Space로 편집
            editor.on('KeyDown', (ev) => {
              if (ev.key !== 'Enter' && ev.key !== ' ') return;
              const anchor = editor.selection?.getNode?.();
              const host = anchor?.closest?.('[data-widget-type]');
              if (host) {
                host.dispatchEvent(new CustomEvent('widget:edit', { bubbles: true }));
                ev.preventDefault?.();
                ev.stopPropagation?.();
              }
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

    // TinyMCE 채널 고정 (안정적 로딩)
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
      cleanup();
      const el = document.getElementById(TINYMCE_SCRIPT_ID);
      if (el) {
        el.removeEventListener('load', handleScriptLoad);
        el.removeEventListener('error', handleScriptError);
      }
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
        <span style={{ color: '#64748b' }}>위젯을 더블클릭(또는 Enter/Space)하면 편집합니다.</span>
      </div>

      {apiKey === DEFAULT_API_KEY && (
        <p className="editor-helper" style={{ marginTop: 8, color: '#475569' }}>
          <strong>안내:</strong> 현재 기본 공개 키(<code>{DEFAULT_API_KEY}</code>)로 TinyMCE CDN을
          사용 중입니다. 별도 Tiny Cloud API 키가 있다면 <code>VITE_TINYMCE_API_KEY</code> 환경
          변수를 설정해 주세요.
        </p>
      )}
    </div>
  );
};

export default TinyMceEditor;
