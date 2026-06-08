"""Integration tests for CoinGecko API endpoints used by the app."""
import requests
import pytest

BASE = "https://api.coingecko.com/api/v3"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


def test_global_stats(session):
    r = session.get(f"{BASE}/global", timeout=10)
    assert r.status_code == 200
    data = r.json()["data"]
    assert "total_market_cap" in data
    assert "usd" in data["total_market_cap"]
    assert data["active_cryptocurrencies"] > 0


def test_top_coins(session):
    r = session.get(
        f"{BASE}/coins/markets",
        params={"vs_currency": "usd", "order": "market_cap_desc", "per_page": 10, "sparkline": "true"},
        timeout=10,
    )
    assert r.status_code == 200
    coins = r.json()
    assert len(coins) == 10
    for coin in coins:
        assert "id" in coin
        assert "current_price" in coin
        assert "sparkline_in_7d" in coin


def test_search(session):
    r = session.get(f"{BASE}/search", params={"query": "bitcoin"}, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "coins" in data
    assert any(c["id"] == "bitcoin" for c in data["coins"])


def test_simple_price(session):
    r = session.get(
        f"{BASE}/simple/price",
        params={"ids": "bitcoin,ethereum", "vs_currencies": "usd", "include_24hr_change": "true"},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert "bitcoin" in data
    assert "ethereum" in data
    assert data["bitcoin"]["usd"] > 0


def test_market_chart(session):
    r = session.get(
        f"{BASE}/coins/bitcoin/market_chart",
        params={"vs_currency": "usd", "days": 7},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert "prices" in data
    assert len(data["prices"]) > 0
    assert len(data["prices"][0]) == 2  # [timestamp, price]
