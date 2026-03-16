/**
 * Service to fetch comprehensive destination details
 * Aggregates flights, hotels, weather, and activities data
 */

import { getCheapestFlightOffer, searchAirports, resolveIataCode } from './amadeus';
import { getForecast } from '../controllers/weatherController';
import { searchHotels } from './hotels';
import { getDestinationImage } from './imageProvider';
import { geocodeAddress } from './nominatim';
import { searchPOIs } from './opentripmap';
import axios from 'axios';

// Comprehensive destination database with details
const destinationDatabase: Record<string, any> = {
  'france': {
    country: 'France',
    capital: 'Paris',
    description: 'Experience the romance and elegance of Paris, the cultural heart of Europe. From iconic landmarks to world-class museums, France offers unforgettable experiences.',
    highlights: [
      'Eiffel Tower',
      'Louvre Museum',
      'Notre-Dame Cathedral',
      'Musée d\'Orsay',
      'Seine River Cruise',
      'Versailles Palace',
    ],
    bestMonths: [4, 5, 9, 10],
    currency: 'EUR (€)',
    language: 'French',
    timezone: 'CET (UTC+1)',
  },
  'spain': {
    country: 'Spain',
    capital: 'Madrid',
    description: 'Discover the vibrant culture and passionate spirit of Spain. From sun-soaked beaches to historic cities, Spain captivates every visitor.',
    highlights: [
      'Sagrada Famílía',
      'Park Güell',
      'Flamenco Shows',
      'Alhambra Palace',
      'Costa Brava Beaches',
      'Prado Museum',
    ],
    bestMonths: [4, 5, 9, 10],
    currency: 'EUR (€)',
    language: 'Spanish',
    timezone: 'CET (UTC+1)',
  },
  'italy': {
    country: 'Italy',
    capital: 'Rome',
    description: 'Immerse yourself in the art, history, and delicious cuisine of Italy. Every corner tells a story of ancient Roman civilization.',
    highlights: [
      'Colosseum',
      'Vatican Museums',
      'Roman Forum',
      'Trevi Fountain',
      'Gondola Rides in Venice',
      'Sistine Chapel',
    ],
    bestMonths: [4, 5, 9, 10],
    currency: 'EUR (€)',
    language: 'Italian',
    timezone: 'CET (UTC+1)',
  },
  'japan': {
    country: 'Japan',
    capital: 'Tokyo',
    description: 'Experience the perfect blend of ancient traditions and cutting-edge technology in Japan. A destination like no other.',
    highlights: [
      'Tokyo Tower',
      'Senso-ji Temple',
      'Mount Fuji',
      'Shibuya Crossing',
      'Cherry Blossom Viewing',
      'Hiroshima Peace Memorial',
    ],
    bestMonths: [3, 4, 10, 11],
    currency: 'JPY (¥)',
    language: 'Japanese',
    timezone: 'JST (UTC+9)',
  },
  'thailand': {
    country: 'Thailand',
    capital: 'Bangkok',
    description: 'Feel the energy of Bangkok and the serenity of Thailand\'s beaches and islands. A tropical paradise awaits.',
    highlights: [
      'Grand Palace',
      'Temple of the Emerald Buddha',
      'Floating Markets',
      'Phi Phi Islands',
      'Phuket Beaches',
      'Thai Cooking Classes',
    ],
    bestMonths: [11, 12, 1, 2],
    currency: 'THB (฿)',
    language: 'Thai',
    timezone: 'ICT (UTC+7)',
  },
  'mexico': {
    country: 'Mexico',
    capital: 'Mexico City',
    description: 'Explore Mexico\'s rich heritage, vibrant culture, and stunning natural wonders. From ancient ruins to modern marvels.',
    highlights: [
      'Machu Picchu',
      'Cancún Beaches',
      'Playa del Carmen',
      'Cenotes',
      'Frida Kahlo Museum',
      'Día de Muertos Celebrations',
    ],
    bestMonths: [3, 4, 11, 12],
    currency: 'MXN (₱)',
    language: 'Spanish',
    timezone: 'CST (UTC-6)',
  },
  'australia': {
    country: 'Australia',
    capital: 'Sydney',
    description: 'Discover the land down under with world-famous landmarks, stunning beaches, and unique wildlife.',
    highlights: [
      'Sydney Opera House',
      'Great Barrier Reef',
      'Uluru (Ayers Rock)',
      'Bondi Beach',
      'Blue Mountains',
      'Taronga Zoo',
    ],
    bestMonths: [9, 10, 11, 4],
    currency: 'AUD (A$)',
    language: 'English',
    timezone: 'AEST (UTC+10)',
  },
  'germany': {
    country: 'Germany',
    capital: 'Berlin',
    description: 'Experience the historical landmarks, exceptional beer gardens, and modern culture of Germany.',
    highlights: [
      'Brandenburg Gate',
      'Berlin Wall Memorial',
      'Neuschwanstein Castle',
      'Marienplatz',
      'Rhine Valley',
      'Oktoberfest',
    ],
    bestMonths: [5, 6, 9, 10],
    currency: 'EUR (€)',
    language: 'German',
    timezone: 'CET (UTC+1)',
  },
  'canada': {
    country: 'Canada',
    capital: 'Toronto',
    description: 'Discover the natural beauty and cosmopolitan charm of Canada. From Niagara Falls to the Rocky Mountains, experience vast landscapes and vibrant cities.',
    highlights: [
      'Niagara Falls',
      'Rocky Mountains',
      'CN Tower',
      'Banff National Park',
      'Lake Louise',
      'Whistler Blackcomb',
    ],
    bestMonths: [5, 6, 7, 8, 9],
    currency: 'CAD (C$)',
    language: 'English & French',
    timezone: 'EST (UTC-5)',
  },
  'usa': {
    country: 'United States',
    capital: 'New York',
    description: 'Experience the diversity and energy of the United States. From bustling cities to stunning national parks.',
    highlights: [
      'Statue of Liberty',
      'Grand Canyon',
      'Golden Gate Bridge',
      'Times Square',
      'Hollywood Sign',
      'Las Vegas',
    ],
    bestMonths: [5, 6, 9, 10],
    currency: 'USD ($)',
    language: 'English',
    timezone: 'EST (UTC-5)',
  },
  'uk': {
    country: 'United Kingdom',
    capital: 'London',
    description: 'Explore the rich history, culture, and charm of the United Kingdom. From royal palaces to picturesque villages.',
    highlights: [
      'Big Ben',
      'Tower of London',
      'Buckingham Palace',
      'Westminster Abbey',
      'British Museum',
      'Tower Bridge',
    ],
    bestMonths: [5, 6, 7, 8, 9],
    currency: 'GBP (£)',
    language: 'English',
    timezone: 'GMT (UTC+0)',
  },
};

