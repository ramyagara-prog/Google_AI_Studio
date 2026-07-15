export interface CitySearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  admin1_id?: number;
  admin2_id?: number;
  admin3_id?: number;
  admin4_id?: number;
  timezone: string;
  population?: number;
  postcodes?: string[];
  country_id?: number;
  country: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
}

export interface CurrentWeather {
  temp: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  maxFeels: number;
  minFeels: number;
  weatherCode: number;
  precipProb: number;
  precipSum: number;
  uvIndex: number;
  windSpeed: number;
  sunrise: string;
  sunset: string;
}

export interface ActivityRecommendation {
  day: string;
  recommendation: string;
  suitability: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface WeatherAlert {
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface WeatherIntelligence {
  overview: string;
  activities: ActivityRecommendation[];
  clothing: string[];
  planningAlerts: WeatherAlert[];
}
