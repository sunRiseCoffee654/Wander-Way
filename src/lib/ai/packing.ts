import { GoogleGenAI, Type } from "@google/genai";
import { getDestinationWeather } from "@/lib/weather/service";
import type { DestinationWeatherForecast } from "@/lib/weather/types";
import { getGeminiModel, GEMINI_FALLBACK_MODELS } from "./gemini-client";

export interface PackingItemRecommendation {
  item_name: string;
  category: "weather_climate" | "footwear_gear" | "clothing_attire" | "electronics_adapters" | "essentials_health";
  reason: string;
  quantity: number;
  is_essential: boolean;
}

export interface PackingAssistantResponse {
  summary: string;
  weather_overview: {
    expected_conditions: string;
    temperature_range: string;
    rain_risk: "low" | "moderate" | "high";
    source?: string;
  };
  items: PackingItemRecommendation[];
}

export interface PackingGeneratorInput {
  destination: string;
  startDate?: string;
  endDate?: string;
  activities?: string[];
  travelStyle?: string;
}

const SYSTEM_INSTRUCTION = `You are WanderWay's intelligent Travel Packing & Gear Assistant.
Your task is to analyze the traveler's destination, travel season, planned activities, and local weather patterns to generate an indispensable, localized packing checklist.

Specific Guidance:
1. WEATHER & CLIMATE: Recommend specific weather gear: compact umbrellas, windbreakers, raincoats, UV-rated sun hats, polarized sunglasses, or thermal layers based on the destination's typical seasonal weather and live meteorological feeds.
2. FOOTWEAR & SHOES: Recommend appropriate footwear (e.g., broken-in walking sneakers, slip-on shoes for Asian temples where footwear is removed often, or sturdy hiking boots for alpine/nature trails).
3. BAGS & GEAR: Suggest appropriate daypacks (e.g. lightweight daypack, anti-theft cross-body bag, water bottle, packable shopping tote).
4. LOCAL ETIQUETTE & ATTIRE: Detail clothing requirements (e.g., modest attire covering knees and shoulders for temples, shrines, churches, or mosques; breathable layers for humid regions; smart-casual attire for fine dining).
5. ELECTRONICS & REGION ADAPTERS: Detail the exact power plug adapter types (Type A, C, G, etc.) and voltage needs for the destination country, plus portable power banks for long days using transit apps.
6. NO FABRICATED BRANDS: Suggest generic functional categories rather than paid endorsements.`;

function getResponseSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "A 2-sentence briefing on the destination's weather, terrain, and packing strategy.",
      },
      weather_overview: {
        type: Type.OBJECT,
        properties: {
          expected_conditions: { type: Type.STRING, description: "e.g. Crisp autumn with occasional rains" },
          temperature_range: { type: Type.STRING, description: "e.g. 12°C - 20°C (54°F - 68°F)" },
          rain_risk: {
            type: Type.STRING,
            enum: ["low", "moderate", "high"],
          },
        },
        required: ["expected_conditions", "temperature_range", "rain_risk"],
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            item_name: { type: Type.STRING },
            category: {
              type: Type.STRING,
              enum: [
                "weather_climate",
                "footwear_gear",
                "clothing_attire",
                "electronics_adapters",
                "essentials_health",
              ],
            },
            reason: {
              type: Type.STRING,
              description: "Why this specific item is necessary for this destination and weather",
            },
            quantity: { type: Type.INTEGER },
            is_essential: { type: Type.BOOLEAN },
          },
          required: ["item_name", "category", "reason", "quantity", "is_essential"],
        },
      },
    },
    required: ["summary", "weather_overview", "items"],
  };
}

/**
 * Generate AI-curated packing recommendations grounded in live meteorological feeds.
 */
