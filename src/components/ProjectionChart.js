import { jsx as _jsx } from "react/jsx-runtime";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip, } from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
const currencyFormatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
});
export const ProjectionChart = ({ data }) => {
    if (!data.length) {
        return _jsx("p", { className: "text-sm text-slate-400", children: "Add a contribution plan to preview your retirement balance." });
    }
    const labels = data.map((point) => `Age ${point.age}`);
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Projected Balance',
                data: data.map((point) => point.balance),
                borderColor: '#1F8EF1',
                backgroundColor: 'rgba(31, 142, 241, 0.15)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
            },
            {
                label: 'Inflation Adjusted',
                data: data.map((point) => point.realBalance),
                borderColor: '#C084FC',
                tension: 0.35,
                borderDash: [6, 6],
                borderWidth: 2,
            },
            {
                label: 'Total Contributions',
                data: data.map((point) => point.totalContributions),
                borderColor: '#10B981',
                tension: 0.35,
                borderWidth: 2,
            },
        ],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#CBD5F5',
                    usePointStyle: true,
                },
            },
            tooltip: {
                callbacks: {
                    label(context) {
                        return `${context.dataset.label}: ${currencyFormatter.format(Number(context.parsed.y ?? context.parsed))}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: { color: '#94A3B8' },
                grid: { color: 'rgba(148,163,184,0.2)' },
            },
            y: {
                ticks: {
                    color: '#94A3B8',
                    callback(value) {
                        if (typeof value === 'string')
                            return value;
                        return `${Math.round(Number(value) / 1000)}k`;
                    },
                },
                grid: { color: 'rgba(148,163,184,0.2)' },
            },
        },
    };
    return (_jsx("div", { className: "h-80", children: _jsx(Line, { data: chartData, options: options, updateMode: "resize" }) }));
};
