import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  isAuthenticated: boolean;
  userEmail?: string;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated, userEmail, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = isAuthenticated ? JSON.parse(localStorage.getItem('user') || '{}')?.role : null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 11c6-6 12-6 18 0-6 6-12 6-18 0Z" stroke="url(#g1)" strokeWidth="2"/>
          <path d="M12 3v18" stroke="url(#g2)" strokeWidth="2"/>
          <defs>
            <linearGradient id="g1" x1="3" y1="11" x2="21" y2="11">
              <stop stopColor="#7aa7ff"/>
              <stop offset="1" stopColor="#6df0c2"/>
            </linearGradient>
            <linearGradient id="g2" x1="12" y1="3" x2="12" y2="21">
              <stop stopColor="#7aa7ff"/>
              <stop offset="1" stopColor="#6df0c2"/>
            </linearGradient>
          </defs>
        </svg>
        <span>Scoop Travel Planner</span>
      </Link>

      <button
        type="button"
        className="btn btn-outline nav-mobile-toggle"
        onClick={() => setMobileMenuOpen((current) => !current)}
        aria-expanded={mobileMenuOpen}
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
      </button>
      
      <div className={`nav-actions ${mobileMenuOpen ? '' : 'nav-collapsed'}`}>
        {isAuthenticated ? (
          <>
            {userRole === 'admin' ? (
              <>
                <Link to="/admin" className="btn btn-outline">User Management</Link>
                <Link to="/search" className="btn btn-outline">Search</Link>
              </>
            ) : (
              <>
                <Link to="/search" className="btn btn-outline">Search</Link>
                <Link to="/favorites" className="btn btn-outline">Favorites</Link>
              </>
            )}
            <Link to="/account" className="btn btn-outline">Account</Link>
            <span className="btn btn-outline nav-email" style={{opacity: 0.7}}>{userEmail}</span>
            <button onClick={handleLogout} className="btn btn-primary">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
