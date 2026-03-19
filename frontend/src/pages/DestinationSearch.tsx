import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { destinationAPI, flightsAPI, destinationFavoritesAPI } from '../services/api';

// Helper function to build Google Flights URL
const buildGoogleFlightsUrl = (origin: string, destination: string, departureDate: string, returnDate: string) => {
  // Google Flights URL format: #flt=ORIGIN.DESTINATION.DEPARTURE_DATE*DESTINATION.ORIGIN.RETURN_DATE
  // Dates should be in YYYY-MM-DD format
  return `https://www.google.com/travel/flights?hl=en#flt=${origin}.${destination}.${departureDate}*${destination}.${origin}.${returnDate}`;
};

// Helper function to build hotel booking URL
const buildHotelBookingUrl = (hotelName: string, destination: string, checkInDate: string, checkOutDate: string) => {
  const query = `${hotelName} ${destination} ${checkInDate}`;
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}&checkin=${checkInDate}&checkout=${checkOutDate}`;
};

// Helper function to build GetYourGuide URL for activities
const buildActivityUrl = (activity: string, destination: string) => {
  const query = `${activity} ${destination}`;
  return `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}&partner_id=travelplanner`;
};

interface SearchProps {
  isAuthenticated: boolean;
}

interface AirportOption {
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

interface DestinationOption {
  iataCode?: string;
  name: string;
  cityName?: string;
  countryName?: string;
  country?: string;
  capital?: string;
}

interface DestinationDetails {
  country: string;
  capital: string;
  description: string;
  highlights: string[];
  bestMonths: number[];
  currency: string;
  language: string;
  timezone: string;
  imageUrl?: string;
}

interface DestinationSearchResult {
  destination: DestinationDetails;
  flight: any | null;
  weather: any[];
  hotel: any | null;
  activities: string[];
  highlights?: Array<{
    name: string;
    type: string;
    description: string;
    rating?: number;
    wikiUrl?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }>;
  events?: Array<{
    name: string;
    type: string;
    month: number;
    description: string;
    date?: string;
    time?: string;
    location?: string;
    url?: string;
  }>;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const currencyOptions = [
  'USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'CAD', 'AUD',
  'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'SGD', 'HKD',
  'INR', 'CNY', 'KRW', 'THB', 'TRY', 'ZAR', 'MXN', 'BRL',
];

const DestinationSearch: React.FC<SearchProps> = ({ isAuthenticated }) => {
  const navigate = useNavigate();

  // Search form state
  const [destinationQuery, setDestinationQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<DestinationDetails | null>(null);
  const [destinationOptions, setDestinationOptions] = useState<DestinationOption[]>([]);

  const [originQuery, setOriginQuery] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<AirportOption | null>(null);
  const [airportOptions, setAirportOptions] = useState<AirportOption[]>([]);

  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  
  // Budget and interests
  const [budget, setBudget] = useState('moderate');
  const [currency, setCurrency] = useState('USD');
  const [interests, setInterests] = useState<string[]>([]);

  // Results state
  const [searchResult, setSearchResult] = useState<DestinationSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Favorites state
  const [isFavorite, setIsFavorite] = useState(false);

  // Destination search with real-time autocomplete using Amadeus API
  useEffect(() => {
    if (destinationQuery.trim().length < 2) {
      setDestinationOptions([]);
      return;
    }

    const handle = setTimeout(() => {
      flightsAPI
        .searchAirports(destinationQuery.trim())
        .then((res) => {
          const results = res.data?.results || [];
          // Filter to show cities and major airports
          const filtered = results.filter((item: any) => 
            item.subType === 'CITY' || item.type === 'CITY' || item.name.includes(item.cityName || '')
          );
          setDestinationOptions(filtered.slice(0, 10)); // Limit to 10 results
        })
        .catch(() => setDestinationOptions([]));
    }, 300);

    return () => clearTimeout(handle);
  }, [destinationQuery]);

  // Airport search
  useEffect(() => {
    if (originQuery.trim().length < 2) {
      setAirportOptions([]);
      return;
    }

    const handle = setTimeout(() => {
      flightsAPI
        .searchAirports(originQuery.trim())
        .then((res) => setAirportOptions(res.data?.results || []))
        .catch(() => setAirportOptions([]));
    }, 300);

    return () => clearTimeout(handle);
  }, [originQuery]);

  const handleDepartureDateChange = (value: string) => {
    setDepartureDate(value);
    if (returnDate && value && returnDate < value) {
      setReturnDate('');
    }
  };

  const handleSelectDestination = (dest: DestinationOption) => {
    // Extract proper city and country names from API response
    const cityName = dest.cityName && dest.cityName !== dest.countryName ? dest.cityName : dest.name;
    const countryName = dest.countryName || '';
    
    setSelectedDestination({
      country: countryName,
      capital: cityName,
      description: `Discover the unique experiences and attractions of ${cityName}, ${countryName}.`,
      highlights: [
        'Local Markets',
        'Historical Landmarks',
        'Cultural Museums',
        'Traditional Cuisine',
        'Natural Attractions',
        'Local Experiences',
      ],
      bestMonths: [3, 4, 5, 9, 10],
      currency: 'USD',
      language: 'Local',
      timezone: 'Local',
    });
    setDestinationQuery(`${cityName}, ${countryName}`);
    setDestinationOptions([]);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');

    try {
      if (!selectedDestination) {
        setError('Please select a destination');
        setLoading(false);
        return;
      }

      if (!selectedOrigin?.iataCode) {
        setError('Please select a departure city');
        setLoading(false);
        return;
      }

      if (!departureDate || !returnDate) {
        setError('Please select your travel dates');
        setLoading(false);
        return;
      }

      if (returnDate < departureDate) {
        setError('Return date must be after departure date');
        setLoading(false);
        return;
      }

      // Call API to search specific destination with budget and interests
      console.log('🔵 [FRONTEND] Sending destination search with currency:', currency);
      const response = await destinationAPI.searchSpecific({
        destination: selectedDestination.country,
        departureAirport: selectedOrigin.iataCode,
        departureDate,
        returnDate,
        currency,
        budget,
        interests,
      });
      console.log('🔵 [FRONTEND] Received flight data:', response.data?.results?.flight);

      const { results } = response.data;

      setSearchResult({
        destination: results.destination,
        flight: results.flight,
        weather: results.weather,
        hotel: results.hotel,
        activities: results.activities,
        highlights: results.highlights,
        events: results.events,
      });

      // Store in sessionStorage for persistence
      sessionStorage.setItem('destinationSearchResult', JSON.stringify({
        destination: results.destination,
        flight: results.flight,
        weather: results.weather,
        hotel: results.hotel,
        activities: results.activities,
        highlights: results.highlights,
        events: results.events,
        departureDate,
        returnDate,
        origin: selectedOrigin,
        currency,
        budget,
        interests,
      }));
    } catch (err: any) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!searchResult || !selectedDestination || !selectedOrigin) return;

    const searchParams = {
      country: selectedDestination.country,
      capital: selectedDestination.capital,
      departureAirport: selectedOrigin.iataCode,
      departureDate,
      returnDate,
      currency,
      budget,
      interests,
    };

    try {
      const response = await destinationFavoritesAPI.toggle({
        searchParams,
        searchResult,
      });
      setIsFavorite(response.data?.isFavorite === true);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Check if current search is favorited (when result is loaded)
  useEffect(() => {
    if (searchResult && selectedDestination && selectedOrigin) {
      // For simplicity, we'll just reset to false on new search
      // In a production app, you'd want to check against the server
      setIsFavorite(false);
    }
  }, [searchResult, selectedDestination, selectedOrigin]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <div style={{ marginBottom: '32px' }}>
        <div className="search-header">
          <button
            className="btn btn-secondary btn-mobile-full"
            onClick={() => navigate('/search')}
            style={{ fontSize: '14px', padding: '8px 14px' }}
          >
            ← Back to AI Search
          </button>
          <h1 style={{ margin: 0 }}>Search by Destination</h1>
        </div>

        {/* Search Form Card */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Find Your Perfect Destination</h2>

          {/* Destination Selection */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Destination Country or City
            </label>
            <input
              type="text"
              value={destinationQuery}
              onChange={(e) => setDestinationQuery(e.target.value)}
              placeholder="Search for a country or city (e.g., Paris, Japan, Italy...)"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(122, 167, 255, 0.2)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text)',
                marginBottom: '12px',
              }}
            />

            {/* Show message when no text entered */}
            {destinationQuery.trim().length === 0 && !selectedDestination && (
              <div className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                Start typing to search for any city or destination worldwide
              </div>
            )}

            {/* No results message */}
            {destinationQuery.trim().length >= 2 && destinationOptions.length === 0 && !selectedDestination && (
              <div className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                No destinations found. Try searching for another city.
              </div>
            )}

            {/* Display search results from Amadeus API */}
            {destinationOptions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {destinationOptions.map((option) => (
                  <button
                    key={`${option.name}-${option.countryName}`}
                    type="button"
                    onClick={() => handleSelectDestination(option)}
                    className="btn btn-outline"
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      fontSize: '13px',
                      padding: '10px 12px',
                      borderColor: 'rgba(109, 240, 194, 0.3)',
                      color: '#cfe0ff',
                    }}
                  >
                    <span style={{ color: '#6df0c2', marginRight: '8px' }}>📍</span>
                    {option.name} <span style={{ color: 'var(--muted)' }}>— {option.countryName}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedDestination && (
              <div style={{
                backgroundColor: 'rgba(109, 240, 194, 0.1)',
                border: '1px solid rgba(109, 240, 194, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '12px',
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#6df0c2' }}>
                  ✓ {selectedDestination.country} — {selectedDestination.capital}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  Best months: {selectedDestination.bestMonths.map(m => monthNames[m - 1]).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Departure City */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Departure City
            </label>
            <input
              type="text"
              value={originQuery}
              onChange={(e) => setOriginQuery(e.target.value)}
              placeholder="Search your departure city"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(122, 167, 255, 0.2)',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text)',
                marginBottom: '12px',
              }}
            />

            {originQuery.trim().length >= 2 && airportOptions.length === 0 && (
              <div className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                No results found. Try another city.
              </div>
            )}

            {airportOptions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {airportOptions.map((option) => (
                  <button
                    key={`${option.iataCode}-${option.name}`}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(option);
                      setOriginQuery(
                        `${option.iataCode} • ${option.name}${option.cityName ? ` — ${option.cityName}` : ''}`
                      );
                      setAirportOptions([]);
                    }}
                    className={selectedOrigin?.iataCode === option.iataCode ? 'btn btn-primary' : 'btn btn-outline'}
                    style={{ textAlign: 'left', fontSize: '13px', width: '100%' }}
                  >
                    {option.iataCode} • {option.name}
                    {option.cityName ? ` — ${option.cityName}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Travel Dates */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Travel Dates
            </label>
            <div className="date-range-grid" style={{ gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Departure
                </label>
                <input
                  type="date"
                  value={departureDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDepartureDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(122, 167, 255, 0.2)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', display: 'block' }}>
                  Return
                </label>
                <input
                  type="date"
                  value={returnDate}
                  min={departureDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setReturnDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid rgba(122, 167, 255, 0.2)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-2" style={{ gap: '12px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Budget
              </label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid rgba(122, 167, 255, 0.2)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Preferred Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid rgba(122, 167, 255, 0.2)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interests */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Interests
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['Beach', 'Nightlife', 'Nature', 'City', 'Culture', 'Adventure', 'Food', 'Shopping'].map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => {
                    if (interests.includes(interest)) {
                      setInterests(interests.filter((i) => i !== interest));
                    } else {
                      setInterests([...interests, interest]);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    border: interests.includes(interest)
                      ? '2px solid #6df0c2'
                      : '1px solid rgba(122, 167, 255, 0.2)',
                    borderRadius: '20px',
                    backgroundColor: interests.includes(interest)
                      ? 'rgba(109, 240, 194, 0.1)'
                      : 'rgba(255, 255, 255, 0.04)',
                    color: interests.includes(interest) ? '#6df0c2' : 'var(--text)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: interests.includes(interest) ? '500' : '400',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '16px', padding: '12px' }}
          >
            {loading ? '🔍 Searching...' : '🔍 Search Destination'}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card text-center" style={{ padding: '60px 40px' }}>
            <div style={{ marginBottom: '24px', fontSize: '48px', animation: 'fly 2s ease-in-out infinite' }}>
              ✈️
            </div>
            <h2 style={{ marginBottom: '12px' }}>Gathering Destination Details</h2>
            <p className="muted" style={{ marginBottom: '24px' }}>
              Fetching flights, hotels, weather, and activities...
            </p>
            <div style={{
              width: '100%',
              maxWidth: '400px',
              margin: '0 auto',
              height: '6px',
              backgroundColor: 'rgba(109, 240, 194, 0.1)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6df0c2, #7aa7ff, #6df0c2)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s ease-in-out infinite',
                borderRadius: '3px',
              }} />
            </div>
            <style>{`
              @keyframes fly {
                0%, 100% { transform: translateX(-10px) translateY(0px); }
                50% { transform: translateX(10px) translateY(-8px); }
              }
              @keyframes loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        )}

        {/* Search Results */}
        {!loading && searchResult && (
          <div style={{ animation: 'slideDown 0.3s ease' }}>
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Destination Header */}
            <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{
                backgroundImage: searchResult.destination.imageUrl ? `url('${searchResult.destination.imageUrl}')` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                height: '300px',
                position: 'relative',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                {searchResult.destination.imageUrl && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
                  }} />
                )}
                
                {/* Favorite Button */}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    background: isFavorite
                      ? 'linear-gradient(135deg, rgba(255, 99, 132, 0.95), rgba(255, 159, 64, 0.95))'
                      : 'rgba(0, 0, 0, 0.4)',
                    color: '#fff',
                    fontSize: '22px',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </button>

                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '20px',
                  right: '20px',
                  color: 'white',
                }}>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '36px' }}>
                    🌏 {searchResult.destination.country}
                  </h1>
                  <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
                    Capital: {searchResult.destination.capital}
                  </p>
                </div>
              </div>

              <div className="grid grid-3" style={{ gap: '16px', marginBottom: '20px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>Currency</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6df0c2' }}>
                    {searchResult.destination.currency}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>Language</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6df0c2' }}>
                    {searchResult.destination.language}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>Timezone</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6df0c2' }}>
                    {searchResult.destination.timezone}
                  </p>
                </div>
              </div>
            </div>

            {/* City Landmarks & Points of Interest */}
            {searchResult.highlights && searchResult.highlights.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, color: '#6df0c2' }}>🏛️ Must-See Landmarks</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                    {searchResult.highlights.length} places
                  </p>
                </div>
                
                <div className="grid grid-3" style={{ gap: '16px' }}>
                  {searchResult.highlights.map((highlight, idx) => {
                    // Get icon based on type
                    const getTypeIcon = (type: string) => {
                      if (type.includes('museum')) return '🏛️';
                      if (type.includes('church') || type.includes('cathedral') || type.includes('temple')) return '⛪';
                      if (type.includes('monument') || type.includes('memorial')) return '🗿';
                      if (type.includes('park') || type.includes('garden')) return '🌳';
                      if (type.includes('castle') || type.includes('palace')) return '🏰';
                      if (type.includes('tower')) return '🗼';
                      if (type.includes('bridge')) return '🌉';
                      if (type.includes('market')) return '🏪';
                      if (type.includes('theater') || type.includes('opera')) return '🎭';
                      if (type.includes('historic')) return '📜';
                      return '📍';
                    };
                    
                    const icon = getTypeIcon(highlight.type);
                    const hasWiki = highlight.wikiUrl && highlight.wikiUrl.length > 0;
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(122, 167, 255, 0.05)',
                          border: '1px solid rgba(122, 167, 255, 0.2)',
                          borderRadius: '12px',
                          padding: '18px',
                          transition: 'all 0.3s ease',
                          cursor: hasWiki ? 'pointer' : 'default',
                          position: 'relative' as const,
                        }}
                        onClick={() => {
                          if (hasWiki) {
                            window.open(highlight.wikiUrl, '_blank');
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (hasWiki) {
                            e.currentTarget.style.backgroundColor = 'rgba(122, 167, 255, 0.12)';
                            e.currentTarget.style.borderColor = 'rgba(122, 167, 255, 0.5)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(122, 167, 255, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(122, 167, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(122, 167, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                          <div style={{
                            fontSize: '32px',
                            lineHeight: '1',
                            flexShrink: 0,
                          }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: '0 0 8px 0',
                              fontSize: '15px',
                              fontWeight: '600',
                              color: '#cfe0ff',
                              lineHeight: '1.3',
                            }}>
                              {highlight.name}
                            </h4>
                            <p style={{
                              margin: 0,
                              fontSize: '12px',
                              color: 'var(--muted)',
                              textTransform: 'capitalize' as const,
                            }}>
                              {highlight.type.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        
                        {highlight.description && (
                          <p style={{
                            margin: '0 0 12px 0',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            color: 'rgba(207, 224, 255, 0.8)',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                          }}>
                            {highlight.description}
                          </p>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                          {highlight.rating && highlight.rating > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}>
                              <span style={{ fontSize: '14px' }}>⭐</span>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6df0c2',
                              }}>
                                {highlight.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          {hasWiki && (
                            <span style={{
                              fontSize: '11px',
                              color: 'rgba(122, 167, 255, 0.7)',
                              fontWeight: '500',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.5px',
                            }}>
                              Learn More →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Events During Travel */}
            {searchResult.events && searchResult.events.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, color: '#6df0c2' }}>🎉 Events & Festivals</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                    {searchResult.events.length} happening during your visit
                  </p>
                </div>
                
                <div className="grid grid-3" style={{ gap: '14px' }}>
                  {searchResult.events.map((event, idx) => {
                    // Get icon based on event type
                    const getEventIcon = (type: string) => {
                      if (type === 'festival') return '🎪';
                      if (type === 'music') return '🎵';
                      if (type === 'art') return '🎨';
                      if (type === 'fashion') return '👗';
                      if (type === 'food') return '🍽️';
                      if (type === 'sports') return '⚽';
                      if (type === 'cultural') return '🎭';
                      if (type === 'garden') return '🌸';
                      if (type === 'film') return '🎬';
                      if (type === 'tech') return '💻';
                      if (type === 'shopping') return '🛍️';
                      if (type === 'nature') return '🌳';
                      if (type === 'expo') return '🏛️';
                      return '✨';
                    };

                    const icon = getEventIcon(event.type);
                    const hasOfficialPage = !!event.url && !event.url.includes('google.com/search');
                    
                    return (
                      <a
                        key={idx}
                        href={event.url || `https://www.google.com/search?q=${encodeURIComponent(event.name + ' ' + searchResult.destination.capital)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          backgroundColor: 'rgba(207, 224, 255, 0.05)',
                          border: '2px solid rgba(109, 240, 194, 0.2)',
                          borderRadius: '12px',
                          padding: '18px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative' as const,
                          display: 'flex',
                          flexDirection: 'column' as const,
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(109, 240, 194, 0.12)';
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.5)';
                          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-6px)';
                          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 24px rgba(109, 240, 194, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(207, 224, 255, 0.05)';
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.2)';
                          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                          (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                          <div style={{
                            fontSize: '36px',
                            lineHeight: '1',
                            flexShrink: 0,
                          }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              margin: '0 0 6px 0',
                              fontSize: '15px',
                              fontWeight: '600',
                              color: '#cfe0ff',
                              lineHeight: '1.3',
                            }}>
                              {event.name}
                            </h4>
                            <p style={{
                              margin: 0,
                              fontSize: '12px',
                              color: 'var(--muted)',
                              textTransform: 'capitalize' as const,
                              fontWeight: '500',
                            }}>
                              {event.type}
                            </p>
                          </div>
                        </div>
                        
                        <p style={{
                          margin: '0 0 12px 0',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          color: 'rgba(207, 224, 255, 0.85)',
                          flex: 1,
                        }}>
                          {event.description}
                        </p>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(109, 240, 194, 0.1)',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              fontSize: '12px',
                              color: 'rgba(122, 167, 255, 0.9)',
                              fontWeight: '500',
                            }}>
                              📅 {event.date || `Month ${event.month}`}
                            </span>
                            {event.time && (
                              <span style={{
                                fontSize: '11px',
                                color: 'rgba(122, 167, 255, 0.8)',
                              }}>
                                🕒 {event.time}
                              </span>
                            )}
                            {event.location && (
                              <span style={{
                                fontSize: '11px',
                                color: 'rgba(122, 167, 255, 0.8)',
                              }}>
                                📍 {event.location}
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '11px',
                            color: '#6df0c2',
                            fontWeight: '600',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.5px',
                          }}>
                            {hasOfficialPage ? 'Official Page ↗' : 'Learn More →'}
                          </span>
                        </div>
                        {hasOfficialPage && (
                          <span style={{
                            position: 'absolute' as const,
                            top: '10px',
                            right: '10px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            fontWeight: '700',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(109, 240, 194, 0.15)',
                            border: '1px solid rgba(109, 240, 194, 0.35)',
                            color: '#6df0c2',
                          }}>
                            Official
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flight Information */}
            {searchResult.flight && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: '#6df0c2' }}>✈️ Flight Information</h3>
                <div className="grid grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>Price (Round Trip)</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: '#cfe0ff' }}>
                      {searchResult.flight.currency} {searchResult.flight.price}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Departure → Return
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#cfe0ff' }}>
                      {searchResult.flight.departureDate} → {searchResult.flight.returnDate}
                    </p>
                  </div>
                </div>
                <a
                  href={buildGoogleFlightsUrl(
                    searchResult.flight.origin,
                    searchResult.flight.destination,
                    searchResult.flight.departureDate,
                    searchResult.flight.returnDate
                  )}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '10px 16px',
                    backgroundColor: 'rgba(109, 240, 194, 0.1)',
                    border: '1px solid rgba(109, 240, 194, 0.3)',
                    borderRadius: '6px',
                    color: '#6df0c2',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(109, 240, 194, 0.15)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(109, 240, 194, 0.1)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.3)';
                  }}
                >
                  View on Google Flights ↗
                </a>
              </div>
            )}

            {/* Hotel Information */}
            {searchResult.hotel && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', color: '#6df0c2' }}>🏨 Hotel Information</h3>
                <a
                  href={buildHotelBookingUrl(
                    searchResult.hotel.name,
                    searchResult.destination.capital,
                    departureDate,
                    returnDate
                  )}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
                  }}
                >
                  <div style={{
                    backgroundColor: 'rgba(109, 240, 194, 0.05)',
                    border: '1px solid rgba(109, 240, 194, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(109, 240, 194, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(109, 240, 194, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(109, 240, 194, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(109, 240, 194, 0.2)';
                  }}
                  >
                    <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500', color: '#cfe0ff' }}>
                      {searchResult.hotel.name}
                      <span style={{ fontSize: '12px', marginLeft: '8px' }}>↗</span>
                    </p>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
                      {searchResult.hotel.location}
                    </p>
                    <div className="grid grid-2" style={{ gap: '12px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Price per night:</span>
                        <p style={{ margin: '4px 0 0 0', color: '#cfe0ff', fontWeight: '500' }}>
                          {searchResult.hotel.currency} {searchResult.hotel.pricePerNight?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Rating:</span>
                        <p style={{ margin: '4px 0 0 0', color: '#6df0c2', fontWeight: '500' }}>
                          ⭐ {searchResult.hotel.rating?.toFixed(1)} ({searchResult.hotel.reviewCount} reviews)
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            )}

            {/* Weather Forecast */}
            {searchResult.weather.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#6df0c2' }}>🌤️ Weather Forecast</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                    {searchResult.weather.length} days • {searchResult.destination.capital}
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '12px',
                  paddingBottom: '12px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(109, 240, 194, 0.3) rgba(0, 0, 0, 0.1)',
                }}>
                  {searchResult.weather.map((day, idx) => {
                    const date = new Date(day.date);
                    const isToday = idx === 0;
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          minWidth: '110px',
                          backgroundColor: isToday 
                            ? 'rgba(109, 240, 194, 0.1)' 
                            : 'rgba(122, 167, 255, 0.05)',
                          border: isToday 
                            ? '2px solid rgba(109, 240, 194, 0.4)' 
                            : '1px solid rgba(122, 167, 255, 0.2)',
                          borderRadius: '12px',
                          padding: '14px 10px',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          cursor: 'default',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(109, 240, 194, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {isToday && (
                          <p style={{ 
                            margin: '0 0 6px 0', 
                            fontSize: '10px', 
                            fontWeight: '600',
                            color: '#6df0c2',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Today
                          </p>
                        )}
                        <p style={{ 
                          margin: '0 0 4px 0', 
                          fontSize: '13px', 
                          fontWeight: '600',
                          color: '#cfe0ff'
                        }}>
                          {dayName}
                        </p>
                        <p style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: '11px', 
                          color: 'var(--muted)'
                        }}>
                          {monthDay}
                        </p>
                        <p style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: '28px',
                          lineHeight: '1'
                        }}>
                          {day.description.split(' ')[0]}
                        </p>
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                        }}>
                          <p style={{ 
                            margin: 0, 
                            fontSize: '15px', 
                            fontWeight: '600',
                            color: '#6df0c2'
                          }}>
                            {day.maxTemp}°
                          </p>
                          <p style={{ 
                            margin: '2px 0 0 0', 
                            fontSize: '12px',
                            color: 'rgba(122, 167, 255, 0.7)'
                          }}>
                            {day.minTemp}°
                          </p>
                        </div>
                        <p style={{ 
                          margin: '8px 0 0 0', 
                          fontSize: '10px',
                          color: 'var(--muted)',
                          lineHeight: '1.3'
                        }}>
                          {day.description.split(' ').slice(1).join(' ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <style>{`
                  div::-webkit-scrollbar {
                    height: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                  }
                  div::-webkit-scrollbar-thumb {
                    background: rgba(109, 240, 194, 0.3);
                    border-radius: 3px;
                  }
                  div::-webkit-scrollbar-thumb:hover {
                    background: rgba(109, 240, 194, 0.5);
                  }
                `}</style>
              </div>
            )}

            {/* Activities & Highlights */}
            {searchResult.activities.length > 0 && (
              <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, color: '#6df0c2' }}>🎯 Top Activities & Highlights</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                    {searchResult.activities.length} experiences
                  </p>
                </div>
                
                <div className="grid grid-3" style={{ gap: '14px' }}>
                  {searchResult.activities.map((activity, idx) => {
                    // Generate activity icons based on keywords
                    const getActivityIcon = (text: string) => {
                      const lower = text.toLowerCase();
                      if (lower.includes('museum') || lower.includes('art') || lower.includes('gallery')) return '🎨';
                      if (lower.includes('food') || lower.includes('cuisine') || lower.includes('restaurant') || lower.includes('cooking')) return '🍽️';
                      if (lower.includes('beach') || lower.includes('swim')) return '🏖️';
                      if (lower.includes('hike') || lower.includes('mountain') || lower.includes('trek')) return '⛰️';
                      if (lower.includes('temple') || lower.includes('church') || lower.includes('shrine') || lower.includes('cathedral')) return '⛩️';
                      if (lower.includes('night') || lower.includes('bar') || lower.includes('club')) return '🌃';
                      if (lower.includes('park') || lower.includes('garden')) return '🌳';
                      if (lower.includes('shop') || lower.includes('market')) return '🛍️';
                      if (lower.includes('tour') || lower.includes('walk')) return '🚶';
                      if (lower.includes('water') || lower.includes('boat') || lower.includes('cruise')) return '⛵';
                      if (lower.includes('view') || lower.includes('tower') || lower.includes('observation')) return '🗼';
                      if (lower.includes('festival') || lower.includes('show') || lower.includes('performance')) return '🎭';
                      return '✨';
                    };
                    
                    const icon = getActivityIcon(activity);
                    
                    return (
                      <a
                        key={idx}
                        href={buildActivityUrl(activity, searchResult.destination.capital)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          backgroundColor: 'rgba(109, 240, 194, 0.05)',
                          border: '1px solid rgba(109, 240, 194, 0.2)',
                          borderRadius: '12px',
                          padding: '16px',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          position: 'relative' as const,
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(109, 240, 194, 0.12)';
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.5)';
                          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-4px)';
                          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 20px rgba(109, 240, 194, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(109, 240, 194, 0.05)';
                          (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(109, 240, 194, 0.2)';
                          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                          (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          fontSize: '28px',
                          lineHeight: '1',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}>
                          {icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: '0 0 6px 0',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#cfe0ff',
                            lineHeight: '1.4',
                          }}>
                            {activity}
                          </p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '8px',
                          }}>
                            <span style={{
                              fontSize: '11px',
                              color: '#6df0c2',
                              fontWeight: '500',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.5px',
                            }}>
                              Explore
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#6df0c2',
                            }}>
                              →
                            </span>
                          </div>
                        </div>
                        <div style={{
                          position: 'absolute' as const,
                          top: '12px',
                          right: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          color: 'rgba(109, 240, 194, 0.4)',
                        }}>
                          #{idx + 1}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setSearchResult(null)}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              ← New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationSearch;
