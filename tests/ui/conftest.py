import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions


def pytest_addoption(parser):
    parser.addoption("--browser", default="firefox", choices=["chrome", "firefox"])
    parser.addoption("--no-headless", action="store_true", default=False)


@pytest.fixture(scope="module")
def driver(request):
    browser = request.config.getoption("--browser")
    headless = not request.config.getoption("--no-headless")
    if browser == "chrome":
        opts = ChromeOptions()
        if headless:
            opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        d = webdriver.Chrome(options=opts)
    else:
        opts = FirefoxOptions()
        if headless:
            opts.add_argument("-headless")
        d = webdriver.Firefox(options=opts)
    yield d
    d.quit()