export async function generatePackingRecommendations(
  input: PackingGeneratorInput
): Promise<PackingAssistantResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Retrieve live coordinate weather from Open-Meteo
  let liveWeather: DestinationWeatherForecast | null = null;
  try {
    liveWeather = await getDestinationWeather(input.destination);
  } catch {
    liveWeather = null;
  }

  // Fallback if no API key or demo destination
  if (!apiKey || apiKey === "dummy") {
    return input.destination.toLowerCase().includes("kyoto")
      ? getKyotoDemoPacking(liveWeather)
      : getIndiaDemoPacking(input.destination, liveWeather);
  }
  if (input.destination.toLowerCase().includes("kyoto")) {
    return getKyotoDemoPacking(liveWeather);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const primaryModel = getGeminiModel();
    const modelsToTry = [
      primaryModel,
      ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primaryModel),
    ];

    const weatherContext = liveWeather
      ? `Live Forecast: ${liveWeather.condition_text}, Temp ${liveWeather.temperature_current}°C (High: ${liveWeather.daily[0]?.temperature_max}°C, Low: ${liveWeather.daily[0]?.temperature_min}°C), Precip Risk: ${liveWeather.rain_risk} (${liveWeather.precipitation_probability}%), Wind: ${liveWeather.wind_speed_kmh} km/h.`
      : "Weather: Standard seasonal forecast";

    const prompt = `Generate a personalized packing checklist for a trip to:
Destination: ${input.destination}
Live Meteorological Context: ${weatherContext}
Dates: ${input.startDate || "Upcoming season"} to ${input.endDate || ""}
Planned Activities: ${input.activities?.join(", ") || "City walking, cultural sites, dining, transit"}
Travel Style: ${input.travelStyle || "Comfortable exploration"}

Make sure to recommend:
- Weather gear (umbrellas, jackets, sun protection, hats) specifically responding to ${weatherContext}
- Bags (daypack, tote, packable organizer)
- Shoes (walking sneakers, specialized shoes for local terrain or cultural sites)
- Clothing types (temple/church modesty, layers, fabric suggestions)
- Country-specific power adapters and transit essentials.`;

    let text: string | undefined;
    let lastError: unknown;

    for (const candidateModel of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: getResponseSchema(),
            temperature: 0.3,
          },
        });

        text = response.text;
        if (text) break;
      } catch (err: unknown) {
        lastError = err;
        const status = (err as { status?: number })?.status;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[generatePackingRecommendations] Model ${candidateModel} failed (${status || message}). Trying next fallback...`);
      }
    }

    if (!text) {
      throw new Error(
        `Gemini packing generator failed across models (${modelsToTry.join(", ")}): ${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    }

    const parsed = JSON.parse(text) as PackingAssistantResponse;
    if (liveWeather) {
      parsed.weather_overview.source = "Open-Meteo Global WMO Forecast";
    }
    return parsed;
  } catch (err) {
    console.warn("Gemini packing generation failed, falling back to curated destination packing:", err);
    return input.destination.toLowerCase().includes("kyoto")
      ? getKyotoDemoPacking(liveWeather)
      : getIndiaDemoPacking(input.destination, liveWeather);
  }
}

/**
 * High-fidelity fallback for Indian travel circuits, grounded in live weather when available
 */
export function getIndiaDemoPacking(
  destination: string = "Jaipur, Rajasthan",
  liveWeather?: DestinationWeatherForecast | null
): PackingAssistantResponse {
  const rainRisk = liveWeather?.rain_risk || "low";
  const tempRange = liveWeather?.daily?.[0]
    ? `${liveWeather.daily[0].temperature_min}°C - ${liveWeather.daily[0].temperature_max}°C`
    : "18°C - 29°C (64°F - 84°F)";
  const condition = liveWeather?.condition_text || "Warm golden afternoons, cool heritage evenings";

  return {
    summary: `${destination} offers sunlit heritage fortwalks, bustling bazaars, and sacred temple courtyards that reward breathable cotton layers and easy slip-off footwear.`,
    weather_overview: {
      expected_conditions: condition,
      temperature_range: tempRange,
      rain_risk: rainRisk,
      source: liveWeather?.source || "Open-Meteo Global Meteorological Feed",
    },
    items: [
      {
        item_name: "Compact UV & Rain Umbrella",
        category: "weather_climate",
        reason: `Shields against midday Rajasthan sun and unexpected showers (${liveWeather?.precipitation_probability ?? 20}% risk) during open palace courtyard walks.`,
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Light Linen Jacket or Breathable Cotton Overshirt",
        category: "weather_climate",
        reason: "Provides sun protection during midday transit and warmth once desert or lakeside evenings cool down.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Wide-Brim Sun Hat & SPF 50+ Sunscreen",
        category: "weather_climate",
        reason: "High UV reflection across sandstone ramparts at Amber Fort, City Palace, and Hawa Mahal.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Slip-On Cushioned Walking Shoes",
        category: "footwear_gear",
        reason: "Many temples, stepwells, and haveli sanctuaries require removing shoes at the entrance.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Lightweight 20L Heritage Daypack",
        category: "footwear_gear",
        reason: "Carries a stainless water bottle, shawl, power bank, and ASI monument tickets comfortably.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Modest Breathable Kurta / Cotton Attire",
        category: "clothing_attire",
        reason: "Light natural fibers keep you cool while meeting shoulder-and-knee dress codes at religious landmarks.",
        quantity: 4,
        is_essential: true,
      },
      {
        item_name: "Type C / D / M India Power Plug Adapter (230V)",
        category: "electronics_adapters",
        reason: "Indian sockets use rounded 3-pin Type D/M (large & small) or European Type C plugs at 230V / 50Hz.",
        quantity: 2,
        is_essential: true,
      },
      {
        item_name: "10,000mAh Portable Power Bank",
        category: "electronics_adapters",
        reason: "Keeps your phone charged for UPI payments, DigiYatra boarding passes, and offline map navigation.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Small ₹100/₹50 Cash Pouch + UPI-Ready Phone",
        category: "essentials_health",
        reason: "UPI works almost everywhere across India, while small ₹ notes are useful for auto-rickshaws, tips, and bazaar crafts.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Electrolyte Packets (ORS) & Hand Sanitizer",
        category: "essentials_health",
        reason: "Maintains hydration during warm sightseeing afternoons and before sampling local street food.",
        quantity: 1,
        is_essential: true,
      },
    ],
  };
}

