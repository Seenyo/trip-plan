# Roam — trip planner

A responsive, map-first trip planner. Plans are stored locally in the browser; no account or backend is required.

## Local development

```bash
npm install
npm run dev
```

## Google Maps

Open Settings in the app and paste a Google Maps JavaScript API key. Enable the **Maps JavaScript API** and **Geocoding API**, then restrict the key to your GitHub Pages hostname. The key is saved only in the current browser.

For local and build-time configuration, create `.env`:

```bash
GOOGLE_MAP_API_KEY=your_key_here
```

The Vite configuration exposes only this named variable to the browser bundle. The GitHub Pages workflow reads the same name from the repository's Actions secrets.

## Deployment

The included GitHub Actions workflow builds and deploys the site to GitHub Pages whenever `main` is updated.
