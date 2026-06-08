const STORAGE_KEY = 'ct_holdings';

export function loadHoldings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

export function addHolding(holdings, { id, symbol, name, amount, purchasePrice }) {
  const existing = holdings.find(h => h.id === id);
  if (existing) {
    // Average down/up: combine positions
    const totalCost = existing.amount * existing.purchasePrice + amount * purchasePrice;
    const totalAmount = existing.amount + amount;
    existing.amount = totalAmount;
    existing.purchasePrice = totalCost / totalAmount;
    return [...holdings];
  }
  return [...holdings, { id, symbol, name, amount: Number(amount), purchasePrice: Number(purchasePrice) }];
}

export function removeHolding(holdings, id) {
  return holdings.filter(h => h.id !== id);
}

export function calcPortfolioStats(holdings, prices) {
  let totalValue = 0;
  let totalCost = 0;

  const enriched = holdings.map(h => {
    const priceData = prices[h.id];
    const currentPrice = priceData?.usd ?? priceData?.eur ?? priceData?.gbp ?? 0;
    const value = h.amount * currentPrice;
    const cost = h.amount * h.purchasePrice;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    totalValue += value;
    totalCost += cost;
    return { ...h, currentPrice, value, cost, pnl, pnlPct };
  });

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return { enriched, totalValue, totalCost, totalPnl, totalPnlPct };
}

export function buildPortfolioHistory(holdings, chartData) {
  // chartData: { coinId: [[timestamp, price], ...] }
  if (!holdings.length || !Object.keys(chartData).length) return { labels: [], values: [] };

  // Use BTC (or first coin) timestamps as x-axis
  const firstId = Object.keys(chartData)[0];
  const prices = chartData[firstId]?.prices ?? [];

  const labels = prices.map(([ts]) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const values = prices.map(([ts], i) => {
    return holdings.reduce((sum, h) => {
      const coinPrices = chartData[h.id]?.prices ?? [];
      const price = coinPrices[i]?.[1] ?? 0;
      return sum + h.amount * price;
    }, 0);
  });

  return { labels, values };
}
