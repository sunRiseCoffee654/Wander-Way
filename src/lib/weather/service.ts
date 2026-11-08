import type {
  DestinationWeatherForecast,
  DailyForecast,
  RainRisk,
  WeatherWarning,
} from "./types";

// Curated geographic coordinates for major travel hubs
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; timezone: string }> = {
  kyoto: { lat: 35.0116, lon: 135.7681, timezone: "Asia/Tokyo" },
  tokyo: { lat: 35.6762, lon: 139.6503, timezone: "Asia/Tokyo" },
  dolomites: { lat: 46.4102, lon: 11.844, timezone: "Europe/Rome" },
  amalfi: { lat: 40.634, lon: 14.6027, timezone: "Europe/Rome" },
  iceland: { lat: 64.1466, lon: -21.9426, timezone: "Atlantic/Reykjavik" },
  paris: { lat: 48.8566, lon: 2.3522, timezone: "Europe/Paris" },
  rome: { lat: 41.9028, lon: 12.4964, timezone: "Europe/Rome" },
  london: { lat: 51.5074, lon: -0.1278, timezone: "Europe/London" },
  newyork: { lat: 40.7128, lon: -74.006, timezone: "America/New_York" },
};

// In-memory cache with 30-minute TTL
interface CachedWeather {
  data: DestinationWeatherForecast;
  expiresAt: number;
}
const WEATHER_CACHE = new Map<string, CachedWeather>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Maps WMO standard weather code to human text and Material Symbol icon
 */
export function interpretWmoCode(code: number): { text: string; icon: string } {
  if (code === 0) return { text: "Clear Skies", icon: "wb_sunny" };
  if (code === 1 || code === 2) return { text: "Partly Cloudy", icon: "partly_cloudy_day" };
  if (code === 3) return { text: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { text: "Foggy Mist", icon: "foggy" };
  if (code >= 51 && code <= 55) return { text: "Light Passing Drizzle", icon: "rainy" };
  if (code >= 61 && code <= 65) return { text: "Moderate Rain Showers", icon: "rainy" };
  if (code >= 71 && code <= 77) return { text: "Snowfall", icon: "ac_unit" };
  if (code >= 80 && code <= 82) return { text: "Scattered Rain Showers", icon: "rainy" };
  if (code >= 95) return { text: "Thunderstorms & Gusts", icon: "thunderstorm" };
  return { text: "Fair Weather", icon: "wb_sunny" };
}

/**
 * Calculates rain risk tier based on probability and millimeter accumulation
 */
export function calculateRainRisk(probability: number, rainMm: number): RainRisk {
  if (probability >= 60 || rainMm >= 6.0) return "high";
  if (probability >= 25 || rainMm >= 1.0) return "moderate";
  return "low";
}

/**
 * Resolves latitude and longitude for a destination query
 */
export function resolveCoordinates(
  destination: string,
  userLat?: number,
  userLon?: number
): { lat: number; lon: number; timezone: string } {
  if (typeof userLat === "number" && typeof userLon === "number") {
    return { lat: userLat, lon: userLon, timezone: "auto" };
  }

  const query = destination.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (query.includes(key)) {
      return coords;
    }
  }

  // Default to Kyoto, Japan coordinates
  return KNOWN_COORDINATES.kyoto;
}

/**
 * Fetches real-time weather and 7-day meteorological forecast from Open-Meteo
 */
