import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div>
      <section className="hero-grid">
        <div className="card">
          <h1 style={{ fontSize: 'clamp(2rem, 8vw, 44px)', lineHeight: '1.1', margin: '0 0 16px' }}>
            Find your next <span style={{
              background: 'linear-gradient(135deg, #7aa7ff, #6df0c2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>perfect destination</span>
          </h1>
          
          <p style={{ fontSize: 'clamp(1rem, 4vw, 18px)', color: '#d7def5', marginBottom: '24px', lineHeight: '1.6' }}>
            Scoop Travel Planner helps you discover cities, beaches and nature escapes matched to your season, budget and style. 
            Save favorites, compare options and build short itineraries in minutes.
          </p>

          <div className="cta-row" style={{ marginBottom: '16px' }}>
            <Link to="/register" className="btn btn-primary">
              Create your free account
            </Link>
            <Link to="/login" className="btn btn-outline">
              I already have an account
            </Link>
          </div>

          <p className="muted" style={{ fontSize: '14px' }}>
            Registration unlocks favorites, personalized results and saved itineraries.
          </p>
        </div>

        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✈️</div>
          <h3 style={{ marginBottom: '12px' }}>Ready to explore?</h3>
          <p className="muted">Join thousands of travelers finding their perfect destinations</p>
        </div>
      </section>

      <section style={{ padding: '40px 0' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '24px' }}>Why you'll love Scoop</h2>
        <div className="grid grid-2">
          <div className="card">
            <h3>🎯 Personalized results</h3>
            <p className="muted">Filter by season, budget, nightlife, nature and more—get destinations that match your vibe.</p>
          </div>
          <div className="card">
            <h3>❤️ Favorites & compare</h3>
            <p className="muted">Shortlist places you like, then compare cost, weather and highlights side-by-side.</p>
          </div>
          <div className="card">
            <h3>📍 Smart search</h3>
            <p className="muted">Search by month, budget, and interests to find destinations perfect for you.</p>
          </div>
          <div className="card">
            <h3>🔐 Secure & private</h3>
            <p className="muted">Your data is encrypted and secure. Register to access all features.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
