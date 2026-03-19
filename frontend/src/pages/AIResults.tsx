import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchFilters from '../components/SearchFilters';
import { aiAPI, destinationAPI, flightsAPI, weatherAPI, hotelsAPI, aiFavoritesAPI } from '../services/api';

interface Recommendation {
  rank: number;
  country: string;
  capital: string;
  bestMonths: number[];
  matchScore: number;
  highlights: string[];
  activities: string[];
  estimatedBudget: string;
  whyMatch: string;
}

interface AirportOption {
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

interface FlightInfo {
  price: string;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
}

interface WeatherDay {
  date: string;
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
  description: string;
  precipitation: number;
}

interface ForecastMeta {
  cityLabel: string;
}

interface HotelInfo {
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

const getWeatherIcon = (description: string) => {
  const d = description.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('rain') || d.includes('shower')) return '🌧️';
  if (d.includes('fog') || d.includes('mist')) return '🌫️';
  if (d.includes('cloud')) return '☁️';
  return '☀️';
};

const buildGoogleFlightsUrl = (flight: FlightInfo) => {
  // Google Flights URL format: #flt=ORIGIN.DESTINATION.DEPARTURE_DATE*DESTINATION.ORIGIN.RETURN_DATE
  // Dates should be in YYYY-MM-DD format
  return `https://www.google.com/travel/flights?hl=en#flt=${flight.origin}.${flight.destination}.${flight.departureDate}*${flight.destination}.${flight.origin}.${flight.returnDate}`;
};

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const buildAIFavoriteKey = (rec: Recommendation, criteria: any) => {
  const interests = Array.isArray(criteria?.interests)
    ? criteria.interests.slice().sort().join(',')
    : '';
  const originIata = criteria?.selectedOrigin?.iataCode || criteria?.originIata || '';
  return [
    (rec.country || '').toLowerCase().trim(),
    (rec.capital || '').toLowerCase().trim(),
    (criteria?.departureDate || '').toLowerCase().trim(),
    (criteria?.returnDate || '').toLowerCase().trim(),
    (criteria?.budget || '').toLowerCase().trim(),
    (criteria?.currency || '').toLowerCase().trim(),
    interests.toLowerCase().trim(),
    (originIata || '').toLowerCase().trim(),
  ].join('|');
};

// Cache for country images to avoid repeated API calls
const imageCache: Record<string, string> = {};

const getCountryImage = async (countryName: string): Promise<string> => {
  if (!countryName) {
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop';
  }

  // Check cache first
  if (imageCache[countryName]) {
    return imageCache[countryName];
  }

  try {
    const response = await destinationAPI.getImage(countryName);
    const imageUrl = response.data?.image?.url;
    if (imageUrl) {
      imageCache[countryName] = imageUrl;
      return imageUrl;
    }
  } catch (error) {
    console.warn(`Failed to fetch image for ${countryName}:`, error);
  }

  // Fallback generic travel image
  const fallbackUrl =
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop';
  imageCache[countryName] = fallbackUrl;
  return fallbackUrl;
};

interface CountryCardProps {
  rec: Recommendation;
  idx: number;
  expandedCard: number | null;
  setExpandedCard: (idx: number | null) => void;
  isFavorite: boolean;
  onToggleFavorite: (rec: Recommendation) => void;
  flight?: FlightInfo | null;
  flightsLoading?: boolean;
  forecast?: WeatherDay[];
  forecastLoading?: boolean;
}

const CountryCard: React.FC<CountryCardProps> = ({
  rec,
  idx,
  expandedCard,
  setExpandedCard,
  isFavorite,
  onToggleFavorite,
  flight,
  flightsLoading,
  forecast,
  forecastLoading,
}) => {
  const [cardImage, setCardImage] = useState<string>(
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop'
  );

  useEffect(() => {
    const loadImage = async () => {
      const imageUrl = await getCountryImage(rec.country);
      setCardImage(imageUrl);
    };
    loadImage();
  }, [rec.country]);

  return (
    <div
      key={idx}
      className="card"
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: `url('${cardImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(122, 167, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      {/* Dark overlay for better text readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(11, 16, 32, 0.4), rgba(11, 16, 32, 0.95))',
          zIndex: 1,
        }}
      />

      {/* Rank Badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, rgba(122, 167, 255, 0.8), rgba(109, 240, 194, 0.8))`,
          border: '2px solid rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          zIndex: 10,
          color: '#0b1020',
        }}
      >
        #{rec.rank}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(rec);
        }}
        aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          background: isFavorite
            ? 'linear-gradient(135deg, rgba(255, 99, 132, 0.9), rgba(255, 159, 64, 0.9))'
            : 'rgba(0, 0, 0, 0.35)',
          color: '#fff',
          fontSize: '18px',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>

      {/* Header - positioned at bottom */}
      <div style={{ padding: '20px', paddingBottom: '16px', position: 'relative', zIndex: 5 }}>
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{rec.country}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>Capital: {rec.capital}</p>
        </div>

        {/* Match Score */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span>Match Score</span>
            <span style={{ fontWeight: 'bold' }}>{rec.matchScore}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(122, 167, 255, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${rec.matchScore}%`,
                background: `linear-gradient(90deg, #7aa7ff, #6df0c2)`,
                borderRadius: '3px',
              }}
            />
          </div>
        </div>

        {/* Budget */}
        <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--muted)' }}>
          <strong>Budget:</strong> {rec.estimatedBudget}
        </p>

        {/* Best Flight Deal */}
        <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--muted)' }}>
          <strong>Best Flight Deal:</strong>{' '}
          {flightsLoading
            ? 'Loading...'
            : flight
            ? (
              <a
                href={buildGoogleFlightsUrl(flight)}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#cfe0ff', textDecoration: 'underline' }}
              >
                {`${flight.currency} ${flight.price} (round trip)`}
              </a>
            )
            : 'Not available'}
        </p>

        {/* Best Months */}
        <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--muted)' }}>
          <strong>Best Months:</strong> {rec.bestMonths.map((m) => monthNames[m - 1]).join(', ')}
        </p>
      </div>

      {/* Click hint */}
      <div
        style={{
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text)',
          backgroundColor: 'rgba(11, 16, 32, 0.85)',
          borderTop: '1px solid rgba(122, 167, 255, 0.2)',
          position: 'relative',
          zIndex: 5,
        }}
      >
        Click to open details
      </div>
    </div>
  );
};

const AIResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to get recommendations from location state or sessionStorage
  const recommendations = location.state?.recommendations || 
    (() => {
      try {
        const stored = sessionStorage.getItem('aiResults');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();
  
  const initialRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const initialFilters = location.state?.filters || (() => {
    try {
      const stored = sessionStorage.getItem('aiFilters');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  // Main state
  const [currentRecommendations, setCurrentRecommendations] = useState<Recommendation[]>(initialRecommendations);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>(initialFilters);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [flightMap, setFlightMap] = useState<Record<string, FlightInfo | null>>({});
  const [flightsLoading, setFlightsLoading] = useState(false);
  const [flightsError, setFlightsError] = useState('');
  const [forecastMap, setForecastMap] = useState<Record<string, WeatherDay[]>>({});
  const [forecastLoadingMap, setForecastLoadingMap] = useState<Record<string, boolean>>({});
  const [forecastMetaMap, setForecastMetaMap] = useState<Record<string, ForecastMeta>>({});

  // Hotel state
  const [hotelMap, setHotelMap] = useState<Record<string, HotelInfo | null>>({});
  const [hotelLoadingMap, setHotelLoadingMap] = useState<Record<string, boolean>>({});

  // AI favorites state
  const [aiFavoriteMap, setAiFavoriteMap] = useState<Record<string, boolean>>({});

  // Modify search state
  const [showModifySearch, setShowModifySearch] = useState(false);
  const [modifyBudget, setModifyBudget] = useState(initialFilters.budget || '');
  const [modifyCurrency, setModifyCurrency] = useState(initialFilters.currency || 'USD');
  const [modifyInterests, setModifyInterests] = useState(initialFilters.interests || []);
  const [modifyOriginQuery, setModifyOriginQuery] = useState(initialFilters.originQuery || '');
  const [modifySelectedOrigin, setModifySelectedOrigin] = useState<AirportOption | null>(initialFilters.selectedOrigin || null);
  const [modifyAirportOptions, setModifyAirportOptions] = useState<AirportOption[]>([]);
  const [modifyDepartureDate, setModifyDepartureDate] = useState(initialFilters.departureDate || '');
  const [modifyReturnDate, setModifyReturnDate] = useState(initialFilters.returnDate || '');
  const [modifyLoading, setModifyLoading] = useState(false);
  const [modifyError, setModifyError] = useState('');

  // Initialize with location state on first load
  useEffect(() => {
    if (initialRecommendations.length > 0 && currentRecommendations.length === 0) {
      setCurrentRecommendations(initialRecommendations);
      setCurrentFilters(initialFilters);
    }
  }, []);

  // Persist results to sessionStorage whenever they change
  useEffect(() => {
    if (currentRecommendations.length > 0) {
      try {
        sessionStorage.setItem('aiResults', JSON.stringify(currentRecommendations));
        sessionStorage.setItem('aiFilters', JSON.stringify(currentFilters));
      } catch (error) {
        console.warn('Failed to save results to sessionStorage:', error);
      }
    }
  }, [currentRecommendations, currentFilters]);

  useEffect(() => {
    let isMounted = true;

    aiFavoritesAPI
      .list()
      .then((response) => {
        if (!isMounted) return;
        const favorites = response.data?.favorites || [];
        const nextMap: Record<string, boolean> = {};
        favorites.forEach((fav: any) => {
          if (fav.favoriteKey) {
            nextMap[fav.favoriteKey] = true;
          }
        });
        setAiFavoriteMap(nextMap);
      })
      .catch(() => {
        if (!isMounted) return;
        setAiFavoriteMap({});
      })
      .finally(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const originIata = currentFilters.selectedOrigin?.iataCode;
    const departureDate = currentFilters.departureDate;
    const returnDate = currentFilters.returnDate;
    const currency = currentFilters.currency || 'USD';
    if (currentRecommendations.length === 0 || !originIata || !departureDate || !returnDate) return;

    let isMounted = true;
    setFlightsLoading(true);
    setFlightsError('');

    console.log('🔵 [FRONTEND-AI] Requesting flights with currency:', currency);
    flightsAPI
      .getCheapest({
        origin: originIata,
        departureDate,
        returnDate,
        currency,
        destinations: currentRecommendations.map((rec) => ({
          country: rec.country,
          capital: rec.capital,
        })),
      })
      .then((response) => {
        if (!isMounted) return;
        const results = response.data?.results || [];
        console.log('🔵 [FRONTEND-AI] Received flights:', results);
        const nextMap: Record<string, FlightInfo | null> = {};
        results.forEach((item: any) => {
          nextMap[item.country] = item.flight || null;
        });
        setFlightMap(nextMap);
      })
      .catch(() => {
        if (!isMounted) return;
        setFlightsError('Failed to load flight prices');
      })
      .finally(() => {
        if (!isMounted) return;
        setFlightsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentRecommendations, currentFilters.selectedOrigin?.iataCode, currentFilters.departureDate, currentFilters.returnDate, currentFilters.currency]);

  useEffect(() => {
    setFlightMap({});
    setHotelMap({});
    setHotelLoadingMap({});
  }, [currentFilters.currency]);

  useEffect(() => {
    if (expandedCard === null) return;

    const rec = currentRecommendations[expandedCard];
    if (!rec) return;

    const startDate = currentFilters.departureDate;
    const endDate = currentFilters.returnDate;
    if (!startDate || !endDate) return;

    const key = rec.country;
    if (forecastMap[key]) return;

    setForecastLoadingMap((prev) => ({ ...prev, [key]: true }));

    weatherAPI
      .getForecast({
        city: rec.capital || rec.country,
        startDate,
        endDate,
      })
      .then((response) => {
        const forecast = response.data?.forecast || [];
        const locationCity = response.data?.location?.city || response.data?.city || rec.capital || rec.country;
        setForecastMap((prev) => ({ ...prev, [key]: forecast }));
        setForecastMetaMap((prev) => ({ ...prev, [key]: { cityLabel: locationCity } }));
      })
      .catch(() => {
        setForecastMap((prev) => ({ ...prev, [key]: [] }));
      })
      .finally(() => {
        setForecastLoadingMap((prev) => ({ ...prev, [key]: false }));
      });
  }, [expandedCard, currentRecommendations, currentFilters.departureDate, currentFilters.returnDate, currentFilters.currency]);

  // Fetch hotel data when card is expanded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (expandedCard === null) return;

    const rec = currentRecommendations[expandedCard];
    if (!rec) return;

    const checkInDate = currentFilters.departureDate;
    const checkOutDate = currentFilters.returnDate;
    if (!checkInDate || !checkOutDate) return;

    const key = rec.country;

    console.log('[HOTEL] Fetching hotels for:', key, { location: rec.capital || rec.country, checkInDate, checkOutDate });
    setHotelLoadingMap((prev) => ({ ...prev, [key]: true }));

    hotelsAPI
      .searchHotels({
        location: rec.capital || rec.country,
        checkInDate,
        checkOutDate,
        currency: currentFilters.currency || 'USD',
      })
      .then((response) => {
        console.log('[HOTEL] API Response:', response);
        console.log('[HOTEL] Response data:', response.data);
        const hotels = response.data?.hotels || [];
        console.log('[HOTEL] Extracted hotels:', hotels);
        const bestHotel = hotels.length > 0 ? hotels[0] : null;
        console.log('[HOTEL] Best hotel:', bestHotel);
        console.log('[HOTEL] Hotel name:', bestHotel?.name);
        setHotelMap((prev) => ({ ...prev, [key]: bestHotel }));
      })
      .catch((error) => {
        console.error('[HOTEL] Error fetching hotels:', error);
        setHotelMap((prev) => ({ ...prev, [key]: null }));
      })
      .finally(() => {
        setHotelLoadingMap((prev) => ({ ...prev, [key]: false }));
      });
  }, [expandedCard, currentRecommendations, currentFilters.departureDate, currentFilters.returnDate, currentFilters.currency]);

  // Initialize modify form with current filters
  const initializeModifyForm = () => {
    setModifyBudget(currentFilters.budget || '');
    setModifyCurrency(currentFilters.currency || 'USD');
    setModifyInterests(currentFilters.interests || []);
    setModifyOriginQuery(currentFilters.originQuery || '');
    setModifySelectedOrigin(currentFilters.selectedOrigin || null);
    setModifyDepartureDate(currentFilters.departureDate || '');
    setModifyReturnDate(currentFilters.returnDate || '');
    setShowModifySearch(true);
    setModifyError('');
  };

  useEffect(() => {
    if (modifyOriginQuery.trim().length < 2) {
      setModifyAirportOptions([]);
      return;
    }

    const handle = setTimeout(() => {
      flightsAPI
        .searchAirports(modifyOriginQuery.trim())
        .then((res) => setModifyAirportOptions(res.data?.results || []))
        .catch(() => setModifyAirportOptions([]));
    }, 300);

    return () => clearTimeout(handle);
  }, [modifyOriginQuery]);

  const handleModifySearch = async () => {
    setModifyLoading(true);
    setModifyError('');

    try {
      if (!modifySelectedOrigin?.iataCode) {
        setModifyError('Please select a departure city');
        setModifyLoading(false);
        return;
      }

      if (!modifyDepartureDate || !modifyReturnDate) {
        setModifyError('Please select your travel dates');
        setModifyLoading(false);
        return;
      }

      if (modifyReturnDate < modifyDepartureDate) {
        setModifyError('Return date must be after departure date');
        setModifyLoading(false);
        return;
      }

      const monthFromDate = new Date(modifyDepartureDate).getMonth() + 1;

      // Call AI recommendations API with modified criteria
      const response = await aiAPI.getRecommendations({
        month: monthFromDate,
        budget: modifyBudget || 'moderate',
        interests: modifyInterests.length > 0 ? modifyInterests : [],
      });

      const recommendationsData = Array.isArray(response.data) ? response.data : response.data?.recommendations || [];
      setCurrentRecommendations(recommendationsData);
      setCurrentFilters({
        budget: modifyBudget,
        currency: modifyCurrency,
        interests: modifyInterests,
        originQuery: modifyOriginQuery,
        selectedOrigin: modifySelectedOrigin,
        departureDate: modifyDepartureDate,
        returnDate: modifyReturnDate,
      });
      setShowModifySearch(false);
      setExpandedCard(null);
    } catch (error) {
      setModifyError('Failed to fetch new recommendations. Please try again.');
      console.error('Error fetching recommendations:', error);
    } finally {
      setModifyLoading(false);
    }
  };

  const getCurrentCriteria = () => ({
    budget: currentFilters.budget || '',
    currency: currentFilters.currency || 'USD',
    interests: currentFilters.interests || [],
    originQuery: currentFilters.originQuery || '',
    selectedOrigin: currentFilters.selectedOrigin || null,
    originIata: currentFilters.selectedOrigin?.iataCode || '',
    departureDate: currentFilters.departureDate || '',
    returnDate: currentFilters.returnDate || '',
  });

  const handleToggleAIFavorite = async (rec: Recommendation) => {
    const criteria = getCurrentCriteria();
    const favoriteKey = buildAIFavoriteKey(rec, criteria);
    const imageUrl = await getCountryImage(rec.country);
    const flight = flightMap[rec.country] || null;
    const flightLink = flight ? buildGoogleFlightsUrl(flight) : '';
    const hotel = hotelMap[rec.country] || null;
    const hotelLink = hotel?.link || '';

    const details = {
      imageUrl,
      flight,
      flightLink,
      hotel,
      hotelLink,
      weather: forecastMap[rec.country] || [],
    };

    try {
      const response = await aiFavoritesAPI.toggle({ recommendation: rec, criteria, details });
      const isFavorite = response.data?.isFavorite === true;
      const keyFromServer = response.data?.favoriteKey || favoriteKey;
      setAiFavoriteMap((prev) => ({ ...prev, [keyFromServer]: isFavorite }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes thinkingBar {
          0% { transform: translateX(-130%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      <div className="page-shell" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ marginBottom: '8px' }}>Your Perfect Destinations</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            AI-powered recommendations tailored to your preferences
          </p>
        </div>

        {/* Results Grid */}
        <div className="grid grid-3" style={{ gap: '24px', marginBottom: '40px' }}>
          {currentRecommendations.map((rec, idx) => (
            <CountryCard
              key={idx}
              rec={rec}
              idx={idx}
              expandedCard={expandedCard}
              setExpandedCard={setExpandedCard}
              isFavorite={Boolean(aiFavoriteMap[buildAIFavoriteKey(rec, getCurrentCriteria())])}
              onToggleFavorite={handleToggleAIFavorite}
              flight={flightMap[rec.country]}
              flightsLoading={flightsLoading}
              forecast={forecastMap[rec.country]}
              forecastLoading={forecastLoadingMap[rec.country]}
            />
          ))}
        </div>

        {flightsError && (
          <div className="error" style={{ marginBottom: '24px' }}>
            {flightsError}
          </div>
        )}

        {expandedCard !== null && currentRecommendations[expandedCard] && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(5, 10, 20, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '20px',
            }}
            onClick={() => setExpandedCard(null)}
          >
            <div
              className="card"
              style={{
                maxWidth: '760px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '16px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setExpandedCard(null)}
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                Close
              </button>

              <div style={{ padding: 'clamp(16px, 5vw, 28px)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '6px' }}>
                  {currentRecommendations[expandedCard].country}
                </h2>
                <p className="muted" style={{ marginTop: 0, marginBottom: '20px' }}>
                  Capital: {currentRecommendations[expandedCard].capital}
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7aa7ff' }}>Why This Match?</h4>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: 'var(--muted)' }}>
                    {currentRecommendations[expandedCard].whyMatch}
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6df0c2' }}>Highlights</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {currentRecommendations[expandedCard].highlights.map((highlight, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'rgba(109, 240, 194, 0.15)',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#6df0c2',
                        }}
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7aa7ff' }}>Top Activities</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                    {currentRecommendations[expandedCard].activities.map((activity, i) => (
                      <li key={i}>
                        <a
                          href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(activity)}&partner_id=travelplanner`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#cfe0ff', textDecoration: 'underline' }}
                        >
                          {activity}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {flightMap[currentRecommendations[expandedCard].country] && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6df0c2' }}>Best Flight Deal</h4>
                    <a
                      href={buildGoogleFlightsUrl(flightMap[currentRecommendations[expandedCard].country]!)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-block',
                        margin: 0,
                        fontSize: '13px',
                        color: '#cfe0ff',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                      }}
                    >
                      {`${flightMap[currentRecommendations[expandedCard].country]?.currency} ${flightMap[currentRecommendations[expandedCard].country]?.price} (round trip)`}
                    </a>
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                      Depart: {flightMap[currentRecommendations[expandedCard].country]?.departureDate} • Return: {flightMap[currentRecommendations[expandedCard].country]?.returnDate}
                    </p>
                  </div>
                )}

                {/* Hotel Section */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6df0c2' }}>💰 Best Hotel Deal</h4>
                  {hotelLoadingMap[currentRecommendations[expandedCard].country] ? (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Loading hotels...</p>
                  ) : hotelMap[currentRecommendations[expandedCard].country] ? (
                    <div style={{
                      backgroundColor: 'rgba(109, 240, 194, 0.05)',
                      border: '1px solid rgba(109, 240, 194, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginTop: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', color: '#cfe0ff' }}>
                            {hotelMap[currentRecommendations[expandedCard].country]?.name}
                          </p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>
                            {hotelMap[currentRecommendations[expandedCard].country]?.location}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#6df0c2', fontWeight: 'bold' }}>
                            ⭐ {hotelMap[currentRecommendations[expandedCard].country]?.rating.toFixed(1)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            ({hotelMap[currentRecommendations[expandedCard].country]?.reviewCount} reviews)
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(109, 240, 194, 0.1)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--muted)' }}>Price per night:</span>
                          <span style={{ fontWeight: 'bold', color: '#cfe0ff' }}>
                            {hotelMap[currentRecommendations[expandedCard].country]?.currency} {hotelMap[currentRecommendations[expandedCard].country]?.pricePerNight?.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--muted)' }}>Total:</span>
                          <span style={{ fontWeight: 'bold', color: '#6df0c2' }}>
                            {hotelMap[currentRecommendations[expandedCard].country]?.currency} {hotelMap[currentRecommendations[expandedCard].country]?.price.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                          {currentFilters.departureDate} → {currentFilters.returnDate}
                        </div>
                        {hotelMap[currentRecommendations[expandedCard].country]?.link && (
                          <a
                            href={hotelMap[currentRecommendations[expandedCard].country]?.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-block',
                              width: '100%',
                              textAlign: 'center',
                              padding: '6px 12px',
                              backgroundColor: 'rgba(109, 240, 194, 0.1)',
                              border: '1px solid rgba(109, 240, 194, 0.3)',
                              borderRadius: '4px',
                              color: '#6df0c2',
                              textDecoration: 'none',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            View Booking →
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>
                      No hotels found for these dates
                    </p>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7aa7ff' }}>Weather Forecast</h4>
                  {forecastMetaMap[currentRecommendations[expandedCard].country]?.cityLabel && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--muted)' }}>
                      City: {forecastMetaMap[currentRecommendations[expandedCard].country].cityLabel}
                    </p>
                  )}
                  {forecastLoadingMap[currentRecommendations[expandedCard].country] && (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Loading forecast...</p>
                  )}
                  {!forecastLoadingMap[currentRecommendations[expandedCard].country] &&
                    (forecastMap[currentRecommendations[expandedCard].country]?.length || 0) > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {forecastMap[currentRecommendations[expandedCard].country].map((day) => (
                          <div
                            key={day.date}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              color: 'var(--muted)',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span>{day.date}</span>
                            <span>{getWeatherIcon(day.description)} {day.description}</span>
                            <span>{Math.round(day.minTemp)}° / {Math.round(day.maxTemp)}°C</span>
                          </div>
                        ))}
                      </div>
                    )}
                  {!forecastLoadingMap[currentRecommendations[expandedCard].country] &&
                    (forecastMap[currentRecommendations[expandedCard].country]?.length || 0) === 0 && (
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                        Forecast not available.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '40px', marginBottom: '32px' }}>
          <div className="cta-row" style={{ justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={initializeModifyForm}
          >
            🔄 Modify Search Criteria
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/search', { state: { fromResults: true } })}
          >
            ← Back to Search
          </button>
          </div>
        </div>

        {/* Modify Search Form Modal */}
        {showModifySearch && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={() => setShowModifySearch(false)}
          >
            <div
              className="card"
              style={{
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 'clamp(16px, 5vw, 32px)' }}>
                <h2 style={{ marginBottom: '24px' }}>Modify Search Criteria</h2>

                {!modifyLoading ? (
                  <>
                    <SearchFilters
                      budget={modifyBudget}
                      currency={modifyCurrency}
                      interests={modifyInterests}
                      originQuery={modifyOriginQuery}
                      selectedOrigin={modifySelectedOrigin}
                      airportOptions={modifyAirportOptions}
                      departureDate={modifyDepartureDate}
                      returnDate={modifyReturnDate}
                      onOriginQueryChange={setModifyOriginQuery}
                      onSelectOrigin={(option) => {
                        setModifySelectedOrigin(option);
                        setModifyOriginQuery(
                          `${option.iataCode} • ${option.name}${option.cityName ? ` — ${option.cityName}` : ''}`
                        );
                        setModifyAirportOptions([]);
                      }}
                      onDepartureDateChange={(value) => {
                        setModifyDepartureDate(value);
                        if (modifyReturnDate && value && modifyReturnDate < value) {
                          setModifyReturnDate('');
                        }
                      }}
                      onReturnDateChange={setModifyReturnDate}
                      onBudgetChange={setModifyBudget}
                      onCurrencyChange={setModifyCurrency}
                      onInterestsChange={setModifyInterests}
                      onSearch={handleModifySearch}
                    />

                    {modifyError && (
                      <div className="error" style={{ marginTop: '16px', marginBottom: '16px' }}>
                        {modifyError}
                      </div>
                    )}

                    <div className="modal-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowModifySearch(false)}
                        disabled={modifyLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ marginBottom: '20px', fontSize: '48px', animation: 'bounce 2s infinite' }}>
                      ✈️
                    </div>
                    <h3 style={{ marginBottom: '12px', color: '#a7d0ff' }}>Finding Perfect Destinations</h3>
                    <p className="muted" style={{ marginBottom: '20px' }}>
                      Our AI is analyzing your preferences and searching for the best matches...
                    </p>
                    <div
                      style={{
                        width: 'min(340px, 92%)',
                        height: '10px',
                        margin: '0 auto 18px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(122, 167, 255, 0.15)',
                        overflow: 'hidden',
                        border: '1px solid rgba(122, 167, 255, 0.25)',
                      }}
                    >
                      <div
                        style={{
                          width: '42%',
                          height: '100%',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, rgba(122, 167, 255, 0.95), rgba(109, 240, 194, 0.95))',
                          animation: 'thinkingBar 1.3s ease-in-out infinite',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        width: '50px',
                        height: '50px',
                        border: '4px solid rgba(122, 167, 255, 0.2)',
                        borderTop: '4px solid rgba(122, 167, 255, 0.8)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    <p className="muted" style={{ marginTop: '20px', fontSize: '12px' }}>
                      This usually takes 5-15 seconds...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIResults;
