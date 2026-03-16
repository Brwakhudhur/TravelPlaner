-- Migration: 001_initial_schema
-- Description: Create initial schema for SQLite/PostgreSQL compatibility
-- Created: 2025-01-19

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  displayName TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Destinations table
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

CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);
CREATE INDEX IF NOT EXISTS idx_destinations_budget ON destinations(budget);

-- Preferences table
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

CREATE INDEX IF NOT EXISTS idx_preferences_userId ON preferences(userId);

-- User Favorites table (junction table)
CREATE TABLE IF NOT EXISTS user_favorites (
  userId TEXT NOT NULL,
  destinationId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (userId, destinationId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destinationId) REFERENCES destinations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_userId ON user_favorites(userId);
CREATE INDEX IF NOT EXISTS idx_user_favorites_destinationId ON user_favorites(destinationId);

-- AI Favorites table (AI recommendations with criteria)
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

CREATE INDEX IF NOT EXISTS idx_user_ai_favorites_userId ON user_ai_favorites(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_favorites_key ON user_ai_favorites(userId, favoriteKey);
