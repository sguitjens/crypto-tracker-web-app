"""Page Object for the Portfolio page."""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class PortfolioPage:
    NAV_BTN = (By.CSS_SELECTOR, "[data-page='portfolio']")
    ADD_HOLDING_BTN = (By.ID, "add-holding-btn")
    MODAL = (By.ID, "add-holding-modal")
    COIN_INPUT = (By.ID, "holding-coin-input")
    AMOUNT_INPUT = (By.ID, "holding-amount")
    PRICE_INPUT = (By.ID, "holding-price")
    SAVE_BTN = (By.ID, "save-holding-btn")
    CANCEL_BTN = (By.ID, "cancel-holding-btn")
    SUGGESTIONS = (By.CSS_SELECTOR, "#holding-coin-suggestions li")
    HOLDINGS_LIST = (By.ID, "holdings-list")
    TOTAL_VALUE = (By.ID, "port-total-value")

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    def navigate(self):
        self.driver.find_element(*self.NAV_BTN).click()
        return self

    def open_add_modal(self):
        self.driver.find_element(*self.ADD_HOLDING_BTN).click()
        self.wait.until(EC.visibility_of_element_located(self.MODAL))
        return self

    def type_coin(self, text):
        inp = self.driver.find_element(*self.COIN_INPUT)
        inp.clear()
        inp.send_keys(text)
        return self

    def select_first_suggestion(self):
        self.wait.until(EC.presence_of_element_located(self.SUGGESTIONS))
        self.driver.find_elements(*self.SUGGESTIONS)[0].click()
        return self

    def enter_amount(self, amount):
        self.driver.find_element(*self.AMOUNT_INPUT).send_keys(str(amount))
        return self

    def enter_price(self, price):
        self.driver.find_element(*self.PRICE_INPUT).send_keys(str(price))
        return self

    def save(self):
        self.driver.find_element(*self.SAVE_BTN).click()
        return self

    def get_holding_rows(self):
        return self.driver.find_elements(By.CSS_SELECTOR, ".holding-row")

    def get_total_value_text(self):
        return self.driver.find_element(*self.TOTAL_VALUE).text
