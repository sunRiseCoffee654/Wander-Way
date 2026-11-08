export type RainRisk = "low" | "moderate" | "high";

export interface WeatherWarning {
  title: string;
  severity: "advisory" | "warning" | "severe";
  message: string;
  source?: string;
}

export interface DailyForecast {
  date: string;
  temperature_max: number;
  temperature_min: number;
  precipitation_probability: number; // 0-100%
  precipitation_sum_mm: number;
  condition_code: number;
  condition_text: string;
  condition_icon: string;
  rain_risk: RainRisk;
}

export interface DestinationWeatherForecast {
  destination: string;
  latitude: number;
  longitude: number;
  timezone: string;
  temperature_current: number;
  temperature_unit: "C" | "F";
  condition_code: number;
  condition_text: string;
  condition_icon: string;
  rain_risk: RainRisk;
  precipitation_probability: number;
  precipitation_mm: number;
  humidity_percent?: number;
  wind_speed_kmh?: number;
  daily: DailyForecast[];
  warnings: WeatherWarning[];
  source: string;
  fetched_at: string;
}
