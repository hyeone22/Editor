import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AnyWidget, DataSourceType } from '../types/Widget';
import { SAMPLE_WIDGETS } from '../mocks/widgetSamples';

type BindingStatus = 'synced' | 'drifted' | 'pending';

export interface FieldMappingPreview {
  id: string;
  widgetField: string;
  sourceField: string;
  sampleValue?: string;
  required?: boolean;
  note?: string;
}

export interface ParameterPreview {
  key: string;
  value: string;
  type?: string;
}

export interface DataSourceDetailPreview {
  label: string;
  summary: string;
  lastSyncedAt: string;
  connectionLabel?: string;
  queryPreview?: string;
  endpoint?: string;
  parameters?: ParameterPreview[];
  previewRows?: string[];
  status?: BindingStatus;
  rowCount?: number;
  fieldMappings: FieldMappingPreview[];
}

export interface WidgetBindingPreset {
  widget: AnyWidget;
  activeSource: DataSourceType;
  sources: Record<DataSourceType, DataSourceDetailPreview>;
}

interface DataBinderStoreValue {
  bindings: WidgetBindingPreset[];
  selectedWidgetId: string;
  selectWidget: (widgetId: string) => void;
  setActiveSource: (widgetId: string, source: DataSourceType) => void;
}

const DataBinderStoreContext = createContext<DataBinderStoreValue | undefined>(undefined);

type ExtractWidget<TType extends AnyWidget['type']> = Extract<AnyWidget, { type: TType }>;

const findWidget = <TType extends AnyWidget['type']>(
  type: TType,
): ExtractWidget<TType> | undefined =>
  SAMPLE_WIDGETS.find((widget): widget is ExtractWidget<TType> => widget.type === type);

