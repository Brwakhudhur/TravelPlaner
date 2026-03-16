/**
 * Amadeus Flight Offers Service
 *
 * Fetches cheapest flight offers for destinations
 * https://developers.amadeus.com/
 *
 * Environment Variables:
 * - AMADEUS_API_KEY: Amadeus API key (client_id)
 * - AMADEUS_API_SECRET: Amadeus API secret (client_secret)
 * - AMADEUS_BASE_URL: Default https://test.api.amadeus.com
 */

import axios from 'axios';
import { cacheOrFetch } from './cache';

const BASE_URL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
const API_KEY = process.env.AMADEUS_API_KEY;
const API_SECRET = process.env.AMADEUS_API_SECRET;
const REQUEST_TIMEOUT = 8000;
const TOKEN_TTL = 1500; // 25 minutes
const OFFER_TTL = 21600; // 6 hours
const FX_CACHE_TTL = 21600; // 6 hours

export interface CheapestFlightResult {
  price: string;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
}

export interface AirportOption {
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

const getExchangeRate = async (fromCurrency: string, toCurrency: string): Promise<number | null> => {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (!from || !to || from === to) {
    return 1;
  }

  const cacheKey = `fx:amadeus:${from}:${to}`;

  try {
    const rate = await cacheOrFetch(
      cacheKey,
      async () => {
        const response = await axios.get('https://api.frankfurter.app/latest', {
          params: { from, to },
          timeout: REQUEST_TIMEOUT,
        });
        const value = response.data?.rates?.[to];
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      },
      FX_CACHE_TTL,
      'fx'
    );

    return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
  } catch (error) {
    console.warn('Failed to fetch FX rate for flight conversion:', { from, to, error });
    return null;
  }
};

const getAccessToken = async (): Promise<string> => {
  if (!API_KEY || !API_SECRET) {
    throw new Error('Amadeus API credentials not configured');
  }

  return cacheOrFetch(
    'amadeus:token',
    async () => {
      const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: API_KEY,
        client_secret: API_SECRET,
      });

      const response = await axios.post(
        `${BASE_URL}/v1/security/oauth2/token`,
        payload.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: REQUEST_TIMEOUT,
        }
      );

      return response.data?.access_token as string;
    },
    TOKEN_TTL,
    'amadeus'
  );
};

export const resolveIataCode = async (keyword: string): Promise<string | null> => {
  if (!keyword) return null;

  const cacheKey = `amadeus:iata:${keyword.toLowerCase()}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      const token = await getAccessToken();

      const response = await axios.get(`${BASE_URL}/v1/reference-data/locations`, {
        params: {
          keyword,
          subType: 'CITY,AIRPORT',
          sort: 'analytics.travelers.score',
          'page[limit]': 1,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      const item = response.data?.data?.[0];
      return item?.iataCode || null;
    },
    86400,
    'amadeus'
  );
};

export const searchAirports = async (
  keyword: string,
  limit: number = 20
): Promise<AirportOption[]> => {
  if (!keyword) return [];

  const normalized = keyword.trim().toLowerCase();
  const fallbackAirports: AirportOption[] = [
    {
      iataCode: 'DUB',
      name: 'Dublin Airport',
      cityName: 'Dublin',
      countryName: 'Ireland',
    },
  ];

  const cacheKey = `amadeus:airports:${keyword.toLowerCase()}:${limit}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      const token = await getAccessToken();

      const response = await axios.get(`${BASE_URL}/v1/reference-data/locations`, {
        params: {
          keyword,
          subType: 'CITY,AIRPORT',
          sort: 'analytics.travelers.score',
          'page[limit]': limit,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      const items = response.data?.data || [];
      const mapped = items.map((item: any) => ({
        iataCode: item?.iataCode,
        name: item?.name || item?.detailedName || 'Unknown',
        cityName: item?.address?.cityName,
        countryName: item?.address?.countryName,
      })) as AirportOption[];

      if ((normalized.includes('dub') || normalized.includes('dublin')) &&
        !mapped.some((opt) => opt.iataCode === 'DUB')) {
        return [...fallbackAirports, ...mapped].slice(0, limit);
      }

      return mapped;
    },
    86400,
    'amadeus'
  );
};

export const getCheapestFlightOffer = async (
  origin: string,
  destinationKeyword: string,
  departureDate: string,
  returnDate: string,
  currency: string = 'USD'
): Promise<CheapestFlightResult | null> => {
  if (!origin || !destinationKeyword || !departureDate || !returnDate) {
    throw new Error('Origin, destination, and dates are required');
  }

  const destinationIata = await resolveIataCode(destinationKeyword);
  if (!destinationIata) return null;

  const normalizedCurrency = (currency || 'USD').toUpperCase();
  const cacheKey = `amadeus:offer:${origin}:${destinationIata}:${departureDate}:${returnDate}:${normalizedCurrency}`;

  console.log(`🛫 [AMADEUS] Requesting flight offer in currency: ${normalizedCurrency}`);

  return cacheOrFetch(
    cacheKey,
    async () => {
      const token = await getAccessToken();

      console.log(`🛫 [AMADEUS] API call params - currencyCode: ${normalizedCurrency}`);
      const response = await axios.get(`${BASE_URL}/v2/shopping/flight-offers`, {
        params: {
          originLocationCode: origin,
          destinationLocationCode: destinationIata,
          departureDate,
          returnDate,
          adults: 1,
          currencyCode: normalizedCurrency,
          max: 1,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: REQUEST_TIMEOUT,
      });

      const offer = response.data?.data?.[0];
      if (!offer) return null;

      const providerCurrency = offer.price?.currency || normalizedCurrency;
      const rawPrice = parseFloat(offer.price?.total || '0');
      let finalPrice = Number.isFinite(rawPrice) ? rawPrice : 0;
      let finalCurrency = providerCurrency;

      console.log(`🛫 [AMADEUS] Provider returned: ${providerCurrency} ${rawPrice}`);

      if (finalPrice > 0 && providerCurrency !== normalizedCurrency) {
        console.log(`💱 [AMADEUS] Converting ${providerCurrency} → ${normalizedCurrency}`);
        const rate = await getExchangeRate(providerCurrency, normalizedCurrency);
        if (rate && rate > 0) {
          finalPrice = finalPrice * rate;
          finalCurrency = normalizedCurrency;
          console.log(`💱 [AMADEUS] Converted to: ${finalCurrency} ${finalPrice.toFixed(2)} (rate: ${rate})`);
        } else {
          console.warn(`💱 [AMADEUS] FX conversion failed, keeping original currency`);
        }
      } else {
        console.log(`✅ [AMADEUS] Currency matches or no conversion needed`);
      }

      return {
        price: finalPrice.toFixed(2),
        currency: finalCurrency,
        origin,
        destination: destinationIata,
        departureDate,
        returnDate,
      } as CheapestFlightResult;
    },
    OFFER_TTL,
    'amadeus'
  );
};

export default {
  searchAirports,
  getCheapestFlightOffer,
  resolveIataCode,
};
