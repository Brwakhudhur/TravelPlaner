/**
 * Image Provider Service
 * 
 * Fetches destination images from multiple sources with fallback
 * 
 * Supported providers:
 * 1. Flickr - Free images, requires API key
 * 2. Pixabay - Free images, requires API key
 * 3. Unsplash - Free, high quality, requires API key
 * 4. Pexels - Free images with API access
 * 4. Fallback: Generic placeholder
 * 
 * Environment Variables:
 * - FLICKR_API_KEY: API key from https://www.flickr.com/services/api/misc.api_keys.html
 * - PIXABAY_API_KEY: API key from https://pixabay.com/api/docs/
 * - UNSPLASH_API_KEY: API key from https://unsplash.com/developers
 * - PEXELS_API_KEY: API key from https://www.pexels.com/api/
 * - DEFAULT_IMAGE_URL: Fallback image URL
 */

import axios from 'axios';
import { cacheOrFetch } from './cache';

const CACHE_TTL = 604800; // 7 days (images don't change often)
const REQUEST_TIMEOUT = 5000;

interface ImageResult {
  url: string;
  source: 'flickr' | 'pixabay' | 'unsplash' | 'pexels' | 'placeholder';
  title: string;
  photographer?: string;
  originalUrl?: string;
}

/**
 * Fetch image for a destination
 * Tries multiple providers in order, returns first successful result
 * @param query - Destination name or description (e.g., "Paris", "Beach in Bali")
 * @returns Image URL and metadata
 */
export const getDestinationImage = async (query: string): Promise<ImageResult | null> => {
  if (!query) {
    throw new Error('Query is required');
  }

  const cacheKey = `image:${query.toLowerCase()}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      // Try providers in order
      let result = await tryFlickr(query);
      if (result) return result;

      result = await tryPixabay(query);
      if (result) return result;

      result = await tryUnsplash(query);
      if (result) return result;

      result = await tryPexels(query);
      if (result) return result;

      // Fallback to placeholder
      return getPlaceholder(query);
    },
    CACHE_TTL,
    'image'
  );
};

/**
 * Pixabay image search
 */
async function tryPixabay(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  Pixabay API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: query,
        image_type: 'photo',
        per_page: 3,
        order: 'popular',
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.data?.hits || response.data.hits.length === 0) {
      console.log(`⚠️  No Pixabay images for: ${query}`);
      return null;
    }

    const image = response.data.hits[0];
    return {
      url: image.webformatURL,
      source: 'pixabay',
      title: query,
      photographer: image.user,
      originalUrl: image.pageURL,
    };
  } catch (error: any) {
    console.warn(`Pixabay error: ${error.message}`);
    return null;
  }
}

/**
 * Flickr image search
 */
async function tryFlickr(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.FLICKR_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  Flickr API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://www.flickr.com/services/rest/', {
      params: {
        method: 'flickr.photos.search',
        api_key: apiKey,
        text: query,
        per_page: 1,
        page: 1,
        sort: 'relevance',
        content_type: 1,
        media: 'photos',
        safe_search: 1,
        extras: 'url_c,url_l,url_o,owner_name',
        format: 'json',
        nojsoncallback: 1,
      },
      timeout: REQUEST_TIMEOUT,
    });

    const photo = response.data?.photos?.photo?.[0];
    if (!photo) {
      console.log(`⚠️  No Flickr images for: ${query}`);
      return null;
    }

    const url = photo.url_c || photo.url_l || photo.url_o ||
      `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;

    return {
      url,
      source: 'flickr',
      title: query,
      photographer: photo.ownername,
      originalUrl: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`,
    };
  } catch (error: any) {
    console.warn(`Flickr error: ${error.message}`);
    return null;
  }
}

/**
 * Unsplash image search
 */
async function tryUnsplash(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.UNSPLASH_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  Unsplash API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query,
        per_page: 1,
        order_by: 'relevant',
        client_id: apiKey,
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.data?.results || response.data.results.length === 0) {
      console.log(`⚠️  No Unsplash images for: ${query}`);
      return null;
    }

    const image = response.data.results[0];
    return {
      url: image.urls.regular,
      source: 'unsplash',
      title: image.alt_description || query,
      photographer: image.user?.name,
      originalUrl: image.links.html,
    };
  } catch (error: any) {
    console.warn(`Unsplash error: ${error.message}`);
    return null;
  }
}

/**
 * Pexels image search
 */
async function tryPexels(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('ℹ️  Pexels API key not configured');
    return null;
  }

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: {
        query,
        per_page: 1,
      },
      headers: {
        Authorization: apiKey,
      },
      timeout: REQUEST_TIMEOUT,
    });

    if (!response.data?.photos || response.data.photos.length === 0) {
      console.log(`⚠️  No Pexels images for: ${query}`);
      return null;
    }

    const image = response.data.photos[0];
    return {
      url: image.src.large,
      source: 'pexels',
      title: query,
      photographer: image.photographer,
      originalUrl: image.photographer_url,
    };
  } catch (error: any) {
    console.warn(`Pexels error: ${error.message}`);
    return null;
  }
}

/**
 * Get placeholder image
 */
function getPlaceholder(query: string): ImageResult {
  const encodedQuery = encodeURIComponent(query);
  const fallbackUrl = process.env.DEFAULT_IMAGE_URL ||
    `https://via.placeholder.com/800x600?text=${encodedQuery}`;

  return {
    url: fallbackUrl,
    source: 'placeholder',
    title: query,
  };
}

/**
 * Batch fetch images for multiple destinations
 * @param queries - Array of destination names
 * @returns Array of image results
 */
export const getDestinationImages = async (queries: string[]): Promise<ImageResult[]> => {
  const results = await Promise.all(
    queries.map(query =>
      getDestinationImage(query).catch(error => {
        console.error(`Error fetching image for ${query}:`, error);
        return getPlaceholder(query);
      })
    )
  );
  return results.map((result, index) => result ?? getPlaceholder(queries[index]));
};

export default {
  getDestinationImage,
  getDestinationImages,
};
