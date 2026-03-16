/**
 * Database Migrations
 * Supports both SQLite and PostgreSQL
 * Usage: npm run migrate (runs all pending migrations)
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

interface Migration {
  name: string;
  content: string;
}

const DB_PATH = path.join(process.cwd(), 'data', 'travel-planner.db');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

// Initialize migrations tracking table
const initMigrationsTable = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executedAt TEXT NOT NULL
    );
  `);
};

// Get all migration files
const getMigrations = (): Migration[] => {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(file => ({
    name: file.replace('.sql', ''),
    content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'),
  }));
};

// Run migrations
export const runMigrations = (db: Database.Database): void => {
  try {
    console.log('🔄 Running database migrations...');
    
    initMigrationsTable(db);
    
    const migrations = getMigrations();
    const executedMigrations = db.prepare('SELECT name FROM _migrations').all() as Array<{ name: string }>;
    const executedNames = executedMigrations.map(m => m.name);

    let migrationsRun = 0;

    for (const migration of migrations) {
      if (executedNames.includes(migration.name)) {
        console.log(`✅ ${migration.name} (already executed)`);
        continue;
      }

      try {
        // Split by semicolon to handle multiple statements
        const statements = migration.content
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          db.exec(statement);
        }

        // Record migration
        db.prepare('INSERT INTO _migrations (name, executedAt) VALUES (?, ?)').run(
          migration.name,
          new Date().toISOString()
        );

        console.log(`✅ ${migration.name} (executed)`);
        migrationsRun++;
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.name}`, error);
        throw error;
      }
    }

    if (migrationsRun === 0) {
      console.log('✅ All migrations already executed');
    } else {
      console.log(`✅ ${migrationsRun} migration(s) executed successfully`);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

// Generate migration file template
export const generateMigration = (name: string): void => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  const template = `-- Migration: ${filename}
-- Description: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL statements here
`;

  fs.writeFileSync(filepath, template);
  console.log(`✅ Migration template created: ${filename}`);
};

// Export for CLI usage
if (process.argv[2] === 'generate' && process.argv[3]) {
  generateMigration(process.argv[3]);
} else if (process.argv[2] === 'run') {
  const db = new Database(DB_PATH);
  runMigrations(db);
  db.close();
}
