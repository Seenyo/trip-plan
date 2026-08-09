# Roam — trip planner

A responsive trip planner with a map-first itinerary and a Notion-style planning notebook. Trips, notebook blocks, and notebook images are synchronized through one shared Supabase workspace, with browser storage as a fallback.

The shared workspace does not use authentication. Anyone who can open the deployed site can read and edit its trip data.

## Local development

```bash
npm install
npm run dev
```

## Google Maps

Open Settings in the app and paste a Google Maps JavaScript API key. Enable the **Maps JavaScript API**, **Geocoding API**, and **Routes API**. The Routes API is used to draw the real driving route through each day's stops.

For the deployed site, allow this HTTP referrer in the key restrictions:

```text
https://seenyo.github.io/*
```

The Routes API request is cross-origin and sends the site origin as its referrer, so a restriction limited to `/trip-plan/*` will block road routing. A key entered in Settings is saved only in the current browser.

For local and build-time configuration, copy `.env.example` to `.env`:

```bash
GOOGLE_MAP_API_KEY=your_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The Vite configuration exposes only these named variables to the browser bundle. Never use a Supabase secret or service-role key in the frontend. The GitHub Pages workflow reads the same names from the repository's Actions secrets.

## Supabase

The database and Storage setup is documented in `supabase/migrations`. The public `app_state` table has RLS enabled and exposes only the single shared workspace row. The public `trip-plan-images` bucket accepts images up to 10MB.

## Deployment

The included GitHub Actions workflow builds and deploys the site to GitHub Pages whenever `main` is updated.
