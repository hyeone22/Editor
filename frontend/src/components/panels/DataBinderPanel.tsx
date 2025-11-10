import { useMemo } from 'react';
import type { DataSourceType } from '../../types/Widget';
import { useDataBinderStore, useSelectedBinding } from '../../store/dataBinderStore';

const SOURCE_LABEL: Record<DataSourceType, string> = {
  static: '정적 데이터',
  sql: 'SQL 뷰',
  api: 'API 연동',
};

const STATUS_LABEL: Record<string, string> = {
  synced: '동기화 완료',
  drifted: '불일치 감지',
  pending: '대기 중',
};

const STATUS_CLASSNAME: Record<string, string> = {
  synced: 'data-binder-panel__status-badge--success',
  drifted: 'data-binder-panel__status-badge--warning',
  pending: 'data-binder-panel__status-badge--muted',
};

const modeOrder: DataSourceType[] = ['static', 'sql', 'api'];

const formatWidgetType = (type: string) => {
  switch (type) {
    case 'text':
      return '텍스트';
    case 'table':
      return '테이블';
    case 'graph':
      return '그래프';
    default:
      return type;
  }
};

const DataBinderPanel = () => {
  const { bindings, selectedWidgetId, selectWidget, setActiveSource } = useDataBinderStore();
  const selectedBinding = useSelectedBinding();

  const activeDetail = useMemo(() => {
    if (!selectedBinding) return null;
    return selectedBinding.sources[selectedBinding.activeSource];
  }, [selectedBinding]);

  if (!selectedBinding || !activeDetail) {
    return (
      <aside className="data-binder-panel" aria-live="polite">
        <p className="data-binder-panel__empty">표시할 데이터 바인딩 정보가 없습니다.</p>
      </aside>
    );
  }

  const handleModeClick = (mode: DataSourceType) => {
    if (mode === selectedBinding.activeSource) return;
    setActiveSource(selectedBinding.widget.id, mode);
  };

  const statusClass = STATUS_CLASSNAME[activeDetail.status ?? 'pending'] ?? '';
  const statusLabel = STATUS_LABEL[activeDetail.status ?? 'pending'] ?? '대기 중';

  return (
    <aside className="data-binder-panel" aria-live="polite">
      <header className="data-binder-panel__header">
        <div>
          <h3 className="data-binder-panel__title">데이터 바인더</h3>
          <p className="data-binder-panel__subtitle">위젯 유형에 따라 데이터 소스와 매핑 구성을 확인하세요.</p>
        </div>
        <div className="data-binder-panel__selected">
          <span className="data-binder-panel__selected-label">선택된 위젯</span>
          <strong className="data-binder-panel__selected-title">{selectedBinding.widget.title ?? '제목 없음'}</strong>
          <span className="data-binder-panel__selected-meta">
            {formatWidgetType(selectedBinding.widget.type)} · #{selectedBinding.widget.order}
          </span>
        </div>
      </header>

      <section aria-label="바인딩 대상 위젯 목록" className="data-binder-panel__widget-list">
        {bindings.map((binding) => {
          const isActive = binding.widget.id === selectedWidgetId;
          return (
            <button
              key={binding.widget.id}
              type="button"
              className={`data-binder-panel__chip${isActive ? ' is-active' : ''}`}
              onClick={() => selectWidget(binding.widget.id)}
              aria-pressed={isActive}
            >
              <span className="data-binder-panel__chip-title">{binding.widget.title ?? '제목 없음'}</span>
              <span className="data-binder-panel__chip-type">{formatWidgetType(binding.widget.type)}</span>
            </button>
          );
        })}
      </section>

      <section className="data-binder-panel__card" aria-label="데이터 소스 선택">
        <div className="data-binder-panel__card-header">
          <div>
            <h4>데이터 소스</h4>
            <p>위젯에 연결할 데이터 공급 방식을 선택합니다.</p>
          </div>
          <span className={`data-binder-panel__status-badge ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className="data-binder-panel__mode-toggle" role="group" aria-label="데이터 소스 유형">
          {modeOrder.map((mode) => {
            const isSelected = selectedBinding.activeSource === mode;
            return (
              <button
                key={mode}
                type="button"
                className={`data-binder-panel__mode${isSelected ? ' is-selected' : ''}`}
                onClick={() => handleModeClick(mode)}
                aria-pressed={isSelected}
              >
                <span className="data-binder-panel__mode-label">{SOURCE_LABEL[mode]}</span>
                <span className="data-binder-panel__mode-caption">{selectedBinding.sources[mode].label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="data-binder-panel__card" aria-label="소스 세부 정보">
        <div className="data-binder-panel__card-header">
          <div>
            <h4>{SOURCE_LABEL[selectedBinding.activeSource]} 세부 정보</h4>
            <p>{activeDetail.summary}</p>
          </div>
          <dl className="data-binder-panel__meta">
            {activeDetail.connectionLabel && (
              <div>
                <dt>연결</dt>
                <dd>{activeDetail.connectionLabel}</dd>
              </div>
            )}
            <div>
              <dt>최근 동기화</dt>
              <dd>{activeDetail.lastSyncedAt}</dd>
            </div>
            {typeof activeDetail.rowCount === 'number' && (
              <div>
                <dt>결과 행 수</dt>
                <dd>{activeDetail.rowCount} rows</dd>
              </div>
            )}
          </dl>
        </div>

        {activeDetail.queryPreview && (
          <div className="data-binder-panel__code-block" role="group" aria-label="SQL 미리보기">
            <span>SQL 미리보기</span>
            <pre>
              <code>{activeDetail.queryPreview}</code>
            </pre>
          </div>
        )}

        {activeDetail.endpoint && (
          <div className="data-binder-panel__code-block" role="group" aria-label="API 엔드포인트">
            <span>엔드포인트</span>
            <pre>
              <code>{activeDetail.endpoint}</code>
            </pre>
          </div>
        )}

        {activeDetail.parameters && activeDetail.parameters.length > 0 && (
          <div className="data-binder-panel__parameter-grid" aria-label="매개변수">
            {activeDetail.parameters.map((param) => (
              <div key={param.key} className="data-binder-panel__parameter">
                <span className="data-binder-panel__parameter-key">{param.key}</span>
                <strong className="data-binder-panel__parameter-value">{param.value}</strong>
                {param.type && <span className="data-binder-panel__parameter-type">{param.type}</span>}
              </div>
            ))}
          </div>
        )}

        {activeDetail.previewRows && activeDetail.previewRows.length > 0 && (
          <div className="data-binder-panel__preview" aria-label="데이터 미리보기">
            <h5>데이터 미리보기</h5>
            <ul>
              {activeDetail.previewRows.map((row, index) => (
                <li key={`${row}-${index}`}>{row}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="data-binder-panel__card" aria-label="필드 매핑">
        <div className="data-binder-panel__card-header">
          <div>
            <h4>필드 매핑</h4>
            <p>데이터 컬럼이 위젯 속성에 어떻게 연결되는지 확인합니다.</p>
          </div>
        </div>
        <div className="data-binder-panel__mapping">
          <table>
            <caption className="visually-hidden">위젯 필드와 데이터 소스 필드 매핑 표</caption>
            <thead>
              <tr>
                <th scope="col">위젯 필드</th>
                <th scope="col">소스 필드</th>
                <th scope="col">샘플 값</th>
                <th scope="col">비고</th>
              </tr>
            </thead>
            <tbody>
              {activeDetail.fieldMappings.map((mapping) => (
                <tr key={mapping.id}>
                  <th scope="row">{mapping.widgetField}</th>
                  <td>{mapping.sourceField}</td>
                  <td>{mapping.sampleValue ?? '—'}</td>
                  <td>
                    {mapping.required && <span className="data-binder-panel__tag">필수</span>}
                    {mapping.note && <span className="data-binder-panel__note">{mapping.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </aside>
  );
};

export default DataBinderPanel;
