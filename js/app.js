import { getGlobalStats, getTopCoins, getCoinDetail, getCoinMarketChart, searchCoins, getSimplePrice, getNews } from './api.js';
import { loadHoldings, saveHoldings, addHolding, removeHolding, calcPortfolioStats, buildPortfolioHistory } from './portfolio.js';
import { renderPortfolioChart, renderAllocationChart, renderSparkline, destroyAllCharts } from './charts.js';

// ── State ────────────────────────────────────────────────────────────────────
let currency = localStorage.getItem('ct_currency') ?? 'usd';
let holdings = loadHoldings();
let currentPage = 'dashboard';
let searchDebounce = null;
let holdingDebounce = null;
let selectedHoldingCoin = null;
let refreshInterval = null;

const CURRENCY_SYMBOLS = { usd: '$', eur: '€', gbp: '£' };

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreTheme();
  restoreCurrency();
  bindNav();
  bindThemeToggle();
  bindCurrencySelect();
  bindPortfolioModal();
  bindSearchPage();
  loadPage('dashboard');
});

// ── Navigation ───────────────────────────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.page);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  currentPage = page;
  clearInterval(refreshInterval);
  loadPage(page);
}

function loadPage(page) {
  if (page === 'dashboard') loadDashboard();
  else if (page === 'portfolio') loadPortfolio();
  else if (page === 'news') loadNews();
}

// ── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  await Promise.all([loadGlobalStats(), loadCoinTable()]);
  await loadPortfolioChart();
  refreshInterval = setInterval(() => {
    if (currentPage === 'dashboard') loadCoinTable();
  }, 60_000);
}

async function loadGlobalStats() {
  try {
    const { data } = await getGlobalStats();
    const sym = CURRENCY_SYMBOLS[currency];
    document.getElementById('metric-market-cap').textContent =
      sym + formatCompact(data.total_market_cap[currency]);
    document.getElementById('metric-volume').textContent =
      sym + formatCompact(data.total_volume[currency]);
    document.getElementById('metric-btc-dom').textContent =
      data.market_cap_percentage.btc.toFixed(1) + '%';
    document.getElementById('metric-active').textContent =
      data.active_cryptocurrencies.toLocaleString();
    document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('skeleton'));
  } catch (e) {
    console.error('Global stats error:', e);
  }
}

