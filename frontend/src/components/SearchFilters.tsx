import React from 'react';

interface AirportOption {
  iataCode: string;
  name: string;
  cityName?: string;
  countryName?: string;
}

interface SearchFiltersProps {
  budget: string;
  currency: string;
  interests: string[];
  originQuery: string;
  selectedOrigin: AirportOption | null;
  airportOptions: AirportOption[];
  departureDate: string;
  returnDate: string;
  onOriginQueryChange: (value: string) => void;
  onSelectOrigin: (option: AirportOption) => void;
  onDepartureDateChange: (value: string) => void;
  onReturnDateChange: (value: string) => void;
  onBudgetChange: (budget: string) => void;
  onCurrencyChange: (currency: string) => void;
  onInterestsChange: (interests: string[]) => void;
  onSearch: () => void;
  isModifying?: boolean;
}

const allInterests = ['Beach', 'Nightlife', 'Nature', 'City', 'Culture', 'Adventure', 'Food', 'Shopping'];
const currencyOptions = [
  'USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'CAD', 'AUD',
  'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'SGD', 'HKD',
  'INR', 'CNY', 'KRW', 'THB', 'TRY', 'ZAR', 'MXN', 'BRL',
];

const SearchFilters: React.FC<SearchFiltersProps> = ({
  budget,
  currency,
  interests,
  originQuery,
  selectedOrigin,
  airportOptions,
  departureDate,
  returnDate,
  onOriginQueryChange,
  onSelectOrigin,
  onDepartureDateChange,
  onReturnDateChange,
  onBudgetChange,
  onCurrencyChange,
  onInterestsChange,
  onSearch,
  isModifying = false
}) => {
  const today = new Date().toISOString().split('T')[0];
  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      onInterestsChange(interests.filter(i => i !== interest));
    } else {
      onInterestsChange([...interests, interest]);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="filters-header">
        <h2 style={{ margin: 0, fontSize: '24px' }}>Search Destinations</h2>
        {isModifying && (
          <span style={{
            fontSize: '12px',
            backgroundColor: 'rgba(109, 240, 194, 0.1)',
            border: '1px solid rgba(109, 240, 194, 0.3)',
            borderRadius: '12px',
            padding: '6px 12px',
            color: '#6df0c2',
          }}>
            ✏️ Modifying current search
          </span>
        )}
      </div>
      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label>Departure City</label>
          <input
            type="text"
            value={originQuery}
            onChange={(e) => onOriginQueryChange(e.target.value)}
            placeholder="Search city (e.g., Dublin)"
          />
          {originQuery.trim().length >= 2 && airportOptions.length === 0 && (
            <div className="muted" style={{ marginTop: '8px', fontSize: '12px' }}>
              No results yet. Try another city spelling.
            </div>
          )}
          {airportOptions.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {airportOptions.map((option) => (
                <button
                  key={`${option.iataCode}-${option.name}`}
                  type="button"
                  className={selectedOrigin?.iataCode === option.iataCode ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => onSelectOrigin(option)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  {option.iataCode} • {option.name}
                  {option.cityName ? ` — ${option.cityName}` : ''}
                  {option.countryName ? `, ${option.countryName}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Travel Dates</label>
          <div className="date-range-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Depart</span>
              <input
                type="date"
                value={departureDate}
                min={today}
                onChange={(e) => onDepartureDateChange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Return</span>
              <input
                type="date"
                value={returnDate}
                min={departureDate || today}
                onChange={(e) => onReturnDateChange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>
          <div className="muted" style={{ marginTop: '6px', fontSize: '12px' }}>
            Return date must be after departure and cannot be in the past.
          </div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label>Budget</label>
          <select value={budget} onChange={(e) => onBudgetChange(e.target.value)}>
            <option value="moderate">Any Budget</option>
            <option value="budget">Budget</option>
            <option value="moderate">Moderate</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>

        <div className="form-group">
          <label>Preferred Currency</label>
          <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
            {currencyOptions.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Interests</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {allInterests.map(interest => (
            <button
              key={interest}
              type="button"
              onClick={() => handleInterestToggle(interest)}
              className={interests.includes(interest) ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ fontSize: '14px', padding: '8px 14px' }}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onSearch} className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
        🔍 Search Destinations
      </button>
    </div>
  );
};

export default SearchFilters;
