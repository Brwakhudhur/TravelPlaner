import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'data', 'travel-planner.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
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

// Initialize schema
export const connectDatabase = (): void => {
  try {
    // Create Users table
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

    // Create Destinations table
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

    // Create Preferences table
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

    // Create Favorites table (junction table for many-to-many relationship)
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

    // Create AI Favorites table (favorites for AI recommendations with criteria)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_ai_favorites (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        favoriteKey TEXT NOT NULL,
        country TEXT NOT NULL,
        capital TEXT,
        bestMonths TEXT,
        matchScore REAL,
        highlights TEXT,
        activities TEXT,
        estimatedBudget TEXT,
        whyMatch TEXT,
        criteria TEXT,
        details TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create Destination Favorites table (favorites for destination search results)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_destination_favorites (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        favoriteKey TEXT NOT NULL,
        country TEXT NOT NULL,
        capital TEXT,
        departureAirport TEXT,
        departureDate TEXT,
        returnDate TEXT,
        currency TEXT,
        budget TEXT,
        interests TEXT,
        searchResult TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create Cache table for external API responses
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
    db.run(`CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_destinations_budget ON destinations(budget);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_preferences_userId ON preferences(userId);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_favorites_userId ON user_favorites(userId);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_favorites_destinationId ON user_favorites(destinationId);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_ai_favorites_userId ON user_ai_favorites(userId);`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_favorites_key ON user_ai_favorites(userId, favoriteKey);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_destination_favorites_userId ON user_destination_favorites(userId);`);
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_destination_favorites_key ON user_destination_favorites(userId, favoriteKey);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_provider ON cache(provider);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_expiresAt ON cache(expiresAt);`, () => {
      console.log('✅ SQLite database initialized successfully');
    });

    // Patch existing databases that may not have the role column yet
    db.all("PRAGMA table_info(users);", (err, rows) => {
      if (err) {
        console.error('Error inspecting users table:', err);
        return;
      }

      const hasRole = rows.some((row: any) => row.name === 'role');
      const seedAdmin = () => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`, () => {
          void ensureAdminUser();
        });
      };
      if (!hasRole) {
        db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';", (alterErr) => {
          if (alterErr) {
            console.error('Error adding role column to users:', alterErr.message);
          } else {
            db.run("UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';", (updateErr) => {
              if (updateErr) {
                console.error('Error backfilling role column:', updateErr.message);
              }
              seedAdmin();
            });
          }
        });
      } else {
        seedAdmin();
      }
    });

    // Patch existing databases that may not have the details column in user_ai_favorites
    db.all("PRAGMA table_info(user_ai_favorites);", (err, rows) => {
      if (err) {
        return;
      }

      const hasDetails = rows.some((row: any) => row.name === 'details');
      if (!hasDetails) {
        db.run("ALTER TABLE user_ai_favorites ADD COLUMN details TEXT;", (alterErr) => {
          if (alterErr) {
            console.error('Error adding details column to user_ai_favorites:', alterErr.message);
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Helper function to promisify db.run
export const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Helper function to promisify db.get
export const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to promisify db.all
export const dbAll = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// User model methods
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

  findById: async (id: string) => {
    return dbGet(
      `SELECT id, displayName, email, role, createdAt, updatedAt FROM users WHERE id = ?`,
      [id]
    );
  },

  findByEmail: async (email: string) => {
    return dbGet(
      `SELECT id, displayName, email, password, role, createdAt, updatedAt FROM users WHERE email = ?`,
      [email]
    );
  },

  findAll: async () => {
    return dbAll(
      `SELECT id, displayName, email, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC`
    );
  },

  update: async (id: string, data: { displayName?: string; email?: string; password?: string; role?: 'user' | 'admin' }) => {
    const updates: string[] = [];
    const params: any[] = [];
    const now = new Date().toISOString();

    if (data.displayName !== undefined) {
      updates.push('displayName = ?');
      params.push(data.displayName);
    }

    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }

    if (data.password !== undefined) {
      updates.push('password = ?');
      params.push(bcrypt.hashSync(data.password, 10));
    }

    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }

    updates.push('updatedAt = ?');
    params.push(now);
    params.push(id);

    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return userModel.findById(id);
  },

  remove: async (id: string) => {
    return dbRun(`DELETE FROM users WHERE id = ?`, [id]);
  },

  setRole: async (id: string, role: 'user' | 'admin') => {
    const now = new Date().toISOString();
    await dbRun(`UPDATE users SET role = ?, updatedAt = ? WHERE id = ?`, [role, now, id]);
    return userModel.findById(id);
  },

  comparePassword: (hashedPassword: string, plainPassword: string): boolean => {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },
};

// Destination model methods
export const destinationModel = {
  create: async (data: {
    id: string;
    title: string;
    country: string;
    description: string;
    budget: string;
    bestMonths: string;
    tags: string;
    image?: string;
  }) => {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO destinations (id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.title,
        data.country,
        data.description || '',
        data.budget,
        data.bestMonths,
        data.tags,
        data.image || null,
        now,
        now,
      ]
    );
    
    return destinationModel.findById(data.id);
  },

  findById: async (id: string) => {
    return dbGet(
      `SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
       FROM destinations WHERE id = ?`,
      [id]
    );
  },

  findAll: async () => {
    return dbAll(
      `SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
       FROM destinations`
    );
  },

  findByBudget: async (budget: string) => {
    return dbAll(
      `SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
       FROM destinations WHERE budget = ?`,
      [budget]
    );
  },

  search: async (filters: { budget?: string; tags?: string; month?: number }) => {
    let query = `
      SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
      FROM destinations WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.budget) {
      query += ` AND budget = ?`;
      params.push(filters.budget);
    }

    if (filters.tags) {
      query += ` AND tags LIKE ?`;
      params.push(`%${filters.tags}%`);
    }

    if (filters.month) {
      query += ` AND bestMonths LIKE ?`;
      params.push(`%${filters.month}%`);
    }

    return dbAll(query, params);
  },
};

// Preference model methods
export const preferenceModel = {
  create: async (data: {
    id: string;
    userId: string;
    travelMonth: number;
    budget: string;
    interests: string;
  }) => {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO preferences (id, userId, travelMonth, budget, interests, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.userId, data.travelMonth, data.budget, data.interests, now, now]
    );
    return preferenceModel.findByUserId(data.userId);
  },

  findByUserId: async (userId: string) => {
    return dbGet(
      `SELECT id, userId, travelMonth, budget, interests, createdAt, updatedAt
       FROM preferences WHERE userId = ?`,
      [userId]
    );
  },

  update: async (userId: string, data: { travelMonth: number; budget: string; interests: string }) => {
    const now = new Date().toISOString();
    await dbRun(
      `UPDATE preferences SET travelMonth = ?, budget = ?, interests = ?, updatedAt = ?
       WHERE userId = ?`,
      [data.travelMonth, data.budget, data.interests, now, userId]
    );
    return preferenceModel.findByUserId(userId);
  },
};

// Favorites model methods
export const favoritesModel = {
  add: async (userId: string, destinationId: string) => {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT OR IGNORE INTO user_favorites (userId, destinationId, createdAt)
       VALUES (?, ?, ?)`,
      [userId, destinationId, now]
    );
  },

  remove: async (userId: string, destinationId: string) => {
    await dbRun(
      `DELETE FROM user_favorites WHERE userId = ? AND destinationId = ?`,
      [userId, destinationId]
    );
  },

  findByUserId: async (userId: string) => {
    return dbAll(
      `SELECT d.id, d.title, d.country, d.description, d.budget, d.bestMonths, d.tags, d.image, d.createdAt, d.updatedAt
       FROM destinations d
       INNER JOIN user_favorites uf ON d.id = uf.destinationId
       WHERE uf.userId = ?`,
      [userId]
    );
  },

  isFavorite: async (userId: string, destinationId: string): Promise<boolean> => {
    const result = await dbGet(
      `SELECT 1 FROM user_favorites WHERE userId = ? AND destinationId = ?`,
      [userId, destinationId]
    );
    return result !== undefined;
  },
};

// Destination Favorites model methods (favorites for destination search results)
export const destinationFavoritesModel = {
  add: async (data: {
    id: string;
    userId: string;
    favoriteKey: string;
    country: string;
    capital?: string;
    departureAirport: string;
    departureDate: string;
    returnDate: string;
    currency: string;
    budget: string;
    interests: string;
    searchResult: string;
  }) => {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT OR IGNORE INTO user_destination_favorites
       (id, userId, favoriteKey, country, capital, departureAirport, departureDate, returnDate, currency, budget, interests, searchResult, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.userId,
        data.favoriteKey,
        data.country,
        data.capital || '',
        data.departureAirport,
        data.departureDate,
        data.returnDate,
        data.currency,
        data.budget,
        data.interests,
        data.searchResult,
        now,
      ]
    );
  },

  removeByKey: async (userId: string, favoriteKey: string) => {
    await dbRun(
      `DELETE FROM user_destination_favorites WHERE userId = ? AND favoriteKey = ?`,
      [userId, favoriteKey]
    );
  },

  findByKey: async (userId: string, favoriteKey: string) => {
    return dbGet(
      `SELECT id FROM user_destination_favorites WHERE userId = ? AND favoriteKey = ?`,
      [userId, favoriteKey]
    );
  },

  findByUserId: async (userId: string) => {
    return dbAll(
      `SELECT id, favoriteKey, country, capital, departureAirport, departureDate, returnDate, currency, budget, interests, searchResult, createdAt
       FROM user_destination_favorites
       WHERE userId = ?
       ORDER BY createdAt DESC`,
      [userId]
    );
  },
};

// AI Favorites model methods (favorites for AI recommendations with criteria)
export const aiFavoritesModel = {
  add: async (data: {
    id: string;
    userId: string;
    favoriteKey: string;
    country: string;
    capital?: string;
    bestMonths: string;
    matchScore: number;
    highlights: string;
    activities: string;
    estimatedBudget: string;
    whyMatch: string;
    criteria: string;
    details: string;
  }) => {
    const now = new Date().toISOString();
    await dbRun(
      `INSERT OR IGNORE INTO user_ai_favorites
       (id, userId, favoriteKey, country, capital, bestMonths, matchScore, highlights, activities, estimatedBudget, whyMatch, criteria, details, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.userId,
        data.favoriteKey,
        data.country,
        data.capital || '',
        data.bestMonths,
        data.matchScore,
        data.highlights,
        data.activities,
        data.estimatedBudget,
        data.whyMatch,
        data.criteria,
        data.details,
        now,
      ]
    );
  },

  removeByKey: async (userId: string, favoriteKey: string) => {
    await dbRun(
      `DELETE FROM user_ai_favorites WHERE userId = ? AND favoriteKey = ?`,
      [userId, favoriteKey]
    );
  },

  findByKey: async (userId: string, favoriteKey: string) => {
    return dbGet(
      `SELECT id FROM user_ai_favorites WHERE userId = ? AND favoriteKey = ?`,
      [userId, favoriteKey]
    );
  },

  findByUserId: async (userId: string) => {
    return dbAll(
      `SELECT id, favoriteKey, country, capital, bestMonths, matchScore, highlights, activities, estimatedBudget, whyMatch, criteria, details, createdAt
       FROM user_ai_favorites
       WHERE userId = ?
       ORDER BY createdAt DESC`,
      [userId]
    );
  },
};