/**
 * Fetch currency information from REST Countries API
 */
async function fetchCurrencyFromAPI(countryName: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`, {
      timeout: 5000,
    });
    
    if (response.data && response.data[0] && response.data[0].currencies) {
      const currencies = response.data[0].currencies;
      const currencyCode = Object.keys(currencies)[0];
      const currencyData = currencies[currencyCode];
      return `${currencyCode} (${currencyData.symbol})`;
    }
  } catch (error) {
    console.log(`Could not fetch currency from API for ${countryName}`);
  }
  return null;
}

/**
 * Get comprehensive destination details by country/city name
 */
export async function getDestinationDetailsByName(countryOrCity: string): Promise<any> {
  const key = countryOrCity.toLowerCase().trim();
  
  // Search for exact match first
  for (const [destKey, destData] of Object.entries(destinationDatabase)) {
    if (destKey.includes(key) || key.includes(destKey)) {
      return destData;
    }
  }
  
  // If not found, try to fetch currency from REST Countries API
  let currency = 'USD ($)'; // Default fallback
  try {
    const apiCurrency = await fetchCurrencyFromAPI(countryOrCity);
    if (apiCurrency) {
      currency = apiCurrency;
    }
  } catch (error) {
    console.log(`Error fetching currency data: ${error}`);
  }
  
  return {
    country: countryOrCity,
    capital: countryOrCity,
    description: `Explore the unique culture and attractions of ${countryOrCity}.`,
    highlights: [
      'Local Markets',
      'Historical Landmarks',
      'Cultural Museums',
      'Traditional Cuisine',
      'Natural Attractions',
      'Local Experiences',
    ],
    bestMonths: [3, 4, 5, 9, 10],
    currency: currency,
    language: 'English',
    timezone: 'UTC',
  };
}

/**
 * Generate weather forecast for a destination starting from a specific date
 */
export function generateWeatherForecast(days: number, startDate?: string): any[] {
  const forecast = [];
  const baseDate = startDate ? new Date(startDate) : new Date();
  const weatherPatterns = [
    { description: '☀️ Sunny', minTemp: 22, maxTemp: 28 },
    { description: '⛅ Partly Cloudy', minTemp: 19, maxTemp: 25 },
    { description: '🌤️ Mostly Clear', minTemp: 20, maxTemp: 26 },
    { description: '🌦️ Scattered Clouds', minTemp: 18, maxTemp: 24 },
    { description: '⛈️ Thunderstorms', minTemp: 16, maxTemp: 22 },
    { description: '🌧️ Rainy', minTemp: 15, maxTemp: 20 },
  ];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const pattern = weatherPatterns[Math.floor(Math.random() * weatherPatterns.length)];
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      description: pattern.description,
      minTemp: pattern.minTemp,
      maxTemp: pattern.maxTemp,
    });
  }
  
  return forecast;
}

/**
 * Calculate days between two dates
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get comprehensive destination search results with AI-powered activities
 */
export async function searchDestinationComprehensive(
  country: string,
  departureAirport: string,
  departureDate: string,
  returnDate: string,
  budget: string = 'moderate',
  interests: string[] = [],
  preferredCurrency: string = 'USD'
): Promise<any> {
  try {
    const normalizedCurrency = (preferredCurrency || 'USD').toUpperCase();
    console.log('💰 [DEST-COMPREHENSIVE] Using currency:', normalizedCurrency);
    // Get destination details
    const destinationDetails = await getDestinationDetailsByName(country);
    
    // Calculate number of days for weather forecast
    const tripDays = calculateDays(departureDate, returnDate);
    
    // Fetch real data for the specific city (not country-wide)
    const cityName = destinationDetails.capital;
    
    // Resolve departure airport IATA code if needed
    let departureIataCode = departureAirport;
    if (departureAirport.length > 3) {
      // If it's a city name like "NYC", try to resolve it to IATA code
      try {
        const airports = await searchAirports(departureAirport);
        if (airports && airports.length > 0) {
          departureIataCode = airports[0].iataCode;
        }
      } catch (error) {
        console.log(`Could not resolve departure airport ${departureAirport}, using as-is`);
      }
    }
    
    // Resolve destination IATA code first
    let destinationIata: string | null = null;
    try {
      destinationIata = await resolveIataCode(cityName);
    } catch (error) {
      console.error(`Could not resolve IATA for ${cityName}:`, error);
    }
    
    // Fetch real flight data using Amadeus API
    let flightData = null;
    try {
      console.log('✈️  [DEST-FLIGHT] Requesting flight with currency:', normalizedCurrency);
      const flightResult = await getCheapestFlightOffer(
        departureIataCode,
        cityName, // Search for flights to the specific city
        departureDate,
        returnDate,
        normalizedCurrency
      );
      console.log('✈️  [DEST-FLIGHT] Received flight data:', flightResult ? `${flightResult.currency} ${flightResult.price}` : 'null');
      if (flightResult) {
        flightData = {
          origin: flightResult.origin,
          destination: flightResult.destination,
          departureDate: flightResult.departureDate,
          returnDate: flightResult.returnDate,
          price: flightResult.price,
          currency: flightResult.currency,
        };
      }
    } catch (error) {
      console.error(`Error fetching flights for ${cityName}:`, error);
      // Fall back to mock data if API fails
      flightData = generateFlightData(departureIataCode, destinationIata || cityName, departureDate, returnDate, normalizedCurrency);
    }
    
    // Fetch real hotel data using Xotelo API
    let hotelData = null;
    try {
      const hotelResults = await searchHotels({
        location: cityName, // Search hotels in the specific city
        checkInDate: departureDate,
        checkOutDate: returnDate,
        currency: normalizedCurrency,
      });
      if (hotelResults && hotelResults.length > 0) {
        // Use the first (best rated/cheapest) hotel
        hotelData = hotelResults[0];
      }
    } catch (error) {
      console.error(`Error fetching hotels for ${cityName}:`, error);
      // Fall back to mock data if API fails
      hotelData = generateHotelData(cityName);
    }
    
    // Generate weather forecast for the entire trip duration
    const weatherForecast = generateWeatherForecast(tripDays, departureDate);
    
    // Get AI-powered activities based on user interests
    let activities = destinationDetails.highlights; // Default fallback
    let detailedDescription = destinationDetails.description;
    
    if (interests && interests.length > 0) {
      try {
        const aiActivities = await getAIActivitiesForDestination(
          cityName,
          destinationDetails.country,
          interests,
          budget,
          departureDate
        );
        
        if (aiActivities && aiActivities.activities) {
          activities = aiActivities.activities;
        }
        if (aiActivities && aiActivities.description) {
          detailedDescription = aiActivities.description;
        }
      } catch (error) {
        console.error(`Error fetching AI activities for ${cityName}:`, error);
        // Fall back to default highlights if AI fails
      }
    }
    
    // Fetch destination image for the specific city
    let imageUrl = null;
    try {
      const imageResult = await getDestinationImage(cityName);
      if (imageResult && imageResult.url) {
        imageUrl = imageResult.url;
      }
    } catch (error) {
      console.error(`Error fetching image for ${cityName}:`, error);
    }
    
    // Fetch city highlights/POIs from OpenTripMap
    let cityHighlights: any[] = [];
    try {
      const geoLocation = await geocodeAddress(cityName);
      if (geoLocation) {
        const poisResult = await searchPOIs(
          geoLocation.latitude,
          geoLocation.longitude,
          5000, // 5km radius
          'interesting_places,tourist_facilities,cultural,historic,architecture,museums',
          12 // Get 12 highlights
        );
        
        if (poisResult && poisResult.pois.length > 0) {
          cityHighlights = poisResult.pois.map(poi => ({
            name: poi.name,
            type: poi.kind,
            description: poi.description || `Visit ${poi.name} in ${cityName}`,
            rating: poi.rating,
            wikiUrl: poi.wikiurl,
            coordinates: {
              latitude: poi.latitude,
              longitude: poi.longitude,
            }
          }));
        }
      }
    } catch (error) {
      console.error(`Error fetching POIs for ${cityName}:`, error);
      // Continue without POIs - not critical
    }
    
    // Generate events happening during travel dates
    const events = generateDestinationEvents(cityName, departureDate, returnDate);
    
    return {
      destination: {
        ...destinationDetails,
        description: detailedDescription,
        imageUrl: imageUrl,
      },
      flight: flightData || generateFlightData(departureIataCode, destinationIata || cityName, departureDate, returnDate, normalizedCurrency),
      weather: weatherForecast,
      hotel: hotelData || generateHotelData(cityName, normalizedCurrency),
      activities: activities,
      highlights: cityHighlights, // New field with real POI data
      events: events, // New field with destination events
    };
  } catch (error) {
    console.error('Error searching destination:', error);
    throw error;
  }
}

/**
 * Generate mock flight data
 */
function generateFlightData(origin: string, destination: string, departureDate: string, returnDate: string, currency: string = 'USD'): any {
  const prices = [450, 520, 580, 650, 720, 850];
  const price = prices[Math.floor(Math.random() * prices.length)];
  
  return {
    origin,
    destination,
    departureDate,
    returnDate,
    price: Math.round(price),
    currency: (currency || 'USD').toUpperCase(),
    duration: '12h 30m',
    stops: Math.floor(Math.random() * 2), // 0-1 stops
    airline: ['United', 'American', 'Delta', 'Air France', 'Lufthansa'][Math.floor(Math.random() * 5)],
  };
}

/**
 * Generate mock hotel data
 */
function generateHotelData(city: string, currency: string = 'USD'): any {
  const hotels = [
    { name: `Luxury Plaza ${city}`, rating: 4.8, reviewCount: 2345, pricePerNight: 280 },
    { name: `Comfort Inn ${city}`, rating: 4.2, reviewCount: 1200, pricePerNight: 120 },
    { name: `Budget Hotel ${city}`, rating: 3.9, reviewCount: 856, pricePerNight: 65 },
    { name: `Modern Suites ${city}`, rating: 4.6, reviewCount: 1890, pricePerNight: 180 },
    { name: `Historic ${city} Hotel`, rating: 4.4, reviewCount: 1456, pricePerNight: 150 },
  ];
  
  const hotel = hotels[Math.floor(Math.random() * hotels.length)];
  
  return {
    ...hotel,
    location: city,
    currency: (currency || 'USD').toUpperCase(),
    amenities: [
      'Free WiFi',
      'Swimming Pool',
      'Restaurant',
      'Fitness Center',
      'Room Service',
    ],
  };
}

/**
 * Get AI-powered activities and description for a destination
 */
async function getAIActivitiesForDestination(
  city: string,
  country: string,
  interests: string[],
  budget: string,
  travelDate: string
): Promise<{ activities: string[], description: string } | null> {
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_PROVIDER = (process.env.AI_PROVIDER || 'google').toLowerCase();
  const AI_MODEL = process.env.AI_MODEL || (AI_PROVIDER === 'google' ? 'gemini-1.5-flash' : 'gpt-4o-mini');
  
  if (!AI_API_KEY) {
    console.log('AI_API_KEY not configured, using default activities');
    return null;
  }
  
  try {
    const travelMonth = new Date(travelDate).getMonth() + 1; // 1-12
    const interestList = interests.join(', ');
    
    let url: string;
    let headers: Record<string, string>;
    let body: any;
    
    const prompt = `You are a travel expert. Provide personalized recommendations for ${city}, ${country}.

Travel details:
- Month: ${travelMonth}
- Budget: ${budget}
- Interests: ${interestList}

Return ONLY valid JSON matching exactly this schema:
{
  "description": "A detailed 2-3 paragraph description of what travelers can do in this city, tailored to their interests and budget",
  "activities": ["activity 1", "activity 2", ...]
}

Provide 8-12 specific activities that match the traveler's interests. Be specific to ${city} and the travel month.
Activities should be budget-appropriate (${budget}) and aligned with interests (${interestList}).
Do NOT include line breaks inside string values.`;

    if (AI_PROVIDER === 'google') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${AI_API_KEY}`;
      headers = {
        'Content-Type': 'application/json',
      };
      body = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: 'application/json',
        },
      };
    } else {
      // OpenAI or Azure
      url = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      };
      body = {
        model: AI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: 'You are a travel expert. Respond ONLY with valid JSON matching the schema: {"description": string, "activities": string[]}',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`AI API error: ${response.status}`);
      return null;
    }
    
    const data: any = await response.json();
    let content: string;
    
    if (AI_PROVIDER === 'google') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else {
      content = data.choices?.[0]?.message?.content || '{}';
    }
    
    const parsed = JSON.parse(content);
    
    return {
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      description: typeof parsed.description === 'string' ? parsed.description : '',
    };
  } catch (error) {
    console.error('Error getting AI activities:', error);
    return null;
  }
}

