import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudDrizzle, 
  CloudFog, 
  CloudSun,
  LucideIcon 
} from "lucide-react";

export interface WeatherCondition {
  label: string;
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
  gradient: string;
}

export function getWeatherCondition(code: number): WeatherCondition {
  // WMO Weather interpretation codes (WW)
  // https://open-meteo.com/en/docs
  switch (code) {
    case 0: // Clear sky
      return {
        label: "Clear Sky",
        icon: Sun,
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        gradient: "from-amber-400 via-orange-400 to-yellow-500",
      };
    case 1: // Mainly clear
    case 2: // Partly cloudy
      return {
        label: code === 1 ? "Mainly Clear" : "Partly Cloudy",
        icon: CloudSun,
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        gradient: "from-sky-400 via-blue-400 to-indigo-500",
      };
    case 3: // Overcast
      return {
        label: "Overcast",
        icon: Cloud,
        bgColor: "bg-slate-50",
        textColor: "text-slate-700",
        borderColor: "border-slate-200",
        gradient: "from-slate-400 to-slate-600",
      };
    case 45: // Fog
    case 48: // Depositing rime fog
      return {
        label: code === 45 ? "Foggy" : "Rime Fog",
        icon: CloudFog,
        bgColor: "bg-zinc-50",
        textColor: "text-zinc-700",
        borderColor: "border-zinc-200",
        gradient: "from-zinc-300 via-slate-400 to-zinc-500",
      };
    case 51: // Light drizzle
    case 53: // Moderate drizzle
    case 55: // Dense drizzle
    case 56: // Light freezing drizzle
    case 57: // Dense freezing drizzle
      return {
        label: "Drizzle",
        icon: CloudDrizzle,
        bgColor: "bg-cyan-50",
        textColor: "text-cyan-700",
        borderColor: "border-cyan-200",
        gradient: "from-cyan-300 via-teal-400 to-blue-500",
      };
    case 61: // Slight rain
    case 63: // Moderate rain
    case 65: // Heavy rain
    case 66: // Light freezing rain
    case 67: // Heavy freezing rain
    case 80: // Slight rain showers
    case 81: // Moderate rain showers
    case 82: // Violent rain showers
      return {
        label: code >= 80 ? "Rain Showers" : "Rainy",
        icon: CloudRain,
        bgColor: "bg-indigo-50",
        textColor: "text-indigo-700",
        borderColor: "border-indigo-200",
        gradient: "from-blue-400 via-indigo-400 to-violet-600",
      };
    case 71: // Slight snow fall
    case 73: // Moderate snow fall
    case 75: // Heavy snow fall
    case 77: // Snow grains
    case 85: // Slight snow showers
    case 86: // Heavy snow showers
      return {
        label: "Snowy",
        icon: CloudSnow,
        bgColor: "bg-sky-50",
        textColor: "text-sky-700",
        borderColor: "border-sky-200",
        gradient: "from-sky-300 via-cyan-200 to-blue-400",
      };
    case 95: // Thunderstorm
    case 96: // Thunderstorm with slight hail
    case 99: // Thunderstorm with heavy hail
      return {
        label: "Thunderstorm",
        icon: CloudLightning,
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
        gradient: "from-purple-600 via-indigo-600 to-slate-800",
      };
    default:
      return {
        label: "Unknown Conditions",
        icon: Cloud,
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        gradient: "from-gray-400 to-slate-500",
      };
  }
}

// Convert wind direction degrees to human-readable compass points
export function getWindDirection(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((degrees / 22.5) + 0.5);
  return directions[val % 16];
}
