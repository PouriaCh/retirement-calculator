import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ProjectionYear } from '../lib/calculator';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface BalanceMiniChartProps {
  data: ProjectionYear[];
  label: string;
  color: string;
}

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export const BalanceMiniChart = ({ data, label, color }: BalanceMiniChartProps) => {
  if (!data.length) {
    return <p className="text-sm text-slate-400">Add contributions to preview {label} growth.</p>;
  }

  const chartData = {
    labels: data.map((point) => `Age ${point.age}`),
    datasets: [
      {
        label,
        data: data.map((point) => point.balance),
        borderColor: color,
        backgroundColor: color + '33',
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(context: TooltipItem<'line'>) {
            const parsed = context.parsed;
            const value =
              typeof parsed === 'object' && parsed !== null ? Number((parsed as { y?: number }).y ?? 0) : Number(parsed ?? 0);
            return `${label}: ${currencyFormatter.format(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
  };

  return (
    <div className="h-32">
      <Line data={chartData} options={options} updateMode="resize" />
    </div>
  );
};
