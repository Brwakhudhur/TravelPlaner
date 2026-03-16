# External Providers & Caching Guide

This guide covers the external data provider integrations and caching system implemented in your Travel Planner backend.

---

## 📊 Architecture Overview

```
┌─────────────────────┐
│   API Endpoints     │
│   (Controllers)     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Service Layer      │
├─────────────────────┤
│ • Nominatim         │
│ • Open-Meteo        │
│ • OpenTripMap       │
│ • ImageProvider     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────┐
│    Caching Layer                │
├─────────────────────────────────┤
│ 1. Check Redis (if enabled)     │
│ 2. Check Database Cache         │
│ 3. Fetch from external API      │
│ 4. Cache result                 │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────┐
│  External APIs      │
│  • Nominatim        │
│  • Open-Meteo       │
│  • OpenTripMap      │
│  • Pixabay/Unsplash │
└─────────────────────┘
```

---

## 🔧 Configuration

### 1. Add API Keys to `.env`

```bash
# Copy from .env.example and add your keys
cp backend/.env.example backend/.env

# Edit backend/.env and add your keys:
OPENTRIPMAP_API_KEY=your-key-here
PIXABAY_API_KEY=your-key-here
UNSPLASH_API_KEY=your-key-here
PEXELS_API_KEY=your-key-here

# Optional: Enable Redis
REDIS_URL=redis://localhost:6379
```

### 2. Get API Keys

| Service | Link | Free Tier | Notes |
|---------|------|-----------|-------|
| **Nominatim** | https://nominatim.org/ | ✅ Unlimited | No key needed, respect 1 req/sec rate limit |
| **Open-Meteo** | https://open-meteo.com/ | ✅ 10k/day | No key needed, free weather data |
| **OpenTripMap** | https://opentripmap.io/ | ✅ Free tier | API key required for POI search |
| **Pixabay** | https://pixabay.com/api/docs/ | ✅ 5k/month | Free, high-quality stock photos |
| **Unsplash** | https://unsplash.com/developers | ✅ 50/hour | Beautiful curated photos |
| **Pexels** | https://www.pexels.com/api/ | ✅ 200/hour | Free stock photos |

---

## 📍 Services Overview

### 1. Nominatim (Geocoding)
**File:** `backend/src/services/nominatim.ts`

Converts addresses to coordinates and vice versa.

```typescript
import { geocodeAddress, reverseGeocode } from '../services/nominatim';

// Get coordinates from address
const location = await geocodeAddress('Paris, France');
console.log(location);
// { latitude: 48.856..., longitude: 2.352..., displayName: "Paris...", country: "France" }

// Get address from coordinates
const address = await reverseGeocode(48.856, 2.352);
```

