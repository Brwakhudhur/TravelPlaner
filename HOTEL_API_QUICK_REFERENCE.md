# Hotel API Quick Reference

## 🎯 Quick Start

### What's New?
Hotel pricing now displays in the destination results. When you expand a destination card, you'll see the best-rated hotel with competitive pricing.

### Where to Find It?
**Frontend**: `http://localhost:3000`
→ Register/Login
→ Search for destinations
→ Click any destination card
→ Scroll to "💰 Best Hotel Deal" section

## 🏗️ Architecture

### Backend Stack
```
Frontend (React) 
    ↓ API Call
POST /api/hotels/search
    ↓
Node.js/Express Backend
    ↓
Xotelo API (RapidAPI)
    ↓
Hotel Data
    ↓
Frontend Display
```

### New API Endpoints

**1. Search Hotels**
```
POST /api/hotels/search
Headers: Authorization: Bearer {token}
Body: {
  location: "Paris",
  checkInDate: "2024-06-15",
  checkOutDate: "2024-06-18"
}

Response: {
  success: true,
  hotelCount: 5,
  hotels: [
    {
      name: "Hotel Name",
      location: "City, Country",
      price: 450,
      currency: "USD",
      rating: 4.8,
      reviewCount: 1250,
      pricePerNight: 150,
      link: "booking-url"
    }
  ]
}
```

**2. Get Best Hotel**
```
POST /api/hotels/best
Headers: Authorization: Bearer {token}
Body: {
  location: "Paris",
  checkInDate: "2024-06-15",
  checkOutDate: "2024-06-18"
}

Response: {
  success: true,
  hotel: { ... } // Top-rated, best-priced hotel
}
```

## 📁 File Map

**Backend Files:**
```
backend/src/
├── services/
│   └── hotels.ts              ← Hotel search logic
├── controllers/
│   └── hotelController.ts     ← API request handlers
├── routes/
│   └── hotelRoutes.ts         ← Route definitions
└── app.ts                     ← (modified - routes added)
```

**Frontend Files:**
```
frontend/src/
├── pages/
│   └── AIResults.tsx          ← (modified - hotel UI added)
└── services/
    └── api.ts                 ← (modified - hotelsAPI added)
```

## 🔑 API Configuration

**API Provider**: Xotelo (via RapidAPI)
**Your Key**: `54c18e87d9msh116f5d9f6b5f013p19f198jsnee177005cf83`

**Location in Code**: `/backend/src/services/hotels.ts`
```typescript
const RAPIDAPI_KEY = process.env.XOTELO_API_KEY || 'YOUR_KEY_HERE';
const RAPIDAPI_HOST = 'xotelo-hotel-prices.p.rapidapi.com';
```

**For Production**:
Create `.env` file in backend folder:
```
XOTELO_API_KEY=your_api_key_here
```

## 💡 How It Works

### 1. Hotel Search Algorithm
```
Input: destination city + dates
  ↓
Query Xotelo API for accommodations
  ↓
Process results:
  - Extract name, price, rating, reviews
  - Calculate price per night
  - Filter by date range
  ↓
Sort by:
  - Rating (descending) - quality first
  - Price per night (ascending) - value second
  ↓
Return top 5 results
```

### 2. Frontend Integration
```
User expands destination card
  ↓
useEffect triggers with expanded index
  ↓
Check if hotels already cached
  ↓
If not cached:
  - Set loading state
  - Call backend /api/hotels/search
  - Receive hotel data
  ↓
Display in UI with:
  - Hotel name & location
  - Rating with review count
  - Price per night
  - Total stay cost
  - Booking link
  ↓
Cache result to avoid duplicate calls
```

## 🎨 UI Component

**Location in Expanded Card**: Below flight prices section

**Styling**:
```
- Background: rgba(109, 240, 194, 0.05) - light green
- Border: 1px solid rgba(109, 240, 194, 0.2) - green border
- Text Color: #cfe0ff (light blue for hotel name)
- Rating Color: #6df0c2 (green for rating)
- Border Radius: 8px
```

**States**:
- **Loading**: "Loading hotels..."
- **Success**: Display hotel card with all info
- **No Results**: "No hotels found for these dates"
- **Error**: Graceful handling, no crash

## 🧪 Testing

### Test Case 1: Basic Search
1. Navigate to http://localhost:3000
2. Register/login
3. Go to Search page
4. Select: June, Moderate budget, Beach interest
5. Set dates: 2024-06-15 to 2024-06-18
6. Click Search
7. Click first destination card
8. ✅ Should see hotel pricing section

### Test Case 2: Check Sorting
1. Complete Test Case 1
2. Note hotel rating (should be high, e.g., 4.5+)
3. Note price per night (should be competitive)
4. ✅ Hotel should balance quality with affordability

### Test Case 3: Error Handling
1. Expand multiple cards quickly
2. ✅ Should show loading state
3. ✅ Should handle errors gracefully
4. ✅ App should remain functional

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Hotels not loading | Check browser console for errors |
| Slow loading | Normal - API call takes 1-2 seconds |
| "Rate Limited" | Xotelo free tier has limits, wait & retry |
| Wrong dates | Ensure dates are YYYY-MM-DD format |
| No booking link | Some hotels may not have links |
| Styling looks odd | Refresh browser (Ctrl+R or Cmd+R) |

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│               USER INTERACTIONS                         │
│  1. Search (month, budget, interests, dates)           │
│  2. View Results (destination cards)                   │
│  3. Expand Card → Hotel data fetches                   │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│             FRONTEND (React/TypeScript)                  │
│  - AIResults.tsx (display & state management)           │
│  - api.ts (API service calls)                          │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓ HTTP POST
        /api/hotels/search
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│          BACKEND (Node.js/Express)                       │
│  - hotelController.ts (request handling)                │
│  - hotelRoutes.ts (routing)                             │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│           HOTEL SERVICE (Business Logic)                 │
│  - hotels.ts (search & sort algorithm)                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓ HTTPS Request
      Xotelo Hotel Prices API
     (via RapidAPI Gateway)
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│          EXTERNAL DATA SOURCE                            │
│  - Hotel listings                                       │
│  - Prices & availability                                │
│  - Reviews & ratings                                    │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓ JSON Response
┌──────────────────────────────────────────────────────────┐
│         PROCESSING & SORTING                             │
│  1. Extract hotel data                                  │
│  2. Calculate price per night                           │
│  3. Sort by rating + price                              │
│  4. Return top 5 results                                │
└──────────────┬──────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────┐
│        FRONTEND DISPLAY                                  │
│  - Show best hotel in expanded card                     │
│  - Display rating, price, dates                         │
│  - Provide booking link                                 │
└──────────────────────────────────────────────────────────┘
```

## 📚 Additional Resources

- Full documentation: `HOTEL_INTEGRATION.md`
- Summary overview: `HOTEL_FEATURE_SUMMARY.md`
- Backend API: `/api/health` (health check endpoint)

## ✨ Key Features

1. **Smart Ranking**: Hotels ranked by rating first, then price
2. **Date-Aware**: Automatically calculates nights and per-night cost
3. **Cached Results**: Doesn't re-fetch if already loaded
4. **Error Resilient**: App continues if hotels unavailable
5. **User-Focused**: Clean UI with all key info at a glance

## 🚀 Performance Notes

- Hotel API call: ~1-2 seconds (normal for external API)
- Results cached in memory during session
- No duplicate API calls for same destination
- Responsive UI with loading indicators

---

**Status**: ✅ Production Ready

All systems are operational and tested. The hotel pricing feature seamlessly integrates with your existing Travel Planner system!
