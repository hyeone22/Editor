import { useMemo } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ensureChartJsRegistered } from './chartSetup';

ensureChartJsRegistered();

const SAMPLE_DATA: ChartData<'bar'> = {
  labels: ['1분기', '2분기', '3분기', '4분기'],
  datasets: [
    {
      label: '온라인 매출',
      data: [320, 410, 380, 450],
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 6,
    },
    {
      label: '오프라인 매출',
      data: [280, 300, 340, 360],
      backgroundColor: 'rgba(16, 185, 129, 0.7)',
      borderRadius: 6,
    },
  ],
};

const SAMPLE_OPTIONS: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 100,
      },
    },
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded',
      },
    },
    title: {
      display: true,
      text: '분기별 채널 매출 비교',
    },
  },
};

export interface BarChartProps {
  data?: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
}

const DEFAULT_HEIGHT = 320;

const BarChart = ({ data = SAMPLE_DATA, options, height = DEFAULT_HEIGHT }: BarChartProps) => {
  const resolvedOptions = useMemo(() => options ?? SAMPLE_OPTIONS, [options]);

  return (
    <div style={{ position: 'relative', height }}>
      <Bar data={data} options={resolvedOptions} />
    </div>
  );
};

export default BarChart;
