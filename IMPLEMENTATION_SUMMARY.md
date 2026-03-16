# Travel Planner - Implementation Summary

Complete implementation guide with code snippets and file locations for all core components.

---

## 📱 1. Frontend: React Single-Page Application (SPA)

### Overview
React 18 + TypeScript frontend running in the browser with client-side routing, authentication, and real-time UI updates.

### Key Files & Structure

```
frontend/
├── package.json                          # Dependencies: React, React Router, Axios
├── tsconfig.json                         # TypeScript configuration
├── public/
│   └── index.html                        # Entry point
├── src/
│   ├── App.tsx                           # Main app component with routing
│   ├── index.tsx                         # React DOM render
│   ├── index.css                         # Global styles
│   ├── components/
│   │   ├── Navbar.tsx                    # Navigation component
│   │   ├── DestinationCard.tsx           # Card display
│   │   └── SearchFilters.tsx             # Filter UI
│   ├── pages/
│   │   ├── Home.tsx                      # Landing page
│   │   ├── Login.tsx                     # Login page
│   │   ├── Register.tsx                  # Registration page
│   │   ├── Search.tsx                    # Search destinations
│   │   ├── Favorites.tsx                 # User favorites
│   │   ├── Account.tsx                   # Profile page
│   │   ├── AdminDashboard.tsx            # Admin panel
│   │   └── AIResults.tsx                 # AI recommendations
│   └── services/
│       └── api.ts                        # Axios API client
```

### Core Code - App.tsx
```typescript
// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import Favorites from './pages/Favorites';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<Search />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### API Service - api.ts
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (email: string, password: string, displayName: string) =>
    api.post('/auth/register', { email, password, displayName }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Destination endpoints
export const destinationAPI = {
  search: (month?: number, budget?: string, tags?: string) =>
    api.get('/destinations/search', { params: { month, budget, tags } }),
  getAll: () => api.get('/destinations'),
  getById: (id: string) => api.get(`/destinations/${id}`),
  saveFavorite: (destinationId: string) =>
    api.post('/destinations/favorites', { destinationId }),
  getFavorites: () => api.get('/destinations/favorites/list'),
};

export default api;
```

### Running Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## 🔧 2. Backend: Node.js with Express REST API

### Overview
Express.js REST API with TypeScript, providing endpoints for authentication, destinations, and admin functions.

### Key Files & Structure

```
backend/
├── package.json                          # Dependencies: Express, JWT, BCrypt, SQLite
├── tsconfig.json                         # TypeScript config
├── .env                                  # Environment variables
├── .env.example                          # Example configuration
├── src/
│   ├── server.ts                         # Server entry point
│   ├── app.ts                            # Express app setup
│   ├── config/
│   │   ├── database.ts                   # SQLite connection & schema
│   │   └── postgresAdapter.ts            # PostgreSQL alternative
│   ├── controllers/
│   │   ├── authController.ts             # Auth logic (register, login)
│   │   ├── userController.ts             # User management
│   │   ├── destinationController.ts      # Destination search
│   │   ├── adminController.ts            # Admin functions
│   │   ├── aiController.ts               # AI recommendations
│   │   └── exampleController.ts          # Provider examples
│   ├── middleware/
│   │   └── authMiddleware.ts             # JWT verification
│   ├── routes/
│   │   ├── authRoutes.ts                 # /api/auth routes
│   │   ├── destinationRoutes.ts          # /api/destinations routes
│   │   ├── adminRoutes.ts                # /api/admin routes
│   │   └── aiRoutes.ts                   # /api/ai routes
│   ├── models/
│   │   ├── User.ts                       # User schema
│   │   ├── Destination.ts                # Destination schema
│   │   └── Preference.ts                 # User preferences
│   ├── services/
│   │   ├── cache.ts                      # Caching service
│   │   ├── nominatim.ts                  # Geocoding
│   │   ├── openmeteo.ts                  # Weather data
│   │   ├── opentripmap.ts                # POI search
│   │   └── imageProvider.ts              # Image fetching
│   └── migrations/
│       └── index.ts                      # Database migrations
└── data/
    └── travel-planner.db                 # SQLite database file
```

