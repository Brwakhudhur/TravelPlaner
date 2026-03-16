/**
 * Example Controller - Using External Providers & Caching
 * 
 * This demonstrates how to use the geocoding, weather, POI, and image services
 * in your API endpoints.
 * 
 * To use in your routes:
 * import { getDestinationDetails } from '../controllers/exampleController';
 * router.get('/destination/:name', getDestinationDetails);
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { geocodeAddress, reverseGeocode } from '../services/nominatim';
import { getCurrentWeather, getMonthlyClimate } from '../services/openmeteo';
import { searchPOIs } from '../services/opentripmap';
import { getDestinationImage } from '../services/imageProvider';
import { getCacheStats, clearExpiredCache } from '../services/cache';

/**
 * Example: Get comprehensive destination details
 * Combines geocoding, weather, POIs, and images
 */
export const getDestinationDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, month } = req.query;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Destination name is required' });
      return;
    }

    // Step 1: Geocode the destination
    const location = await geocodeAddress(name);
    if (!location) {
      res.status(404).json({ error: `Could not find location for: ${name}` });
      return;
    }

    // Step 2: Get weather/climate data
    let weather = null;
    let climate = null;
    try {
      weather = await getCurrentWeather(location.latitude, location.longitude);
      
      if (month && typeof month === 'string') {
        const monthNum = parseInt(month);
        if (monthNum >= 1 && monthNum <= 12) {
          climate = await getMonthlyClimate(location.latitude, location.longitude, monthNum);
        }
      }
    } catch (error) {
      console.warn('Weather service error:', error);
      // Continue without weather data
    }

    // Step 3: Get POIs
    let pois = null;
    try {
      pois = await searchPOIs(location.latitude, location.longitude, 5000, 'tourist,landmark', 10);
    } catch (error) {
      console.warn('POI service error:', error);
      // Continue without POIs
    }

    // Step 4: Get image
    let image = null;
    try {
      image = await getDestinationImage(name);
    } catch (error) {
      console.warn('Image service error:', error);
      // Continue without image
    }

    // Return comprehensive destination details
    res.json({
      destination: name,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        displayName: location.displayName,
        city: location.city,
        country: location.country,
      },
      currentWeather: weather,
      monthlyClimate: climate,
      pointsOfInterest: pois,
      image,
    });

  } catch (error) {
    console.error('Destination details error:', error);
    res.status(500).json({ error: 'Failed to fetch destination details' });
  }
};

/**
 * Example: Get cache statistics
 * Useful for monitoring and debugging
 */
export const getCacheStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Optional: clear expired entries first
    await clearExpiredCache();

    const stats = await getCacheStats();

    res.json({
      status: 'Cache statistics',
      stats,
      note: 'Cache is database-backed. Redis can be optionally enabled via REDIS_URL env var.',
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
};

/**
 * Example: Reverse geocode endpoint
 * Finds city/country from coordinates
 */
export const getCityFromCoordinates = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    const location = await reverseGeocode(lat, lon);

    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.json({ location });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
};

export default {
  getDestinationDetails,
  getCacheStatus,
  getCityFromCoordinates,
};
