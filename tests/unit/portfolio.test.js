import { addHolding, removeHolding, calcPortfolioStats, buildPortfolioHistory } from '../../js/portfolio.js';

describe('addHolding', () => {
  test('adds new holding', () => {
    const result = addHolding([], { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 0.5, purchasePrice: 40000 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'bitcoin', amount: 0.5, purchasePrice: 40000 });
  });

  test('averages price on duplicate coin', () => {
    const base = [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 1, purchasePrice: 40000 }];
    const result = addHolding(base, { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 1, purchasePrice: 60000 });
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(2);
    expect(result[0].purchasePrice).toBe(50000);
  });
});

describe('removeHolding', () => {
  test('removes by id', () => {
    const holdings = [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 1, purchasePrice: 40000 },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum', amount: 10, purchasePrice: 2000 },
    ];
    const result = removeHolding(holdings, 'bitcoin');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ethereum');
  });

  test('returns same array if id not found', () => {
    const holdings = [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 1, purchasePrice: 40000 }];
    expect(removeHolding(holdings, 'notexist')).toHaveLength(1);
  });
});

describe('calcPortfolioStats', () => {
  const holdings = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 1, purchasePrice: 40000 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', amount: 10, purchasePrice: 2000 },
  ];

  test('calculates total value correctly', () => {
    const prices = { bitcoin: { usd: 50000 }, ethereum: { usd: 3000 } };
    const { totalValue } = calcPortfolioStats(holdings, prices);
    expect(totalValue).toBe(80000); // 50000 + 30000
  });

  test('calculates total P&L correctly', () => {
    const prices = { bitcoin: { usd: 50000 }, ethereum: { usd: 3000 } };
    const { totalPnl } = calcPortfolioStats(holdings, prices);
    expect(totalPnl).toBe(20000); // (50000-40000) + (30000-20000)
  });

  test('handles zero cost gracefully', () => {
    const { totalPnlPct } = calcPortfolioStats([], {});
    expect(totalPnlPct).toBe(0);
  });
});

describe('buildPortfolioHistory', () => {
  test('returns empty arrays for no holdings', () => {
    const { labels, values } = buildPortfolioHistory([], {});
    expect(labels).toEqual([]);
    expect(values).toEqual([]);
  });

  test('calculates history correctly', () => {
    const holdings = [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', amount: 2, purchasePrice: 40000 }];
    const chartData = {
      bitcoin: {
        prices: [
          [1700000000000, 40000],
          [1700086400000, 42000],
        ],
      },
    };
    const { values } = buildPortfolioHistory(holdings, chartData);
    expect(values[0]).toBe(80000);
    expect(values[1]).toBe(84000);
  });
});
