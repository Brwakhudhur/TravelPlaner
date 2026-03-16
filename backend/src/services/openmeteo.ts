/**
 * Open-Meteo Weather Service
 * 
 * Provides historical and forecast weather data
 * https://open-meteo.com/
 * 
 * Rate limit: 10,000 free requests/day (unlimited for non-commercial)
 * Cache: 1 hour (weather changes frequently)
 * 
 * Environment Variables:
 * - OPENMETEO_BASE_URL: Default https://api.open-meteo.com/v1
 */

import axios from 'axios';
import { cacheOrFetch } from './cache';

const BASE_URL = process.env.OPENMETEO_BASE_URL || 'https://api.open-meteo.com/v1';
const VISUAL_CROSSING_BASE_URL = process.env.VISUAL_CROSSING_BASE_URL || 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services';
const VISUAL_CROSSING_API_KEY = process.env.VISUAL_CROSSING_API_KEY;
const CACHE_TTL = 3600; // 1 hour
const REQUEST_TIMEOUT = 5000;

interface WeatherData {
  latitude: number;
  longitude: number;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  description: string;
  month?: number;
}

export interface ForecastDay {
  date: string;
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
  description: string;
  precipitation: number;
}

/**
 * Get current weather at location
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Current weather conditions
 */
export const getCurrentWeather = async (
  latitude: number,
  longitude: number
): Promise<WeatherData | null> => {
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required');
  }

  const cacheKey = `weather:current:${latitude},${longitude}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BASE_URL}/forecast`, {
          params: {
            latitude,
            longitude,
            current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation',
            timezone: 'auto',
          },
          timeout: REQUEST_TIMEOUT,
        });

        if (!response.data?.current) {
          console.warn(`⚠️  No weather data for: ${latitude}, ${longitude}`);
          return null;
        }

        const current = response.data.current;
        return {
          latitude,
          longitude,
          temperature: current.temperature_2m,
          weatherCode: current.weather_code,
          windSpeed: current.wind_speed_10m,
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation || 0,
          description: describeWeatherCode(current.weather_code),
        };
      } catch (error: any) {
        console.error(`Weather error for (${latitude}, ${longitude}):`, error.message);
        throw new Error(`Failed to fetch weather: ${error.message}`);
      }
    },
    CACHE_TTL,
    'weather'
  );
};

/**
 * Get historical monthly climate data (good for destination planning)
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param month - Month (1-12) for historical average
 * @returns Average climate data for the month
 */
export const getMonthlyClimate = async (
  latitude: number,
  longitude: number,
  month: number
): Promise<WeatherData | null> => {
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required');
  }
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  const cacheKey = `climate:${latitude},${longitude},${month}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        // Get historical data for the specific month
        // Using yearly data with month filter
        const response = await axios.get(`${BASE_URL}/forecast`, {
          params: {
            latitude,
            longitude,
            start_date: `2023-${String(month).padStart(2, '0')}-01`,
            end_date: `2023-${String(month).padStart(2, '0')}-28`,
            daily: 'temperature_2m_mean,precipitation_sum,weather_code',
            timezone: 'auto',
          },
          timeout: REQUEST_TIMEOUT,
        });

        if (!response.data?.daily?.temperature_2m_mean) {
          return null;
        }

        // Calculate averages for the month
        const temps = response.data.daily.temperature_2m_mean;
        const precips = response.data.daily.precipitation_sum;
        const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
        const totalPrecip = precips.reduce((a: number, b: number) => a + b, 0);

        return {
          latitude,
          longitude,
          temperature: Math.round(avgTemp * 10) / 10,
          weatherCode: 0, // Summary only
          windSpeed: 0,
          humidity: 0,
          precipitation: Math.round(totalPrecip * 10) / 10,
          description: `Average: ${Math.round(avgTemp)}°C, Precipitation: ${totalPrecip}mm`,
          month,
        };
      } catch (error: any) {
        console.error(`Climate error for (${latitude}, ${longitude}, month ${month}):`, error.message);
        throw new Error(`Failed to fetch climate data: ${error.message}`);
      }
    },
    86400, // 24 hours (climate is stable)
    'climate'
  );
};

/**
 * Get daily forecast for a date range
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param startDate - YYYY-MM-DD
 * @param endDate - YYYY-MM-DD
 */
export const getForecastRange = async (
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<ForecastDay[] | null> => {
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required');
  }
  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }
  if (!VISUAL_CROSSING_API_KEY) {
    throw new Error('VISUAL_CROSSING_API_KEY is not configured');
  }

  const cacheKey = `forecast:${latitude},${longitude},${startDate},${endDate}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(
          `${VISUAL_CROSSING_BASE_URL}/timeline/${latitude},${longitude}/${startDate}/${endDate}`,
          {
            params: {
              unitGroup: 'metric',
              include: 'days',
              key: VISUAL_CROSSING_API_KEY,
              contentType: 'json',
            },
            timeout: REQUEST_TIMEOUT,
          }
        );

        const days = response.data?.days;
        if (!Array.isArray(days)) {
          return null;
        }

        return days.map((day: any) => ({
          date: day.datetime,
          minTemp: day.tempmin ?? 0,
          maxTemp: day.tempmax ?? 0,
          weatherCode: 0,
          description: day.conditions || 'Unknown',
          precipitation: day.precip ?? 0,
        })) as ForecastDay[];
      } catch (error: any) {
        console.error(`Forecast error for (${latitude}, ${longitude}):`, error.message);
        throw new Error(`Failed to fetch forecast: ${error.message}`);
      }
    },
    CACHE_TTL,
    'forecast'
  );
};

/**
 * Convert WMO weather code to human-readable description
 * @param code - WMO weather code
 * @returns Description
 */
export function describeWeatherCode(code: number): string {
  const descriptions: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy with rime',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

export default {
  getCurrentWeather,
  getMonthlyClimate,
  getForecastRange,
  describeWeatherCode,
};