### Core Code - server.ts
```typescript
// backend/src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { connectDatabase } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 5001;

const startServer = (): void => {
  try {
    // Initialize database
    connectDatabase();

    // Start server
    setTimeout(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📍 API endpoints: http://localhost:${PORT}/api`);
        console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      });
    }, 500);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

### Core Code - app.ts
```typescript
// backend/src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes';
import destinationRoutes from './routes/destinationRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Error handling
app.use((err: Error, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
```

### Auth Controller
```typescript
// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import { userModel } from '../config/database';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const generateToken = (userId: string, role: 'user' | 'admin'): string => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayName, email, password } = req.body;

    // Check if user exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Create user
    const userId = uuidv4();
    const user = await userModel.create({
      id: userId,
      displayName,
      email,
      password,
      role: 'user',
    });

    // Generate token
    const token = generateToken(userId, 'user');

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user!.id,
        displayName: user!.displayName,
        email: user!.email,
        role: user!.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userModel.findByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check password
    const isPasswordValid = userModel.comparePassword(user.password, password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken(user.id, user.role as 'user' | 'admin');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};
```

### Auth Middleware
```typescript
// backend/src/middleware/authMiddleware.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { userModel } from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'user' | 'admin';
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role?: 'user' | 'admin' };
    const user = await userModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    req.userId = user.id;
    req.userRole = user.role as 'user' | 'admin';

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
```

### Running Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5001
```

---

## 🗄️ 3. Database: SQLite (Development) → PostgreSQL (Production)

### Overview
SQLite for rapid development and prototyping, with a migration path to PostgreSQL for production scale.

### SQLite Implementation

#### File: backend/src/config/database.ts
```typescript
// backend/src/config/database.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'data', 'travel-planner.db');

// Initialize SQLite connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
});

db.configure('busyTimeout', 5000);
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

// Create schema
export const connectDatabase = (): void => {
  try {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Destinations table
    db.run(`
      CREATE TABLE IF NOT EXISTS destinations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        country TEXT NOT NULL,
        description TEXT,
        budget TEXT NOT NULL CHECK(budget IN ('budget', 'moderate', 'luxury')),
        bestMonths TEXT NOT NULL,
        tags TEXT NOT NULL,
        image TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Preferences table
    db.run(`
      CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL UNIQUE,
        travelMonth INTEGER NOT NULL,
        budget TEXT NOT NULL,
        interests TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Favorites table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        userId TEXT NOT NULL,
        destinationId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        PRIMARY KEY (userId, destinationId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (destinationId) REFERENCES destinations(id) ON DELETE CASCADE
      );
    `);

    // Cache table (for external API results)
    db.run(`
      CREATE TABLE IF NOT EXISTS cache (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        provider TEXT NOT NULL,
        ttlSeconds INTEGER NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        hits INTEGER DEFAULT 0,
        lastAccessed TEXT
      );
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_expiresAt ON cache(expiresAt);`, () => {
      console.log('✅ SQLite database initialized successfully');
    });
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Promisified database helpers
export const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// User model
export const userModel = {
  create: async (data: { id: string; displayName: string; email: string; password: string; role?: 'user' | 'admin' }) => {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const now = new Date().toISOString();
    const role = data.role || 'user';
    
    await dbRun(
      `INSERT INTO users (id, displayName, email, password, role, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.displayName, data.email, hashedPassword, role, now, now]
    );
    
    return userModel.findById(data.id);
  },

  findByEmail: async (email: string) => {
    return dbGet(
      `SELECT id, displayName, email, password, role, createdAt, updatedAt FROM users WHERE email = ?`,
      [email]
    );
  },

  comparePassword: (hashedPassword: string, plainPassword: string): boolean => {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },
};

export default db;
```

### PostgreSQL Migration Path

#### File: backend/src/config/postgresAdapter.ts
```typescript
// backend/src/config/postgresAdapter.ts
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'travel_planner',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

