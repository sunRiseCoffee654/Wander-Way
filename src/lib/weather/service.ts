import type {
  DestinationWeatherForecast,
  DailyForecast,
  RainRisk,
  WeatherWarning,
  WeatherGearTip,
  WeatherPreparationAdvice,
} from "./types";

// Curated geographic coordinates for major Indian travel hubs & global destinations
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; timezone: string }> = {
  jaipur: { lat: 26.9124, lon: 75.7873, timezone: "Asia/Kolkata" },
  varanasi: { lat: 25.3176, lon: 82.9739, timezone: "Asia/Kolkata" },
  kerala: { lat: 9.4981, lon: 76.3388, timezone: "Asia/Kolkata" },
  alleppey: { lat: 9.4981, lon: 76.3388, timezone: "Asia/Kolkata" },
  delhi: { lat: 28.6139, lon: 77.209, timezone: "Asia/Kolkata" },
  mumbai: { lat: 19.076, lon: 72.8777, timezone: "Asia/Kolkata" },
  goa: { lat: 15.2993, lon: 74.124, timezone: "Asia/Kolkata" },
  ladakh: { lat: 34.1526, lon: 77.5771, timezone: "Asia/Kolkata" },
  leh: { lat: 34.1526, lon: 77.5771, timezone: "Asia/Kolkata" },
  udaipur: { lat: 24.5854, lon: 73.7125, timezone: "Asia/Kolkata" },
  hampi: { lat: 15.335, lon: 76.46, timezone: "Asia/Kolkata" },
  srinagar: { lat: 34.0837, lon: 74.7973, timezone: "Asia/Kolkata" },
  manali: { lat: 32.2432, lon: 77.1892, timezone: "Asia/Kolkata" },
  bengaluru: { lat: 12.9716, lon: 77.5946, timezone: "Asia/Kolkata" },
  bangalore: { lat: 12.9716, lon: 77.5946, timezone: "Asia/Kolkata" },
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

  // Default to Jaipur, Rajasthan coordinates
  return KNOWN_COORDINATES.jaipur;
}

/**
 * Fetches real-time weather and 7-day meteorological forecast from Open-Meteo
 */
