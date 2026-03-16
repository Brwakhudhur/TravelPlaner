# Hotel Pricing Integration Guide

## Overview
This project now includes hotel pricing functionality integrated with the Xotelo Hotel Prices RapidAPI service. When users expand a destination card in the AI Results page, the system automatically fetches and displays the best-rated hotel with competitive pricing for their travel dates.

## Architecture

### Backend Components

#### 1. Hotel Service (`/backend/src/services/hotels.ts`)
- **`searchHotels()`**: Searches for hotels using the Xotelo API
  - Takes: location, check-in date, check-out date
  - Returns: Array of up to 5 hotels sorted by:
    1. Rating (high-rated first)
    2. Price per night (cheapest first)
  - Handles API calls and data processing

- **`getBestHotel()`**: Gets the single best hotel
  - Leverages `searchHotels()` and returns top result
  - Returns: Single best `HotelResult` or null

#### 2. Hotel Controller (`/backend/src/controllers/hotelController.ts`)
- **`search` endpoint**: Returns multiple hotel options
- **`getBest` endpoint**: Returns single best hotel
- Both validate required input fields and handle errors

#### 3. Hotel Routes (`/backend/src/routes/hotelRoutes.ts`)
- `POST /api/hotels/search` - Search hotels (requires authentication)
- `POST /api/hotels/best` - Get best hotel (requires authentication)

### Frontend Components

#### 1. API Service (`/frontend/src/services/api.ts`)
- Added `hotelsAPI` with `searchHotels()` method
- Integrates with backend hotel endpoints

#### 2. AIResults Component (`/frontend/src/pages/AIResults.tsx`)
- New state variables:
  - `hotelMap`: Stores fetched hotel data by country
  - `hotelLoadingMap`: Tracks loading state per country

- New `useEffect` hook: Fetches hotels when card is expanded
  - Triggered when: `expandedCard`, `currentRecommendations`, or date filters change
  - Searches for hotels using capital city as location

- New UI Section in expanded card:
  - Hotel name and location
  - Star rating with review count
  - Price per night
  - Total price for stay
  - Check-in and check-out dates
  - "View Booking" link (if available)
  - Loading state and error handling

## Data Flow

```
User clicks destination card
    ↓
expandedCard state updates
    ↓
useEffect triggers with card index
    ↓
Frontend calls hotelsAPI.searchHotels()
    ↓
Backend hotelController.search receives request
    ↓
hotelService.searchHotels() queries Xotelo API
    ↓
Results sorted by rating + price
    ↓
Top hotel returned to frontend
    ↓
UI displays hotel card in expanded view
```

## API Integration Details

### Xotelo API
- **Endpoint**: `https://xotelo-hotel-prices.p.rapidapi.com/api/search`
- **Authentication**: RapidAPI key (via environment variable)
- **Key Parameters**:
  - `location_type`: 'accommodation'
  - `location`: Destination city
  - `check_in`: Date (YYYY-MM-DD format)
  - `check_out`: Date (YYYY-MM-DD format)

### Response Processing
- Filters results by rating and price
- Calculates price per night
- Sorts by rating (desc) then price per night (asc)
- Returns top 5 options or just the best 1

## Environment Setup

### Required API Key
The Xotelo API key you provided:
```
54c18e87d9msh116f5d9f6b5f013p19f198jsnee177005cf83
```

This is used in `/backend/src/services/hotels.ts`:
```typescript
const RAPIDAPI_KEY = process.env.XOTELO_API_KEY || '54c18e87d9msh116f5d9f6b5f013p19f198jsnee177005cf83';
```

**Note**: For production, store this in `.env` file:
```
XOTELO_API_KEY=your_key_here
```

## Features

### 1. Smart Hotel Selection
- Prioritizes highly-rated hotels
- Balances rating with price
- Shows only verified booking options

### 2. Complete Pricing Information
- Per-night rate
- Total stay cost
- Dates clearly displayed

