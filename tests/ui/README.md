# UI Tests

Selenium end-to-end tests for the crypto tracker dashboard.

## Prerequisites

- Python 3
- geckodriver (Firefox, default): `brew install geckodriver`
- chromedriver (Chrome, optional): `brew install chromedriver`

Install Python dependencies from the project root:

```bash
pip3 install -r requirements.txt
```

## Running the tests

The app must be running before executing the tests:

```bash
npm run serve
```

Then in a separate terminal, from the project root:

```bash
# Headless Firefox (default)
python3 -m pytest tests/ui/ -v

# Visible Firefox
python3 -m pytest tests/ui/ -v --no-headless

# Chrome
python3 -m pytest tests/ui/ -v --browser chrome

# Visible Chrome
python3 -m pytest tests/ui/ -v --browser chrome --no-headless
```
