import { Chart, ChartConfiguration, registerables } from 'chart.js';

let isRegistered = false;

export const ensureChartJsRegistered = () => {
  if (!isRegistered) {
    Chart.register(...registerables);
    isRegistered = true;
  }
};

export type ExtractChartType<TConfig> = TConfig extends ChartConfiguration<infer TType>
  ? TType
  : never;