const createInitialPresets = (): WidgetBindingPreset[] => {
  const textWidget = findWidget('text');
  const tableWidget = findWidget('table');
  const graphWidget = findWidget('graph');

  const presets: WidgetBindingPreset[] = [];

  if (textWidget) {
    presets.push({
      widget: textWidget,
      activeSource: 'static',
      sources: {
        static: {
          label: '수동 입력 텍스트',
          summary: '편집자가 직접 작성한 요약 문단을 사용합니다.',
          lastSyncedAt: '2024-06-11 09:20',
          status: 'synced',
          fieldMappings: [
            {
              id: 'text-content',
              widgetField: '본문 HTML',
              sourceField: '위젯 내 리치 텍스트',
              sampleValue: '<p>Strong quarterly performance with double-digit growth.</p>',
              required: true,
            },
            {
              id: 'text-style',
              widgetField: '스타일 옵션',
              sourceField: '로컬 스타일 설정',
              sampleValue: '정렬: left, 폰트 16px',
            },
          ],
        },
        sql: {
          label: 'Narratives.FinancialHighlights',
          summary: '재무 데이터웨어하우스에서 코멘트 텍스트를 조회합니다.',
          connectionLabel: 'finance-warehouse (rw)',
          queryPreview:
            'SELECT narrative_html, author, updated_at\nFROM mart_financial_commentary\nWHERE company_id = @companyId\n  AND fiscal_quarter = @period',
          parameters: [
            { key: 'companyId', value: 'ACME-NORTHAMERICA', type: 'string' },
            { key: 'period', value: '2024Q2', type: 'string' },
          ],
          lastSyncedAt: '2024-06-10 18:05',
          previewRows: ['<p>Revenue grew 18% QoQ, beating guidance by 3pp.</p>'],
          status: 'drifted',
          fieldMappings: [
            {
              id: 'sql-body',
              widgetField: '본문 HTML',
              sourceField: 'narrative_html',
              sampleValue: '<p>Revenue grew 18% QoQ...</p>',
              required: true,
            },
            {
              id: 'sql-author',
              widgetField: '주석',
              sourceField: "CONCAT(author, ' · ', updated_at)",
              sampleValue: 'J. Kim · 2024-06-10',
              note: '툴팁으로 표기',
            },
          ],
        },
        api: {
          label: 'AI Narrative Service',
          summary: '내부 AI 서비스에서 생성된 코멘트를 사용합니다.',
          endpoint: 'POST https://api.internal/acme/v1/narratives',
          parameters: [
            { key: 'metric', value: 'revenue.growth', type: 'string' },
            { key: 'tone', value: 'analytical', type: 'string' },
          ],
          lastSyncedAt: '대기 중',
          status: 'pending',
          previewRows: ['Awaiting first run...'],
          fieldMappings: [
            {
              id: 'api-body',
              widgetField: '본문 HTML',
              sourceField: 'response.payload.html',
              note: 'HTML Sanitize 필요',
              required: true,
            },
            {
              id: 'api-metadata',
              widgetField: '메타 정보',
              sourceField: 'response.metadata.*',
              sampleValue: '{ tokens: 823 }',
            },
          ],
        },
      },
    });
  }

  if (tableWidget) {
    presets.push({
      widget: tableWidget,
      activeSource: 'sql',
      sources: {
        static: {
          label: '샘플 JSON 테이블',
          summary: '디자인 검토용 정적 테이블 데이터를 유지합니다.',
          lastSyncedAt: '2024-05-28 14:10',
          status: 'pending',
          previewRows: ['Q1 2024 | $12.5M | 12%', 'Q2 2024 | $14.8M | 18%'],
          fieldMappings: [
            {
              id: 'static-columns',
              widgetField: '컬럼 정의',
              sourceField: 'components.widgets.table.columns',
              sampleValue: '분기, 매출, 성장률',
            },
            {
              id: 'static-rows',
              widgetField: '행 데이터',
              sourceField: 'components.widgets.table.rows',
              sampleValue: '2 rows',
            },
          ],
        },
        sql: {
          label: 'Reporting.FinancialSummary',
          summary: '재무 요약 뷰에서 분기별 실적을 가져옵니다.',
          connectionLabel: 'bi-cluster (ro)',
          queryPreview:
            'SELECT fiscal_quarter, revenue_usd, growth_rate\nFROM rpt_quarterly_summary\nWHERE company_id = @companyId\nORDER BY fiscal_quarter LIMIT 8',
          parameters: [{ key: 'companyId', value: 'ACME-NORTHAMERICA', type: 'string' }],
          lastSyncedAt: '2024-06-11 07:45',
          previewRows: ['2024 Q1 | 12,500,000 | 0.12', '2024 Q2 | 14,800,000 | 0.18'],
          rowCount: 8,
          status: 'synced',
          fieldMappings: [
            {
              id: 'sql-quarter',
              widgetField: '열: Quarter',
              sourceField: 'fiscal_quarter',
              sampleValue: '2024 Q2',
              required: true,
            },
            {
              id: 'sql-revenue',
              widgetField: '열: Revenue (USD)',
              sourceField: 'revenue_usd',
              sampleValue: '14800000',
              required: true,
            },
            {
              id: 'sql-growth',
              widgetField: '열: Growth %',
              sourceField: 'growth_rate',
              sampleValue: '0.18',
            },
            {
              id: 'sql-summary',
              widgetField: '요약',
              sourceField: 'SUM(revenue_usd)',
              sampleValue: '27300000',
              note: '서버 측 계산 후 서식 적용',
            },
          ],
        },
        api: {
          label: 'Finance API (beta)',
          summary: '재무 API에서 JSON 테이블 데이터를 직접 수신합니다.',
          endpoint: 'GET https://finance.api.acme/v2/revenue/breakdown',
          parameters: [
            { key: 'region', value: 'na', type: 'enum' },
            { key: 'limit', value: '4', type: 'number' },
          ],
          lastSyncedAt: '2024-06-09 22:18',
          previewRows: ['{ quarter: "2024 Q1", revenue: 12500000 }', '{ quarter: "2024 Q2", revenue: 14800000 }'],
          status: 'drifted',
          fieldMappings: [
            {
              id: 'api-quarter',
              widgetField: '열: Quarter',
              sourceField: 'data[].quarter',
              sampleValue: '2024 Q1',
              required: true,
            },
            {
              id: 'api-revenue',
              widgetField: '열: Revenue',
              sourceField: 'data[].revenue',
              sampleValue: '12500000',
              required: true,
            },
            {
              id: 'api-growth',
              widgetField: '열: Growth %',
              sourceField: 'data[].growthRate',
              sampleValue: '0.12',
            },
          ],
        },
      },
    });
  }

  if (graphWidget) {
    presets.push({
      widget: graphWidget,
      activeSource: 'api',
      sources: {
        static: {
          label: '디자인용 목업 데이터',
          summary: 'Chart.js 샘플 데이터를 사용하여 시각 검토를 수행합니다.',
          lastSyncedAt: '2024-06-08 11:00',
          status: 'pending',
          previewRows: ['Labels: Q1, Q2, Q3, Q4', 'Data: 12.5, 14.8, 16.1, 17.4'],
          fieldMappings: [
            {
              id: 'static-labels',
              widgetField: '축 레이블',
              sourceField: 'config.labels',
              sampleValue: 'Q1 · Q2 · Q3 · Q4',
              required: true,
            },
            {
              id: 'static-data',
              widgetField: '데이터셋',
              sourceField: 'config.datasets[0].data',
              sampleValue: '12.5, 14.8, 16.1, 17.4',
            },
          ],
        },
        sql: {
          label: 'Analytics.RevenueTrend',
          summary: '분기별 매출 변동을 분석용 뷰에서 가져옵니다.',
          connectionLabel: 'analytics (ro)',
          queryPreview:
            'SELECT fiscal_quarter, revenue_musd\nFROM analytics_revenue_trend\nWHERE company_id = @companyId\nORDER BY fiscal_quarter',
          parameters: [{ key: 'companyId', value: 'ACME-NORTHAMERICA', type: 'string' }],
          lastSyncedAt: '2024-06-10 16:30',
          previewRows: ['2023 Q1 | 12.5', '2023 Q2 | 14.2', '2023 Q3 | 16.1'],
          status: 'synced',
          fieldMappings: [
            {
              id: 'sql-label',
              widgetField: '축 레이블',
              sourceField: 'fiscal_quarter',
              sampleValue: '2023 Q4',
              required: true,
            },
            {
              id: 'sql-dataset',
              widgetField: '데이터셋',
              sourceField: 'revenue_musd',
              sampleValue: '18.4',
              required: true,
            },
            {
              id: 'sql-precision',
              widgetField: '표시 옵션',
              sourceField: 'ROUND(revenue_musd, 1)',
              sampleValue: '18.4',
              note: '소수점 1자리 고정',
            },
          ],
        },
        api: {
          label: 'Metrics Gateway',
          summary: '실시간 매출 지표 API와 연동합니다.',
          endpoint: 'GET https://metrics.acme.dev/v1/revenue/trend?interval=quarter',
          parameters: [{ key: 'region', value: 'north-america', type: 'string' }],
          lastSyncedAt: '2024-06-11 09:05',
          previewRows: ['{ quarter: "2023 Q4", value: 18.4 }', '{ quarter: "2024 Q1", value: 19.7 }'],
          status: 'synced',
          fieldMappings: [
            {
              id: 'api-labels',
              widgetField: '축 레이블',
              sourceField: 'data[].quarter',
              sampleValue: '2023 Q4',
              required: true,
            },
            {
              id: 'api-values',
              widgetField: '데이터셋',
              sourceField: 'data[].value',
              sampleValue: '18.4',
              required: true,
            },
            {
              id: 'api-notes',
              widgetField: '보조 정보',
              sourceField: 'meta.comparedToPrior',
              sampleValue: '+1.2pp',
            },
          ],
        },
      },
    });
  }

  return presets;
};

