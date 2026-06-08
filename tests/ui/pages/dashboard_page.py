"""Page Object for the Dashboard page."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class DashboardPage:
    METRIC_MARKET_CAP = (By.ID, "metric-market-cap")
    METRIC_VOLUME = (By.ID, "metric-volume")
    COIN_TABLE_BODY = (By.ID, "coin-table-body")
    LAST_UPDATED = (By.ID, "last-updated")
    PORTFOLIO_CHART = (By.ID, "portfolio-chart")

    def __init__(self, driver, base_url="http://localhost:3000"):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 15)

    def load(self):
        self.driver.get(self.base_url)
        return self

    def wait_for_coins(self):
        self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#coin-table-body tr:not(.skeleton-row)"))
        )
        return self

    def get_coin_rows(self):
        return self.driver.find_elements(By.CSS_SELECTOR, "#coin-table-body tr")

    def get_market_cap_text(self):
        return self.driver.find_element(*self.METRIC_MARKET_CAP).text

    def get_last_updated_text(self):
        return self.driver.find_element(*self.LAST_UPDATED).text

    def is_chart_rendered(self):
        canvas = self.driver.find_element(*self.PORTFOLIO_CHART)
        return canvas.is_displayed()
