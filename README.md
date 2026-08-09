# Roam — trip planner

A responsive, map-first trip planner. Plans are stored locally in the browser; no account or backend is required.

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

For local and build-time configuration, create `.env`:

```bash
GOOGLE_MAP_API_KEY=your_key_here
```

The Vite configuration exposes only this named variable to the browser bundle. The GitHub Pages workflow reads the same name from the repository's Actions secrets.

## Deployment

The included GitHub Actions workflow builds and deploys the site to GitHub Pages whenever `main` is updated.
