import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in your Settings > Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Map WMO codes to simple text descriptions
function getWeatherDescription(code: number): string {
  const wmoCodes: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
  };
  return wmoCodes[code] || "Unknown Weather";
}

// Generate highly accurate meteorological & planning insights programmatically when AI is offline/unconfigured
function generateFallbackIntelligence(city: string, currentWeather: any, forecast: any[], hasKeyError: boolean) {
  const overview = `The weather in ${city} is currently ${getWeatherDescription(currentWeather.weatherCode).toLowerCase()} at ${currentWeather.temp}°C. Over the course of the week, temperatures will range between ${Math.min(...forecast.map(f => f.minTemp))}°C and ${Math.max(...forecast.map(f => f.maxTemp))}°C.`;
  
  const clothing: string[] = [];
  if (currentWeather.temp < 10) {
    clothing.push("A heavy winter coat, warm gloves, and an insulating scarf are highly recommended.");
    clothing.push("Wear thick thermal layers or double-layered socks to maintain body heat.");
  } else if (currentWeather.temp < 18) {
    clothing.push("Dress in light layers: a comfortable long-sleeve shirt under a warm sweater or light jacket is perfect.");
    clothing.push("Long trousers or jeans are recommended for the cool air.");
  } else if (currentWeather.temp < 28) {
    clothing.push("Lightweight, breathable garments such as linen shirts, classic t-shirts, or summer dresses.");
    clothing.push("A light windbreaker or sun cap is useful during daytime excursions.");
  } else {
    clothing.push("Warm conditions: choose activewear, light shorts, and tank tops.");
    clothing.push("Always protect yourself with polarized sunglasses and high-coverage hats.");
  }

  if (currentWeather.humidity > 80) {
    clothing.push("High atmospheric humidity detected: opt for synthetic moisture-wicking apparel over denim.");
  }
  if (currentWeather.precipitation > 0 || currentWeather.weatherCode >= 50) {
    clothing.push("An umbrella or waterproof shell is essential for staying dry outdoors.");
  }

  const activities = forecast.map((day) => {
    let suitability: "Excellent" | "Good" | "Fair" | "Poor" = "Excellent";
    let recommendation = "";

    const desc = getWeatherDescription(day.weatherCode).toLowerCase();
    if (day.precipProb > 50 || day.precipSum > 2) {
      suitability = "Poor";
      recommendation = `High probability of rain (${day.precipProb}%). Best suited for indoor activities such as visiting local museums, planning cozy meals, or catching a movie.`;
    } else if (day.maxTemp > 32) {
      suitability = "Fair";
      recommendation = `Very warm afternoon peaks forecasted (${day.maxTemp}°C). Enjoy morning walks, and pivot to fully air-conditioned spaces during peak heat.`;
    } else if (day.minTemp < 5) {
      suitability = "Fair";
      recommendation = `Chilly start to the day (${day.minTemp}°C). Perfect for indoor cafe sessions, warm afternoon strolls, and museum visits.`;
    } else {
      suitability = "Excellent";
      recommendation = `Magnificent weather with ${desc} and a comfortable high of ${day.maxTemp}°C. Excellent for hiking, picnics, cycling, and outdoor tours.`;
    }

    return {
      day: day.dayName,
      recommendation,
      suitability,
    };
  });

  const planningAlerts: any[] = [];
  
  if (hasKeyError) {
    planningAlerts.push({
      type: "Precision Fallback",
      message: "No active Gemini API key detected. Displaying high-fidelity programmatic weather recommendations.",
      severity: "info"
    });
  }

  // Check UV index warnings
  const maxUv = Math.max(...forecast.map(f => f.uvIndex));
  if (maxUv >= 6) {
    planningAlerts.push({
      type: "High UV Warning",
      message: `UV index peaks at ${maxUv} this week. Generous SPF 30+ sunscreen, sunglasses, and protective headwear are highly recommended.`,
      severity: "warning"
    });
  }

  // Check Storm warnings
  const stormyDays = forecast.filter(f => f.weatherCode >= 80 || f.weatherCode === 95 || f.weatherCode === 96 || f.weatherCode === 99);
  if (stormyDays.length > 0) {
    planningAlerts.push({
      type: "Dynamic Rain / Storms",
      message: `Occasional showers or stormy conditions expected around ${stormyDays.map(r => r.dayName).join(", ")}. Carry umbrellas and prepare backup indoor plans.`,
      severity: "warning"
    });
  }

  // Wind speed warning
  const maxWind = Math.max(...forecast.map(f => f.windSpeed));
  if (maxWind > 45) {
    planningAlerts.push({
      type: "Gale Warnings",
      message: `Strong gusty winds up to ${maxWind} km/h are forecasted. Secure lightweight objects outdoors and avoid forest routes.`,
      severity: "warning"
    });
  }

  return {
    overview,
    activities,
    clothing,
    planningAlerts
  };
}

