"""Page Object for the Search page."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL


class SearchPage:
    NAV_BTN = (By.CSS_SELECTOR, "[data-page='search']")
    SEARCH_INPUT = (By.ID, "search-input")
    RESULT_ITEMS = (By.CSS_SELECTOR, ".search-result-item")
    DETAIL_PANEL = (By.ID, "coin-detail-panel")
    ADD_TO_PORTFOLIO_BTN = (By.CSS_SELECTOR, ".add-from-search")

    def __init__(self, driver, base_url=BASE_URL):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 15)

    def load(self):
        self.driver.get(self.base_url)
        self.driver.find_element(*self.NAV_BTN).click()
        return self

    def search(self, query):
        inp = self.driver.find_element(*self.SEARCH_INPUT)
        inp.clear()
        inp.send_keys(query)
        self.wait.until(EC.presence_of_element_located(self.RESULT_ITEMS))
        return self

    def click_first_result(self):
        self.driver.find_elements(*self.RESULT_ITEMS)[0].click()
        self.wait.until(EC.visibility_of_element_located(self.DETAIL_PANEL))
        return self

    def click_add_to_portfolio(self):
        self.wait.until(EC.element_to_be_clickable(self.ADD_TO_PORTFOLIO_BTN))
        self.driver.find_element(*self.ADD_TO_PORTFOLIO_BTN).click()
        return self
