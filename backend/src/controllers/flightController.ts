import { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { getCheapestFlightOffer, searchAirports } from '../services/amadeus';

export const cheapestFlightsValidation = [
  body('origin').isString().notEmpty().withMessage('Origin is required'),
  body('departureDate').isISO8601().withMessage('Valid departureDate is required'),
  body('returnDate').isISO8601().withMessage('Valid returnDate is required'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('destinations').isArray({ min: 1 }).withMessage('Destinations are required'),
  body('destinations.*.country').optional().isString(),
  body('destinations.*.capital').optional().isString(),
];

export const airportSearchValidation = [
  query('keyword').isString().notEmpty().withMessage('Keyword is required'),
];

export const getCheapestFlights = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const { destinations } = req.body as {
      origin: string;
      departureDate: string;
      returnDate: string;
      currency?: string;
      destinations: { country?: string; capital?: string }[];
    };
    const { origin, departureDate, returnDate, currency } = req.body as {
      origin: string;
      departureDate: string;
      returnDate: string;
      currency?: string;
    };
    const selectedCurrency = (currency || 'USD').toUpperCase();
    console.log('✈️  [FLIGHTS-CHEAPEST] Received currency:', currency, '→ normalized:', selectedCurrency);

    const results = await Promise.all(
      destinations.map(async (dest) => {
        const keyword = dest.capital || dest.country || '';
        if (!keyword) {
          return {
            country: dest.country || 'Unknown',
            capital: dest.capital || 'Unknown',
            flight: null,
          };
        }

        try {
          const flight = await getCheapestFlightOffer(origin, keyword, departureDate, returnDate, selectedCurrency);
          return {
            country: dest.country || keyword,
            capital: dest.capital || keyword,
            flight,
          };
        } catch (error: any) {
          return {
            country: dest.country || keyword,
            capital: dest.capital || keyword,
            flight: null,
            error: error?.message || 'Failed to fetch flight',
          };
        }
      })
    );

    res.json({ origin, results });
  } catch (error) {
    console.error('Cheapest flights error:', error);
    res.status(500).json({ error: 'Server error fetching flights' });
  }
};

