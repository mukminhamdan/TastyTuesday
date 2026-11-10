import { useEffect, useRef } from 'react';
import { Chart as ChartJS, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import { fmtRM } from '../lib/format.js';

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// Validated categorical palette (fixed order, never cycled).
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

/**
 * Thin wrapper over Chart.js.
 * datasets: [{ label, data, color? }] ; money: values are sen
 */
export default function Chart({ type = 'bar', labels, datasets, money = false, height = 260, horizontal = false, stacked = false }) {
  const canvas = useRef(null);
  const chart = useRef(null);
  useEffect(() => {
    const fmt = (v) => (money ? fmtRM(v) : Number(v).toLocaleString('en-MY'));
    const short = (v) => {
      if (!money) return Number(v).toLocaleString('en-MY');
      const rm = v / 100;
      return rm >= 1000 ? `RM ${(rm / 1000).toLocaleString('en-MY', { maximumFractionDigits: 1 })}k` : `RM ${rm.toLocaleString('en-MY')}`;
    };
    const multi = datasets.length > 1;
    const config = {
      type,
      data: {
        labels,
        datasets: datasets.map((d, i) => {
          const color = d.color || SERIES[i];
          return type === 'line'
            ? { label: d.label, data: d.data, borderColor: color, backgroundColor: color + '22', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.25, fill: !multi }
            : {
                label: d.label,
                data: d.data,
                backgroundColor: color,
                hoverBackgroundColor: color,
                borderRadius: 4,
                borderSkipped: 'start',
                maxBarThickness: 28,
                borderColor: '#fff',
                borderWidth: multi && !stacked ? 0 : 0,
              };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: multi, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, color: '#475569', font: { size: 12 } } },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 6,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(horizontal ? ctx.parsed.x : ctx.parsed.y)}` },
          },
        },
        scales: {
          [horizontal ? 'y' : 'x']: { stacked, grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } }, border: { color: '#e2e8f0' } },
          [horizontal ? 'x' : 'y']: {
            stacked,
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 }, callback: short, maxTicksLimit: 6 },
          },
        },
      },
    };
    if (chart.current) chart.current.destroy();
    chart.current = new ChartJS(canvas.current, config);
    return () => chart.current?.destroy();
  }, [type, labels, datasets, money, horizontal, stacked]);
  return (
    <div style={{ height }} className="relative">
      <canvas ref={canvas} role="img" aria-label={datasets.map((d) => d.label).join(', ')} />
    </div>
  );
}
