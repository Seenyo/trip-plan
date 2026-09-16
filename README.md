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

## Place guides and travel notebooks

Open **地点ガイド** on an itinerary stop, or the book button beside the trip title for **旅行ノート**. On phones these open a full-screen reading page; **編集 → 保存** edits the page. Headings, paragraphs, bullets, checklists, safe links, tables, images and PDFs are supported. Notebooks can contain nested pages. Reading-mode checklist changes also require **保存**.

Documents live in `travel_documents`, separate from itinerary writes. A revision comparison prevents a stale editor from overwriting someone else's changes. Unsaved drafts remain on the current browser/device and can be restored on reopening. The editor does not automatically sync offline drafts.

Opening a guide/notebook online caches all document text for that trip on this browser. Production builds include a service worker that caches the app shell, so a previously visited app can reopen offline; Google Maps/search/routes, attachments and external websites require connectivity. The map cannot be used offline. Browser storage may be cleared or unavailable, so this is a convenience rather than a backup.

Images (JPEG/PNG/WebP/GIF) and PDFs up to 10MB are stored in the non-public `travel-attachments` bucket and opened using short-lived signed URLs. **The workspace still has no authentication: anyone who has the site and public client configuration can read/edit the shared trips, documents and attachments. The bucket is not a personal vault for sensitive reservation/identity information.** Removed blocks retain uploaded files rather than permanently deleting attachments.

Original researched Japanese content and source links are in `scripts/guide-content.mjs` (checked 2026-09-16). Seed against the current workspace after applying the document migrations:

```bash
node scripts/seed-travel-guides.mjs         # coverage check only
node scripts/seed-travel-guides.mjs --write # add missing documents; never overwrite existing pages
node scripts/enrich-travel-guides.mjs         # preview researched additions to 12 existing guides
node scripts/enrich-travel-guides.mjs --write # append once, preserving edits; backs up first and checks revisions
```

The initial seed covers all 100 activities in the two saved trips, including transport and unspecified stops. Unknown facility/booking details are marked for confirmation; prices and availability are not promised. New stops start with an empty editable guide.