// 1. Search for a city using Open-Meteo Geocoding API
app.get("/api/weather/search", async (req, res) => {
  const city = req.query.city as string;
  if (!city) {
    return res.status(400).json({ error: "City parameter is required" });
  }

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=10&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json(data.results || []);
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: error.message || "Failed to search for city" });
  }
});

// 2. Fetch current weather and 7-day weather forecast using Open-Meteo Forecast API
app.get("/api/weather/forecast", async (req, res) => {
  const lat = req.query.lat as string;
  const lon = req.query.lon as string;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Latitude and Longitude are required" });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Forecast API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Forecast error:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve forecast data" });
  }
});

// 3. Generate AI Weather Intelligence Recommendations based on the forecast
app.post("/api/weather/intelligence", async (req, res) => {
  const { city, currentWeather, forecast } = req.body;

  if (!city || !currentWeather || !forecast) {
    return res.status(400).json({ error: "City, current weather, and forecast data are required" });
  }

  const hasApiKey = !!process.env.GEMINI_API_KEY;

  if (!hasApiKey) {
    // Gracefully serve high-fidelity programmatic insights if there is no API key configured
    console.log(`GEMINI_API_KEY is not defined. Gracefully serving programmatic weather intelligence for ${city}.`);
    const fallbackData = generateFallbackIntelligence(city, currentWeather, forecast, true);
    return res.json(fallbackData);
  }

  try {
    const ai = getGeminiClient();

    const prompt = `
      You are an expert Weather Intelligence Assistant.
      Generate highly personalized planning, outfit, and activity recommendations based on the current weather and 7-day forecast for the city of "${city}".

      Current Conditions in ${city}:
      - Temp: ${currentWeather.temp}°C (Feels like: ${currentWeather.feelsLike}°C)
      - Condition: ${getWeatherDescription(currentWeather.weatherCode)}
      - Humidity: ${currentWeather.humidity}%
      - Wind: ${currentWeather.windSpeed} km/h (Gusts: ${currentWeather.windGusts} km/h)

      7-Day Forecast for ${city}:
      ${forecast.map((day: any) => `
        - ${day.date} (${day.dayName}):
          Temp: ${day.minTemp}°C to ${day.maxTemp}°C (Feels: ${day.minFeels}°C to ${day.maxFeels}°C)
          Condition: ${getWeatherDescription(day.weatherCode)}
          Precipitation Probability: ${day.precipProb}% (Sum: ${day.precipSum}mm)
          Max UV Index: ${day.uvIndex}
          Max Wind Speed: ${day.windSpeed} km/h
      `).join("\n")}

      Please analyze this weather pattern carefully and generate the planning intelligence.
      Return the output strictly in the requested JSON structure. Provide realistic, human-oriented, helpful advices.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional weather meteorologist and lifestyle planner. You write concise, high-utility, visually engaging, and actionable guides for outdoor/indoor recreation, daily clothing, and specific safety/comfort precautions. Always be highly specific to the provided values.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "A summary overview of the weather trend and what it means for the week."
            },
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "The day of the week, e.g., Monday" },
                  recommendation: { type: Type.STRING, description: "Specific activity advice tailored to this day's weather." },
                  suitability: { type: Type.STRING, description: "One of: 'Excellent', 'Good', 'Fair', 'Poor'" }
                },
                required: ["day", "recommendation", "suitability"]
              },
              description: "Custom planning recommendations and activity suitability for key days."
            },
            clothing: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "Practical and stylistic outfit recommendations for the current conditions and temperature swings."
            },
            planningAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "Type of warning or planning tip, e.g., 'UV Warning', 'Rain Alert', 'Comfort Warning'" },
                  message: { type: Type.STRING, description: "Detailed actionable tip or warning message." },
                  severity: { type: Type.STRING, description: "One of: 'info', 'warning', 'critical'" }
                },
                required: ["type", "message", "severity"]
              },
              description: "Any alerts, warnings, or highly recommended precautions."
            }
          },
          required: ["overview", "activities", "clothing", "planningAlerts"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response generated by Gemini model");
    }

    const parsedData = JSON.parse(text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini weather intelligence error:", error);
    // Even if Gemini fails due to an invalid/expired API key or network issues at runtime,
    // gracefully serve programmatic insights instead of returning a 500 error to the client.
    const fallbackData = generateFallbackIntelligence(city, currentWeather, forecast, true);
    res.json(fallbackData);
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
