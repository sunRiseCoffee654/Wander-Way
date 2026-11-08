import type {
  ExchangeRateResponse,
  CurrencyConversionResult,
} from "./types";

export const CURRENCY_DECIMALS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CHF: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  SGD: 2,
  HKD: 2,
};

// Central Bank fallback baseline exchange rates (relative to 1 USD)
const FALLBACK_RATES: Record<string, number> = {
  INR: 84.0,
  USD: 1.0,
  EUR: 0.925,
  JPY: 154.5,
  GBP: 0.785,
  CHF: 0.882,
  CAD: 1.395,
  AUD: 1.525,
  NZD: 1.685,
  SGD: 1.342,
  HKD: 7.775,
};

// 1-hour cache map: baseCurrency -> ExchangeRateResponse
const FX_CACHE = new Map<string, { data: ExchangeRateResponse; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live exchange rates from European Central Bank via Frankfurter API
 */
export async function getLiveExchangeRates(
  baseCurrency: string = "INR"
): Promise<ExchangeRateResponse> {
  const base = baseCurrency.toUpperCase();
  const cached = FX_CACHE.get(base);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Frankfurter API responded with ${res.status}`);
    }

    const data = await res.json();
    const result: ExchangeRateResponse = {
      amount: data.amount || 1,
      base: data.base || base,
      date: data.date || new Date().toISOString().split("T")[0],
      rates: {
        ...data.rates,
        [base]: 1.0, // Ensure base rate is self-mapped to 1.0
      },
      source: "European Central Bank (Frankfurter Feed)",
      fetched_at: new Date().toISOString(),
    };

    FX_CACHE.set(base, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  } catch (err) {
    console.warn("Using fallback exchange rates:", err);
    return getFallbackRates(base);
  }
}

/**
 * Returns fallback central bank exchange rates
 */
export function getFallbackRates(base: string = "INR"): ExchangeRateResponse {
  const baseMultiplier = FALLBACK_RATES[base] || 1.0;
  const rates: Record<string, number> = {};

  for (const [curr, val] of Object.entries(FALLBACK_RATES)) {
    rates[curr] = Number((val / baseMultiplier).toFixed(4));
  }

  return {
    amount: 1,
    base,
    date: new Date().toISOString().split("T")[0],
    rates,
    source: "WanderWay Central Bank Fallback Matrix",
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Converts integer minor units with exact decimal precision and foreign exchange rounding
 */
export function convertMinorUnitsDeterministic(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rateMap?: Record<string, number>
): CurrencyConversionResult {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  const fromDecimals = CURRENCY_DECIMALS[from] ?? 2;
  const toDecimals = CURRENCY_DECIMALS[to] ?? 2;

  // Resolve rate
  let fxRate = 1.0;
  let source = "Parity 1:1";

  if (from !== to) {
    if (rateMap && rateMap[to]) {
      fxRate = rateMap[to];
      source = "Live Central Bank Feed";
    } else {
      const fromUsd = FALLBACK_RATES[from] || 1.0;
      const toUsd = FALLBACK_RATES[to] || 1.0;
      fxRate = toUsd / fromUsd;
      source = "WanderWay FX Fallback Matrix";
    }
  }

  // Convert major units:
  // e.g. 1000 minor USD = 10.00 USD
  const majorAmount = amountMinor / Math.pow(10, fromDecimals);
  // Major converted = 10.00 * 154.5 = 1545 JPY
  const convertedMajor = majorAmount * fxRate;
  // Converted minor = 1545 * 10^toDecimals
  const convertedMinor = Math.round(convertedMajor * Math.pow(10, toDecimals));

  const formattedOriginal = formatMinorUnits(amountMinor, from);
  const formattedConverted = formatMinorUnits(convertedMinor, to);

  return {
    original_amount_minor: amountMinor,
    original_currency: from,
    converted_amount_minor: convertedMinor,
    target_currency: to,
    fx_rate_to_target: Number(fxRate.toFixed(4)),
    fx_timestamp: new Date().toISOString(),
    fx_source: source,
    formatted_original: formattedOriginal,
    formatted_converted: formattedConverted,
  };
}

/**
 * Format integer minor units into international currency string
 */
export function formatMinorUnits(
  amountMinor: number,
  currency: string = "INR",
  locale: string = currency === "INR" ? "en-IN" : "en-US"
): string {
  const code = currency.toUpperCase();
  const decimals = CURRENCY_DECIMALS[code] ?? 2;
  const major = amountMinor / Math.pow(10, decimals);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(decimals)}`;
  }
}