export const DataBinderProvider = ({ children }: { children: ReactNode }) => {
  const [bindings, setBindings] = useState<WidgetBindingPreset[]>(createInitialPresets);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(() => bindings[0]?.widget.id ?? '');

  useEffect(() => {
    if (bindings.length === 0) {
      setSelectedWidgetId('');
      return;
    }

    if (!bindings.some((binding) => binding.widget.id === selectedWidgetId)) {
      setSelectedWidgetId(bindings[0].widget.id);
    }
  }, [bindings, selectedWidgetId]);

  const selectWidget = useCallback((widgetId: string) => {
    setSelectedWidgetId(widgetId);
  }, []);

  const setActiveSource = useCallback((widgetId: string, source: DataSourceType) => {
    setBindings((prev) =>
      prev.map((binding) =>
        binding.widget.id === widgetId
          ? {
              ...binding,
              activeSource: source,
            }
          : binding,
      ),
    );
  }, []);

  const value = useMemo<DataBinderStoreValue>(
    () => ({
      bindings,
      selectedWidgetId,
      selectWidget,
      setActiveSource,
    }),
    [bindings, selectedWidgetId, selectWidget, setActiveSource],
  );

  return <DataBinderStoreContext.Provider value={value}>{children}</DataBinderStoreContext.Provider>;
};

export const useDataBinderStore = () => {
  const context = useContext(DataBinderStoreContext);
  if (!context) {
    throw new Error('useDataBinderStore must be used within a DataBinderProvider');
  }
  return context;
};

export const useSelectedBinding = () => {
  const { bindings, selectedWidgetId } = useDataBinderStore();
  return useMemo(
    () => bindings.find((binding) => binding.widget.id === selectedWidgetId) ?? bindings[0] ?? null,
    [bindings, selectedWidgetId],
  );
};