export async function getDestinationWeather(
  destinationName: string = "Kyoto, Japan",
  userLat?: number,
  userLon?: number
): Promise<DestinationWeatherForecast> {
  const { lat, lon, timezone } = resolveCoordinates(destinationName, userLat, userLon);
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;

  // Check cache
  const cached = WEATHER_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=${encodeURIComponent(
      timezone
    )}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 1800 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo responded with status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current || {};
    const dailyData = data.daily || {};

    const currentWmo = interpretWmoCode(current.weather_code ?? 1);
    const dailyDates = (dailyData.time as string[]) || [];

    const dailyForecasts: DailyForecast[] = dailyDates.map((dateStr, idx) => {
      const maxTemp = Math.round(dailyData.temperature_2m_max?.[idx] ?? 20);
      const minTemp = Math.round(dailyData.temperature_2m_min?.[idx] ?? 12);
      const precipProb = dailyData.precipitation_probability_max?.[idx] ?? 30;
      const precipMm = dailyData.precipitation_sum?.[idx] ?? 1.2;
      const code = dailyData.weather_code?.[idx] ?? 1;
      const wmo = interpretWmoCode(code);
      const risk = calculateRainRisk(precipProb, precipMm);

      return {
        date: dateStr,
        temperature_max: maxTemp,
        temperature_min: minTemp,
        precipitation_probability: precipProb,
        precipitation_sum_mm: precipMm,
        condition_code: code,
        condition_text: wmo.text,
        condition_icon: wmo.icon,
        rain_risk: risk,
      };
    });

    const currentProb = dailyForecasts[0]?.precipitation_probability ?? 30;
    const currentRainMm = current.precipitation ?? 0.5;
    const currentRainRisk = calculateRainRisk(currentProb, currentRainMm);

    // Generate weather warnings if rain risk is high or winds are strong
    const warnings: WeatherWarning[] = [];
    if (currentRainRisk === "high") {
      warnings.push({
        title: "Heavy Rain & Slippery Stone Paths Advisory",
        severity: "warning",
        message: "High precipitation predicted. Pack windproof umbrellas and waterproof footwear for hillside trails.",
        source: "Open-Meteo Meteorological WMO Feed",
      });
    } else if (currentRainRisk === "moderate") {
      warnings.push({
        title: "Passing Showers Expected",
        severity: "advisory",
        message: "Scattered light showers forecast. Carry a compact umbrella and light packable layer.",
        source: "Open-Meteo Meteorological WMO Feed",
      });
    }

    if ((current.wind_speed_10m ?? 0) > 35) {
      warnings.push({
        title: "Strong Gusts Advisory",
        severity: "advisory",
        message: "Wind speeds exceeding 35 km/h. Secure loose hats and gear on elevated observation decks.",
        source: "Open-Meteo Meteorological WMO Feed",
      });
    }

    const forecastResult: DestinationWeatherForecast = {
      destination: destinationName,
      latitude: lat,
      longitude: lon,
      timezone: data.timezone || timezone,
      temperature_current: Math.round(current.temperature_2m ?? 18),
      temperature_unit: "C",
      condition_code: current.weather_code ?? 1,
      condition_text: currentWmo.text,
      condition_icon: currentWmo.icon,
      rain_risk: currentRainRisk,
      precipitation_probability: currentProb,
      precipitation_mm: currentRainMm,
      humidity_percent: current.relative_humidity_2m ?? 65,
      wind_speed_kmh: Math.round(current.wind_speed_10m ?? 12),
      daily: dailyForecasts,
      warnings,
      source: "Open-Meteo Global WMO Forecast",
      fetched_at: new Date().toISOString(),
    };

    // Store in cache
    WEATHER_CACHE.set(cacheKey, {
      data: forecastResult,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return forecastResult;
  } catch (err) {
    console.warn("External weather fetch fallback:", err);
    return getFallbackWeather(destinationName, lat, lon);
  }
}

/**
 * Resilient fallback forecast if offline or external API throttled
 */
export function getFallbackWeather(
  destination: string,
  lat = 35.0116,
  lon = 135.7681
): DestinationWeatherForecast {
  const isAutumn = true;
  const today = new Date();

  const daily: DailyForecast[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const isRainDay = i === 1 || i === 3;

    return {
      date: dateStr,
      temperature_max: isAutumn ? 19 + (i % 2) : 24,
      temperature_min: isAutumn ? 12 - (i % 2) : 16,
      precipitation_probability: isRainDay ? 45 : 15,
      precipitation_sum_mm: isRainDay ? 2.5 : 0.1,
      condition_code: isRainDay ? 61 : 1,
      condition_text: isRainDay ? "Passing Showers" : "Crisp Autumn Sun",
      condition_icon: isRainDay ? "rainy" : "wb_sunny",
      rain_risk: isRainDay ? "moderate" : "low",
    };
  });

  return {
    destination,
    latitude: lat,
    longitude: lon,
    timezone: "Asia/Tokyo",
    temperature_current: 17,
    temperature_unit: "C",
    condition_code: 1,
    condition_text: "Partly Sunny & Crisp",
    condition_icon: "partly_cloudy_day",
    rain_risk: "moderate",
    precipitation_probability: 35,
    precipitation_mm: 1.2,
    humidity_percent: 62,
    wind_speed_kmh: 14,
    daily,
    warnings: [
      {
        title: "Autumn Showers Advisory",
        severity: "advisory",
        message: "35% chance of passing showers. Carry a compact umbrella for temple grounds.",
        source: "WanderWay Weather Grounding Fallback",
      },
    ],
    source: "WanderWay Seasonal Climate Grounding",
    fetched_at: new Date().toISOString(),
  };
}
