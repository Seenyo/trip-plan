# Roam — trip planner

A responsive, map-first trip planner. Plans are stored locally in the browser; no account or backend is required.

## Local development

```bash
npm install
npm run dev
```

## Google Maps

Open Settings in the app and paste a Google Maps JavaScript API key. Enable the **Maps JavaScript API** and **Geocoding API**, then restrict the key to your GitHub Pages hostname. The key is saved only in the current browser.

For build-time configuration, create `.env.local`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

## Deployment

The included GitHub Actions workflow builds and deploys the site to GitHub Pages whenever `main` is updated.