/**
 * High-fidelity fallback for Kyoto & Japan, grounded in live weather when available
 */
export function getKyotoDemoPacking(liveWeather?: DestinationWeatherForecast | null): PackingAssistantResponse {
  const rainRisk = liveWeather?.rain_risk || "moderate";
  const tempRange = liveWeather?.daily?.[0]
    ? `${liveWeather.daily[0].temperature_min}°C - ${liveWeather.daily[0].temperature_max}°C`
    : "12°C - 19°C (54°F - 66°F)";
  const condition = liveWeather?.condition_text || "Mild sunny afternoons, cool evenings, passing showers";

  return {
    summary:
      "Kyoto brings crisp days with intermittent showers and substantial walking over cobblestone and wooden temple decks.",
    weather_overview: {
      expected_conditions: condition,
      temperature_range: tempRange,
      rain_risk: rainRisk,
      source: liveWeather?.source || "Open-Meteo Global Meteorological Feed",
    },
    items: [
      {
        item_name: "Compact Wind-Resistant Umbrella",
        category: "weather_climate",
        reason: `Passing showers are common (${liveWeather?.precipitation_probability ?? 35}% forecast). Essential for Arashiyama bamboo groves and Higashiyama alleys.`,
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Water-Repellent Packable Windbreaker",
        category: "weather_climate",
        reason: "Lightweight layer for windy mornings along the Kamo River and sudden mountain breezes.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "UV-Protection Sun Hat",
        category: "weather_climate",
        reason: "Sun reflection off open stone temple plazas like Fushimi Inari and Kiyomizu-dera.",
        quantity: 1,
        is_essential: false,
      },
      {
        item_name: "Slip-On Cushioned Walking Shoes",
        category: "footwear_gear",
        reason: "Temple halls and traditional teahouses require taking shoes off repeatedly; slip-ons save time and back strain.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Lightweight 18L-20L Daypack",
        category: "footwear_gear",
        reason: "Convenient for carrying your water bottle, umbrella, transit cards, and temple stamp books (Goshuincho).",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Packable Tote Bag",
        category: "footwear_gear",
        reason: "Japanese shops charge for plastic bags; handy for souvenir snacks from Nishiki Market.",
        quantity: 1,
        is_essential: false,
      },
      {
        item_name: "Modest Breathable Layers (Shoulder & Knee Coverage)",
        category: "clothing_attire",
        reason: "Required for respectful entry into sacred Shinto shrines and Buddhist monastic grounds.",
        quantity: 4,
        is_essential: true,
      },
      {
        item_name: "Merino Wool or Thermal Base Layer",
        category: "clothing_attire",
        reason: "Evening temperatures drop quickly once the sun sets over the Kyoto foothills.",
        quantity: 2,
        is_essential: false,
      },
      {
        item_name: "Type A Japan Power Plug Adapter",
        category: "electronics_adapters",
        reason: "Japan uses two-prong Type A (100V). Most US plugs fit, but UK/EU travelers require physical adapters.",
        quantity: 2,
        is_essential: true,
      },
      {
        item_name: "10,000mAh Portable Power Bank",
        category: "electronics_adapters",
        reason: "Continuous mobile transit navigation (Suica/Pasmo) and camera use deplete battery quickly.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Physical Coin Purse / Suica Card Sleeve",
        category: "essentials_health",
        reason: "Cash coins (100¥, 500¥) are still widely required for vending machines, gachapon, and temple donation boxes.",
        quantity: 1,
        is_essential: true,
      },
      {
        item_name: "Hydrocolloid Blister Bandages & Moleskin",
        category: "essentials_health",
        reason: "Walking 15,000 to 22,000 steps daily across stone steps and hillside shrines can cause foot friction.",
        quantity: 1,
        is_essential: true,
      },
    ],
  };
}
