import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import SearchFilters from '../components/SearchFilters';
import { destinationAPI, aiAPI, flightsAPI } from '../services/api';

interface SearchProps {
  isAuthenticated: boolean;
}

interface AirportOption {
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

const Search: React.FC<SearchProps> = ({ isAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [interests, setInterests] = useState<string[]>([]);
  const [originQuery, setOriginQuery] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<AirportOption | null>(null);
  const [airportOptions, setAirportOptions] = useState<AirportOption[]>([]);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showModifyOptions, setShowModifyOptions] = useState(false);

  // Check if user is coming from results page to search
  useEffect(() => {
    if (location.state?.fromResults) {
      setShowModifyOptions(true);
    }
  }, [location.state?.fromResults]);

  // Load previous search criteria if available
  useEffect(() => {
    if (location.state?.filters) {
      const {
        budget: prevBudget,
        currency: prevCurrency,
        interests: prevInterests,
        originQuery: prevOriginQuery,
        selectedOrigin: prevSelectedOrigin,
        departureDate: prevDepartureDate,
        returnDate: prevReturnDate,
      } = location.state.filters;
      setBudget(prevBudget || '');
      setCurrency(prevCurrency || 'USD');
      setInterests(prevInterests || []);
      setOriginQuery(prevOriginQuery || '');
      setSelectedOrigin(prevSelectedOrigin || null);
      setDepartureDate(prevDepartureDate || '');
      setReturnDate(prevReturnDate || '');
    }
  }, [location.state]);

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

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="card text-center" style={{ marginTop: '60px', padding: '40px' }}>
        <h2 style={{ marginBottom: '16px' }}>🔒 Authentication Required</h2>
        <p className="muted" style={{ marginBottom: '24px' }}>
          You must be registered and logged in to search for destinations.
        </p>
        <Navigate to="/login" replace />
      </div>
    );
  }

  const handleDepartureDateChange = (value: string) => {
    setDepartureDate(value);
    if (returnDate && value && returnDate < value) {
      setReturnDate('');
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
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

      const monthFromDate = new Date(departureDate).getMonth() + 1;

      // Call AI recommendations API
      const response = await aiAPI.getRecommendations({
        month: monthFromDate,
        budget: budget || 'moderate', // Default to moderate if not selected
        interests: interests.length > 0 ? interests : [],
      });

      // Clear cached results before navigating to new search results
      sessionStorage.removeItem('aiResults');
      sessionStorage.removeItem('aiFilters');

      // Navigate to AI results page with recommendations and preserve search criteria
      navigate('/ai-results', {
        state: {
          recommendations: response.data.recommendations,
          filters: {
            budget,
            currency,
            interests,
            originQuery,
            selectedOrigin,
            departureDate,
            returnDate,
          },
        },
      });

      // Also save preferences
      if (budget || interests.length > 0) {
        await destinationAPI.savePreferences({
          travelMonth: monthFromDate,
          budget: budget,
          interests: interests,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // New function: navigate back to results without clearing cache
  const handleBackToResults = () => {
    navigate('/ai-results');
  };

  // New function: clear everything and start fresh
  const handleNewSearch = () => {
    sessionStorage.removeItem('aiResults');
    sessionStorage.removeItem('aiFilters');
    setBudget('');
    setCurrency('USD');
    setInterests([]);
    setOriginQuery('');
    setSelectedOrigin(null);
    setDepartureDate('');
    setReturnDate('');
    setError('');
    setShowModifyOptions(false);
  };

  return (
    <div>
      <div className="search-header">
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>Search Destinations</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Get AI-powered recommendations for your trip</p>
        </div>
        <button
          onClick={() => navigate('/destination-search')}
          className="btn btn-outline btn-mobile-full"
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
          }}
        >
          🎯 Search Specific Destination
        </button>
        {showModifyOptions && (
          <div className="search-modify-actions">
            {/* Show "Back to Results" button if user came from results */}
            <button
              onClick={handleBackToResults}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(109, 240, 194, 0.1)',
                border: '1px solid rgba(109, 240, 194, 0.3)',
                borderRadius: '4px',
                color: '#6df0c2',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(109, 240, 194, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(109, 240, 194, 0.1)';
              }}
            >
              ← Back to Results
            </button>
            
            {/* New Search button */}
            <button
              onClick={handleNewSearch}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(122, 167, 255, 0.1)',
                border: '1px solid rgba(122, 167, 255, 0.3)',
                borderRadius: '4px',
                color: '#7aa7ff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(122, 167, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(122, 167, 255, 0.1)';
              }}
            >
              🔄 New Search
            </button>
          </div>
        )}
      </div>

      <SearchFilters
        budget={budget}
        currency={currency}
        interests={interests}
        originQuery={originQuery}
        selectedOrigin={selectedOrigin}
        airportOptions={airportOptions}
        departureDate={departureDate}
        returnDate={returnDate}
        onOriginQueryChange={setOriginQuery}
        onSelectOrigin={(option) => {
          setSelectedOrigin(option);
          setOriginQuery(
            `${option.iataCode} • ${option.name}${option.cityName ? ` — ${option.cityName}` : ''}`
          );
          setAirportOptions([]);
        }}
        onDepartureDateChange={handleDepartureDateChange}
        onReturnDateChange={setReturnDate}
        onBudgetChange={setBudget}
        onCurrencyChange={setCurrency}
        onInterestsChange={setInterests}
        onSearch={handleSearch}
        isModifying={showModifyOptions}
      />

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="card text-center" style={{ padding: '60px 40px' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px', animation: 'bounce 2s infinite' }}>
            ✈️
          </div>
          <h2 style={{ marginBottom: '12px' }}>AI is Analyzing Your Preferences</h2>
          <p className="muted" style={{ marginBottom: '20px', fontSize: '16px' }}>
            Searching for the perfect destinations tailored just for you...
          </p>
          <div
            style={{
              width: 'min(360px, 90%)',
              height: '10px',
              margin: '0 auto 22px',
              borderRadius: '999px',
              backgroundColor: 'rgba(122, 167, 255, 0.15)',
              overflow: 'hidden',
              border: '1px solid rgba(122, 167, 255, 0.25)',
            }}
          >
            <div
              style={{
                width: '40%',
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, rgba(122, 167, 255, 0.95), rgba(109, 240, 194, 0.95))',
                animation: 'loadingBar 1.3s ease-in-out infinite',
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
          <p className="muted" style={{ marginTop: '20px', fontSize: '13px' }}>
            ✨ Finding top 10 countries matching your dates, budget, and interests...
          </p>
          <p className="muted" style={{ fontSize: '12px', marginTop: '8px' }}>
            This usually takes 5-15 seconds
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes loadingBar {
              0% { transform: translateX(-130%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </div>
      )}

      {!loading && hasSearched && (
        <div className="card text-center" style={{ padding: '40px' }}>
          <p className="muted">
            Redirecting to AI-powered recommendations...
          </p>
        </div>
      )}
    </div>
  );
};

export default Search;
