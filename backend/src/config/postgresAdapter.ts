import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'travel_planner',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(1);
});

const initSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      displayName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS user_favorites (
      userId TEXT NOT NULL,
      destinationId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (userId, destinationId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (destinationId) REFERENCES destinations(id) ON DELETE CASCADE
    );

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

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);
    CREATE INDEX IF NOT EXISTS idx_destinations_budget ON destinations(budget);
    CREATE INDEX IF NOT EXISTS idx_preferences_userId ON preferences(userId);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_userId ON user_favorites(userId);
    CREATE INDEX IF NOT EXISTS idx_user_favorites_destinationId ON user_favorites(destinationId);
    CREATE INDEX IF NOT EXISTS idx_user_ai_favorites_userId ON user_ai_favorites(userId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_favorites_key ON user_ai_favorites(userId, favoriteKey);
    CREATE INDEX IF NOT EXISTS idx_user_destination_favorites_userId ON user_destination_favorites(userId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_destination_favorites_key ON user_destination_favorites(userId, favoriteKey);
    CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key);
    CREATE INDEX IF NOT EXISTS idx_cache_provider ON cache(provider);
    CREATE INDEX IF NOT EXISTS idx_cache_expiresAt ON cache(expiresAt);
  `);
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

export const connectPostgresDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    client.release();
    await initSchema();
    await ensureAdminUser();
    console.log('✅ PostgreSQL connected and initialized successfully');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    process.exit(1);
  }
};

export const userModel = {
  create: async (data: { id: string; displayName: string; email: string; password: string; role?: 'user' | 'admin' }) => {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const now = new Date().toISOString();
    const role = data.role || 'user';

    const query = `
      INSERT INTO users (id, displayName, email, password, role, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, displayName, email, role, createdAt, updatedAt
    `;

    const result = await pool.query(query, [
      data.id,
      data.displayName,
      data.email,
      hashedPassword,
      role,
      now,
      now,
    ]);

    return result.rows[0];
  },

  findById: async (id: string) => {
    const query = `SELECT id, displayName, email, role, createdAt, updatedAt FROM users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  findByEmail: async (email: string) => {
    const query = `SELECT id, displayName, email, password, role, createdAt, updatedAt FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  findAll: async () => {
    const query = `SELECT id, displayName, email, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC`;
    const result = await pool.query(query);
    return result.rows;
  },

  update: async (id: string, data: { displayName?: string; email?: string; password?: string; role?: 'user' | 'admin' }) => {
    const updates: string[] = [];
    const params: any[] = [];
    const now = new Date().toISOString();

    if (data.displayName !== undefined) {
      updates.push(`displayName = $${params.length + 1}`);
      params.push(data.displayName);
    }

    if (data.email !== undefined) {
      updates.push(`email = $${params.length + 1}`);
      params.push(data.email);
    }

    if (data.password !== undefined) {
      updates.push(`password = $${params.length + 1}`);
      params.push(bcrypt.hashSync(data.password, 10));
    }

    if (data.role !== undefined) {
      updates.push(`role = $${params.length + 1}`);
      params.push(data.role);
    }

    updates.push(`updatedAt = $${params.length + 1}`);
    params.push(now);
    params.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`;
    await pool.query(query, params);
    return userModel.findById(id);
  },

  remove: async (id: string) => {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  },

  setRole: async (id: string, role: 'user' | 'admin') => {
    const now = new Date().toISOString();
    await pool.query(`UPDATE users SET role = $1, updatedAt = $2 WHERE id = $3`, [role, now, id]);
    return userModel.findById(id);
  },

  comparePassword: (hashedPassword: string, plainPassword: string): boolean => {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },
};

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
    const query = `
      INSERT INTO destinations (id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
    `;

    const result = await pool.query(query, [
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
    ]);

    return result.rows[0];
  },

  findById: async (id: string) => {
    const query = `
      SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
      FROM destinations WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  findAll: async () => {
    const query = `
      SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
      FROM destinations
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  findByBudget: async (budget: string) => {
    const query = `
      SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
      FROM destinations WHERE budget = $1
    `;
    const result = await pool.query(query, [budget]);
    return result.rows;
  },

  search: async (filters: { budget?: string; tags?: string; month?: number }) => {
    let query = `
      SELECT id, title, country, description, budget, bestMonths, tags, image, createdAt, updatedAt
      FROM destinations
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.budget) {
      query += ` AND budget = $${params.length + 1}`;
      params.push(filters.budget);
    }

    if (filters.tags) {
      query += ` AND tags ILIKE $${params.length + 1}`;
      params.push(`%${filters.tags}%`);
    }

    if (filters.month) {
      query += ` AND bestMonths ILIKE $${params.length + 1}`;
      params.push(`%${filters.month}%`);
    }

    const result = await pool.query(query, params);
    return result.rows;
  },
};

export const preferenceModel = {
  create: async (data: {
    id: string;
    userId: string;
    travelMonth: number;
    budget: string;
    interests: string;
  }) => {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO preferences (id, userId, travelMonth, budget, interests, createdAt, updatedAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, userId, travelMonth, budget, interests, createdAt, updatedAt
    `;

    const result = await pool.query(query, [
      data.id,
      data.userId,
      data.travelMonth,
      data.budget,
      data.interests,
      now,
      now,
    ]);

    return result.rows[0];
  },

  findByUserId: async (userId: string) => {
    const query = `
      SELECT id, userId, travelMonth, budget, interests, createdAt, updatedAt
      FROM preferences WHERE userId = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  update: async (userId: string, data: { travelMonth: number; budget: string; interests: string }) => {
    const now = new Date().toISOString();
    const query = `
      UPDATE preferences SET travelMonth = $1, budget = $2, interests = $3, updatedAt = $4
      WHERE userId = $5
      RETURNING id, userId, travelMonth, budget, interests, createdAt, updatedAt
    `;

    const result = await pool.query(query, [
      data.travelMonth,
      data.budget,
      data.interests,
      now,
      userId,
    ]);

    return result.rows[0];
  },
};

export const favoritesModel = {
  add: async (userId: string, destinationId: string) => {
    const now = new Date().toISOString();
    const query = `
      INSERT INTO user_favorites (userId, destinationId, createdAt)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `;
    await pool.query(query, [userId, destinationId, now]);
  },

  remove: async (userId: string, destinationId: string) => {
    await pool.query(`DELETE FROM user_favorites WHERE userId = $1 AND destinationId = $2`, [userId, destinationId]);
  },

  findByUserId: async (userId: string) => {
    const query = `
      SELECT d.id, d.title, d.country, d.description, d.budget, d.bestMonths, d.tags, d.image, d.createdAt, d.updatedAt
      FROM destinations d
      INNER JOIN user_favorites uf ON d.id = uf.destinationId
      WHERE uf.userId = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  isFavorite: async (userId: string, destinationId: string): Promise<boolean> => {
    const result = await pool.query(`SELECT 1 FROM user_favorites WHERE userId = $1 AND destinationId = $2`, [userId, destinationId]);
    return result.rows.length > 0;
  },
};

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
    await pool.query(
      `INSERT INTO user_destination_favorites
       (id, userId, favoriteKey, country, capital, departureAirport, departureDate, returnDate, currency, budget, interests, searchResult, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (userId, favoriteKey) DO NOTHING`,
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
    await pool.query(
      `DELETE FROM user_destination_favorites WHERE userId = $1 AND favoriteKey = $2`,
      [userId, favoriteKey]
    );
  },

  findByKey: async (userId: string, favoriteKey: string) => {
    const result = await pool.query(
      `SELECT id FROM user_destination_favorites WHERE userId = $1 AND favoriteKey = $2`,
      [userId, favoriteKey]
    );
    return result.rows[0];
  },

  findByUserId: async (userId: string) => {
    const result = await pool.query(
      `SELECT id, favoriteKey, country, capital, departureAirport, departureDate, returnDate, currency, budget, interests, searchResult, createdAt
       FROM user_destination_favorites
       WHERE userId = $1
       ORDER BY createdAt DESC`,
      [userId]
    );
    return result.rows;
  },
};

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
    await pool.query(
      `INSERT INTO user_ai_favorites
       (id, userId, favoriteKey, country, capital, bestMonths, matchScore, highlights, activities, estimatedBudget, whyMatch, criteria, details, createdAt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (userId, favoriteKey) DO NOTHING`,
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
    await pool.query(`DELETE FROM user_ai_favorites WHERE userId = $1 AND favoriteKey = $2`, [userId, favoriteKey]);
  },

  findByKey: async (userId: string, favoriteKey: string) => {
    const result = await pool.query(`SELECT id FROM user_ai_favorites WHERE userId = $1 AND favoriteKey = $2`, [userId, favoriteKey]);
    return result.rows[0];
  },

  findByUserId: async (userId: string) => {
    const result = await pool.query(
      `SELECT id, favoriteKey, country, capital, bestMonths, matchScore, highlights, activities, estimatedBudget, whyMatch, criteria, details, createdAt
       FROM user_ai_favorites
       WHERE userId = $1
       ORDER BY createdAt DESC`,
      [userId]
    );
    return result.rows;
  },
};

