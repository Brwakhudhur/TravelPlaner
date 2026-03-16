# Database Migration Guide: SQLite to PostgreSQL

This guide explains how to migrate from SQLite (development) to PostgreSQL (production).

## Architecture Overview

- **Development**: SQLite with `better-sqlite3`
- **Production**: PostgreSQL with `pg` (Node Postgres)
- **Schema**: Identical SQL schema - migrations work for both databases
- **ORM**: Custom model layer supporting both databases

## Development Environment (SQLite)

SQLite is automatically initialized when you start the backend:

```bash
cd backend
npm run dev
```

This creates `data/travel-planner.db` with all required tables.

## Migration Process

### Step 1: Set Up PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Or use Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -d -p 5432:5432 postgres:latest

# Create database
createdb travel_planner
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create `.env.production`:

```env
NODE_ENV=production
PORT=5001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/travel_planner

# Or individual variables:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=travel_planner
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

### Step 4: Run Migrations

```bash
npm run migrate
```

This executes all SQL files in `src/migrations/` directory.

### Step 5: Seed Data (Optional)

Export data from SQLite:

```bash
# Export from SQLite
sqlite3 data/travel-planner.db ".mode csv" ".output destinations.csv" "SELECT * FROM destinations;"

# Import to PostgreSQL
psql travel_planner
\COPY destinations(id,title,country,description,budget,bestMonths,tags,image,createdAt,updatedAt) FROM 'destinations.csv' WITH (FORMAT csv);
```

Or use the Node.js seed script with PostgreSQL models.

### Step 6: Switch Backend to PostgreSQL

Update `src/config/database.ts` or create a database selector in `src/server.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

let connectDatabase: () => void;

if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
  // Use PostgreSQL
  const { connectPostgresDatabase } = require('./config/postgresAdapter');
  connectDatabase = connectPostgresDatabase;
} else {
  // Use SQLite (default)
  const { connectDatabase: connectSqliteDatabase } = require('./config/database');
  connectDatabase = connectSqliteDatabase;
}
```

### Step 7: Deploy

```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm start
```

## Creating Custom Migrations

Create new migration files in `src/migrations/`:

```bash
npm run migrate:generate add_column_to_users
```

This creates a timestamped SQL file. Add your SQL statements:

```sql
-- Migration: 002_add_column_to_users.sql
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
```

Run the migration:

```bash
npm run migrate
```

## Database Schema

Both SQLite and PostgreSQL use identical schema:

### Users
- id (TEXT PRIMARY KEY)
- displayName (TEXT)
- email (TEXT UNIQUE)
- password (TEXT - hashed)
- createdAt (TEXT - ISO 8601)
- updatedAt (TEXT - ISO 8601)

### Destinations
- id (TEXT PRIMARY KEY)
- title (TEXT)
- country (TEXT)
- description (TEXT)
- budget (TEXT: 'budget', 'moderate', 'luxury')
- bestMonths (TEXT: comma-separated month numbers)
- tags (TEXT: comma-separated)
- image (TEXT - URL)
- createdAt (TEXT)
- updatedAt (TEXT)

### Preferences
- id (TEXT PRIMARY KEY)
- userId (TEXT FOREIGN KEY)
- travelMonth (INTEGER)
- budget (TEXT)
- interests (TEXT: comma-separated)
- createdAt (TEXT)
- updatedAt (TEXT)

### UserFavorites (Junction Table)
- userId (TEXT FOREIGN KEY)
- destinationId (TEXT FOREIGN KEY)
- createdAt (TEXT)

## Troubleshooting

### SQLite Still Locked Error
```bash
# Close any open connections
rm data/travel-planner.db-shm
rm data/travel-planner.db-wal
```

### PostgreSQL Connection Refused
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql
```

### Migration Failed
Check migration file syntax:
```bash
# Validate SQL
psql -d travel_planner -f src/migrations/001_initial_schema.sql
```

## Database Backup & Restore

### SQLite Backup
```bash
cp data/travel-planner.db data/travel-planner.backup.db
```

### PostgreSQL Backup
```bash
pg_dump travel_planner > backup.sql
pg_dump -Fc travel_planner > backup.dump

# Restore
psql travel_planner < backup.sql
pg_restore -d travel_planner backup.dump
```

## Performance Considerations

### SQLite (Development)
- Single-file database
- No server overhead
- Limited concurrent connections
- Good for prototyping

### PostgreSQL (Production)
- Multi-user support
- ACID compliance
- Advanced indexing
- Connection pooling support
- Better concurrency handling

## Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [better-sqlite3 Guide](https://github.com/WiseLibs/better-sqlite3)
- [pg (Node Postgres) Guide](https://node-postgres.com/)
