"""Selenium E2E tests for the Dashboard page."""
import pytest
from pages.dashboard_page import DashboardPage


def test_dashboard_loads(driver):
    page = DashboardPage(driver).load()
    page.wait_for_coins()
    rows = page.get_coin_rows()
    assert len(rows) >= 10, f"Expected at least 10 coins, got {len(rows)}"


def test_market_cap_populated(driver):
    page = DashboardPage(driver)
    text = page.get_market_cap_text()
    assert text != "—", "Market cap should be populated after load"
    assert any(c in text for c in ['$', '€', '£']), "Market cap should have currency symbol"


def test_last_updated_shown(driver):
    page = DashboardPage(driver)
    text = page.get_last_updated_text()
    assert "Updated" in text


def test_portfolio_chart_rendered(driver):
    page = DashboardPage(driver)
    assert page.is_chart_rendered(), "Portfolio chart canvas should be visible"
