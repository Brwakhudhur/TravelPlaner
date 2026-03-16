/**
 * Nominatim Geocoding Service
 * 
 * Converts addresses to coordinates (geocoding)
 * https://nominatim.org/
 * 
 * Rate limit: 1 request/second
 * Cache: 24 hours (locations don't change often)
 * 
 * Environment Variables:
 * - NOMINATIM_BASE_URL: Default https://nominatim.openstreetmap.org
 */

import axios from 'axios';
import { cacheOrFetch } from './cache';

const BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const CACHE_TTL = 86400; // 24 hours
const REQUEST_TIMEOUT = 5000;

// Rate limiting helper
let lastRequestTime = 0;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 1000) {
    await delay(1000 - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
};

interface GeoLocation {
  latitude: number;
  longitude: number;
  displayName: string;
  country?: string;
  city?: string;
}

/**
 * Geocode an address to coordinates
 * @param address - Full address or city name
 * @returns Location with latitude, longitude, display name
 */
export const geocodeAddress = async (address: string): Promise<GeoLocation | null> => {
  if (!address || address.trim().length === 0) {
    throw new Error('Address is required');
  }

  const cacheKey = `geocoding:${address.toLowerCase()}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      await rateLimit();

      try {
        const response = await axios.get(`${BASE_URL}/search`, {
          params: {
            q: address,
            format: 'json',
            limit: 1,
          },
          timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'TravelPlanner/1.0 (geocoding)',
          },
        });

        if (!response.data || response.data.length === 0) {
          console.warn(`⚠️  No geocoding results for: ${address}`);
          return null;
        }

        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          country: result.address?.country,
          city: result.address?.city || result.address?.town,
        };
      } catch (error: any) {
        console.error(`Geocoding error for "${address}":`, error.message);
        throw new Error(`Failed to geocode address: ${error.message}`);
      }
    },
    CACHE_TTL,
    'geocoding'
  );
};

/**
 * Reverse geocode coordinates to address
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Location with display name
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeoLocation | null> => {
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required');
  }

  const cacheKey = `reverse-geocoding:${latitude},${longitude}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      await rateLimit();

      try {
        const response = await axios.get(`${BASE_URL}/reverse`, {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
          },
          timeout: REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'TravelPlanner/1.0 (reverse-geocoding)',
          },
        });

        if (!response.data) {
          console.warn(`⚠️  No reverse geocoding results for: ${latitude}, ${longitude}`);
          return null;
        }

        return {
          latitude,
          longitude,
          displayName: response.data.display_name,
          country: response.data.address?.country,
          city: response.data.address?.city || response.data.address?.town,
        };
      } catch (error: any) {
        console.error(`Reverse geocoding error:`, error.message);
        throw new Error(`Failed to reverse geocode: ${error.message}`);
      }
    },
    CACHE_TTL,
    'reverse-geocoding'
  );
};

export default {
  geocodeAddress,
  reverseGeocode,
};