export async function getDestinationWeather(
  destinationName: string = "Jaipur, Rajasthan",
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=${encodeURIComponent(
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
      const windKmh = Math.round(dailyData.wind_speed_10m_max?.[idx] ?? (current.wind_speed_10m ?? 12));
      const uvIdx = Number((dailyData.uv_index_max?.[idx] ?? (wmo.icon === "wb_sunny" ? 5.2 : 3.4)).toFixed(1));
      const humidityEst = Math.min(
        95,
        Math.max(
          35,
          Math.round((current.relative_humidity_2m ?? 55) + (precipProb > 50 ? 15 : precipProb > 20 ? 5 : -5))
        )
      );

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
        humidity_percent: humidityEst,
        wind_speed_kmh: windKmh,
        uv_index: uvIdx,
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
  destination: string = "Jaipur, Rajasthan",
  lat = 26.9124,
  lon = 75.7873
): DestinationWeatherForecast {
  const query = destination.toLowerCase();
  const isJapan = query.includes("japan") || query.includes("kyoto") || query.includes("tokyo");
  const today = new Date();

  const daily: DailyForecast[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const isRainDay = i === 1 || i === 3;

    return {
      date: dateStr,
      temperature_max: isJapan ? 19 + (i % 2) : 29 + (i % 3),
      temperature_min: isJapan ? 12 - (i % 2) : 17 + (i % 2),
      precipitation_probability: isRainDay ? 45 : 15,
      precipitation_sum_mm: isRainDay ? 2.5 : 0.1,
      condition_code: isRainDay ? 61 : 1,
      condition_text: isRainDay
        ? "Passing Showers"
        : isJapan
          ? "Crisp Autumn Sun"
          : "Warm Golden Sun",
      condition_icon: isRainDay ? "rainy" : "wb_sunny",
      rain_risk: isRainDay ? "moderate" : "low",
      humidity_percent: isRainDay ? 76 : isJapan ? 52 : 44,
      wind_speed_kmh: 9 + ((i * 3) % 11),
      uv_index: isRainDay ? 1.8 : Number(((isJapan ? 4.2 : 6.4) - (i % 2) * 0.7).toFixed(1)),
    };
  });

  return {
    destination,
    latitude: lat,
    longitude: lon,
    timezone: isJapan ? "Asia/Tokyo" : "Asia/Kolkata",
    temperature_current: isJapan ? 17 : 27,
    temperature_unit: "C",
    condition_code: 1,
    condition_text: isJapan ? "Partly Sunny & Crisp" : "Warm & Partly Sunny",
    condition_icon: "partly_cloudy_day",
    rain_risk: "moderate",
    precipitation_probability: 35,
    precipitation_mm: 1.2,
    humidity_percent: isJapan ? 62 : 48,
    wind_speed_kmh: 14,
    daily,
    warnings: [
      {
        title: isJapan ? "Autumn Showers Advisory" : "Afternoon Heat & Passing Breeze Advisory",
        severity: "advisory",
        message: isJapan
          ? "35% chance of passing showers. Carry a compact umbrella for temple grounds."
          : "Pleasant regional weather with light evening breeze. Carry a compact UV umbrella and hydrated water bottle for fort & heritage walks.",
        source: "WanderWay Weather Grounding Fallback",
      },
    ],
    source: "WanderWay Seasonal Climate Grounding",
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Converts Celsius temperature to Fahrenheit.
 */
export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/**
 * Derives actionable packing and preparation guidance from a destination weather forecast.
 * Filters daily forecasts by user travel dates if they overlap, or uses the first 5 days.
 */
export function getWeatherPreparationAdvice(
  forecast: DestinationWeatherForecast,
  startDate?: string | null,
  endDate?: string | null
): WeatherPreparationAdvice {
  const daily = forecast.daily || [];

  // If user provided dates, check if any daily forecast matches the trip window
  let relevantDays: DailyForecast[] = [];
  let travelDateMatch = false;

  if (startDate && endDate) {
    const sDate = startDate.slice(0, 10);
    const eDate = endDate.slice(0, 10);
    relevantDays = daily.filter((d) => d.date >= sDate && d.date <= eDate);
    if (relevantDays.length > 0) {
      travelDateMatch = true;
    }
  }

  // Fallback to first 5 days if dates don't match or not provided
  if (relevantDays.length === 0) {
    relevantDays = daily.slice(0, 5);
  }

  if (relevantDays.length === 0) {
    return {
      comfortIndex: "Optimal",
      comfortTone: "success",
      headline: "Favorable Travel Weather",
      summary: "Comfortable ambient conditions expected for your journey.",
      maxTempC: 22,
      minTempC: 15,
      rainDaysCount: 0,
      gearTips: [
        {
          id: "walking-shoes",
          icon: "directions_walk",
          label: "Comfortable Walking Footwear",
          note: "Essential for historic districts and temple grounds.",
          category: "clothing",
          suggestedItemName: "Comfortable Walking Shoes",
          packingCategory: "Clothing",
        },
      ],
      travelDateMatch: false,
    };
  }

  const maxTempC = Math.max(...relevantDays.map((d) => d.temperature_max));
  const minTempC = Math.min(...relevantDays.map((d) => d.temperature_min));
  const rainDays = relevantDays.filter((d) => d.rain_risk === "high" || d.rain_risk === "moderate");
  const rainDaysCount = rainDays.length;
  const highRainDaysCount = relevantDays.filter((d) => d.rain_risk === "high").length;
  const maxPrecipMm = Math.max(...relevantDays.map((d) => d.precipitation_sum_mm || 0));
  const maxUv = Math.max(...relevantDays.map((d) => d.uv_index ?? 3.5));

  const gearTips: WeatherGearTip[] = [];

  // Rain gear recommendations
  if (highRainDaysCount > 0 || maxPrecipMm >= 5) {
    gearTips.push({
      id: "heavy-rain",
      icon: "umbrella",
      label: "Windproof Umbrella & Waterproof Shell",
      note: `Significant rain forecast on ${highRainDaysCount} day${highRainDaysCount > 1 ? "s" : ""}. Keep outer layers dry.`,
      category: "gear",
      suggestedItemName: "Windproof Umbrella",
      packingCategory: "Gear",
    });
    gearTips.push({
      id: "waterproof-shoes",
      icon: "hiking",
      label: "Waterproof Shoes or Grip Boots",
      note: "Cobblestone and stone stairs become slippery during downpours.",
      category: "clothing",
      suggestedItemName: "Waterproof Footwear",
      packingCategory: "Clothing",
    });
  } else if (rainDaysCount > 0) {
    gearTips.push({
      id: "compact-umbrella",
      icon: "umbrella",
      label: "Compact Packable Umbrella",
      note: "Passing showers expected. Small enough for daypack storage.",
      category: "gear",
      suggestedItemName: "Compact Umbrella",
      packingCategory: "Gear",
    });
  }

  // Temperature-based gear
  if (minTempC <= 8) {
    gearTips.push({
      id: "thermal-layer",
      icon: "ac_unit",
      label: "Insulated Jacket & Thermal Underlayer",
      note: `Lows dropping down to ${minTempC}°C (${celsiusToFahrenheit(minTempC)}°F). Essential for evening transit.`,
      category: "clothing",
      suggestedItemName: "Thermal Underlayer & Fleece",
      packingCategory: "Clothing",
    });
  } else if (minTempC <= 14) {
    gearTips.push({
      id: "light-layer",
      icon: "dry_cleaning",
      label: "Cardigan or Light Packable Fleece",
      note: `Mornings & evenings dip to ${minTempC}°C (${celsiusToFahrenheit(minTempC)}°F). Layering is recommended.`,
      category: "clothing",
      suggestedItemName: "Light Cardigan / Fleece",
      packingCategory: "Clothing",
    });
  }

  if (maxUv >= 4.0 || maxTempC >= 25) {
    gearTips.push({
      id: "sun-protection",
      icon: "wb_sunny",
      label: "UV Sunscreen & Breathable Hat",
      note: `UV Index reaching ${maxUv.toFixed(1)}. High solar radiation during midday.`,
      category: "wellness",
      suggestedItemName: "UV Sunscreen (SPF 50+)",
      packingCategory: "Personal Care",
    });
  }

  if (maxTempC >= 28) {
    gearTips.push({
      id: "hydration",
      icon: "water_drop",
      label: "Refillable Insulated Water Bottle",
      note: "Stay hydrated during walking tours and outdoor excursions.",
      category: "gear",
      suggestedItemName: "Refillable Water Bottle",
      packingCategory: "Gear",
    });
  } else if (maxTempC >= 18 && minTempC >= 10 && rainDaysCount === 0) {
    gearTips.push({
      id: "sunglasses",
      icon: "light_mode",
      label: "UV Sunglasses & Walking Shoes",
      note: "Clear sunny skies. Perfect for scenic sightseeing.",
      category: "clothing",
      suggestedItemName: "Polarized Sunglasses",
      packingCategory: "Accessories",
    });
  }

  // Universal walking tip
  if (!gearTips.some((g) => g.id === "waterproof-shoes")) {
    gearTips.push({
      id: "walking-shoes",
      icon: "directions_walk",
      label: "Cushioned Walking Shoes",
      note: "Crucial for navigating itineraries with 8,000+ daily steps.",
      category: "clothing",
      suggestedItemName: "Comfortable Walking Shoes",
      packingCategory: "Clothing",
    });
  }

  // Evaluate overall comfort tone and headline
  let comfortIndex: "Optimal" | "Variable" | "Challenging" = "Optimal";
  let comfortTone: "success" | "warning" | "alert" = "success";
  let headline = "Favorable Weather Window";
  let summary = `Expect pleasant conditions ranging from ${minTempC}°C to ${maxTempC}°C with minimal weather disruption.`;

  if (highRainDaysCount >= 2 || minTempC < 3 || maxTempC > 34) {
    comfortIndex = "Challenging";
    comfortTone = "alert";
    headline = "Challenging Weather Ahead";
    summary = `Expect heavy precipitation or temperature extremes (${minTempC}°C to ${maxTempC}°C). Pack resilient gear.`;
  } else if (rainDaysCount > 0 || minTempC < 10 || maxTempC > 28) {
    comfortIndex = "Variable";
    comfortTone = "warning";
    headline = "Variable Conditions Expected";
    summary = `Intermittent weather (${minTempC}°C to ${maxTempC}°C) with occasional showers or brisk transitions. Pack versatile layers.`;
  }

  return {
    comfortIndex,
    comfortTone,
    headline,
    summary,
    maxTempC,
    minTempC,
    rainDaysCount,
    gearTips: gearTips.slice(0, 4),
    travelDateMatch,
  };
}

/**
 * Evaluates UV Index level, semantic tone, and protective guidance.
 */
export function interpretUvIndex(uv: number = 3.0): {
  level: string;
  tone: "low" | "moderate" | "high" | "very-high" | "extreme";
  badgeClass: string;
  advice: string;
} {
  const rounded = Number(uv.toFixed(1));
  if (rounded < 3) {
    return {
      level: "Low",
      tone: "low",
      badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
      advice: "Minimal sun hazard. Normal outdoor activity.",
    };
  }
  if (rounded < 6) {
    return {
      level: "Moderate",
      tone: "moderate",
      badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
      advice: "Wear sunglasses & SPF 30+ during midday.",
    };
  }
  if (rounded < 8) {
    return {
      level: "High",
      tone: "high",
      badgeClass: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/30",
      advice: "Cover up, hat and SPF 50+ recommended 11am–3pm.",
    };
  }
  if (rounded < 11) {
    return {
      level: "Very High",
      tone: "very-high",
      badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
      advice: "Seek shade during peak hours. Extra protection required.",
    };
  }
  return {
    level: "Extreme",
    tone: "extreme",
    badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/30",
    advice: "Avoid direct outdoor sun exposure around midday.",
  };
}


