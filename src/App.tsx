import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Sun, 
  Sunrise, 
  Sunset, 
  AlertCircle, 
  Compass, 
  Thermometer, 
  Calendar, 
  CloudRain, 
  Shirt, 
  Activity, 
  RefreshCw, 
  X, 
  Sparkles, 
  TrendingUp, 
  Info,
  ExternalLink
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  CitySearchResult, 
  CurrentWeather, 
  DailyForecast, 
  WeatherIntelligence,
  WeatherAlert
} from "./types";
import { getWeatherCondition, getWindDirection } from "./lib/weatherUtils";

// Client-side high-fidelity weather and planning intelligence generator
function generateClientIntelligence(city: string, currentWeather: CurrentWeather, forecast: DailyForecast[]): WeatherIntelligence {
  const weatherLabel = getWeatherCondition(currentWeather.weatherCode).label;
  const overview = `The weather in ${city} is currently ${weatherLabel.toLowerCase()} at ${currentWeather.temp}°C. Over the course of the week, temperatures will range between ${Math.min(...forecast.map(f => f.minTemp))}°C and ${Math.max(...forecast.map(f => f.maxTemp))}°C.`;
  
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

    const desc = getWeatherCondition(day.weatherCode).label.toLowerCase();
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

  const planningAlerts: WeatherAlert[] = [];

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

const PRESET_CITIES = [
  { name: "New York", lat: 40.7128, lon: -74.0060, country: "United States" },
  { name: "London", lat: 51.5074, lon: -0.1278, country: "United Kingdom" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "Japan" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, country: "Australia" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, country: "France" },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, country: "Egypt" },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState({
    name: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.0060,
    timezone: "America/New_York",
  });

  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [intelligence, setIntelligence] = useState<WeatherIntelligence | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [chartTab, setChartTab] = useState<"temp" | "rain">("temp");

  // Loading & Error States
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load default weather on mount
  useEffect(() => {
    fetchWeatherAndIntelligence(selectedCity.name, selectedCity.country, selectedCity.lat, selectedCity.lon);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search for cities
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchCities(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchCities = async (query: string) => {
    setIsSearchingCities(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCities(false);
    }
  };

  const fetchWeatherAndIntelligence = async (cityName: string, country: string, lat: number, lon: number) => {
    setIsLoadingForecast(true);
    setIsLoadingIntelligence(true);
    setErrorMessage(null);
    setCurrentWeather(null);
    setForecast([]);
    setIntelligence(null);
    setSelectedDayIndex(0);

    try {
      // 1. Fetch Forecast data directly from Open-Meteo Forecast API in the frontend
      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`
      );
      if (!forecastRes.ok) {
        throw new Error("Unable to retrieve weather forecast. Please try again.");
      }
      const rawForecast = await forecastRes.json();

      // Parse current weather
      const current = rawForecast.current;
      const parsedCurrent: CurrentWeather = {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        windSpeed: Math.round(current.wind_speed_10m),
        windGusts: Math.round(current.wind_gusts_10m),
        windDirection: current.wind_direction_10m,
        isDay: current.is_day === 1,
      };
      setCurrentWeather(parsedCurrent);

      // Parse 7-day forecast
      const daily = rawForecast.daily;
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const parsedForecast: DailyForecast[] = [];

      for (let i = 0; i < 7; i++) {
        const dateObj = new Date(daily.time[i]);
        const dayName = i === 0 ? "Today" : daysOfWeek[dateObj.getUTCDay()];
        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

        parsedForecast.push({
          date: formattedDate,
          dayName,
          maxTemp: Math.round(daily.temperature_2m_max[i]),
          minTemp: Math.round(daily.temperature_2m_min[i]),
          maxFeels: Math.round(daily.apparent_temperature_max[i]),
          minFeels: Math.round(daily.apparent_temperature_min[i]),
          weatherCode: daily.weather_code[i],
          precipProb: daily.precipitation_probability_max[i],
          precipSum: daily.precipitation_sum[i],
          uvIndex: parseFloat(daily.uv_index_max[i].toFixed(1)),
          windSpeed: Math.round(daily.wind_speed_10m_max[i]),
          sunrise: new Date(daily.sunrise[i]).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          sunset: new Date(daily.sunset[i]).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        });
      }
      setForecast(parsedForecast);
      setIsLoadingForecast(false);

      // 2. Generate Planning Intelligence purely client-side instantly
      try {
        const intelData = generateClientIntelligence(cityName, parsedCurrent, parsedForecast);
        setIntelligence(intelData);
      } catch (intelErr: any) {
        console.error("Client intelligence generation failed:", intelErr);
        // Secondary fallback
        setIntelligence({
          overview: "Enjoy the transition in local weather conditions this week. Dynamic atmospheric factors are at play.",
          activities: parsedForecast.map(f => ({
            day: f.dayName,
            recommendation: f.precipProb > 40 ? "Precipitation expected. Great day for museum tours or indoor activities." : "Favorable temperatures. Excellent for outdoor parks and walks.",
            suitability: f.precipProb > 40 ? "Fair" : "Excellent"
          })),
          clothing: [
            "Dress in versatile, breathable layers.",
            "Carry a light rain jacket or compact umbrella just in case.",
            "Wear high UV block or hats during high UV windows."
          ],
          planningAlerts: [
            {
              type: "Local Mode",
              message: "Showing rule-based local meteorology suggestions.",
              severity: "info"
            }
          ]
        });
      } finally {
        setIsLoadingIntelligence(false);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong fetching the weather. Please try again.");
      setIsLoadingForecast(false);
      setIsLoadingIntelligence(false);
    }
  };

  const handleSelectCity = (city: CitySearchResult) => {
    const formattedCity = {
      name: city.name,
      country: city.country,
      lat: city.latitude,
      lon: city.longitude,
      timezone: city.timezone,
    };
    setSelectedCity(formattedCity);
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    fetchWeatherAndIntelligence(formattedCity.name, formattedCity.country, formattedCity.lat, formattedCity.lon);
  };

  const handlePresetSelect = (preset: typeof PRESET_CITIES[0]) => {
    setSelectedCity({
      name: preset.name,
      country: preset.country,
      lat: preset.lat,
      lon: preset.lon,
      timezone: "auto",
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    fetchWeatherAndIntelligence(preset.name, preset.country, preset.lat, preset.lon);
  };

  // Weather styling shortcuts
  const currentWeatherStyle = currentWeather ? getWeatherCondition(currentWeather.weatherCode) : null;
  const currentIcon = currentWeatherStyle ? currentWeatherStyle.icon : Sun;

  // Chart Data Preparation
  const chartData = forecast.map((day) => ({
    name: day.dayName,
    "Max Temp (°C)": day.maxTemp,
    "Min Temp (°C)": day.minTemp,
    "Rain Probability (%)": day.precipProb,
    "Precipitation (mm)": day.precipSum,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans" id="app_root">
      {/* Header section */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm" id="app_header">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-md">
              <CloudRain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
                Weather Intelligence
              </h1>
              <p className="text-xs text-slate-500 font-medium">Precision Forecasts & Lifestyle Planning Insights</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-96" ref={dropdownRef} id="search_container">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                id="search_city_input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a city... (e.g. Toronto, Rome)"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Geocoding Results Dropdown */}
            {showDropdown && (
              <div 
                id="search_dropdown" 
                className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200/80 max-h-72 overflow-y-auto z-50 divide-y divide-slate-100"
              >
                {isSearchingCities ? (
                  <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                    Searching cities...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => handleSelectCity(city)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50/80 flex items-center justify-between transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-900">{city.name}</span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {city.admin1 ? `${city.admin1}, ` : ""}{city.country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                        {city.country_code || "LOC"}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400">
                    No cities found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Preset selections */}
        <div className="flex flex-wrap items-center gap-2 mb-6" id="preset_chips_container">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Popular Locations:
          </span>
          {PRESET_CITIES.map((preset) => (
            <button
              id={`preset_${preset.name.toLowerCase().replace(" ", "_")}`}
              key={preset.name}
              onClick={() => handlePresetSelect(preset)}
              className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer border ${
                selectedCity.name === preset.name
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Error Alert Display */}
        {errorMessage && (
          <div 
            id="error_banner" 
            className="mb-6 p-4 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-3.5 text-red-800 animate-fadeIn"
          >
            <AlertCircle className="w-5.5 h-5.5 text-red-500 shrink-0 mt-0.5" />
            <div className="grow">
              <h3 className="font-bold text-sm text-red-900">Weather Retrieval Error</h3>
              <p className="text-xs text-red-700/95 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
            <button 
              onClick={() => fetchWeatherAndIntelligence(selectedCity.name, selectedCity.country, selectedCity.lat, selectedCity.lon)}
              className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors shrink-0"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_grid">
          
          {/* LEFT PANELS (8 cols on lg): Current, Forecast & charts */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* CURRENT WEATHER HERO */}
            {isLoadingForecast ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col gap-5 h-[280px] justify-between">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-36 bg-slate-200 rounded"></div>
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-24 bg-slate-200 rounded-lg"></div>
                  <div className="space-y-1">
                    <div className="h-5 w-20 bg-slate-200 rounded"></div>
                    <div className="h-4 w-28 bg-slate-200 rounded"></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 bg-slate-100 rounded"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                  <div className="h-10 bg-slate-100 rounded"></div>
                </div>
              </div>
            ) : currentWeather ? (
              <div 
                id="current_weather_hero"
                className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm`}
              >
                {/* Decorative Background Accent based on weather */}
                <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15 bg-gradient-to-br ${currentWeatherStyle?.gradient}`}></div>

                <div className="relative flex flex-col md:flex-row justify-between gap-6">
                  {/* Left part: primary details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-fit mb-3">
                      <MapPin className="w-3 h-3" />
                      {selectedCity.name}, {selectedCity.country}
                    </div>

                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                      {selectedCity.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Coordinates: {selectedCity.lat.toFixed(4)}°N, {selectedCity.lon.toFixed(4)}°E
                    </p>

                    <div className="mt-6 flex items-center gap-5">
                      <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${currentWeatherStyle?.gradient} text-white shadow-md`}>
                        {(() => {
                          const IconComponent = currentIcon;
                          return <IconComponent className="w-9 h-9" />;
                        })()}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-black text-slate-950 tracking-tighter">
                            {currentWeather.temp}
                          </span>
                          <span className="text-2xl font-bold text-slate-400">°C</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {currentWeatherStyle?.label}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-medium text-slate-500">
                            Feels like <strong className="text-slate-700">{currentWeather.feelsLike}°C</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Secondary metrics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:w-[420px] shrink-0" id="current_stats_grid">
                    
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <Droplets className="w-5 h-5 text-sky-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Humidity</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{currentWeather.humidity}%</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <Wind className="w-5 h-5 text-teal-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wind</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{currentWeather.windSpeed} km/h</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <Compass className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Direction</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{getWindDirection(currentWeather.windDirection)}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <CloudRain className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rain</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{currentWeather.precipitation} mm</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <Sunrise className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sunrise</p>
                        <p className="text-xs font-bold text-slate-800 mt-1">
                          {forecast[0] ? forecast[0].sunrise : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                      <Sunset className="w-5 h-5 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sunset</p>
                        <p className="text-xs font-bold text-slate-800 mt-1">
                          {forecast[0] ? forecast[0].sunset : "N/A"}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400">
                Please search for or select a city to display weather details.
              </div>
            )}

            {/* 7-DAY FORECAST PREVIEW */}
            <div id="forecast_section">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 text-sm">7-Day Weather Forecast</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Click day to inspect details</span>
              </div>

              {isLoadingForecast ? (
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="h-32 bg-white border border-slate-200/80 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-3" id="forecast_cards_grid">
                  {forecast.map((day, index) => {
                    const dayStyle = getWeatherCondition(day.weatherCode);
                    const DayIcon = dayStyle.icon;
                    const isSelected = selectedDayIndex === index;

                    return (
                      <button
                        key={day.date}
                        id={`forecast_day_${index}`}
                        onClick={() => setSelectedDayIndex(index)}
                        className={`text-left p-3.5 rounded-xl border flex flex-col justify-between h-36 transition-all relative ${
                          isSelected
                            ? "bg-gradient-to-b from-indigo-50 to-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/30"
                            : "bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-bold ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                            {day.dayName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{day.date}</p>
                        </div>

                        <div className="my-2.5 flex items-center justify-center">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${dayStyle.gradient} text-white`}>
                            <DayIcon className="w-5 h-5" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-baseline gap-1">
                            <span className="text-sm font-bold text-slate-900">{day.maxTemp}°</span>
                            <span className="text-xs font-semibold text-slate-400">{day.minTemp}°</span>
                          </div>
                          <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                            {dayStyle.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* EXPANDED DAY DETAILS & WEATHER CHARTS */}
            {forecast.length > 0 && (
              <div id="expanded_chart_section" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                
                {/* Day Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Meteorological Trends for {forecast[selectedDayIndex].dayName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Selected: {forecast[selectedDayIndex].date} — Max UV: {forecast[selectedDayIndex].uvIndex} • Precip: {forecast[selectedDayIndex].precipProb}%
                      </p>
                    </div>
                  </div>

                  {/* Tabs to switch charts */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      id="tab_temp"
                      onClick={() => setChartTab("temp")}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                        chartTab === "temp"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Temperature Trend
                    </button>
                    <button
                      id="tab_rain"
                      onClick={() => setChartTab("rain")}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                        chartTab === "rain"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Precipitation Probability
                    </button>
                  </div>
                </div>

                {/* Specific selected day metrics bento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-100">
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Apparent Range</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {forecast[selectedDayIndex].minFeels}°C to {forecast[selectedDayIndex].maxFeels}°C
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Precipitation Sum</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {forecast[selectedDayIndex].precipSum} mm
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max UV Index</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {forecast[selectedDayIndex].uvIndex} <span className="text-xs font-semibold text-slate-400 ml-1">
                        ({forecast[selectedDayIndex].uvIndex <= 2 ? "Low" : forecast[selectedDayIndex].uvIndex <= 5 ? "Moderate" : forecast[selectedDayIndex].uvIndex <= 7 ? "High" : "Very High"})
                      </span>
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max Wind Speed</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">
                      {forecast[selectedDayIndex].windSpeed} km/h
                    </p>
                  </div>
                </div>

                {/* Recharts Area Chart */}
                <div className="h-64 mt-4 w-full" id="weather_chart_container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorMinTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight={500}
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight={500}
                        tickLine={false} 
                        unit={chartTab === "temp" ? "°" : "%"}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#fff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.05)"
                        }} 
                      />
                      {chartTab === "temp" ? (
                        <>
                          <Area 
                            type="monotone" 
                            dataKey="Max Temp (°C)" 
                            stroke="#f43f5e" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorTemp)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Min Temp (°C)" 
                            stroke="#06b6d4" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorMinTemp)" 
                          />
                        </>
                      ) : (
                        <Area 
                          type="monotone" 
                          dataKey="Rain Probability (%)" 
                          stroke="#3b82f6" 
                          strokeWidth={2.5}
                          fillOpacity={1} 
                          fill="url(#colorRain)" 
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

              </div>
            )}

          </div>

          {/* RIGHT PANEL (4 cols on lg): GEMINI WEATHER INTELLIGENCE */}
          <div className="lg:col-span-4 flex flex-col gap-6" id="ai_intelligence_sidebar">
            
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
              {/* Glow accents */}
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl opacity-20 bg-indigo-500"></div>
              
              {/* Sidebar Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg border border-indigo-500/20">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
                      Weather Intelligence
                    </h3>
                    <p className="text-[10px] text-indigo-300 font-medium mt-0.5">Smart Lifestyle Planner</p>
                  </div>
                </div>
              </div>

              {/* Sidebar content */}
              <div className="p-5 space-y-6">
                
                {isLoadingIntelligence ? (
                  <div className="space-y-5 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                      <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                      <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                    </div>
                    <div className="border-t border-slate-800 pt-4 space-y-3">
                      <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                      <div className="h-10 bg-slate-800/50 rounded-xl w-full"></div>
                      <div className="h-10 bg-slate-800/50 rounded-xl w-full"></div>
                    </div>
                  </div>
                ) : intelligence ? (
                  <>
                    {/* 1. Overview */}
                    <div className="space-y-2" id="ai_overview_container">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest block">Met Trend Insight</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        {intelligence.overview}
                      </p>
                    </div>

                    {/* 2. Planning Alerts / Precautions */}
                    {intelligence.planningAlerts && intelligence.planningAlerts.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-4" id="ai_alerts_container">
                        <span className="text-[10px] uppercase font-bold text-rose-400 tracking-widest block mb-2.5">Meteorological Planning Alerts</span>
                        <div className="space-y-2">
                          {intelligence.planningAlerts.map((alert, i) => (
                            <div 
                              key={i}
                              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                                alert.severity === "critical"
                                  ? "bg-rose-950/20 border-rose-900/50 text-rose-200"
                                  : alert.severity === "warning"
                                  ? "bg-amber-950/20 border-amber-900/50 text-amber-200"
                                  : "bg-blue-950/20 border-blue-900/50 text-blue-200"
                              }`}
                            >
                              <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                                alert.severity === "critical" ? "text-rose-400" : alert.severity === "warning" ? "text-amber-400" : "text-blue-400"
                              }`} />
                              <div>
                                <strong className="font-semibold block text-[11px] uppercase tracking-wide opacity-90">{alert.type}</strong>
                                <p className="mt-0.5 leading-relaxed text-slate-300">{alert.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Clothing / Attire Guide */}
                    {intelligence.clothing && intelligence.clothing.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-4" id="ai_clothing_container">
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-widest block mb-2.5 flex items-center gap-1">
                          <Shirt className="w-3.5 h-3.5" /> Outfit Recommendation
                        </span>
                        <ul className="space-y-2">
                          {intelligence.clothing.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="text-indigo-400 mt-1 shrink-0">•</span>
                              <span className="leading-relaxed font-medium">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 4. Activity Planner / Day Suitability */}
                    {intelligence.activities && intelligence.activities.length > 0 && (
                      <div className="border-t border-slate-800/80 pt-4" id="ai_activities_container">
                        <span className="text-[10px] uppercase font-bold text-teal-400 tracking-widest block mb-2.5 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> Activity Suitability Index
                        </span>
                        <div className="space-y-2">
                          {intelligence.activities.map((act, i) => {
                            const suitStyle = 
                              act.suitability === "Excellent" 
                                ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40"
                                : act.suitability === "Good"
                                ? "bg-teal-950/30 text-teal-300 border-teal-900/40"
                                : act.suitability === "Fair"
                                ? "bg-amber-950/30 text-amber-300 border-amber-900/40"
                                : "bg-rose-950/30 text-rose-300 border-rose-900/40";

                            return (
                              <div key={i} className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-slate-200">{act.day}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${suitStyle}`}>
                                    {act.suitability}
                                  </span>
                                </div>
                                <p className="text-slate-400 leading-normal text-[11px]">
                                  {act.recommendation}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Could not load planning intelligence recommendations. Please select a city to reload.
                  </div>
                )}
              </div>
            </div>

            {/* Weather safety info card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex gap-3 items-start">
              <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-xs text-slate-800">About Open-Meteo & Analytics</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  Weather forecasts are retrieved live via Open-Meteo. The planning intelligence analysis is processed in real-time client-side in your browser using precise meteorological parameters.
                </p>
                <a 
                  href="https://open-meteo.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 mt-2 transition-colors inline-flex"
                >
                  Open-Meteo API <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60 mt-12 py-6 text-center">
        <p className="text-xs text-slate-400 font-medium">
          Weather Intelligence App &copy; {new Date().getFullYear()} • Powered by Open-Meteo Geocoding & Forecast APIs
        </p>
      </footer>
    </div>
  );
}
