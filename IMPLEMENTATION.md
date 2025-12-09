# Stores Map - Croatia

An interactive web application that fetches store locations from the Cijene.dev API, geocodes them using OpenStreetMap's Nominatim service, and displays them on an interactive map using MapLibre GL.

## Features

- **Fetch Store Data**: Retrieves store locations from Cijene.dev API for various retail chains in Croatia
- **Geocoding**: Converts addresses to latitude/longitude coordinates using Nominatim API
- **Interactive Map**: Displays stores on a map using MapLibre GL with OpenFreeMap tiles
- **Store Information**: Shows detailed information about each store including address, type, and coordinates
- **Multiple Chains**: Support for various retail chains (Konzum, Lidl, Plodine, Kaufland, Studenac, Tommy, Spar)

## Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Environment Variables**:
   Make sure you have a `.env.local` file with your Cijene.dev API credentials:

   ```
   CIJENE_API_URL=https://api.cijene.dev
   CIJENE_API_TOKEN=your_api_token_here
   ```

3. **Run the development server**:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Select a Store Chain**: Use the dropdown to select a retail chain (e.g., Konzum, Lidl)
2. **Fetch & Geocode**: Click "Geocode & Show on Map" button
3. **Wait for Geocoding**: The app will geocode the first 10 stores (takes ~10 seconds due to rate limiting)
4. **View Map**: Stores will appear as red markers on the map
5. **Explore**: Click on markers to see store details in popups
6. **View List**: Scroll down to see a detailed list of all geocoded stores

## Important Notes

- **Rate Limiting**: Nominatim API requires 1 request per second, so geocoding 10 stores takes about 10 seconds
- **Store Limit**: Currently limited to first 10 stores to avoid excessive API calls during demo
- **No Database**: This implementation doesn't store data in MongoDB - it's purely client-side data fetching

## Technologies Used

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Styling
- **Axios**: HTTP client for API requests
- **React Query**: Data fetching and caching
- **MapLibre GL**: Interactive map rendering
- **OpenFreeMap**: Free map tiles
- **Nominatim**: Geocoding service

## API Integration

### Cijene.dev API

- **Endpoint**: `GET /v1/{chain_code}/stores/`
- **Authentication**: Bearer token
- **Response**: List of stores with address, city, zipcode

### Nominatim API

- **Endpoint**: `GET /search`
- **Rate Limit**: 1 request/second
- **Response**: Latitude and longitude coordinates

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── stores/
│   │       └── route.ts          # API route for fetching stores
│   ├── layout.tsx                 # Root layout with Providers
│   └── page.tsx                   # Main page component
├── components/
│   ├── MapComponent.tsx           # MapLibre GL map component
│   └── Providers.tsx              # React Query provider
├── lib/
│   └── geocoding.ts               # Geocoding utility functions
└── types/
    └── store.ts                   # TypeScript type definitions
```

## Future Enhancements

- MongoDB integration for storing geocoded results
- User authentication with BetterAuth
- Pagination for large store lists
- Caching geocoded coordinates in database
- Advanced filtering and search
- Store details modal
- Export functionality
