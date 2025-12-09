# DRUMRE-Lab1

## Description

DRUMRE-Lab1 is a Next.js (App Router) web application that demonstrates integration with multiple external APIs and a MongoDB (Atlas) backend. The app provides Google-based authentication (BetterAuth), fetches store data from the Cijene.dev API, geocodes addresses with the Photon/Komoot service, and displays stores on an interactive MapLibre map.

## Live demo

Available at: [https://drumre.netlify.app](https://drumre.netlify.app).

## Visuals

_Screenshots and GIFs can be added here to demonstrate the UI and map functionality._

## Tech stack

- Frontend / Backend: Next.js 16 (App Router + API routes)
- UI: TailwindCSS + Shadcn UI
- Authentication: BetterAuth (Google OAuth)
- Database: MongoDB Atlas
- Maps: MapLibre GL + react-map-gl
- HTTP client: Axios
- State & data fetching: React Query
- Forms: React Hook Form
- Package manager: pnpm

## APIs used

- BetterAuth (Google OAuth) — user authentication and session handling
- Cijene.dev — store/chain data for Croatia
- Photon Komoot (OpenStreetMap) — address geocoding

## Prerequisites

- Node.js 18+ (or latest LTS)
- `pnpm` (preferred) or `npm`/`yarn`
- A MongoDB Atlas database (or another MongoDB instance)
- Google OAuth credentials for BetterAuth (Google client ID and secret)

## Environment variables

Create a `.env.local` file in the repository root from the provided `.env.local.example` template and fill in the required values.

## How to run (development)

1. Install dependencies:

```bash
pnpm install
```

2. Start development server:

```bash
pnpm dev
```

3. Open `http://localhost:3000` in your browser.

Notes:

- API routes are implemented under `src/app/api/*` and run together with the Next.js server.
- The app expects a running MongoDB instance reachable with `MONGODB_URI`.

## License

_No explicit license is specified in this repository. Add a `LICENSE` file if you want to specify reuse terms._
