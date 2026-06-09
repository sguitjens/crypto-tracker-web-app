"""Selenium E2E tests for the Portfolio page."""
import pytest
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pages.portfolio_page import PortfolioPage


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
