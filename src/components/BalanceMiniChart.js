import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip, } from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const currencyFormatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
});
export const BalanceMiniChart = ({ data, label, color }) => {
    if (!data.length) {
        return _jsxs("p", { className: "text-sm text-slate-400", children: ["Add contributions to preview ", label, " growth."] });
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
                    label(context) {
                        const parsed = context.parsed;
                        const value = typeof parsed === 'object' && parsed !== null ? Number(parsed.y ?? 0) : Number(parsed ?? 0);
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
    return (_jsx("div", { className: "h-32", children: _jsx(Line, { data: chartData, options: options, updateMode: "resize" }) }));
};
