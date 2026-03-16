# 🚀 Quick Start Guide - Scoop Travel Planner

## ✅ What's Ready

Your full-stack application is set up with:
- ✅ React frontend (TypeScript) - Ready to run
- ✅ Node.js/Express backend (TypeScript) - Ready to run
- ✅ SQLite database (pre-configured) - Ready to use
- ✅ All dependencies installed

## 📦 Database Setup

**Default (Development):** SQLite - automatically initialized on first run, no setup required!

**Production (Optional):** PostgreSQL via `DATABASE_URL` environment variable
- See [MIGRATION_GUIDE.md](backend/MIGRATION_GUIDE.md) for migration instructions

## 🏃‍♂️ Run the Application

### Terminal 1 - Start Backend
```bash
cd /Users/brwakh/Desktop/TravelPlaner/backend
npm run dev
```
**Expected output:**
```
✅ SQLite database initialized successfully
🚀 Server running on http://localhost:5001
📍 API endpoints: http://localhost:5001/api
🏥 Health check: http://localhost:5001/api/health
```

### Terminal 2 - Start Frontend
```bash
cd /Users/brwakh/Desktop/TravelPlaner/frontend
npm start
```
**Expected output:**
```
Compiled successfully!
You can now view the app in the browser.
Local: http://localhost:3000
```

### Terminal 3 - Seed Sample Data (Optional)
```bash
cd /Users/brwakh/Desktop/TravelPlaner/backend

# Create seed runner
cat > src/scripts/seed.ts << 'EOF'
import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { seedDestinations } from './seedDestinations';

dotenv.config();

const runSeed = async () => {
  await connectDatabase();
  await seedDestinations();
  console.log('✅ Seeding complete!');
  process.exit(0);
};

runSeed();
EOF

# Run seed
npx ts-node src/scripts/seed.ts
```

## 🧪 Test the Application

1. **Open** `http://localhost:3000` in your browser
2. **Register** a new account
3. **Login** with your credentials
4. **Search** for destinations by:
   - Month
   - Budget
   - Interests (Beach, Nature, City, etc.)
5. **Add favorites** ❤️

## 🔑 Key Features

- 🔐 **Protected Search**: Must register/login to search
- 🎯 **Preference-Based**: Search by month, budget, and interests
- ❤️ **Favorites**: Save destinations
- 🔒 **Secure**: JWT authentication, password hashing

## 🐛 Troubleshooting

### Database Connection Error
**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:**
```bash
# Ensure data directory exists
mkdir -p backend/data

# Delete old database and let it reinitialize
rm backend/data/travel-planner.db

# Restart backend
cd backend && npm run dev
```

### Port Already in Use
**Error:** `Port 5001 (or 3000) is already in use`

**Solution:**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Cannot Connect to Backend
**Error:** Frontend shows connection errors

**Solution:**
1. Make sure backend is running on port 5001
2. Check `/Users/brwakh/Desktop/TravelPlaner/frontend/.env`:
   ```
   REACT_APP_API_URL=http://localhost:5001/api
   ```
3. Restart frontend: `npm start`

## 📁 Project Structure

```
TravelPlaner/
├── backend/           # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth & validation
│   │   └── server.ts       # Entry point
│   ├── data/               # SQLite database file
│   └── package.json
│
├── frontend/          # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── App.tsx         # Main app
│   └── package.json
│
└── README.md
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Destinations
- `GET /api/destinations/search?month=6&budget=Medium&tags=Beach,Nature` - Search
- `POST /api/destinations/preferences` - Save preferences
- `POST /api/destinations/favorites` - Toggle favorite
- `GET /api/destinations/favorites/list` - Get favorites

## 🔐 Authentication Flow

1. User registers → Password hashed with bcrypt
2. Server creates JWT token
3. Token stored in localStorage
4. Every API request includes token in header
5. Backend validates token
6. Protected routes accessible

## 🎨 Technologies Used

**Frontend:**
- React 18 + TypeScript
- React Router v6
- Axios
- Custom CSS

**Backend:**
- Node.js + Express
- TypeScript
- SQLite (development) / PostgreSQL (production)
- JWT + BCrypt
- Express Validator

## 📝 Next Steps

1. **Start backend**: `cd backend && npm run dev`
2. **Start frontend**: `cd frontend && npm start`
3. **Open** `http://localhost:3000` in your browser
4. **Register and test** the application

## ❓ Need Help?

Check the full documentation in `/Users/brwakh/Desktop/TravelPlaner/README.md`

---

**Built for Final Year Project (FYP) - Travel Planner System**
