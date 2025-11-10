import { useMemo } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ensureChartJsRegistered } from './chartSetup';

ensureChartJsRegistered();

const SAMPLE_DATA: ChartData<'line'> = {
  labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
  datasets: [
    {
      label: '신규 가입자',
      data: [120, 180, 220, 260, 240, 300],
      borderColor: 'rgba(14, 165, 233, 1)',
      backgroundColor: 'rgba(14, 165, 233, 0.25)',
      tension: 0.35,
      fill: true,
    },
    {
      label: '유료 전환',
      data: [30, 45, 60, 80, 75, 95],
      borderColor: 'rgba(249, 115, 22, 1)',
      backgroundColor: 'rgba(249, 115, 22, 0.2)',
      tension: 0.35,
      fill: true,
    },
  ],
};

const SAMPLE_OPTIONS: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 50,
      },
    },
  },
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: '월별 사용자 행동 지표',
    },
  },
};

export interface LineChartProps {
  data?: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
}

const DEFAULT_HEIGHT = 320;

const LineChart = ({ data = SAMPLE_DATA, options, height = DEFAULT_HEIGHT }: LineChartProps) => {
  const resolvedOptions = useMemo(() => options ?? SAMPLE_OPTIONS, [options]);

  return (
    <div style={{ position: 'relative', height }}>
      <Line data={data} options={resolvedOptions} />
    </div>
  );
};

export default LineChart;
