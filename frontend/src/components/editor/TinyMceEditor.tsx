import { useEffect, useMemo, useRef, useState } from 'react';

type EditorStatus = 'loading' | 'ready' | 'error';

const TINYMCE_SCRIPT_ID = 'tinymce-cdn-script';
const DEFAULT_API_KEY = 'no-api-key';

interface TinyMceInstance {
  remove: () => void;
  on: (eventName: string, callback: () => void) => void;
}

interface TinyMceGlobal {
  init: (config: Record<string, unknown>) => Promise<TinyMceInstance | TinyMceInstance[]> | TinyMceInstance | TinyMceInstance[];
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

  const apiKey = (import.meta.env.VITE_TINYMCE_API_KEY ?? DEFAULT_API_KEY).trim() || DEFAULT_API_KEY;

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
        const result = await window.tinymce.init({
          target,
          menubar: false,
          plugins: 'lists link table code',
          toolbar:
            'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | table | link | code',
          height: 480,
          branding: false,
          resize: true,
          content_style:
            "body { font-family: 'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 16px; color: #0f172a; }",
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

    const scriptUrl = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;

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

    return () => {
      isMounted = false;
      cleanup();
      const scriptElement = document.getElementById(TINYMCE_SCRIPT_ID);
      if (scriptElement) {
        scriptElement.removeEventListener('load', handleScriptLoad);
        scriptElement.removeEventListener('error', handleScriptError);
      }
    };
  }, [apiKey]);

  return (
    <div className="tiny-editor">
      {status !== 'ready' && (
        <p className={`editor-status editor-status--${status}`}>
          {status === 'loading' && 'TinyMCE 스크립트를 불러오는 중입니다...'}
          {status === 'error' && '에디터를 초기화하지 못했습니다. 네트워크와 API 키 설정을 확인해주세요.'}
        </p>
      )}

      <textarea ref={textareaRef} defaultValue={initialContent} aria-label="보고서 에디터" />

      {apiKey === DEFAULT_API_KEY && (
        <p className="editor-helper">
          <strong>안내:</strong> 현재 기본 공개 키(<code>{DEFAULT_API_KEY}</code>)로 TinyMCE CDN을 사용하고 있습니다. 별도의 Tiny Cloud API 키가
          있다면 <code>VITE_TINYMCE_API_KEY</code> 환경 변수를 설정해 주세요.
        </p>
      )}
    </div>
  );
};

export default TinyMceEditor;