// Mock airport data for fallback
const getMockAirports = (keyword: string) => {
  const allAirports = [
    { iataCode: 'JFK', name: 'John F Kennedy International Airport', cityName: 'New York', countryName: 'United States' },
    { iataCode: 'LGA', name: 'LaGuardia Airport', cityName: 'New York', countryName: 'United States' },
    { iataCode: 'EWR', name: 'Newark Liberty International Airport', cityName: 'Newark', countryName: 'United States' },
    { iataCode: 'LAX', name: 'Los Angeles International Airport', cityName: 'Los Angeles', countryName: 'United States' },
    { iataCode: 'ORD', name: 'O\'Hare International Airport', cityName: 'Chicago', countryName: 'United States' },
    { iataCode: 'MIA', name: 'Miami International Airport', cityName: 'Miami', countryName: 'United States' },
    { iataCode: 'SFO', name: 'San Francisco International Airport', cityName: 'San Francisco', countryName: 'United States' },
    { iataCode: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', cityName: 'Atlanta', countryName: 'United States' },
    { iataCode: 'DFW', name: 'Dallas/Fort Worth International Airport', cityName: 'Dallas', countryName: 'United States' },
    { iataCode: 'SEA', name: 'Seattle-Tacoma International Airport', cityName: 'Seattle', countryName: 'United States' },
    { iataCode: 'BOS', name: 'Boston Logan International Airport', cityName: 'Boston', countryName: 'United States' },
    { iataCode: 'DEN', name: 'Denver International Airport', cityName: 'Denver', countryName: 'United States' },
    { iataCode: 'LAS', name: 'Harry Reid International Airport', cityName: 'Las Vegas', countryName: 'United States' },
    { iataCode: 'PHX', name: 'Phoenix Sky Harbor International Airport', cityName: 'Phoenix', countryName: 'United States' },
    { iataCode: 'IAH', name: 'George Bush Intercontinental Airport', cityName: 'Houston', countryName: 'United States' },
    { iataCode: 'LHR', name: 'Heathrow Airport', cityName: 'London', countryName: 'United Kingdom' },
    { iataCode: 'LGW', name: 'Gatwick Airport', cityName: 'London', countryName: 'United Kingdom' },
    { iataCode: 'MAN', name: 'Manchester Airport', cityName: 'Manchester', countryName: 'United Kingdom' },
    { iataCode: 'EDI', name: 'Edinburgh Airport', cityName: 'Edinburgh', countryName: 'United Kingdom' },
    { iataCode: 'DUB', name: 'Dublin Airport', cityName: 'Dublin', countryName: 'Ireland' },
    { iataCode: 'CDG', name: 'Charles de Gaulle Airport', cityName: 'Paris', countryName: 'France' },
    { iataCode: 'ORY', name: 'Orly Airport', cityName: 'Paris', countryName: 'France' },
    { iataCode: 'FCO', name: 'Leonardo da Vinci-Fiumicino Airport', cityName: 'Rome', countryName: 'Italy' },
    { iataCode: 'MXP', name: 'Milan Malpensa Airport', cityName: 'Milan', countryName: 'Italy' },
    { iataCode: 'VCE', name: 'Venice Marco Polo Airport', cityName: 'Venice', countryName: 'Italy' },
    { iataCode: 'MAD', name: 'Adolfo Suárez Madrid-Barajas Airport', cityName: 'Madrid', countryName: 'Spain' },
    { iataCode: 'BCN', name: 'Barcelona-El Prat Airport', cityName: 'Barcelona', countryName: 'Spain' },
    { iataCode: 'AMS', name: 'Amsterdam Airport Schiphol', cityName: 'Amsterdam', countryName: 'Netherlands' },
    { iataCode: 'FRA', name: 'Frankfurt Airport', cityName: 'Frankfurt', countryName: 'Germany' },
    { iataCode: 'MUC', name: 'Munich Airport', cityName: 'Munich', countryName: 'Germany' },
    { iataCode: 'BER', name: 'Berlin Brandenburg Airport', cityName: 'Berlin', countryName: 'Germany' },
    { iataCode: 'VIE', name: 'Vienna International Airport', cityName: 'Vienna', countryName: 'Austria' },
    { iataCode: 'ZRH', name: 'Zurich Airport', cityName: 'Zurich', countryName: 'Switzerland' },
    { iataCode: 'GVA', name: 'Geneva Airport', cityName: 'Geneva', countryName: 'Switzerland' },
    { iataCode: 'CPH', name: 'Copenhagen Airport', cityName: 'Copenhagen', countryName: 'Denmark' },
    { iataCode: 'ARN', name: 'Stockholm Arlanda Airport', cityName: 'Stockholm', countryName: 'Sweden' },
    { iataCode: 'OSL', name: 'Oslo Airport', cityName: 'Oslo', countryName: 'Norway' },
    { iataCode: 'HEL', name: 'Helsinki-Vantaa Airport', cityName: 'Helsinki', countryName: 'Finland' },
    { iataCode: 'LIS', name: 'Lisbon Airport', cityName: 'Lisbon', countryName: 'Portugal' },
    { iataCode: 'ATH', name: 'Athens International Airport', cityName: 'Athens', countryName: 'Greece' },
    { iataCode: 'IST', name: 'Istanbul Airport', cityName: 'Istanbul', countryName: 'Turkey' },
    { iataCode: 'DXB', name: 'Dubai International Airport', cityName: 'Dubai', countryName: 'United Arab Emirates' },
    { iataCode: 'DOH', name: 'Hamad International Airport', cityName: 'Doha', countryName: 'Qatar' },
    { iataCode: 'HND', name: 'Tokyo Haneda Airport', cityName: 'Tokyo', countryName: 'Japan' },
    { iataCode: 'NRT', name: 'Narita International Airport', cityName: 'Tokyo', countryName: 'Japan' },
    { iataCode: 'KIX', name: 'Kansai International Airport', cityName: 'Osaka', countryName: 'Japan' },
    { iataCode: 'SIN', name: 'Singapore Changi Airport', cityName: 'Singapore', countryName: 'Singapore' },
    { iataCode: 'ICN', name: 'Incheon International Airport', cityName: 'Seoul', countryName: 'South Korea' },
    { iataCode: 'HKG', name: 'Hong Kong International Airport', cityName: 'Hong Kong', countryName: 'Hong Kong' },
    { iataCode: 'PEK', name: 'Beijing Capital International Airport', cityName: 'Beijing', countryName: 'China' },
    { iataCode: 'PVG', name: 'Shanghai Pudong International Airport', cityName: 'Shanghai', countryName: 'China' },
    { iataCode: 'BKK', name: 'Suvarnabhumi Airport', cityName: 'Bangkok', countryName: 'Thailand' },
    { iataCode: 'KUL', name: 'Kuala Lumpur International Airport', cityName: 'Kuala Lumpur', countryName: 'Malaysia' },
    { iataCode: 'CGK', name: 'Soekarno-Hatta International Airport', cityName: 'Jakarta', countryName: 'Indonesia' },
    { iataCode: 'DEL', name: 'Indira Gandhi International Airport', cityName: 'New Delhi', countryName: 'India' },
    { iataCode: 'BOM', name: 'Chhatrapati Shivaji International Airport', cityName: 'Mumbai', countryName: 'India' },
    { iataCode: 'SYD', name: 'Sydney Airport', cityName: 'Sydney', countryName: 'Australia' },
    { iataCode: 'MEL', name: 'Melbourne Airport', cityName: 'Melbourne', countryName: 'Australia' },
    { iataCode: 'AKL', name: 'Auckland Airport', cityName: 'Auckland', countryName: 'New Zealand' },
    { iataCode: 'YYZ', name: 'Toronto Pearson International Airport', cityName: 'Toronto', countryName: 'Canada' },
    { iataCode: 'YVR', name: 'Vancouver International Airport', cityName: 'Vancouver', countryName: 'Canada' },
    { iataCode: 'YUL', name: 'Montreal-Pierre Elliott Trudeau International Airport', cityName: 'Montreal', countryName: 'Canada' },
    { iataCode: 'MEX', name: 'Mexico City International Airport', cityName: 'Mexico City', countryName: 'Mexico' },
    { iataCode: 'GRU', name: 'São Paulo-Guarulhos International Airport', cityName: 'São Paulo', countryName: 'Brazil' },
    { iataCode: 'GIG', name: 'Rio de Janeiro-Galeão International Airport', cityName: 'Rio de Janeiro', countryName: 'Brazil' },
    { iataCode: 'EZE', name: 'Ministro Pistarini International Airport', cityName: 'Buenos Aires', countryName: 'Argentina' },
    { iataCode: 'BOG', name: 'El Dorado International Airport', cityName: 'Bogotá', countryName: 'Colombia' },
    { iataCode: 'LIM', name: 'Jorge Chávez International Airport', cityName: 'Lima', countryName: 'Peru' },
    { iataCode: 'SCL', name: 'Arturo Merino Benítez International Airport', cityName: 'Santiago', countryName: 'Chile' },
    { iataCode: 'JNB', name: 'O.R. Tambo International Airport', cityName: 'Johannesburg', countryName: 'South Africa' },
    { iataCode: 'CPT', name: 'Cape Town International Airport', cityName: 'Cape Town', countryName: 'South Africa' },
    { iataCode: 'CAI', name: 'Cairo International Airport', cityName: 'Cairo', countryName: 'Egypt' },
  ];

  const lowerKeyword = keyword.toLowerCase();
  return allAirports.filter(airport => 
    airport.cityName.toLowerCase().includes(lowerKeyword) ||
    airport.name.toLowerCase().includes(lowerKeyword) ||
    airport.iataCode.toLowerCase().includes(lowerKeyword) ||
    airport.countryName.toLowerCase().includes(lowerKeyword)
  ).slice(0, 20);
};

export const searchAirportsHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const keyword = req.query.keyword as string;
    
    try {
      const results = await searchAirports(keyword, 20);
      res.json({ results });
    } catch (apiError) {
      // If Amadeus API fails, use mock data as fallback
      console.log('Amadeus API failed, using mock airport data');
      const mockResults = getMockAirports(keyword);
      res.json({ results: mockResults });
    }
  } catch (error) {
    console.error('Airport search error:', error);
    res.status(500).json({ error: 'Server error searching airports' });
  }
};

export default {
  getCheapestFlights,
  cheapestFlightsValidation,
  searchAirportsHandler,
  airportSearchValidation,
};
