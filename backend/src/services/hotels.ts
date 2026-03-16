import axios from 'axios';
import { getTripAdvisorReviews } from './tripadvisor';
import { cacheOrFetch } from './cache';

interface HotelSearchParams {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  currency?: string;
}

interface HotelResult {
  name: string;
  location: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  checkInDate: string;
  checkOutDate: string;
  pricePerNight?: number;
  link?: string;
}

const RAPIDAPI_KEY = process.env.XOTELO_API_KEY || '54c18e87d9msh116f5d9f6b5f013p19f198jsnee177005cf83';
const RAPIDAPI_HOST = 'xotelo-hotel-prices.p.rapidapi.com';
const FX_CACHE_TTL_SECONDS = 6 * 60 * 60;

const getExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number | null> => {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (!from || !to || from === to) {
    return 1;
  }

  const cacheKey = `fx:${from}:${to}`;

  try {
    const cachedRate = await cacheOrFetch(
      cacheKey,
      async () => {
        const response = await axios.get('https://api.frankfurter.app/latest', {
          params: {
            from,
            to,
          },
          timeout: 8000,
        });
        const rate = response.data?.rates?.[to];
        return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
      },
      FX_CACHE_TTL_SECONDS,
      'fx'
    );

    return typeof cachedRate === 'number' && Number.isFinite(cachedRate) ? cachedRate : null;
  } catch (error) {
    console.warn('[HOTEL] Failed to fetch FX rate:', { from, to, error });
    return null;
  }
};

const convertAmount = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
  if (!Number.isFinite(amount)) return amount;
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    return amount;
  }
  return amount * rate;
};

/**
 * Search hotels using Xotelo API
 * Finds best-rated hotels with competitive prices
 */
