# Trip App

A responsive trip planner with a map-first itinerary. Trips are synchronized through one shared Supabase workspace, with browser storage as a fallback.

The shared workspace does not use authentication. Anyone who can open the deployed site can read and edit its trip data.

## Local development

```bash
npm install
npm run dev
```

## Google Maps

The map and place search use a Google Maps JavaScript API key configured when the app starts or builds. Enable the **Maps JavaScript API**, **Places API (New)**, **Geocoding API**, and **Routes API**. Places API provides multilingual place suggestions, nearby Bónus supermarket pins for Iceland days, and the three closest EV chargers within 10km of a lodging stop. Routes API draws driving or walking routes and estimates travel time between stops. Clicking a stop focuses its incoming same-day route; shared route sections alternate their point colors as short dashes. The current-location control requests browser location access only when pressed.

The base map uses Google's default road-map colors and clickable place icons. Google chooses which business labels to show at each zoom level; zoom in or use place search for businesses not labeled on the map. More control over point-of-interest density would require a Google Cloud map ID and a cloud-based map style.

Tap a named place on the map or select a search result to add it to the itinerary or save it as a trip-specific bookmark. Bookmarks stay separate from dated plans, use the ご飯・自然・施設・スーパー・遺跡・オブジェ・その他 categories, and can be extended with your own trip-specific categories. They appear as small colored pins. The 候補 button opens a searchable, filterable list; selecting a saved place focuses it on the map. Bookmarks are stored with the trip in the shared workspace and in its offline copy.

On opening, Trip App selects the nearest active or upcoming trip and the itinerary day closest to the device's local date. When every trip has ended, the home screen offers a new trip or a list of past trips. On phones, selecting a plan while the itinerary is half open keeps the map and timeline side by side and highlights that plan's route.

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

Use the download button beside the trip title while online to save the selected trip for offline use. It stores the itinerary, all guide/notebook text, itinerary photos, notebook images and PDFs on that device, and asks the browser to keep the storage when supported. Production builds cache the app shell, so the saved trip can reopen with no connection. Google Maps, place search, routes, EV/Bónus discovery and external links remain online-only. Saving again refreshes the local copy. Browser storage can still be cleared by the user or operating system, so this is a travel copy rather than a permanent backup.

Images (JPEG/PNG/WebP/GIF) and PDFs up to 10MB are stored in the non-public `travel-attachments` bucket and opened using short-lived signed URLs. The same bucket stores up to eight photos attached directly to each itinerary plan; those photos appear in the timeline and map detail card. **The workspace still has no authentication: anyone who has the site and public client configuration can read/edit the shared trips, documents and attachments. The bucket is not a personal vault for sensitive reservation/identity information.** Removed blocks and detached plan photos retain uploaded files rather than permanently deleting attachments.

Original researched Japanese content and source links are in `scripts/guide-content.mjs` (checked 2026-09-16). Seed against the current workspace after applying the document migrations:

```bash
node scripts/seed-travel-guides.mjs         # coverage check only
node scripts/seed-travel-guides.mjs --write # add missing documents; never overwrite existing pages
node scripts/enrich-travel-guides.mjs         # preview researched additions to 12 existing guides
node scripts/enrich-travel-guides.mjs --write # append once, preserving edits; backs up first and checks revisions
```

The one-time September 20/21 itinerary correction is reproducible and revision checked:

```bash
node scripts/apply-domestic-day-swap.mjs         # preview only
node scripts/apply-domestic-day-swap.mjs --write # back up, swap, save and verify
```

The initial seed covers all 100 activities in the two saved trips, including transport and unspecified stops. Unknown facility/booking details are marked for confirmation; prices and availability are not promised. New stops start with an empty editable guide.
