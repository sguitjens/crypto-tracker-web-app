let portfolioChart = null;
let allocationChart = null;

const CHART_COLORS = [
  '#f7931a', '#627eea', '#26a17b', '#e84142', '#2775ca',
  '#f0b90b', '#8247e5', '#ff007a', '#00d395', '#16213e',
];

export function renderPortfolioChart(labels, values) {
  const ctx = document.getElementById('portfolio-chart');
  if (!ctx) return;

  const isDark = document.documentElement.dataset.theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textColor = isDark ? '#a0aec0' : '#4a5568';

  if (portfolioChart) portfolioChart.destroy();

  portfolioChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Portfolio Value',
        data: values,
        borderColor: '#f7931a',
        backgroundColor: 'rgba(247,147,26,0.1)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 7 } },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            callback: v => '$' + formatCompact(v),
          },
        },
      },
    },
  });
}

export function renderAllocationChart(labels, values) {
  const ctx = document.getElementById('allocation-chart');
  if (!ctx) return;

  if (allocationChart) allocationChart.destroy();

  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.slice(0, values.length),
        borderWidth: 2,
        borderColor: document.documentElement.dataset.theme === 'dark' ? '#1a1a2e' : '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: document.documentElement.dataset.theme === 'dark' ? '#e2e8f0' : '#2d3748' } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
          },
        },
      },
    },
  });
}

export function renderSparkline(canvas, prices, positive) {
  if (!canvas || !prices?.length) return;
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: prices.map((_, i) => i),
      datasets: [{
        data: prices,
        borderColor: positive ? '#48bb78' : '#fc8181',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      }],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });
}

export function destroyAllCharts() {
  if (portfolioChart) { portfolioChart.destroy(); portfolioChart = null; }
  if (allocationChart) { allocationChart.destroy(); allocationChart = null; }
}

function formatCompact(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}