async function ensureAdminUser(): Promise<void> {
  const admins = [
    {
      email: process.env.ADMIN_EMAIL || 'brwa_as@hotmail.com',
      password: process.env.ADMIN_PASSWORD || '12345678',
      displayName: process.env.ADMIN_DISPLAY_NAME || 'Administrator',
    },
    {
      email: process.env.ADMIN2_EMAIL || 'brwa_as@yahoo.com',
      password: process.env.ADMIN2_PASSWORD || '12345678',
      displayName: process.env.ADMIN2_DISPLAY_NAME || 'Administrator 2',
    },
  ];

  for (const admin of admins) {
    try {
      const existingAdmin = await userModel.findByEmail(admin.email);

      if (!existingAdmin) {
        await userModel.create({
          id: uuidv4(),
          displayName: admin.displayName,
          email: admin.email,
          password: admin.password,
          role: 'admin',
        });
        console.log(`👑 Default admin account created (${admin.email}). Please change the password in production.`);
      } else if (existingAdmin.role !== 'admin') {
        await userModel.setRole(existingAdmin.id, 'admin');
        console.log(`👑 Existing user ${admin.email} promoted to admin.`);
      }
    } catch (error) {
      console.error(`Error ensuring admin user ${admin.email}:`, error);
    }
  }
}

export default db;