/**
 * Generate events happening during travel dates in a destination
 */
function generateDestinationEvents(cityName: string, startDate: string, endDate: string): any[] {
  type EventTemplate = {
    name: string;
    type: string;
    month: number;
    preferredDay: number;
    description: string;
    location: string;
    time: string;
  };

  const eventDatabase: Record<string, EventTemplate[]> = {
    'paris': [
      { name: 'Paris Fashion Week', type: 'fashion', month: 3, preferredDay: 10, description: 'Premier fashion showcase', location: 'Grand Palais Éphémère', time: '18:30' },
      { name: 'Fête de la Musique', type: 'music', month: 6, preferredDay: 21, description: 'Summer music festival', location: 'Place de la République', time: '19:00' },
      { name: 'Paris International Agricultural Show', type: 'expo', month: 3, preferredDay: 2, description: 'Agricultural exhibition', location: 'Paris Expo Porte de Versailles', time: '10:00' },
      { name: 'Art Paris Art Fair', type: 'art', month: 9, preferredDay: 15, description: 'Contemporary art fair', location: 'Grand Palais', time: '11:00' },
      { name: 'Nuit Blanche (White Night)', type: 'cultural', month: 10, preferredDay: 5, description: 'All-night art event', location: 'Seine River District', time: '20:00' },
      { name: 'Louvre Night Opening', type: 'culture', month: 5, preferredDay: 18, description: 'Extended museum hours', location: 'Louvre Museum', time: '19:30' },
    ],
    'london': [
      { name: 'Chelsea Flower Show', type: 'garden', month: 5, preferredDay: 22, description: 'Royal horticultural event', location: 'Royal Hospital Chelsea', time: '09:00' },
      { name: 'Notting Hill Carnival', type: 'festival', month: 8, preferredDay: 26, description: 'Caribbean cultural festival', location: 'Notting Hill', time: '12:00' },
      { name: 'Trooping the Colour', type: 'cultural', month: 6, preferredDay: 15, description: 'Royal birthday parade', location: 'Horse Guards Parade', time: '10:30' },
      { name: 'London Fashion Week', type: 'fashion', month: 2, preferredDay: 20, description: 'Fashion showcase', location: 'Somerset House', time: '17:00' },
      { name: 'Ascot Racing Festival', type: 'sports', month: 6, preferredDay: 20, description: 'Royal horse racing', location: 'Ascot Racecourse', time: '13:00' },
      { name: 'Summer concerts at Hyde Park', type: 'music', month: 7, preferredDay: 12, description: 'Open-air music festival', location: 'Hyde Park', time: '18:00' },
    ],
    'tokyo': [
      { name: 'Cherry Blossom Festival', type: 'nature', month: 3, preferredDay: 28, description: 'Hanami season', location: 'Ueno Park', time: '11:00' },
      { name: 'Sumida River Fireworks', type: 'festival', month: 7, preferredDay: 27, description: 'Summer fireworks', location: 'Sumida River', time: '19:30' },
      { name: 'Tokyo Marathon', type: 'sports', month: 3, preferredDay: 3, description: 'International marathon event', location: 'Tokyo Metropolitan Government Building', time: '09:10' },
      { name: 'Tanabata Festival', type: 'cultural', month: 7, preferredDay: 7, description: 'Star festival celebration', location: 'Asakusa', time: '17:30' },
      { name: 'Roppongi Art Night', type: 'art', month: 4, preferredDay: 20, description: 'Contemporary art exhibition', location: 'Roppongi Hills', time: '18:00' },
      { name: 'Shibuya Crossing Festival', type: 'cultural', month: 10, preferredDay: 14, description: 'Street culture festival', location: 'Shibuya Crossing', time: '16:00' },
    ],
    'barcelona': [
      { name: 'La Mercè Festival', type: 'festival', month: 9, preferredDay: 24, description: 'Major cultural festival', location: 'Plaça de Catalunya', time: '18:30' },
      { name: 'Sónar Festival', type: 'music', month: 6, preferredDay: 14, description: 'Electronic music festival', location: 'Fira Montjuïc', time: '20:00' },
      { name: 'Barcelona Marathon', type: 'sports', month: 3, preferredDay: 17, description: 'International marathon', location: 'Passeig de Gràcia', time: '08:30' },
      { name: 'Festa Major de Gràcia', type: 'festival', month: 8, preferredDay: 17, description: 'Neighborhood street festival', location: 'Gràcia District', time: '19:00' },
      { name: 'Brunch Rock Festival', type: 'music', month: 4, preferredDay: 13, description: 'Indie rock music festival', location: 'Poble Espanyol', time: '15:00' },
      { name: 'Nit de Llum', type: 'art', month: 10, preferredDay: 10, description: 'Light art installations', location: 'Barri Gòtic', time: '21:00' },
    ],
    'new york': [
      { name: 'New York Fashion Week', type: 'fashion', month: 2, preferredDay: 11, description: 'Fashion industry showcase', location: 'Spring Studios', time: '17:30' },
      { name: 'Tribeca Film Festival', type: 'film', month: 4, preferredDay: 20, description: 'Independent film festival', location: 'Tribeca', time: '18:00' },
      { name: 'New York Marathon', type: 'sports', month: 11, preferredDay: 3, description: 'Major marathon race', location: 'Staten Island to Central Park', time: '09:00' },
      { name: 'Times Square New Year\'s Eve', type: 'cultural', month: 12, preferredDay: 31, description: 'New Year celebration', location: 'Times Square', time: '23:00' },
      { name: 'Art Week NYC', type: 'art', month: 12, preferredDay: 5, description: 'Contemporary art fair', location: 'Chelsea Galleries', time: '12:00' },
      { name: 'Central Park SummerStage', type: 'music', month: 6, preferredDay: 25, description: 'Free outdoor concerts', location: 'Central Park', time: '19:00' },
    ],
    'dubai': [
      { name: 'Dubai World Cup', type: 'sports', month: 3, preferredDay: 30, description: 'World-class horse racing', location: 'Meydan Racecourse', time: '17:00' },
      { name: 'Dubai Shopping Festival', type: 'shopping', month: 1, preferredDay: 15, description: 'Shopping and entertainment', location: 'Dubai Festival City', time: '16:00' },
      { name: 'Dubai Food Festival', type: 'food', month: 2, preferredDay: 23, description: 'Culinary celebration', location: 'Jumeirah Beach Residence', time: '18:00' },
      { name: 'Gitex Global', type: 'tech', month: 10, preferredDay: 14, description: 'Technology expo', location: 'Dubai World Trade Centre', time: '10:00' },
      { name: 'Dubai Jazz Festival', type: 'music', month: 2, preferredDay: 10, description: 'International jazz music', location: 'Dubai Media City Amphitheatre', time: '20:00' },
      { name: 'UAE National Day', type: 'cultural', month: 12, preferredDay: 2, description: 'National celebration', location: 'Downtown Dubai', time: '19:00' },
    ],
  };

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const city = cityName.toLowerCase();
  const cityEvents = eventDatabase[city] || [];

  const getEventMainUrl = (eventName: string, cityLabel: string): string => {
    const eventUrlMap: Record<string, string> = {
      'Paris Fashion Week': 'https://www.fhcm.paris/en/paris-fashion-week',
      'Fête de la Musique': 'https://fetedelamusique.culture.gouv.fr/',
      'Paris International Agricultural Show': 'https://www.salon-agriculture.com/en/',
      'Art Paris Art Fair': 'https://www.artparis.com/en',
      'Nuit Blanche (White Night)': 'https://www.paris.fr/pages/nuit-blanche-2024-27989',
      'Louvre Night Opening': 'https://www.louvre.fr/en/visit/hours-admission',
      'Chelsea Flower Show': 'https://www.rhs.org.uk/shows-events/rhs-chelsea-flower-show',
      'Notting Hill Carnival': 'https://nhcarnival.org/',
      'Trooping the Colour': 'https://www.householddivision.org.uk/trooping-the-colour',
      'London Fashion Week': 'https://londonfashionweek.co.uk/',
      'Ascot Racing Festival': 'https://www.ascot.com/royal-ascot',
      'Summer concerts at Hyde Park': 'https://www.bst-hydepark.com/',
      'Cherry Blossom Festival': 'https://www.gotokyo.org/en/spot/ev004/index.html',
      'Sumida River Fireworks': 'https://www.gotokyo.org/en/spot/ev062/index.html',
      'Tokyo Marathon': 'https://www.marathon.tokyo/en/',
      'Tanabata Festival': 'https://www.gotokyo.org/en/spot/ev044/index.html',
      'Roppongi Art Night': 'https://www.roppongiartnight.com/',
      'Shibuya Crossing Festival': 'https://www.gotokyo.org/en/spot/56/index.html',
      'La Mercè Festival': 'https://www.barcelona.cat/lamerce/en',
      'Sónar Festival': 'https://sonar.es/en',
      'Barcelona Marathon': 'https://www.zurichmaratobarcelona.es/en/',
      'Festa Major de Gràcia': 'https://www.festamajordegracia.cat/en/',
      'Brunch Rock Festival': 'https://www.brunch-electronic.com/',
      'Nit de Llum': 'https://www.barcelona.cat/en/what-to-do-in-bcn',
      'New York Fashion Week': 'https://cfda.com/fashion-calendar',
      'Tribeca Film Festival': 'https://tribecafilm.com/festival',
      'New York Marathon': 'https://www.nyrr.org/tcsnycmarathon',
      "Times Square New Year's Eve": 'https://www.timessquarenyc.org/new-years-eve',
      'Art Week NYC': 'https://www.nycartweek.com/',
      'Central Park SummerStage': 'https://cityparksfoundation.org/summerstage/',
      'Dubai World Cup': 'https://www.dubairacingclub.com/',
      'Dubai Shopping Festival': 'https://www.visitdubai.com/en/whats-on/dubai-shopping-festival',
      'Dubai Food Festival': 'https://www.visitdubai.com/en/whats-on/dubai-food-festival',
      'Gitex Global': 'https://www.gitex.com/',
      'Dubai Jazz Festival': 'https://www.dubaijazzfest.com/',
      'UAE National Day': 'https://u.ae/en/about-the-uae/national-day',
    };

    const direct = eventUrlMap[eventName];
    if (direct) return direct;
    return `https://www.google.com/search?q=${encodeURIComponent(`${eventName} ${cityLabel} official tickets`)}`;
  };

  const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const pickInRangeDate = (preferredMonth: number, preferredDay: number): Date | null => {
    const candidates = [
      new Date(startDateObj.getFullYear(), preferredMonth - 1, preferredDay),
      new Date(endDateObj.getFullYear(), preferredMonth - 1, preferredDay),
      new Date(startDateObj.getFullYear() - 1, preferredMonth - 1, preferredDay),
      new Date(endDateObj.getFullYear() + 1, preferredMonth - 1, preferredDay),
    ];

    const valid = candidates.filter((candidate) => candidate >= startDateObj && candidate <= endDateObj);
    if (valid.length === 0) return null;

    valid.sort((a, b) => a.getTime() - b.getTime());
    return valid[0];
  };

  const scheduledEvents = cityEvents
    .map((event) => {
      const eventDate = pickInRangeDate(event.month, event.preferredDay);
      if (!eventDate) return null;
      return {
        name: event.name,
        type: event.type,
        description: event.description,
        date: toIsoDate(eventDate),
        time: event.time,
        location: event.location,
        url: getEventMainUrl(event.name, cityName),
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .slice(0, 6);

  if (scheduledEvents.length > 0) {
    return scheduledEvents;
  }

  const tripDays = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const genericTemplates = [
    { name: `${cityName} City Festival`, type: 'festival', description: 'Local cultural celebration', time: '18:00', location: `${cityName} Old Town Square` },
    { name: `${cityName} Art Exhibition`, type: 'art', description: 'Contemporary art showcase', time: '11:00', location: `${cityName} Contemporary Art Museum` },
    { name: `${cityName} Food Market`, type: 'food', description: 'Local street food market', time: '13:00', location: `${cityName} Central Market` },
    { name: `${cityName} Night Market`, type: 'shopping', description: 'Evening shopping and entertainment', time: '20:00', location: `${cityName} Night Bazaar District` },
    { name: `${cityName} Music Festival`, type: 'music', description: 'Live music performances', time: '19:30', location: `${cityName} Riverfront Stage` },
  ];

  return genericTemplates.slice(0, Math.min(5, tripDays)).map((template, index) => {
    const eventDate = new Date(startDateObj);
    const offset = Math.min(index * 2, Math.max(0, tripDays - 1));
    eventDate.setDate(startDateObj.getDate() + offset);
    return {
      ...template,
      date: toIsoDate(eventDate),
      url: `https://www.google.com/search?q=${encodeURIComponent(`${template.name} ${cityName} tickets`)}`,
    };
  });
}

