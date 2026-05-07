import React, { useEffect, useRef } from 'react';

const PIE_COLORS = ['#a78bfa', '#6d28d9', '#4c1d95', '#7c3aed', '#8b5cf6', '#c4b5fd'];

interface Candidate {
  candidate_id: number;
  votes: number;
}

interface PieChartProps {
  candidates: Candidate[];
  totalVotes: number;
  chartId: string;
}

const PieChart: React.FC<PieChartProps> = ({ candidates, totalVotes, chartId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const init = () => {
      const Chart = (window as any).Chart;
      if (!Chart) { setTimeout(init, 100); return; }
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: 'pie',
        data: {
          labels: candidates.map(c => `#${c.candidate_id}`),
          datasets: [{
            data: candidates.map(c => c.votes),
            backgroundColor: candidates.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]),
            borderWidth: 2,
            borderColor: '#0f0f0f',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const pct = Math.round((ctx.raw / totalVotes) * 100);
                  return ` ${ctx.raw} votes (${pct}%)`;
                }
              }
            }
          }
        }
      });
    };

    if (!(window as any).Chart) {
      const existing = document.getElementById('chartjs-cdn');
      if (!existing) {
        const s = document.createElement('script');
        s.id = 'chartjs-cdn';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = init;
        document.head.appendChild(s);
      } else {
        existing.addEventListener('load', init);
      }
    } else {
      init();
    }

    return () => { chartRef.current?.destroy(); };
  }, [candidates, totalVotes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} id={chartId} />
    </div>
  );
};

export default PieChart;