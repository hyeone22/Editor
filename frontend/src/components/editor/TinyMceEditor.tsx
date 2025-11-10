import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureWidgetPlugin } from '../../plugins/widgetPlugin';

type EditorStatus = 'loading' | 'ready' | 'error';

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const DEFAULT_API_KEY = 'no-api-key';

interface TinyMcePluginManager {
  add: (name: string, callback: (editor: unknown) => void) => void;
}

interface TinyMceInstance {
  remove: () => void;
  on: (eventName: string, callback: () => void) => void;
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

  const initialContent = useMemo(
    () =>
      [
        '<h2>재무 보고서 초안</h2>',
        '<p>이 영역은 TinyMCE 에디터가 로딩된 뒤 자유롭게 편집할 수 있는 콘텐츠 영역입니다.</p>',
        '<ul>',
        '<li><strong>굵게</strong>, <em>기울임꼴</em>, <u>밑줄</u>과 같은 서식을 적용해 보세요.</li>',
        '<li>목록, 링크, 표 등 TinyMCE 기본 기능이 정상 동작하는지 확인할 수 있습니다.</li>',
        '</ul>',
      ].join(''),
    [],
  );

  const contentStyle = useMemo(
    () =>
      [
        "body { font-family: 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; color: #0f172a; }",
        '.widget-block { display: block; border: 1px dashed #94a3b8; border-radius: 12px; padding: 16px; background: #f8fafc; position: relative; }',
        '.widget-block__placeholder { display: flex; align-items: center; justify-content: space-between; font-size: 0.95rem; color: #334155; gap: 0.75rem; }',
        '.widget-block__label { font-weight: 600; }',
        '.widget-block__type { font-size: 0.75rem; background: #e2e8f0; color: #0f172a; border-radius: 9999px; padding: 0.25rem 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }',
      ].join('\n'),
    [],
  );

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) {
      return;
    }

    let isMounted = true;
    const setStatusSafe = (value: EditorStatus) => {
      if (isMounted) {
        setStatus(value);
      }
    };

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ensureWidgetPlugin(window.tinymce as any);
        const result = await window.tinymce.init({
          target,
          menubar: false,
          plugins: 'lists link table code noneditable widgetBlocks',
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
            editor.on('init', () => setStatusSafe('ready'));
          },
        });

        const instance = Array.isArray(result) ? result[0] : result;
        if (instance) {
          editorRef.current = instance;
        } else {
          setStatusSafe('error');
        }
      } catch (error) {
        console.error('TinyMCE 초기화 중 오류가 발생했습니다.', error);
        setStatusSafe('error');
      }
    };

    // TinyMCE 채널 버전을 명시적으로 지정
    const CHANNEL = 'stable'; // 또는 '6' 혹은 '6.8.5' 같은 구체 버전

    const scriptUrl = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/${CHANNEL}/tinymce.min.js`;

    const handleScriptLoad = () => {
      void initialiseEditor();
    };

    const handleScriptError = () => {
      setStatusSafe('error');
    };

    const existingScript = document.getElementById(TINYMCE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.tinymce) {
        void initialiseEditor();
      } else {
        existingScript.addEventListener('load', handleScriptLoad);
        existingScript.addEventListener('error', handleScriptError);
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
    console.log('apiKey:', apiKey);
    console.log('src:', `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`);
    console.log('ALL ENV', import.meta.env);
    console.log('API', import.meta.env.VITE_TINYMCE_API_KEY);

    return () => {
      isMounted = false;
      cleanup();
      const scriptElement = document.getElementById(TINYMCE_SCRIPT_ID);
      if (scriptElement) {
        scriptElement.removeEventListener('load', handleScriptLoad);
        scriptElement.removeEventListener('error', handleScriptError);
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

      {apiKey === DEFAULT_API_KEY && (
        <p className="editor-helper">
          <strong>안내:</strong> 현재 기본 공개 키(<code>{DEFAULT_API_KEY}</code>)로 TinyMCE CDN을
          사용하고 있습니다. 별도의 Tiny Cloud API 키가 있다면 <code>VITE_TINYMCE_API_KEY</code>{' '}
          환경 변수를 설정해 주세요.
        </p>
      )}
    </div>
  );
};

export default TinyMceEditor;
