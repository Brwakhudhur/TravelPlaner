import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (data: { displayName: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
};

// Destination API
export const destinationAPI = {
  search: (params: { month?: number; budget?: string; tags?: string }) =>
    api.get('/destinations/search', { params }),
  
  getAll: () =>
    api.get('/destinations'),
  
  getById: (id: string) =>
    api.get(`/destinations/${id}`),

  getImage: (query: string) =>
    api.get('/destinations/image', { params: { query } }),
  
  savePreferences: (data: { travelMonth: number; budget: string; interests: string[] }) =>
    api.post('/destinations/preferences', data),

  searchSpecific: (data: { 
    destination: string; 
    departureAirport: string; 
    departureDate: string; 
    returnDate: string;
    currency?: string;
    budget?: string;
    interests?: string[];
  }) =>
    api.post('/destinations/search-specific', data),
  
  toggleFavorite: (destinationId: string) =>
    api.post('/destinations/favorites', { destinationId }),
  
  getFavorites: () =>
    api.get('/destinations/favorites/list'),
};

// Admin API
export const adminAPI = {
  listUsers: () =>
    api.get('/admin/users'),
  
  getUser: (id: string) =>
    api.get(`/admin/users/${id}`),
  
  createUser: (data: { displayName: string; email: string; password: string; role?: 'user' | 'admin' }) =>
    api.post('/admin/users', data),
  
  updateUser: (id: string, data: { displayName?: string; email?: string; password?: string; role?: 'user' | 'admin' }) =>
    api.put(`/admin/users/${id}`, data),
  
  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),
};

// AI API
export const aiAPI = {
  getRecommendations: (data: { month: number; budget: string; interests: string[] }) =>
    api.post('/ai/recommendations', data),
};

// AI Favorites API
export const aiFavoritesAPI = {
  toggle: (data: { recommendation: any; criteria: any; details?: any }) =>
    api.post('/ai/favorites', data),
  list: () =>
    api.get('/ai/favorites'),
};

// Destination Search Favorites API
export const destinationFavoritesAPI = {
  toggle: (data: { searchParams: any; searchResult: any }) =>
    api.post('/destinations/search-favorites', data),
  list: () =>
    api.get('/destinations/search-favorites/list'),
};

// Flights API
export const flightsAPI = {
  getCheapest: (data: {
    origin: string;
    departureDate: string;
    returnDate: string;
    currency?: string;
    destinations: { country?: string; capital?: string }[];
  }) => api.post('/flights/cheapest', data),

  searchAirports: (keyword: string) =>
    api.get('/flights/airports', { params: { keyword } }),
};

// Weather API
export const weatherAPI = {
  getForecast: (params: { city: string; startDate: string; endDate: string }) =>
    api.get('/weather/forecast', { params }),
};

// Hotels API
export const hotelsAPI = {
  searchHotels: (data: {
    location: string;
    checkInDate: string;
    checkOutDate: string;
    currency?: string;
  }) => api.post('/hotels/search', data),
};

export default api;
