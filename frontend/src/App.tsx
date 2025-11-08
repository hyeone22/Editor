import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHealth } from './api/health';

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

  const title = useMemo(() => {
    switch (health.status) {
      case 'success':
        return '서버 연결이 정상입니다.';
      case 'error':
        return '서버에 연결할 수 없습니다.';
      default:
        return '상태 확인 중...';
    }
  }, [health]);

  return (
    <main>
      <section>
        <h1>에디터 프로젝트 초기화</h1>
        <p>
          이 화면은 <code>checklist.md</code> 1번 항목인 "프로젝트 초기 설정 및 환경 구축"의 결과물입니다. 루트에서는
          공통 Lint/Format 스크립트를 제공하며, 프론트엔드와 백엔드는 각각 Vite + React, Express 기반으로 구성되어
          있습니다.
        </p>
      </section>

      <section className="status-card">
        <h2>{title}</h2>
        {health.status === 'loading' && <span className="status-indicator">확인 중...</span>}
        {health.status === 'success' && (
          <span className="status-indicator">
            ✅ {health.message} (최근 확인: {health.timestamp})
          </span>
        )}
        {health.status === 'error' && (
          <span className="status-indicator error">⚠️ {health.message}</span>
        )}
        <p>
          <strong>백엔드 헬스 체크 API</strong>를 호출하여 서버 상태를 확인합니다. 개발 서버는 <code>npm run dev</code>
          로 실행할 수 있으며, 프론트엔드에서는 동일 명령으로 Vite 개발 서버를 시작할 수 있습니다.
        </p>
        <div className="button-row">
          <button type="button" onClick={() => void loadHealth()} disabled={health.status === 'loading'}>
            다시 확인
          </button>
        </div>
      </section>
    </main>
  );
};

export default App;
