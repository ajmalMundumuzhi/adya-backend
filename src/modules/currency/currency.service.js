
const repository = require("./currency.repository");
const {
  SUPPORTED_CURRENCIES
} = require("./currency.validation");

const BASE_CURRENCY = "AUD";
const API_URL = "https://api.frankfurter.dev/v2/rates";
const REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_CACHE_AGE = 48 * 60 * 60 * 1000;

const QUOTE_CURRENCIES = SUPPORTED_CURRENCIES.filter(
  (currency) => currency !== BASE_CURRENCY
);

let refreshPromise = null;

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isCacheFresh(data) {
  if (!data?.fetchedAt) return false;

  return Date.now() - new Date(data.fetchedAt).getTime()
    < REFRESH_INTERVAL;
}

function isCacheUsable(data) {
  if (!data?.fetchedAt) return false;

  return Date.now() - new Date(data.fetchedAt).getTime()
    <= MAX_CACHE_AGE;
}

function normalizeRates(response) {
  const rates = {
    AUD: 1
  };

  if (Array.isArray(response)) {
    for (const item of response) {
      if (
        item.base === BASE_CURRENCY &&
        QUOTE_CURRENCIES.includes(item.quote) &&
        Number.isFinite(Number(item.rate)) &&
        Number(item.rate) > 0
      ) {
        rates[item.quote] = Number(item.rate);
      }
    }
  } else if (response && response.rates) {
    for (const currency of QUOTE_CURRENCIES) {
      const rate = Number(response.rates[currency]);

      if (Number.isFinite(rate) && rate > 0) {
        rates[currency] = rate;
      }
    }
  }

  const missingCurrencies = QUOTE_CURRENCIES.filter(
    (currency) => !rates[currency]
  );

  if (missingCurrencies.length) {
    throw createError(
      `Exchange rates missing for: ${missingCurrencies.join(", ")}`,
      502
    );
  }

  const rateDate = Array.isArray(response)
    ? response[0]?.date
    : response.date;

  if (!rateDate) {
    throw createError("Invalid exchange rate date", 502);
  }

  return {
    rates,
    rateDate
  };
}

async function fetchLatestRates() {
  const url = new URL(API_URL);

  url.searchParams.set("base", BASE_CURRENCY);
  url.searchParams.set("quotes", QUOTE_CURRENCIES.join(","));

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw createError(
      `Currency provider returned ${response.status}`,
      502
    );
  }

  const data = await response.json();

  return normalizeRates(data);
}

async function refreshRates() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const latest = await fetchLatestRates();

    return repository.saveRates(latest);
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function getRates(forceRefresh = false) {
  const cached = await repository.findRates();

  if (!forceRefresh && isCacheFresh(cached)) {
    return {
      ...cached,
      isStale: false
    };
  }

  try {
    const updated = await refreshRates();

    return {
      ...updated,
      isStale: false
    };
  } catch (error) {
    if (isCacheUsable(cached)) {
      return {
        ...cached,
        isStale: true
      };
    }

    throw createError(
      "Exchange rates are unavailable. Please try again later.",
      503
    );
  }
}

async function getCurrencyRates(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw createError("Unsupported currency");
  }

  const data = await getRates();

  return {
    baseCurrency: BASE_CURRENCY,
    selectedCurrency: currency,
    exchangeRate: data.rates[currency],
    rates: data.rates,
    rateDate: data.rateDate,
    fetchedAt: data.fetchedAt,
    isStale: data.isStale
  };
}

async function convertAmount(amount, currency, rateSnapshot = null) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw createError("Unsupported currency");
  }

  if (!Number.isFinite(amount) || amount < 0) {
    throw createError("Invalid amount");
  }

  const rates = rateSnapshot || await getRates();

  const exchangeRate = rates.rates[currency];

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw createError("Exchange rate unavailable", 503);
  }

  return {
    baseAmount: amount,
    baseCurrency: BASE_CURRENCY,
    convertedAmount: Number((amount * exchangeRate).toFixed(2)),
    currency,
    exchangeRate,
    rateDate: rates.rateDate,
    fetchedAt: rates.fetchedAt,
    isStale: rates.isStale || false
  };
}

async function refreshCurrencyRates() {
  return refreshRates();
}

module.exports = {
  getRates,
  getCurrencyRates,
  convertAmount,
  refreshCurrencyRates
};
