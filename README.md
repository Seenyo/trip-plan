# Roam — trip planner

A responsive trip planner with a map-first itinerary. Trips are synchronized through one shared Supabase workspace, with browser storage as a fallback.

The shared workspace does not use authentication. Anyone who can open the deployed site can read and edit its trip data.

## Local development

```bash
npm install
npm run dev
```

## Google Maps

The map and place search use a Google Maps JavaScript API key configured when the app starts or builds. Enable the **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, and **Routes API**. Places API provides multilingual place suggestions, and Routes API draws driving or walking routes and estimates travel time between stops.

For the deployed site, allow this HTTP referrer in the key restrictions:

```text
https://seenyo.github.io/*
```

The Routes API request is cross-origin and sends the site origin as its referrer, so a restriction limited to `/trip-plan/*` will block road routing.

For local and build-time configuration, copy `.env.example` to `.env`:

```bash
GOOGLE_MAP_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Set `GOOGLE_MAP_API_KEY` before starting the dev server; without it, the itinerary still works but the map and place search are unavailable. Restart the dev server after changing `.env`. Settings controls route colors and does not accept a key.

The Vite configuration exposes only these named variables to the browser bundle. Restrict the Google Maps key to the expected site referrers, and never use a Supabase secret or service-role key in the frontend. The GitHub Pages workflow reads the same names from the repository's Actions secrets.

## Supabase

The database setup is documented in `supabase/migrations`. The public `app_state` table has RLS enabled and exposes only the single shared workspace row.

## Deployment

The included GitHub Actions workflow builds and deploys the site to GitHub Pages whenever `main` is updated.
