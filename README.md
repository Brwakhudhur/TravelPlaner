# Scoop Travel Planner

A full-stack travel planning application built with React and Node.js that helps users find perfect destinations based on their preferences and travel month.

## Features

- 🔐 **User Authentication** - Secure registration and login
- 🔍 **Smart Search** - Search destinations by month, budget, and interests
- ❤️ **Favorites** - Save and manage favorite destinations
- 🎯 **Personalized Results** - Get recommendations based on your preferences
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Custom CSS with modern design

### Backend
- Node.js & Express
- TypeScript
- SQLite with better-sqlite3
- JWT authentication
- BCrypt for password hashing

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v18 or higher)
- npm or yarn

## Installation & Setup

### 1. Clone and Navigate
```bash
cd /Users/brwakh/Desktop/TravelPlaner
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# The SQLite database is automatically created on first run
# Configure environment variables in backend/.env if needed
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:5000`

### Start Frontend Development Server

Open a new terminal:

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:3000`

## Seeding Sample Data

To add sample destinations to your database:

Create a seed script file:

```bash
# In backend directory
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

# Run the seed script
npx ts-node src/scripts/seed.ts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Destinations
- `GET /api/destinations/search` - Search destinations (protected)
- `GET /api/destinations` - Get all destinations (protected)
- `GET /api/destinations/:id` - Get single destination (protected)
- `POST /api/destinations/preferences` - Save user preferences (protected)
- `POST /api/destinations/favorites` - Toggle favorite (protected)
- `GET /api/destinations/favorites/list` - Get favorites (protected)

## Key Features Implementation

### Protected Search
Users **must be registered and logged in** to search for destinations. Unauthenticated users are redirected to the login page with a clear message.

### Preference-Based Recommendations
The system suggests destinations based on:
- Travel month (seasonal suitability)
- Budget (Low/Medium/High)
- Interests (Beach, Nature, City, Culture, etc.)

### User Authentication Flow
1. User registers with email and password
2. Password is hashed using bcrypt
3. JWT token is generated and sent to client
4. Token is stored in localStorage
5. Token is included in all subsequent API requests
6. Backend validates token for protected routes

## Project Structure

```
TravelPlaner/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   └── destinationController.ts
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Destination.ts
│   │   │   └── Preference.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   └── destinationRoutes.ts
│   │   ├── scripts/
│   │   │   └── seedDestinations.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── DestinationCard.tsx
│   │   │   └── SearchFilters.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Search.tsx
│   │   │   └── Favorites.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### CORS Issues
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check that CORS middleware is properly configured in `app.ts`

## Next Steps / Enhancements

- Add password reset functionality
- Implement email verification
- Add destination reviews and ratings
- Create detailed itinerary builder
- Add map view for destinations
- Implement social sharing
- Add weather API integration
- Create admin panel for destination management

## License

MIT

## Author

Built for Final Year Project (FYP)
# TravelPlaner