async function loadCoinTable() {
  try {
    const coins = await getTopCoins(currency, 50);
    const tbody = document.getElementById('coin-table-body');
    tbody.innerHTML = '';
    coins.forEach((coin, i) => {
      const change24 = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0;
      const change7d = coin.price_change_percentage_7d_in_currency ?? 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="rank">${coin.market_cap_rank ?? i + 1}</td>
        <td class="coin-name">
          <img src="${coin.image}" alt="${coin.symbol}" width="24" height="24" loading="lazy" />
          <span class="name">${coin.name}</span>
          <span class="symbol">${coin.symbol.toUpperCase()}</span>
        </td>
        <td class="price">${formatPrice(coin.current_price, currency)}</td>
        <td class="change ${change24 >= 0 ? 'positive' : 'negative'}">${formatPct(change24)}</td>
        <td class="change ${change7d >= 0 ? 'positive' : 'negative'}">${formatPct(change7d)}</td>
        <td>${CURRENCY_SYMBOLS[currency]}${formatCompact(coin.market_cap)}</td>
        <td>${CURRENCY_SYMBOLS[currency]}${formatCompact(coin.total_volume)}</td>
        <td class="sparkline-cell"><canvas width="100" height="36"></canvas></td>
      `;
      tbody.appendChild(row);
      const canvas = row.querySelector('canvas');
      renderSparkline(canvas, coin.sparkline_in_7d?.price, change7d >= 0);
    });
    document.getElementById('last-updated').textContent =
      'Updated ' + new Date().toLocaleTimeString();
  } catch (e) {
    console.error('Coin table error:', e);
    document.getElementById('coin-table-body').innerHTML =
      '<tr><td colspan="8" class="error-cell">Failed to load coins. Rate limit may apply — try again shortly.</td></tr>';
  }
}

async function loadPortfolioChart() {
  if (!holdings.length) {
    // Show demo chart with BTC history
    try {
      const btcData = await getCoinMarketChart('bitcoin', currency, 7);
      const labels = btcData.prices.map(([ts]) => {
        const d = new Date(ts);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      });
      const values = btcData.prices.map(([, price]) => price);
      renderPortfolioChart(labels, values);
    } catch (e) {
      console.error('Chart error:', e);
    }
    return;
  }

  try {
    const chartData = {};
    await Promise.all(holdings.map(async h => {
      const data = await getCoinMarketChart(h.id, currency, 7);
      chartData[h.id] = data;
    }));
    const { labels, values } = buildPortfolioHistory(holdings, chartData);
    renderPortfolioChart(labels, values);
  } catch (e) {
    console.error('Portfolio chart error:', e);
  }
}

// ── Portfolio ────────────────────────────────────────────────────────────────
async function loadPortfolio() {
  renderHoldingsList([]);
  if (!holdings.length) {
    document.getElementById('holdings-list').innerHTML =
      '<p class="empty-state">No holdings yet. Add your first coin!</p>';
    renderAllocationChart([], []);
    return;
  }

  const ids = holdings.map(h => h.id);
  try {
    const prices = await getSimplePrice(ids, currency);
    const { enriched, totalValue, totalPnl, totalPnlPct } = calcPortfolioStats(holdings, prices);

    const sym = CURRENCY_SYMBOLS[currency];
    document.getElementById('port-total-value').textContent = sym + totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('port-pnl').textContent = (totalPnl >= 0 ? '+' : '') + sym + totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('port-pnl').className = 'metric-value ' + (totalPnl >= 0 ? 'positive' : 'negative');
    document.getElementById('port-pnl-pct').textContent = (totalPnlPct >= 0 ? '+' : '') + totalPnlPct.toFixed(2) + '%';
    document.getElementById('port-pnl-pct').className = 'metric-value ' + (totalPnlPct >= 0 ? 'positive' : 'negative');

    renderHoldingsList(enriched);
    const allocationPcts = enriched.map(h => totalValue > 0 ? (h.value / totalValue) * 100 : 0);
    renderAllocationChart(enriched.map(h => h.symbol.toUpperCase()), allocationPcts);
  } catch (e) {
    console.error('Portfolio load error:', e);
  }
}

function renderHoldingsList(enriched) {
  const list = document.getElementById('holdings-list');
  if (!enriched.length) return;
  const sym = CURRENCY_SYMBOLS[currency];
  list.innerHTML = enriched.map(h => `
    <div class="holding-row" data-id="${h.id}">
      <div class="holding-info">
        <span class="holding-name">${h.name}</span>
        <span class="holding-symbol">${h.symbol.toUpperCase()}</span>
      </div>
      <div class="holding-amounts">
        <span class="holding-amount">${h.amount} ${h.symbol.toUpperCase()}</span>
        <span class="holding-value">${sym}${h.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="holding-pnl ${h.pnl >= 0 ? 'positive' : 'negative'}">
        <span>${h.pnl >= 0 ? '+' : ''}${sym}${Math.abs(h.pnl).toFixed(2)}</span>
        <span>${h.pnlPct >= 0 ? '+' : ''}${h.pnlPct.toFixed(2)}%</span>
      </div>
      <button class="remove-holding" data-id="${h.id}" aria-label="Remove ${h.name}">&#215;</button>
    </div>
  `).join('');

  list.querySelectorAll('.remove-holding').forEach(btn => {
    btn.addEventListener('click', () => {
      holdings = removeHolding(holdings, btn.dataset.id);
      saveHoldings(holdings);
      loadPortfolio();
    });
  });
}

function bindPortfolioModal() {
  document.getElementById('add-holding-btn').addEventListener('click', () => {
    document.getElementById('add-holding-modal').classList.remove('hidden');
  });
  document.getElementById('cancel-holding-btn').addEventListener('click', closeModal);
  document.getElementById('add-holding-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  const coinInput = document.getElementById('holding-coin-input');
  const suggestions = document.getElementById('holding-coin-suggestions');

  coinInput.addEventListener('input', () => {
    clearTimeout(holdingDebounce);
    holdingDebounce = setTimeout(async () => {
      const results = await searchCoins(coinInput.value);
      suggestions.innerHTML = results.slice(0, 6).map(c =>
        `<li data-id="${c.id}" data-name="${c.name}" data-symbol="${c.symbol}">
          <img src="${c.thumb}" width="16" height="16" alt="" />
          ${c.name} <span class="sym">${c.symbol.toUpperCase()}</span>
        </li>`
      ).join('');
      suggestions.classList.toggle('hidden', !results.length);
    }, 300);
  });

  suggestions.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    selectedHoldingCoin = { id: li.dataset.id, name: li.dataset.name, symbol: li.dataset.symbol };
    coinInput.value = `${li.dataset.name} (${li.dataset.symbol.toUpperCase()})`;
    suggestions.classList.add('hidden');
  });

  document.getElementById('save-holding-btn').addEventListener('click', async () => {
    if (!selectedHoldingCoin) return alert('Please select a coin.');
    const amount = parseFloat(document.getElementById('holding-amount').value);
    const price = parseFloat(document.getElementById('holding-price').value);
    if (!amount || !price) return alert('Please enter amount and purchase price.');
    holdings = addHolding(holdings, { ...selectedHoldingCoin, amount, purchasePrice: price });
    saveHoldings(holdings);
    closeModal();
    if (currentPage === 'portfolio') loadPortfolio();
  });
}

function closeModal() {
  document.getElementById('add-holding-modal').classList.add('hidden');
  document.getElementById('holding-coin-input').value = '';
  document.getElementById('holding-amount').value = '';
  document.getElementById('holding-price').value = '';
  document.getElementById('holding-coin-suggestions').innerHTML = '';
  selectedHoldingCoin = null;
}

// ── Search ───────────────────────────────────────────────────────────────────
function bindSearchPage() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runSearch(input.value), 350);
  });
}

async function runSearch(query) {
  const resultsEl = document.getElementById('search-results');
  document.getElementById('coin-detail-panel').classList.add('hidden');
  if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }
  resultsEl.innerHTML = '<p class="loading-text">Searching...</p>';
  try {
    const coins = await searchCoins(query);
    resultsEl.innerHTML = coins.slice(0, 20).map(c => `
      <div class="search-result-item" data-id="${c.id}">
        <img src="${c.thumb}" width="24" height="24" alt="${c.symbol}" />
        <span class="name">${c.name}</span>
        <span class="sym">${c.symbol.toUpperCase()}</span>
        <span class="rank">#${c.market_cap_rank ?? '—'}</span>
      </div>
    `).join('') || '<p class="empty-state">No results found.</p>';

    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => showCoinDetail(el.dataset.id));
    });
  } catch (e) {
    resultsEl.innerHTML = '<p class="error-cell">Search failed. Please try again.</p>';
  }
}

async function showCoinDetail(id) {
  const panel = document.getElementById('coin-detail-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = '<p class="loading-text">Loading...</p>';
  try {
    const coin = await getCoinDetail(id, currency);
    const md = coin.market_data;
    const sym = CURRENCY_SYMBOLS[currency];
    const change24 = md.price_change_percentage_24h ?? 0;
    panel.innerHTML = `
      <div class="detail-header">
        <img src="${coin.image?.small}" width="40" height="40" alt="${coin.name}" />
        <div>
          <h3>${coin.name} <span class="sym">${coin.symbol.toUpperCase()}</span></h3>
          <span class="rank">#${coin.market_cap_rank}</span>
        </div>
        <button id="close-detail" class="btn-secondary">&#215;</button>
      </div>
      <div class="detail-price">
        <span class="big-price">${sym}${md.current_price[currency].toLocaleString()}</span>
        <span class="change ${change24 >= 0 ? 'positive' : 'negative'}">${formatPct(change24)}</span>
      </div>
      <div class="detail-stats">
        <div><label>Market Cap</label><span>${sym}${formatCompact(md.market_cap[currency])}</span></div>
        <div><label>24h Volume</label><span>${sym}${formatCompact(md.total_volume[currency])}</span></div>
        <div><label>All-Time High</label><span>${sym}${md.ath[currency].toLocaleString()}</span></div>
        <div><label>Circulating Supply</label><span>${formatCompact(md.circulating_supply)} ${coin.symbol.toUpperCase()}</span></div>
      </div>
      <div class="detail-desc">${coin.description?.en ? coin.description.en.split('. ').slice(0, 2).join('. ') + '.' : ''}</div>
      <div class="detail-actions">
        <button class="btn-primary add-from-search" data-id="${coin.id}" data-name="${coin.name}" data-symbol="${coin.symbol}">
          + Add to Portfolio
        </button>
      </div>
    `;
    panel.querySelector('#close-detail').addEventListener('click', () => panel.classList.add('hidden'));
    panel.querySelector('.add-from-search').addEventListener('click', e => {
      const { id, name, symbol } = e.currentTarget.dataset;
      selectedHoldingCoin = { id, name, symbol };
      document.getElementById('holding-coin-input').value = `${name} (${symbol.toUpperCase()})`;
      navigateTo('portfolio');
      document.getElementById('add-holding-modal').classList.remove('hidden');
    });
  } catch (e) {
    panel.innerHTML = '<p class="error-cell">Failed to load coin details.</p>';
  }
}

// ── News ─────────────────────────────────────────────────────────────────────
async function loadNews() {
  const feed = document.getElementById('news-feed');
  // NewsData.io requires an API key — using mock data for now
  // Set window.NEWS_API_KEY = 'your_key' to enable live news
  try {
    const { results } = await getNews(window.NEWS_API_KEY ?? null);
    if (!results?.length) { feed.innerHTML = '<p class="empty-state">No news available.</p>'; return; }
    feed.innerHTML = results.map(article => `
      <a class="news-card" href="${article.link}" target="_blank" rel="noopener noreferrer">
        ${article.image_url ? `<img src="${article.image_url}" alt="" class="news-img" loading="lazy" />` : '<div class="news-img-placeholder"></div>'}
        <div class="news-content">
          <h3 class="news-title">${article.title}</h3>
          <p class="news-desc">${article.description ?? ''}</p>
          <div class="news-meta">
            <span class="news-source">${article.source_id}</span>
            <span class="news-date">${formatDate(article.pubDate)}</span>
          </div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    feed.innerHTML = '<p class="error-cell">Failed to load news.</p>';
  }
}

// ── Theme & Currency ─────────────────────────────────────────────────────────
function bindThemeToggle() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('ct_theme', next);
    document.getElementById('theme-toggle').textContent = next === 'dark' ? '☽' : '☀';
  });
}

function restoreTheme() {
  const saved = localStorage.getItem('ct_theme') ?? 'dark';
  document.documentElement.dataset.theme = saved;
  document.getElementById('theme-toggle').textContent = saved === 'dark' ? '☽' : '☀';
}

function bindCurrencySelect() {
  const sel = document.getElementById('currency-select');
  sel.addEventListener('change', () => {
    currency = sel.value;
    localStorage.setItem('ct_currency', currency);
    document.querySelectorAll('.currency-label').forEach(el => el.textContent = currency.toUpperCase());
    loadPage(currentPage);
  });
}

function restoreCurrency() {
  document.getElementById('currency-select').value = currency;
  document.querySelectorAll('.currency-label').forEach(el => el.textContent = currency.toUpperCase());
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatPrice(price, curr) {
  const sym = CURRENCY_SYMBOLS[curr];
  if (price >= 1) return sym + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return sym + price.toPrecision(4);
}

function formatPct(n) {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function formatCompact(n) {
  if (!n) return '0';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return n.toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