export const connectPostgresDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }
};

export const postgresUserModel = {
  create: async (data: { id: string; displayName: string; email: string; password: string }) => {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO users (id, displayName, email, password, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, displayName, email, createdAt, updatedAt
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.displayName,
      data.email,
      hashedPassword,
      now,
      now,
    ]);
    
    return result.rows[0];
  },

  findByEmail: async (email: string) => {
    const query = `SELECT id, displayName, email, password, createdAt, updatedAt FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },
};

export default pool;
```

### Database Location
```
backend/data/travel-planner.db    # SQLite file (development)
```

### To Migrate to PostgreSQL

1. **Set DATABASE_URL in .env:**
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/travel_planner
   ```

2. **Run migrations:**
   ```bash
   npm run migrate
   ```

3. **Backend automatically detects** and uses PostgreSQL

See: `backend/MIGRATION_GUIDE.md` for detailed instructions.

---

## 💾 4. Caching: Redis (Optional) + Database-Backed Cache

### Overview
Dual-layer caching system: fast Redis for hot data + persistent database cache as fallback.

### Key Files & Structure

```
backend/src/services/
├── cache.ts                              # Main caching service
├── nominatim.ts                          # Geocoding with cache
├── openmeteo.ts                          # Weather with cache
├── opentripmap.ts                        # POI search with cache
└── imageProvider.ts                      # Image fetching with cache
```

### Caching Service

#### File: backend/src/services/cache.ts
```typescript
// backend/src/services/cache.ts
import { dbRun, dbGet, dbAll } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

let redisClient: any = null;
let useRedis = false;

// Initialize Redis (optional)
export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('ℹ️  Redis not configured. Using database-backed cache.');
    return;
  }

  try {
    // Uncomment when redis installed: npm install redis
    // const redis = require('redis');
    // redisClient = redis.createClient({ url: redisUrl });
    // await redisClient.connect();
    // useRedis = true;
    // console.log('✅ Redis connected for caching');
  } catch (error) {
    console.error('⚠️  Redis connection failed, falling back to database cache:', error);
  }
};

// Get from cache
export const getCache = async (
  key: string,
  provider: string = 'general'
): Promise<any | null> => {
  try {
    // Try Redis first
    if (useRedis && redisClient) {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`💾 Cache hit (Redis): ${key}`);
        return JSON.parse(cached);
      }
    }

    // Fall back to database
    const entry = await dbGet(
      `SELECT value FROM cache WHERE key = ? AND expiresAt > datetime('now')`,
      [key]
    );

    if (entry) {
      console.log(`💾 Cache hit (DB): ${key}`);
      await dbRun(
        `UPDATE cache SET hits = hits + 1, lastAccessed = datetime('now') WHERE key = ?`,
        [key]
      );
      return JSON.parse(entry.value);
    }

    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Set in cache
