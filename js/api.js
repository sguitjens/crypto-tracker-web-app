const BASE = 'https://api.coingecko.com/api/v3';
const NEWS_BASE = 'https://newsdata.io/api/1';

// CoinGecko free tier: 30 req/min — cache aggressively
const cache = new Map();
const CACHE_TTL = 60_000;

async function fetchWithCache(url, ttl = CACHE_TTL) {
  const entry = cache.get(url);
  if (entry && Date.now() - entry.ts < ttl) return entry.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

export async function getGlobalStats() {
  return fetchWithCache(`${BASE}/global`);
}

export async function getTopCoins(currency = 'usd', perPage = 50, page = 1) {
  const url = `${BASE}/coins/markets?vs_currency=${currency}&order=market_cap_desc`
    + `&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=24h,7d`;
  return fetchWithCache(url, 30_000);
}

export async function getCoinDetail(id, currency = 'usd') {
  const url = `${BASE}/coins/${id}?localization=false&tickers=false`
    + `&market_data=true&community_data=false&developer_data=false&sparkline=true`;
  return fetchWithCache(url, 60_000);
}

export async function getCoinMarketChart(id, currency = 'usd', days = 7) {
  const url = `${BASE}/coins/${id}/market_chart?vs_currency=${currency}&days=${days}`;
  return fetchWithCache(url, 300_000);
}

export async function searchCoins(query) {
  if (!query || query.length < 2) return [];
  const url = `${BASE}/search?query=${encodeURIComponent(query)}`;
  const data = await fetchWithCache(url, 120_000);
  return data.coins ?? [];
}

export async function getSimplePrice(ids, currency = 'usd') {
  if (!ids.length) return {};
  const url = `${BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=${currency}`
    + `&include_24hr_change=true&include_market_cap=true`;
  return fetchWithCache(url, 30_000);
}

export async function getNews(apiKey) {
  if (!apiKey) return getMockNews();
  const url = `${NEWS_BASE}/news?apikey=${apiKey}&q=cryptocurrency&language=en&category=business`;
  try {
    return fetchWithCache(url, 600_000);
  } catch {
    return getMockNews();
  }
}

function getMockNews() {
  return {
    results: [
      {
        title: 'Bitcoin Reaches New Heights Amid Institutional Demand',
        description: 'Bitcoin continues its upward trajectory as institutional investors increase exposure.',
        link: '#',
        source_id: 'cryptonews',
        pubDate: new Date().toISOString(),
        image_url: null,
      },
      {
        title: 'Ethereum Layer 2 Adoption Surges in Q2',
        description: 'Layer 2 solutions see record transaction volumes as DeFi activity picks up.',
        link: '#',
        source_id: 'decrypt',
        pubDate: new Date().toISOString(),
        image_url: null,
      },
      {
        title: 'Regulatory Clarity Expected as SEC Reviews Crypto Guidelines',
        description: 'Markets await clearer regulatory guidance as the SEC reviews its crypto framework.',
        link: '#',
        source_id: 'coindesk',
        pubDate: new Date().toISOString(),
        image_url: null,
      },
    ],
  };
}
