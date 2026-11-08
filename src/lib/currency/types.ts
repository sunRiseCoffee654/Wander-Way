export type SupportedCurrency =
  | "INR"
  | "USD"
  | "EUR"
  | "JPY"
  | "GBP"
  | "CHF"
  | "CAD"
  | "AUD"
  | "NZD"
  | "SGD"
  | "HKD";

export interface ExchangeRateResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
  source: string;
  fetched_at: string;
}

export interface CurrencyConversionResult {
  original_amount_minor: number;
  original_currency: string;
  converted_amount_minor: number;
  target_currency: string;
  fx_rate_to_target: number;
  fx_timestamp: string;
  fx_source: string;
  formatted_original: string;
  formatted_converted: string;
}