export const searchHotels = async (params: HotelSearchParams): Promise<HotelResult[]> => {
  try {
    const { location, checkInDate, checkOutDate } = params;
    const preferredCurrency = (params.currency || 'USD').toUpperCase();

    // 1) Search hotels by query to get hotel keys
    const searchResponse = await axios.get('https://xotelo-hotel-prices.p.rapidapi.com/api/search', {
      params: {
        query: location,
        location_type: 'accommodation',
      },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    });

    console.log('[HOTEL] Xotelo search response:', JSON.stringify(searchResponse.data).substring(0, 500));

    // Handle different response formats from Xotelo API
    let accommodations: any[] = [];
    
    // Check if API returned an error
    if (searchResponse.data?.error) {
      console.warn('Xotelo API error:', searchResponse.data.error);
      // Return mock data when API returns an error
      return getMockHotels(params);
    }
    
    // Xotelo search response is in result.list
    if (searchResponse.data?.result?.list && Array.isArray(searchResponse.data.result.list)) {
      accommodations = searchResponse.data.result.list;
    } else {
      console.warn('Unexpected API response format:', searchResponse.data);
      return getMockHotels(params);
    }

    const checkInObj = new Date(checkInDate);
    const checkOutObj = new Date(checkOutDate);
    const nights = Math.max(1, Math.ceil((checkOutObj.getTime() - checkInObj.getTime()) / (1000 * 60 * 60 * 24)));

    // 2) Fetch rates for each hotel key (top 5)
    const topHotels = accommodations.slice(0, 5);
    const processedHotels: HotelResult[] = await Promise.all(
      topHotels.map(async (hotel: any) => {
        const hotelKey = hotel.hotel_key;
        let pricePerNight = 0;
        let currency = 'USD';
        let rating = 0;
        let reviewCount = 0;

        if (hotelKey) {
          try {
            const ratesResponse = await axios.get('https://xotelo-hotel-prices.p.rapidapi.com/api/rates', {
              params: {
                hotel_key: hotelKey,
                chk_in: checkInDate,
                chk_out: checkOutDate,
                currency: preferredCurrency,
              },
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST,
              },
            });

            const rates = ratesResponse.data?.result?.rates || [];
            currency = ratesResponse.data?.result?.currency || 'USD';
            if (Array.isArray(rates) && rates.length > 0) {
              const minRate = rates.reduce((min: number, r: any) => {
                const rate = typeof r?.rate === 'number' ? r.rate : parseFloat(r?.rate || 0);
                return rate > 0 && rate < min ? rate : min;
              }, Number.POSITIVE_INFINITY);
              pricePerNight = Number.isFinite(minRate) ? minRate : 0;
            }

            if (pricePerNight > 0 && currency.toUpperCase() !== preferredCurrency) {
              const convertedPerNight = await convertAmount(pricePerNight, currency, preferredCurrency);
              if (Number.isFinite(convertedPerNight) && convertedPerNight > 0) {
                pricePerNight = convertedPerNight;
                currency = preferredCurrency;
              }
            }
          } catch (rateError) {
            console.warn('[HOTEL] Rate fetch error for', hotelKey, rateError);
          }
        }

        // Fetch TripAdvisor reviews
        if (hotel.url) {
          try {
            const reviews = await getTripAdvisorReviews(hotel.url, hotel.name);
            rating = reviews.rating;
            reviewCount = reviews.reviewCount;
          } catch (reviewError) {
            console.warn('[HOTEL] Review fetch error for', hotel.name, reviewError);
          }
        }

        return {
          name: hotel.name || hotel.title || 'Hotel',
          location: hotel.short_place_name || hotel.place_name || location,
          price: pricePerNight * nights,
          currency,
          rating,
          reviewCount,
          checkInDate,
          checkOutDate,
          pricePerNight,
          link: hotel.url || '',
        };
      })
    );

    // Sort by:
    // 1. Rating (descending) - high-rated first
    // 2. Price per night (ascending) - cheapest first
    const sortedHotels = processedHotels.sort((a, b) => {
      // If ratings differ significantly, prioritize better rated
      if (Math.abs(b.rating - a.rating) > 0.5) {
        return b.rating - a.rating;
      }
      // If ratings are similar, go for cheaper price
      return (a.pricePerNight || 0) - (b.pricePerNight || 0);
    });

    // Return top 5 best hotels
    return sortedHotels.slice(0, 5);
  } catch (error) {
    console.error('Hotel search error:', error);
    // Return mock data if API fails (better UX than complete failure)
    return getMockHotels(params);
  }
};

/**
 * Helper function to generate mock hotel data
 */
function getMockHotels(params: HotelSearchParams): HotelResult[] {
  console.log('Returning mock hotel data for:', params.location);
  const preferredCurrency = (params.currency || 'USD').toUpperCase();
  
  // Build booking.com search URL with location and dates
  const searchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(params.location)}&checkin=${params.checkInDate}&checkout=${params.checkOutDate}`;
  
  return [
    {
      name: 'Premium Resort & Spa',
      location: params.location,
      price: 450,
      currency: preferredCurrency,
      rating: 4.8,
      reviewCount: 2150,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      pricePerNight: 150,
      link: searchUrl,
    },
    {
      name: 'Comfort Inn Hotel',
      location: params.location,
      price: 270,
      currency: preferredCurrency,
      rating: 4.5,
      reviewCount: 1840,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      pricePerNight: 90,
      link: searchUrl,
    },
    {
      name: 'Budget Travelers Hotel',
      location: params.location,
      price: 150,
      currency: preferredCurrency,
      rating: 4.2,
      reviewCount: 1250,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      pricePerNight: 50,
      link: searchUrl,
    },
  ];
}

/**
 * Get best hotel deal for a destination
 * Returns single best-rated hotel with good price
 */
export const getBestHotel = async (params: HotelSearchParams): Promise<HotelResult | null> => {
  try {
    const hotels = await searchHotels(params);
    return hotels.length > 0 ? hotels[0] : null;
  } catch (error) {
    console.error('Error getting best hotel:', error);
    return null;
  }
};
