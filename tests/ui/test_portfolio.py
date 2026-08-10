"""Selenium E2E tests for the Portfolio page."""
import pytest
import random
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pages.portfolio_page import PortfolioPage

HOLDINGS = [
    ("bitcoin", "bitcoin"),
    ("tether", "tether"),
    ("dogecoin", "dogecoin"),
    ("ethereum classic", "ethereum-classic"),
]


@pytest.mark.parametrize("close_method", ["cancel", "esc"])
def test_open_and_close_add_holding_modal(driver, close_method):
    page = PortfolioPage(driver)
    page.load()
    page.open_add_modal()

    if close_method == "cancel":
        page.cancel()
    else:
        page.driver.find_element(*PortfolioPage.COIN_INPUT).send_keys(Keys.ESCAPE)

    WebDriverWait(driver, 10).until(
        EC.invisibility_of_element_located(PortfolioPage.MODAL)
    )


def test_add_and_remove_holding_in_portfolio(driver):
    search_query, coin_id = random.choice(HOLDINGS)

    portfolio = PortfolioPage(driver)
    portfolio.load()
    portfolio.open_add_modal()
    portfolio.type_coin(search_query)
    portfolio.select_first_suggestion()
    portfolio.enter_amount(0.1)
    portfolio.enter_price(50000)
    portfolio.save()

    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, f".holding-row[data-id='{coin_id}']"))
    )
    assert coin_id in portfolio.get_holding_ids()

    portfolio.remove_holding(coin_id)
    assert coin_id not in portfolio.get_holding_ids()
