import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import DestinationCard from '../components/DestinationCard';
import { destinationAPI, aiFavoritesAPI, destinationFavoritesAPI } from '../services/api';

interface FavoritesProps {
  isAuthenticated: boolean;
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

const buildGoogleFlightsUrl = (origin: string, destination: string, departureDate: string, returnDate: string) =>
  `https://www.google.com/travel/flights?hl=en#flt=${origin}.${destination}.${departureDate}*${destination}.${origin}.${returnDate}`;

const buildHotelBookingUrl = (hotelName: string, destination: string, checkInDate: string, checkOutDate: string) =>
  `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${hotelName} ${destination}`)}&checkin=${checkInDate}&checkout=${checkOutDate}`;

const buildActivityUrl = (activity: string, destination: string) =>
  `https://www.getyourguide.com/s/?q=${encodeURIComponent(`${activity} ${destination}`)}&partner_id=travelplanner`;

const buildEventUrl = (eventName: string, destination: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${eventName} ${destination}`)}`;

const normalizeActivityText = (activity: any): string => {
  if (typeof activity === 'string') return activity;
  if (typeof activity?.name === 'string') return activity.name;
  if (typeof activity?.title === 'string') return activity.title;
  return '';
};

const normalizeHighlightText = (highlight: any): string => {
  if (typeof highlight === 'string') return highlight;
  if (typeof highlight?.name === 'string') return highlight.name;
  return '';
};

const Favorites: React.FC<FavoritesProps> = ({ isAuthenticated }) => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [aiFavorites, setAiFavorites] = useState<any[]>([]);
  const [destinationFavorites, setDestinationFavorites] = useState<any[]>([]);
  const [selectedAiFavorite, setSelectedAiFavorite] = useState<any | null>(null);
  const [selectedDestinationFavorite, setSelectedDestinationFavorite] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const [destinationsResponse, aiFavoritesResponse, destFavoritesResponse] = await Promise.all([
        destinationAPI.getFavorites(),
        aiFavoritesAPI.list(),
        destinationFavoritesAPI.list(),
      ]);
      setFavorites(destinationsResponse.data.favorites || []);
      setAiFavorites(aiFavoritesResponse.data.favorites || []);
      setDestinationFavorites(destFavoritesResponse.data.favorites || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleToggleFavorite = async (destinationId: string) => {
    try {
      await destinationAPI.toggleFavorite(destinationId);
      // Reload favorites
      await loadFavorites();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleToggleAIFavorite = async (fav: any) => {
    try {
      await aiFavoritesAPI.toggle({
        recommendation: {
          country: fav.country,
          capital: fav.capital,
          bestMonths: fav.bestMonths,
          matchScore: fav.matchScore,
          highlights: fav.highlights,
          activities: fav.activities,
          estimatedBudget: fav.estimatedBudget,
          whyMatch: fav.whyMatch,
        },
        criteria: fav.criteria || {},
      });
      await loadFavorites();
    } catch (err) {
      console.error('Failed to remove AI favorite:', err);
    }
  };

  const handleToggleDestinationFavorite = async (fav: any) => {
    try {
      await destinationFavoritesAPI.toggle({
        searchParams: {
          country: fav.country,
          capital: fav.capital,
          departureAirport: fav.departureAirport,
          departureDate: fav.departureDate,
          returnDate: fav.returnDate,
          currency: fav.currency,
          budget: fav.budget,
          interests: fav.interests,
        },
        searchResult: fav.searchResult || {},
      });
      await loadFavorites();
    } catch (err) {
      console.error('Failed to remove destination favorite:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading favorites...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>❤️ My Favorites</h1>

      {error && <div className="error">{error}</div>}

      {favorites.length === 0 && aiFavorites.length === 0 && destinationFavorites.length === 0 ? (
        <div className="card text-center" style={{ padding: '40px' }}>
          <h2 style={{ marginBottom: '16px' }}>No favorites yet</h2>
          <p className="muted">
            Start searching for destinations and add them to your favorites!
          </p>
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <>
              <p className="muted" style={{ marginBottom: '24px' }}>
                You have {favorites.length} favorite destination{favorites.length !== 1 ? 's' : ''}
              </p>

              <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                {favorites.map((destination) => (
                  <DestinationCard
                    key={destination._id}
                    destination={destination}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={true}
                  />
                ))}
              </div>
            </>
          )}

          {aiFavorites.length > 0 && (
            <>
              <h2 style={{ marginBottom: '12px' }}>🤖 AI Favorites</h2>
              <p className="muted" style={{ marginBottom: '24px' }}>
                Saved recommendations with the criteria you searched for
              </p>

              <div className="grid grid-2">
                {aiFavorites.map((fav) => (
                  <div
                    key={fav.id || fav.favoriteKey}
                    className="card"
                    style={{ padding: '20px', cursor: 'pointer' }}
                    onClick={() => setSelectedAiFavorite(fav)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{fav.country}</h3>
                        <p className="muted" style={{ margin: '4px 0 0' }}>Capital: {fav.capital}</p>
                      </div>
                      <button
                        onClick={() => handleToggleAIFavorite(fav)}
                        style={{ background: 'transparent', border: 'none', fontSize: '22px' }}
                        aria-label="Remove from favorites"
                        type="button"
                      >
                        ❤️
                      </button>
                    </div>

                    <p className="muted" style={{ marginTop: '12px', marginBottom: '12px' }}>
                      {fav.whyMatch}
                    </p>

                    {fav.details?.imageUrl && (
                      <img
                        src={fav.details.imageUrl}
                        alt={fav.country}
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          marginBottom: '12px',
                        }}
                      />
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {Array.isArray(fav.highlights) && fav.highlights.slice(0, 4).map((highlight: string, index: number) => (
                        <span
                          key={index}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: 'rgba(122,167,255,0.12)',
                            border: '1px solid rgba(122,167,255,0.25)',
                            fontSize: '12px',
                            color: '#cfe0ff',
                          }}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      <div>Match score: <strong style={{ color: '#e6ebff' }}>{fav.matchScore}%</strong></div>
                      <div>Budget: <strong style={{ color: '#e6ebff' }}>{fav.criteria?.budget || 'Any'}</strong></div>
                      <div>
                        Dates: <strong style={{ color: '#e6ebff' }}>{fav.criteria?.departureDate || 'N/A'} → {fav.criteria?.returnDate || 'N/A'}</strong>
                      </div>
                      <div>
                        Interests: <strong style={{ color: '#e6ebff' }}>
                          {Array.isArray(fav.criteria?.interests) && fav.criteria.interests.length > 0
                            ? fav.criteria.interests.join(', ')
                            : 'Any'}
                        </strong>
                      </div>
                      {fav.criteria?.originIata && (
                        <div>Origin: <strong style={{ color: '#e6ebff' }}>{fav.criteria.originIata}</strong></div>
                      )}
                      {fav.details?.hotel && (
                        <div>
                          Hotel: <strong style={{ color: '#e6ebff' }}>{fav.details.hotel.name}</strong>
                        </div>
                      )}
                      {fav.details?.flight && (
                        <div>
                          Flight: <strong style={{ color: '#e6ebff' }}>{fav.details.flight.currency} {fav.details.flight.price}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {fav.details?.flightLink && (
                        <a
                          href={fav.details.flightLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                        >
                          View Flights →
                        </a>
                      )}
                      {fav.details?.hotelLink && (
                        <a
                          href={fav.details.hotelLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                        >
                          View Hotel →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {destinationFavorites.length > 0 && (
            <>
              <h2 style={{ marginBottom: '12px', marginTop: '40px' }}>🌏 Destination Search Favorites</h2>
              <p className="muted" style={{ marginBottom: '24px' }}>
                Saved destination searches with flight, hotel, and weather details
              </p>

              <div className="grid grid-2">
                {destinationFavorites.map((fav) => {
                  const result = fav.searchResult || {};
                  const destination = result.destination || {};
                  const flight = result.flight || {};
                  const hotel = result.hotel || {};
                  
                  return (
                    <div
                      key={fav.id || fav.favoriteKey}
                      className="card"
                      style={{ padding: '20px', cursor: 'pointer' }}
                      onClick={() => setSelectedDestinationFavorite(fav)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDestinationFavorite(fav);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open saved destination details for ${fav.country}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0 }}>🌍 {fav.country}</h3>
                          <p className="muted" style={{ margin: '4px 0 0' }}>
                            {fav.capital} • {fav.departureDate} to {fav.returnDate}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDestinationFavorite(fav);
                          }}
                          style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer' }}
                          aria-label="Remove from favorites"
                          type="button"
                        >
                          ❤️
                        </button>
                      </div>

                      {destination.imageUrl && (
                        <img
                          src={destination.imageUrl}
                          alt={fav.country}
                          style={{
                            width: '100%',
                            height: '180px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            marginBottom: '16px',
                          }}
                        />
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        {flight.price && (
                          <a
                            href={flight.origin && flight.destination
                              ? buildGoogleFlightsUrl(
                                  flight.origin,
                                  flight.destination,
                                  fav.departureDate,
                                  fav.returnDate
                                )
                              : undefined}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!flight.origin || !flight.destination) e.preventDefault();
                            }}
                          >
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Flight
                            </p>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6df0c2' }}>
                              ✈️ {flight.currency} {flight.price}
                            </p>
                          </a>
                        )}
                        
                        {hotel.pricePerNight && (
                          <a
                            href={buildHotelBookingUrl(hotel.name || '', fav.capital || fav.country || '', fav.departureDate, fav.returnDate)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Hotel
                            </p>
                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#7aa7ff' }}>
                              🏨 {hotel.currency || fav.currency} {hotel.pricePerNight}/night
                            </p>
                          </a>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: 'rgba(122, 167, 255, 0.15)',
                          color: '#7aa7ff',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                        }}>
                          From {fav.departureAirport}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: 'rgba(109, 240, 194, 0.15)',
                          color: '#6df0c2',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          textTransform: 'capitalize',
                        }}>
                          {fav.budget} Budget
                        </span>
                        {Array.isArray(fav.interests) && fav.interests.slice(0, 2).map((interest: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'rgba(255, 159, 64, 0.15)',
                              color: '#ff9f40',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              textTransform: 'capitalize',
                            }}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {selectedAiFavorite && (
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
          onClick={() => setSelectedAiFavorite(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '760px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedAiFavorite.country}</h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>Capital: {selectedAiFavorite.capital}</p>
              </div>
              <button
                onClick={() => setSelectedAiFavorite(null)}
                className="btn btn-outline"
                type="button"
              >
                Close
              </button>
            </div>

            {selectedAiFavorite.details?.imageUrl && (
              <img
                src={selectedAiFavorite.details.imageUrl}
                alt={selectedAiFavorite.country}
                style={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}
              />
            )}

            <p style={{ color: '#d7def5', marginBottom: '12px' }}>{selectedAiFavorite.whyMatch}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {Array.isArray(selectedAiFavorite.highlights) && selectedAiFavorite.highlights.map((highlight: string, index: number) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(122,167,255,0.12)',
                    border: '1px solid rgba(122,167,255,0.25)',
                    fontSize: '12px',
                    color: '#cfe0ff',
                  }}
                >
                  {highlight}
                </span>
              ))}
            </div>

            {Array.isArray(selectedAiFavorite.activities) && selectedAiFavorite.activities.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>Activities</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#d7def5' }}>
                  {selectedAiFavorite.activities.map((activity: string, index: number) => (
                    <li key={index}>
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
            )}

            {Array.isArray(selectedAiFavorite.details?.weather) && selectedAiFavorite.details.weather.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>Weather</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  {selectedAiFavorite.details.weather.map((day: any, index: number) => (
                    <div key={index} className="card" style={{ padding: '10px', background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{day.date}</div>
                      <div style={{ fontWeight: 600 }}>
                        {getWeatherIcon(day.description)} {day.description}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {day.minTemp}°C - {day.maxTemp}°C
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
              <div>Match score: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.matchScore}%</strong></div>
              <div>Budget: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.criteria?.budget || 'Any'}</strong></div>
              <div>
                Dates: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.criteria?.departureDate || 'N/A'} → {selectedAiFavorite.criteria?.returnDate || 'N/A'}</strong>
              </div>
              <div>
                Interests: <strong style={{ color: '#e6ebff' }}>
                  {Array.isArray(selectedAiFavorite.criteria?.interests) && selectedAiFavorite.criteria.interests.length > 0
                    ? selectedAiFavorite.criteria.interests.join(', ')
                    : 'Any'}
                </strong>
              </div>
              {selectedAiFavorite.criteria?.originIata && (
                <div>Origin: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.criteria.originIata}</strong></div>
              )}
              {selectedAiFavorite.details?.hotel && (
                <div>Hotel: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.details.hotel.name}</strong></div>
              )}
              {selectedAiFavorite.details?.flight && (
                <div>Flight: <strong style={{ color: '#e6ebff' }}>{selectedAiFavorite.details.flight.currency} {selectedAiFavorite.details.flight.price}</strong></div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {selectedAiFavorite.details?.flightLink && (
                <a
                  href={selectedAiFavorite.details.flightLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  View Flights →
                </a>
              )}
              {selectedAiFavorite.details?.hotelLink && (
                <a
                  href={selectedAiFavorite.details.hotelLink}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  View Hotel →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDestinationFavorite && (
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
          onClick={() => setSelectedDestinationFavorite(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const result = selectedDestinationFavorite.searchResult || {};
              const destination = result.destination || {};
              const flight = result.flight || {};
              const hotel = result.hotel || {};
              const weather = result.weather || [];
              const highlights = result.highlights || [];
              const activities = result.activities || [];
              const events = result.events || [];
              const activityItems = Array.isArray(activities)
                ? activities
                    .map((activity: any) => normalizeActivityText(activity))
                    .filter((activity: string) => activity.length > 0)
                : [];
              const highlightItems = Array.isArray(highlights)
                ? highlights
                    .map((highlight: any) => normalizeHighlightText(highlight))
                    .filter((highlight: string) => highlight.length > 0)
                : [];
              const visibleActivityItems = activityItems.length > 0 ? activityItems : highlightItems.slice(0, 6);

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <h2 style={{ margin: 0 }}>🌍 {selectedDestinationFavorite.country}</h2>
                      <p className="muted" style={{ margin: '6px 0 0' }}>
                        {selectedDestinationFavorite.capital} • {selectedDestinationFavorite.departureDate} to {selectedDestinationFavorite.returnDate}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDestinationFavorite(null)}
                      className="btn btn-outline"
                      type="button"
                    >
                      Close
                    </button>
                  </div>

                  {destination.imageUrl && (
                    <img
                      src={destination.imageUrl}
                      alt={selectedDestinationFavorite.country}
                      style={{
                        width: '100%',
                        height: '260px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        marginBottom: '20px',
                      }}
                    />
                  )}

                  {destination.description && (
                    <p style={{ marginBottom: '20px', lineHeight: '1.6', color: '#cfe0ff' }}>
                      {destination.description}
                    </p>
                  )}

                  {/* Travel Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        From
                      </p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#7aa7ff' }}>
                        {selectedDestinationFavorite.departureAirport}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Budget
                      </p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6df0c2', textTransform: 'capitalize' }}>
                        {selectedDestinationFavorite.budget}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Currency
                      </p>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#ff9f40' }}>
                        {selectedDestinationFavorite.currency}
                      </p>
                    </div>
                  </div>

                  {/* Interests */}
                  {Array.isArray(selectedDestinationFavorite.interests) && selectedDestinationFavorite.interests.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>Your Interests</h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedDestinationFavorite.interests.map((interest: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'rgba(109, 240, 194, 0.15)',
                              color: '#6df0c2',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '500',
                              textTransform: 'capitalize',
                            }}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flight Information */}
                  {flight.price && (
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(109, 240, 194, 0.05)', borderRadius: '8px', border: '1px solid rgba(109, 240, 194, 0.2)' }}>
                      <a
                        href={flight.origin && flight.destination
                          ? buildGoogleFlightsUrl(
                              flight.origin,
                              flight.destination,
                              selectedDestinationFavorite.departureDate,
                              selectedDestinationFavorite.returnDate
                            )
                          : undefined}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => {
                          if (!flight.origin || !flight.destination) e.preventDefault();
                        }}
                      >
                        <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#6df0c2' }}>✈️ Flight (Open Details ↗)</h3>
                      </a>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            Price (Round Trip)
                          </p>
                          <p style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#6df0c2' }}>
                            {flight.currency} {flight.price}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            Route
                          </p>
                          <p style={{ margin: 0, fontSize: '14px', color: '#cfe0ff' }}>
                            {flight.origin} → {flight.destination}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hotel Information */}
                  {hotel.name && (
                    <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(122, 167, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(122, 167, 255, 0.2)' }}>
                      <a
                        href={buildHotelBookingUrl(
                          hotel.name,
                          selectedDestinationFavorite.capital || selectedDestinationFavorite.country,
                          selectedDestinationFavorite.departureDate,
                          selectedDestinationFavorite.returnDate
                        )}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#7aa7ff' }}>🏨 Hotel (Open Booking ↗)</h3>
                      </a>
                      <p style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '500', color: '#cfe0ff' }}>
                        {hotel.name}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            Price per Night
                          </p>
                          <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#7aa7ff' }}>
                            {hotel.currency || selectedDestinationFavorite.currency} {hotel.pricePerNight}
                          </p>
                        </div>
                        {hotel.rating && (
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Rating
                            </p>
                            <p style={{ margin: 0, fontSize: '16px', color: '#ffd700' }}>
                              {'⭐'.repeat(Math.round(hotel.rating))} {hotel.rating}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weather Forecast */}
                  {Array.isArray(weather) && weather.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>🌤️ Weather Forecast</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                        {weather.slice(0, 5).map((day: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px',
                              backgroundColor: 'rgba(122, 167, 255, 0.08)',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--muted)' }}>
                              Day {idx + 1}
                            </p>
                            <p style={{ margin: '0 0 4px 0', fontSize: '28px' }}>
                              {getWeatherIcon(day.description || '')}
                            </p>
                            <p style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#7aa7ff' }}>
                              {day.avgTemp}°C
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                              {day.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {highlightItems.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>✨ Highlights</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {highlightItems.map((highlight: string, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px',
                              backgroundColor: 'rgba(109, 240, 194, 0.08)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span style={{ fontSize: '18px' }}>📍</span>
                            <span style={{ fontSize: '14px', color: '#cfe0ff' }}>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {visibleActivityItems.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>🎯 Activities</h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {visibleActivityItems.map((activity: string, idx: number) => (
                          <a
                            key={idx}
                            href={buildActivityUrl(activity, selectedDestinationFavorite.capital || selectedDestinationFavorite.country)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              textDecoration: 'none',
                              padding: '14px',
                              backgroundColor: 'rgba(255, 159, 64, 0.08)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 159, 64, 0.15)',
                              display: 'block',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', color: '#ff9f40' }}>
                                {activity}
                              </h4>
                              <span style={{ fontSize: '13px', color: '#ffd700' }}>↗</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
                              Open activity details
                            </p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {Array.isArray(events) && events.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>🎉 Events</h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {events.map((event: any, idx: number) => {
                          const hasOfficialPage = !!event.url && !event.url.includes('google.com/search');
                          return (
                            <a
                              key={idx}
                              href={event.url || buildEventUrl(event.name || 'event', selectedDestinationFavorite.capital || selectedDestinationFavorite.country)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                textDecoration: 'none',
                                padding: '14px',
                                backgroundColor: 'rgba(122, 167, 255, 0.08)',
                                borderRadius: '8px',
                                border: '1px solid rgba(122, 167, 255, 0.15)',
                                display: 'block',
                                position: 'relative' as const,
                              }}
                            >
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#7aa7ff' }}>
                                {event.name}
                              </h4>
                              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>
                                {(event.date || `Month ${event.month}`)} • {event.type}
                              </p>
                              {event.time && (
                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted)' }}>
                                  🕒 {event.time}
                                </p>
                              )}
                              {event.location && (
                                <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--muted)' }}>
                                  📍 {event.location}
                                </p>
                              )}
                              {event.description && (
                                <p style={{ margin: 0, fontSize: '13px', color: '#cfe0ff', lineHeight: '1.5' }}>
                                  {event.description}
                                </p>
                              )}
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

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    {flight.origin && flight.destination && (
                      <a
                        href={buildGoogleFlightsUrl(
                          flight.origin,
                          flight.destination,
                          selectedDestinationFavorite.departureDate,
                          selectedDestinationFavorite.returnDate
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                      >
                        View Flights on Google ✈️
                      </a>
                    )}
                    {hotel.name && (
                      <a
                        href={buildHotelBookingUrl(
                          hotel.name,
                          selectedDestinationFavorite.capital || selectedDestinationFavorite.country,
                          selectedDestinationFavorite.departureDate,
                          selectedDestinationFavorite.returnDate
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                      >
                        Book Hotel →
                      </a>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Favorites;
