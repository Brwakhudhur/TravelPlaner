import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import AdminDashboard from './pages/AdminDashboard';
import Account from './pages/Account';
import AIResults from './pages/AIResults';
import DestinationSearch from './pages/DestinationSearch';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // In production, verify token with backend
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const handleLogin = (token: string, userData: any) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="container">
        <Navbar 
          isAuthenticated={isAuthenticated} 
          userEmail={user?.email}
          onLogout={handleLogout}
        />
        
        <main style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/search" element={<Search isAuthenticated={isAuthenticated} />} />
            <Route path="/destination-search" element={<DestinationSearch isAuthenticated={isAuthenticated} />} />
            <Route path="/ai-results" element={<AIResults />} />
            <Route path="/favorites" element={<Favorites isAuthenticated={isAuthenticated} />} />
            <Route path="/admin" element={<AdminDashboard isAuthenticated={isAuthenticated} userRole={user?.role} />} />
            <Route path="/account" element={<Account isAuthenticated={isAuthenticated} onLogout={handleLogout} />} />
          </Routes>
        </main>

        <footer style={{ padding: '28px 0', color: 'var(--muted)', fontSize: '14px', textAlign: 'center' }}>
          <div>&copy; {new Date().getFullYear()} Scoop Travel Planner • Built for your FYP</div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