**Cache TTL:** 24 hours (addresses don't change)  
**Rate Limit:** 1 request/second (built-in delay)

---

### 2. Open-Meteo (Weather & Climate)
**File:** `backend/src/services/openmeteo.ts`

Provides current weather and historical climate data.

```typescript
import { getCurrentWeather, getMonthlyClimate } from '../services/openmeteo';

// Get current weather
const weather = await getCurrentWeather(48.856, 2.352);
console.log(weather);
// { temperature: 15.5, description: "Partly cloudy", humidity: 65, ... }

// Get average climate for a month (good for trip planning)
const climate = await getMonthlyClimate(48.856, 2.352, 7); // July
console.log(climate);
// { temperature: 24.3, precipitation: 45.2, description: "Warm and pleasant" }
```

**Cache TTL:**
- Current weather: 1 hour
- Monthly climate: 24 hours

**No API key required** ✅

---

### 3. OpenTripMap (Points of Interest)
**File:** `backend/src/services/opentripmap.ts`

Finds attractions, landmarks, museums, restaurants, etc.

```typescript
import { searchPOIs, getPOIDetails } from '../services/opentripmap';

// Search POIs in 5km radius
const pois = await searchPOIs(
  48.856, 2.352,           // lat, lon
  5000,                     // radius in meters
  'tourist,landmark',       // types (optional)
  10                        // limit results
);
console.log(pois);
// { poiCount: 10, pois: [...], latitude: 48.856, longitude: 2.352 }

// Get detailed info about a POI
const details = await getPOIDetails('xid-123456');

// Search by name
const named = await searchPOIsByName('Eiffel Tower');
```

**Cache TTL:** 7 days (POIs change slowly)  
**Requires API key:** Get free tier at https://opentripmap.io

---

### 4. Image Provider
**File:** `backend/src/services/imageProvider.ts`

Fetches destination images with fallback strategy:
1. Try Pixabay
2. Try Unsplash
3. Try Pexels
4. Use placeholder

```typescript
import { getDestinationImage, getDestinationImages } from '../services/imageProvider';

// Get single image
const image = await getDestinationImage('Paris');
console.log(image);
// { 
//   url: "https://...", 
//   source: "pixabay",
//   title: "Paris",
//   photographer: "John Doe"
// }

// Get multiple images
const images = await getDestinationImages(['Paris', 'Rome', 'Barcelona']);
```

**Cache TTL:** 7 days (images are mostly stable)  
**Fallback:** Uses `DEFAULT_IMAGE_URL` env var or placeholder

---

## 💾 Caching System

### Database-Backed Cache (Always Active)

Cache table in SQLite:
- Persistent storage
- TTL-based auto-expiration
- Hit tracking for analytics
- Indexed for fast lookups

```typescript
import {
  getCache,
  setCache,
  invalidateCache,
  cacheOrFetch,
  getCacheStats,
  clearExpiredCache
} from '../services/cache';

// Get from cache
const cached = await getCache('my-key');

// Set in cache (24 hours TTL)
await setCache('my-key', { data: 'value' }, 86400);

// Automatically get or fetch
const data = await cacheOrFetch(
  'destination:paris',
  () => fetchDataFromAPI(),
  86400, // TTL in seconds
  'destination' // provider name
);

// Clear specific entry
await invalidateCache('destination:paris');

// Clear by pattern
await invalidateCachePattern('destination:*');

// Get stats
const stats = await getCacheStats();
// { totalEntries: 123, totalHits: 5000, validEntries: 98 }

// Clean expired entries
await clearExpiredCache();
```

### Optional: Redis Cache (Fast, Hot Data)

For production with high traffic:

```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Or use Docker
docker run -d -p 6379:6379 redis:latest

# Install Node Redis client
npm install redis

# Set in .env
REDIS_URL=redis://localhost:6379
```

**Benefits:**
- Sub-millisecond lookups
- Automatic expiration
- Distributed cache (multiple servers)
- Session data persistence

**How it works:**
1. Check Redis first (very fast)
2. Fall back to database cache
3. If not cached, fetch from API
4. Cache in both Redis & database

---

## 🚀 Usage Example

### Complete Destination Details Endpoint

```typescript
// File: backend/src/routes/destinationRoutes.ts
import { getDestinationDetails } from '../controllers/exampleController';

router.get('/details/:name', authMiddleware, getDestinationDetails);
```

Request:
```
GET /api/destinations/details/Paris?month=7
```

Response:
```json
{
  "destination": "Paris",
  "location": {
    "latitude": 48.8566,
    "longitude": 2.3522,
    "displayName": "Paris, Île-de-France, France",
    "city": "Paris",
    "country": "France"
  },
  "currentWeather": {
    "temperature": 22.5,
    "description": "Partly cloudy",
    "humidity": 65,
    "windSpeed": 8.5,
    "precipitation": 0
  },
  "monthlyClimate": {
    "temperature": 24.3,
    "precipitation": 45.2,
    "description": "Warm and pleasant"
  },
  "pointsOfInterest": {
    "poiCount": 10,
    "pois": [
      {
        "id": "xid123",
        "name": "Eiffel Tower",
        "kind": "landmark",
        "latitude": 48.8584,
        "longitude": 2.2945,
        "rating": 4.8
      },
      // ... more POIs
    ]
  },
  "image": {
    "url": "https://images.pixabay.com/...",
    "source": "pixabay",
    "photographer": "Pierre Martin"
  }
}
```

---

## 🔍 Monitoring & Maintenance

### Cache Statistics Endpoint

```typescript
// File: backend/src/routes/admin.ts
import { getCacheStatus } from '../controllers/exampleController';

router.get('/cache/stats', authMiddleware, authorizeAdmin, getCacheStatus);
```

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/admin/cache/stats
```

Response:
```json
{
  "status": "Cache statistics",
  "stats": {
    "totalEntries": 523,
    "totalHits": 45000,
    "avgHits": 86,
    "validEntries": 498
  }
}
```

### Manual Cache Cleanup

```typescript
import { clearExpiredCache } from '../services/cache';

// Run periodically (e.g., every hour)
setInterval(() => {
  clearExpiredCache();
}, 3600000); // 1 hour
```

Or use a scheduled job library (node-cron):

```typescript
import cron from 'node-cron';
import { clearExpiredCache } from '../services/cache';

// Run every hour
cron.schedule('0 * * * *', async () => {
  await clearExpiredCache();
  console.log('🧹 Expired cache cleaned');
});
```

---

## 📈 Performance Considerations

### Cache TTLs (Recommendations)

| Data | TTL | Reasoning |
|------|-----|-----------|
| Geocoding | 24h | Addresses don't change |
| Weather | 1h | Changes frequently |
| Climate averages | 24h | Historical data is stable |
| POIs | 7d | Attractions added/removed slowly |
| Images | 7d | Destination photos are stable |

### Database Optimization

```sql
-- Monitor cache growth
SELECT provider, COUNT(*) as count FROM cache GROUP BY provider;

-- Find most-hit entries
SELECT key, hits FROM cache ORDER BY hits DESC LIMIT 10;

-- Clean old entries manually
DELETE FROM cache WHERE expiresAt < datetime('now');

-- Optimize database
VACUUM;
PRAGMA optimize;
```

---

## 🐛 Troubleshooting

### Service Returns Null

```typescript
// Check if API key is configured
if (process.env.OPENTRIPMAP_API_KEY) {
  // POI search enabled
}

// Check cache stats to see if service is being called
const stats = await getCacheStats();
```

### Slow Responses

1. **Check cache hit rate:**
   ```typescript
   const stats = await getCacheStats();
   const hitRate = stats.totalHits / stats.totalEntries;
   console.log(`Cache hit rate: ${hitRate * 100}%`);
   ```

2. **Enable Redis for faster lookups**

3. **Increase TTLs for non-critical data**

### Rate Limiting Issues

**Nominatim:** Built-in 1 request/second delay  
**Open-Meteo:** 10,000/day free; caching helps  
**OpenTripMap:** Check API plan limits

---

## 🔐 Security Notes

1. **Never commit API keys** - Use `.env` file (gitignore)
2. **Validate user input** - Sanitize search queries
3. **Rate limit API calls** - Implement request queuing
4. **Cache sensitive data carefully** - Don't cache user-specific data
5. **Use HTTPS** - Especially in production

---

## 📚 Additional Resources

- [Nominatim Documentation](https://nominatim.org/release-docs/latest/)
- [Open-Meteo API](https://open-meteo.com/en/docs)
- [OpenTripMap API](https://wiki.openstreetmap.org/wiki/OpenTripMap)
- [Pixabay API](https://pixabay.com/api/docs/)
- [Unsplash API](https://unsplash.com/developers)
- [Pexels API](https://www.pexels.com/api/)
- [Redis Node.js Client](https://github.com/redis/node-redis)

---

**Next Steps:**
1. ✅ Configure API keys in `.env`
2. ✅ Initialize services in your routes
3. ✅ Monitor cache performance
4. ✅ Adjust TTLs based on usage patterns
5. ✅ Consider enabling Redis for production