export const cacheModel = {
  getValidByKey: async (key: string) => {
    const result = await pool.query(
      `SELECT value FROM cache WHERE key = $1 AND expiresAt::timestamptz > NOW()`,
      [key]
    );
    return result.rows[0];
  },

  touch: async (key: string) => {
    await pool.query(
      `UPDATE cache SET hits = hits + 1, lastAccessed = NOW()::text WHERE key = $1`,
      [key]
    );
  },

  upsert: async (data: {
    id: string;
    key: string;
    value: string;
    provider: string;
    ttlSeconds: number;
    expiresAt: string;
  }) => {
    await pool.query(
      `INSERT INTO cache (id, key, value, provider, ttlSeconds, expiresAt, createdAt, hits, lastAccessed)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()::text, 0, NOW()::text)
       ON CONFLICT (key)
       DO UPDATE SET
         value = EXCLUDED.value,
         provider = EXCLUDED.provider,
         ttlSeconds = EXCLUDED.ttlSeconds,
         expiresAt = EXCLUDED.expiresAt,
         lastAccessed = NOW()::text`,
      [data.id, data.key, data.value, data.provider, data.ttlSeconds, data.expiresAt]
    );
  },

  deleteByKey: async (key: string) => {
    await pool.query(`DELETE FROM cache WHERE key = $1`, [key]);
  },

  deleteByPattern: async (pattern: string) => {
    await pool.query(`DELETE FROM cache WHERE key LIKE $1`, [pattern]);
  },

  clearExpired: async () => {
    const result = await pool.query(`DELETE FROM cache WHERE expiresAt::timestamptz < NOW()`);
    return result.rowCount || 0;
  },

  getStats: async () => {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int as "totalEntries",
        COALESCE(SUM(hits), 0)::int as "totalHits",
        COALESCE(AVG(hits), 0)::float as "avgHits",
        COUNT(CASE WHEN expiresAt::timestamptz > NOW() THEN 1 END)::int as "validEntries"
      FROM cache
    `);
    return result.rows[0];
  },
};

export default pool;