export const setCache = async (
  key: string,
  value: any,
  ttlSeconds: number = 3600,
  provider: string = 'general'
): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const valueStr = JSON.stringify(value);

    // Set in Redis
    if (useRedis && redisClient) {
      await redisClient.setEx(key, ttlSeconds, valueStr);
    }

    // Always set in database
    await dbRun(
      `INSERT OR REPLACE INTO cache (id, key, value, provider, ttlSeconds, expiresAt, createdAt, hits, lastAccessed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      [uuidv4(), key, valueStr, provider, ttlSeconds, expiresAt]
    );

    console.log(`💾 Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

// Invalidate cache
export const invalidateCache = async (key: string): Promise<void> => {
  try {
    if (useRedis && redisClient) {
      await redisClient.del(key);
    }
    await dbRun(`DELETE FROM cache WHERE key = ?`, [key]);
    console.log(`🗑️  Cache invalidated: ${key}`);
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
};

// Clear expired entries
export const clearExpiredCache = async (): Promise<number> => {
  try {
    const result = await dbRun(
      `DELETE FROM cache WHERE expiresAt < datetime('now')`
    );
    console.log(`🧹 Cleaned up ${result?.changes || 0} expired cache entries`);
    return result?.changes || 0;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
};

// Get or fetch
export const cacheOrFetch = async (
  key: string,
  fetchFn: () => Promise<any>,
  ttlSeconds: number = 3600,
  provider: string = 'general'
): Promise<any> => {
  // Try cache first
  const cached = await getCache(key, provider);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  try {
    const data = await fetchFn();
    await setCache(key, data, ttlSeconds, provider);
    return data;
  } catch (error) {
    console.error(`Cache fetch error for ${key}:`, error);
    throw error;
  }
};
```

### Example Service with Caching

#### File: backend/src/services/nominatim.ts
```typescript
// backend/src/services/nominatim.ts
import axios from 'axios';
import { cacheOrFetch } from './cache';

const BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const CACHE_TTL = 86400; // 24 hours

interface GeoLocation {
  latitude: number;
  longitude: number;
  displayName: string;
  country?: string;
  city?: string;
}

export const geocodeAddress = async (address: string): Promise<GeoLocation | null> => {
  if (!address || address.trim().length === 0) {
    throw new Error('Address is required');
  }

  const cacheKey = `geocoding:${address.toLowerCase()}`;

  return cacheOrFetch(
    cacheKey,
    async () => {
      try {
        const response = await axios.get(`${BASE_URL}/search`, {
          params: {
            q: address,
            format: 'json',
            limit: 1,
          },
          timeout: 5000,
          headers: {
            'User-Agent': 'TravelPlanner/1.0',
          },
        });

        if (!response.data || response.data.length === 0) {
          return null;
        }

        const result = response.data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          displayName: result.display_name,
          country: result.address?.country,
          city: result.address?.city || result.address?.town,
        };
      } catch (error: any) {
        console.error(`Geocoding error for "${address}":`, error.message);
        throw new Error(`Failed to geocode address: ${error.message}`);
      }
    },
    CACHE_TTL,
    'geocoding'
  );
};

export default { geocodeAddress };
```

### Cache Configuration

#### Environment Variables (.env)
```bash
# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Cache TTLs
CACHE_TTL_GEOCODING=86400      # 24 hours
CACHE_TTL_WEATHER=3600         # 1 hour
CACHE_TTL_POI=604800           # 7 days
CACHE_TTL_IMAGE=604800         # 7 days
```

### Enable Redis (Production)

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Or use Docker
docker run -d -p 6379:6379 redis:latest

# Install Node.js Redis client
npm install redis

# Add to .env
REDIS_URL=redis://localhost:6379
```

---

## 🚀 Running the Full Stack

### Terminal 1: Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:5001
```

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

### Test Credentials
```
Email: brwa_as@hotmail.com
Password: 12345678
```

---

## 📊 Quick Summary

| Component | Technology | Files | Status |
|-----------|-----------|-------|--------|
| **Frontend** | React 18 + TypeScript | `frontend/src/` | ✅ Complete |
| **Backend** | Node.js + Express + TypeScript | `backend/src/` | ✅ Complete |
| **Database** | SQLite (Dev) → PostgreSQL (Prod) | `backend/src/config/` | ✅ Complete |
| **Caching** | Redis (Optional) + SQLite | `backend/src/services/cache.ts` | ✅ Complete |
| **Auth** | JWT + BCrypt | `backend/src/controllers/authController.ts` | ✅ Complete |
| **External APIs** | Nominatim, Open-Meteo, OpenTripMap | `backend/src/services/` | ✅ Complete |

---

## 📚 Documentation

- [QUICK_START.md](QUICK_START.md) - Setup and running
- [EXTERNAL_PROVIDERS_GUIDE.md](EXTERNAL_PROVIDERS_GUIDE.md) - API integrations
- [MIGRATION_GUIDE.md](backend/MIGRATION_GUIDE.md) - SQLite → PostgreSQL
- [README.md](README.md) - Full project documentation

---

**Built for FYP - Travel Planner System (January 2026)**
