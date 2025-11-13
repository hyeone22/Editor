import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHealth } from './api/health';
import TinyMceEditor from './components/editor/TinyMceEditor';
import { DataBinderProvider } from './store/dataBinderStore';
import KCBChecklist from './KCBChecklist';

type HealthState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; message: string; timestamp: string }
  | { status: 'error'; message: string };

const App = () => {
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });

  const loadHealth = useCallback(async () => {
    setHealth({ status: 'loading' });
    try {
      const data = await fetchHealth();
      setHealth({
        status: 'success',
        message: data.message,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setHealth({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <DataBinderProvider>
      <main>
        <section className="status-card">
          <KCBChecklist />
        </section>
        <section className="editor-card">
          <h2>KCB 프로젝트 PoC</h2>
          <p>
            기본 TinyMCE 인스턴스를 React 애플리케이션과 연동했습니다. <br /> 아래 편집기에서 서식
            버튼을 눌러 보고, Tiny Cloud API 키를 설정하면 정식 CDN을 통해 스크립트를 로드할 수
            있습니다.
          </p>
          <TinyMceEditor />
        </section>
      </main>
    </DataBinderProvider>
  );
};

export default App;
