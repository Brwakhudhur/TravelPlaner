/**
 * OpenTripMap Points of Interest (POI) Service
 * 
 * Fetches attractions, landmarks, and points of interest
 * https://opentripmap.io/
 * 
 * Rate limit: 1 request/second
 * Cache: 7 days (POIs are relatively static)
 * 
 * Environment Variables:
 * - OPENTRIPMAP_API_KEY: Required API key from https://opentripmap.io
 * - OPENTRIPMAP_BASE_URL: Default https://api.opentripmap.io/0.3
 */

import axios from 'axios';
import { cacheOrFetch } from './cache';

const BASE_URL = process.env.OPENTRIPMAP_BASE_URL || 'https://api.opentripmap.io/0.3';
const API_KEY = process.env.OPENTRIPMAP_API_KEY;
const CACHE_TTL = 604800; // 7 days
const REQUEST_TIMEOUT = 5000;

interface POI {
  id: string;
  name: string;
  kind: string;
  latitude: number;
  longitude: number;
  distance?: number;
  description?: string;
  wikiurl?: string;
  rating?: number;
}

interface POISearchResult {
  poiCount: number;
  pois: POI[];
  latitude: number;
  longitude: number;
  radius: number;
}

/**
 * Search POIs in a radius around coordinates
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param radius - Search radius in meters (default: 5000)
 * @param kinds - Comma-separated kinds filter (e.g., "tourist,landmark")
 * @param limit - Max number of results (default: 10)
 * @returns List of POIs
 */
export const searchPOIs = async (
  latitude: number,
  longitude: number,
  radius: number = 5000,
  kinds: string = '',
  limit: number = 10
): Promise<POISearchResult | null> => {
  if (!latitude || !longitude) {
    throw new Error('Latitude and longitude are required');
  }

  if (!API_KEY) {
    console.warn('⚠️  OPENTRIPMAP_API_KEY not configured. Skipping POI search.');
    return null;
  }

  const cacheKey = `poi:search:${latitude},${longitude},${radius},${kinds},${limit}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        // Step 1: Get XID (location ID) from coordinates
        const xidResponse = await axios.get(`${BASE_URL}/places/radius`, {
          params: {
            apikey: API_KEY,
            lat: latitude,
            lon: longitude,
            radius: radius,
            kinds: kinds || undefined,
            limit: limit,
          },
          timeout: REQUEST_TIMEOUT,
        });

        if (!xidResponse.data?.features || xidResponse.data.features.length === 0) {
          console.warn(`⚠️  No POIs found for: ${latitude}, ${longitude}`);
          return {
            poiCount: 0,
            pois: [],
            latitude,
            longitude,
            radius,
          };
        }

        // Step 2: Fetch details for each POI
        const pois: POI[] = [];
        for (const feature of xidResponse.data.features.slice(0, limit)) {
          try {
            const xid = feature.id;
            const detailResponse = await axios.get(`${BASE_URL}/places/xid/${xid}`, {
              params: {
                apikey: API_KEY,
              },
              timeout: REQUEST_TIMEOUT,
            });

            const props = detailResponse.data;
            pois.push({
              id: xid,
              name: props.name || 'Unknown',
              kind: props.kinds?.split(',')[0] || 'attraction',
              latitude: props.point?.lat || latitude,
              longitude: props.point?.lon || longitude,
              description: props.description,
              wikiurl: props.wikiurl,
              rating: props.rate ? parseFloat(props.rate) : undefined,
            });
          } catch (error: any) {
            console.warn(`Failed to fetch POI details: ${error.message}`);
            // Continue with next POI
          }
        }

        return {
          poiCount: pois.length,
          pois,
          latitude,
          longitude,
          radius,
        };
      } catch (error: any) {
        console.error(`POI search error for (${latitude}, ${longitude}):`, error.message);
        throw new Error(`Failed to search POIs: ${error.message}`);
      }
    },
    CACHE_TTL,
    'poi'
  );
};

/**
 * Get detailed information about a specific POI
 * @param xid - OpenTripMap XID (unique identifier)
 * @returns Detailed POI information
 */
export const getPOIDetails = async (xid: string): Promise<any> => {
  if (!xid) {
    throw new Error('XID is required');
  }

  if (!API_KEY) {
    console.warn('⚠️  OPENTRIPMAP_API_KEY not configured.');
    return null;
  }

  const cacheKey = `poi:detail:${xid}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BASE_URL}/places/xid/${xid}`, {
          params: {
            apikey: API_KEY,
          },
          timeout: REQUEST_TIMEOUT,
        });

        return response.data;
      } catch (error: any) {
        console.error(`POI detail error for ${xid}:`, error.message);
        throw new Error(`Failed to fetch POI details: ${error.message}`);
      }
    },
    CACHE_TTL,
    'poi'
  );
};

/**
 * Search POIs by name/keyword
 * @param query - Search query (city name, landmark name, etc.)
 * @param kinds - Comma-separated kinds filter
 * @param limit - Max results
 * @returns List of matching POIs with locations
 */
export const searchPOIsByName = async (
  query: string,
  kinds: string = '',
  limit: number = 10
): Promise<POI[]> => {
  if (!query) {
    throw new Error('Query is required');
  }

  if (!API_KEY) {
    console.warn('⚠️  OPENTRIPMAP_API_KEY not configured.');
    return [];
  }

  const cacheKey = `poi:name-search:${query},${kinds},${limit}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BASE_URL}/places/search`, {
          params: {
            apikey: API_KEY,
            name: query,
            kinds: kinds || undefined,
            limit: limit,
          },
          timeout: REQUEST_TIMEOUT,
        });

        if (!response.data?.features) {
          return [];
        }

        return response.data.features.map((feature: any) => ({
          id: feature.id,
          name: feature.properties?.name || 'Unknown',
          kind: feature.properties?.kinds?.split(',')[0] || 'place',
          latitude: feature.geometry?.coordinates?.[1] || 0,
          longitude: feature.geometry?.coordinates?.[0] || 0,
          description: feature.properties?.description,
        }));
      } catch (error: any) {
        console.error(`POI name search error for "${query}":`, error.message);
        throw new Error(`Failed to search POIs: ${error.message}`);
      }
    },
    CACHE_TTL,
    'poi'
  );
};

export default {
  searchPOIs,
  getPOIDetails,
  searchPOIsByName,
};