### 3. User-Friendly UI
- Green accent color (matching theme) for hotel section
- Star rating with review count
- Direct booking link
- Loading indicators
- Error handling for unavailable hotels

### 4. Date-Aware Pricing
- Automatically calculates nights based on check-in/check-out
- Price per night derived from total
- Accurate cost estimation

## Usage Example

**Frontend API Call:**
```typescript
const response = await hotelsAPI.searchHotels({
  location: 'Paris',
  checkInDate: '2024-06-15',
  checkOutDate: '2024-06-18'
});

// Response structure:
{
  success: true,
  location: 'Paris',
  checkInDate: '2024-06-15',
  checkOutDate: '2024-06-18',
  hotelCount: 5,
  hotels: [
    {
      name: 'Hotel XYZ',
      location: 'Paris, France',
      price: 450,
      currency: 'USD',
      rating: 4.8,
      reviewCount: 1250,
      checkInDate: '2024-06-15',
      checkOutDate: '2024-06-18',
      pricePerNight: 150,
      link: 'https://booking-link.com'
    },
    // ... up to 5 hotels
  ]
}
```

## Error Handling

### Frontend
- Shows "Loading hotels..." during fetch
- Displays "No hotels found for these dates" if API returns empty
- Continues functioning if hotel API fails

### Backend
- Returns 400 for missing required fields
- Returns 500 for API call failures
- Logs errors for debugging

## Future Enhancements

1. **Travel Plan Suggestions**
   - Suggest hotels in different cities
   - Multi-city itinerary support
   - Recommendations based on activities/interests

2. **Price Comparison**
   - Multiple hotel price aggregators
   - Historical price trends
   - Best time to book

3. **Advanced Filtering**
   - Amenities filter (pool, gym, spa, etc.)
   - Distance to attractions
   - Guest reviews breakdown

4. **Caching**
   - Cache hotel results by location + dates
   - Reduce API calls
   - Faster subsequent loads

5. **Integration with Other Services**
   - Link to actual booking platforms
   - Real-time availability
   - Cancellation policies

## Testing

### To Test Hotel Integration:

1. **Start the application**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

2. **Perform a Search**
   - Register/login at http://localhost:3000
   - Go to Search page
   - Select destination, month, budget, interests
   - Specify departure and return dates
   - Click Search

3. **View Results**
   - Click any destination card to expand
   - Scroll down to see "💰 Best Hotel Deal" section
   - View hotel name, rating, pricing
   - Click "View Booking" to access hotel link

### Sample Test Data
- Destination: Paris, France
- Check-in: 2024-06-15
- Check-out: 2024-06-18
- Expected: Hotels with EUR pricing in Paris area

## Troubleshooting

### API Rate Limiting
If you see "Too Many Requests" errors:
- Xotelo API has rate limits on RapidAPI free tier
- Wait a few moments before retrying
- Consider upgrading RapidAPI subscription for production

### Hotel Data Not Loading
1. Check network tab in browser DevTools
2. Verify authentication token is valid
3. Confirm dates are in YYYY-MM-DD format
4. Check console for error messages

### Styling Issues
Hotel section uses:
- Color: `#6df0c2` (green accent)
- Font size: `13px` for content
- Border styling: `rgba(109, 240, 194, 0.2)`
- Padding: `12px` for card spacing

## File Structure
```
backend/
├── src/
│   ├── services/
│   │   └── hotels.ts              # Hotel search logic
│   ├── controllers/
│   │   └── hotelController.ts     # API handlers
│   ├── routes/
│   │   └── hotelRoutes.ts         # Route definitions
│   └── app.ts                     # (updated with hotel routes)

frontend/
└── src/
    ├── pages/
    │   └── AIResults.tsx          # (updated with hotel display)
    └── services/
        └── api.ts                 # (updated with hotelsAPI)
```

---

**Integration Date**: February 15, 2026
**Status**: ✅ Active and Tested
