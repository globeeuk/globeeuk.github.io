# Globee

A family activities directory for Exeter · Devon and Nottingham.

Live site: https://globeeuk.github.io/

## Run and check

This is a static, build-free site. Serve the repository with `python3 -m http.server 8767`, then open the local address. Run `node --test tests/*.test.cjs` for the data-loading and analytics checks. Analytics is disabled on local hosts.

## Data flow

The existing published Google Sheet is the source of truth. `db-loader.js` reads the master tab (`gid=0`) and curated events (`gid=1801686098`) as public CSV. Both must load and validate before replacing displayed data. No browser write credentials are used.

`db-snapshot.js` preserves a dated copy of all public rows for first paint and connection failures. The release snapshot contains 116 master records and 135 event rows; these overlap and are not 251 unique activities. Historical rows remain in the source and snapshot; expired or cancelled activities are excluded from current browsing. `db-adapter.js` joins explicit name aliases and normalises schedules without guessing dates, ages or prices.

`editorial.js` contains display-only name aliases, photographs, checked map positions and editorial selections. It is not a second event database. Add a new record to the Sheet first. Dates and prices stay in the Sheet. Unknown positions stay off the map; unknown ages and dates stay TBC.

## Loading and display limits

- Home: six cards per horizontal rail; View all opens the complete events-and-clubs list.
- Browse and map: twelve results per page, with page controls. No arbitrary total-results cap.
- Metadata: both small CSV files load together; a five-minute browser cache reduces repeat requests. This is client-side pagination, not paginated Sheet downloads.
- Photos load near the viewport and use existing provider thumbnails where available. Leaflet and map tiles load only when the map is opened.
- When the Sheet cannot load, the saved directory remains visible with its date and a retry button. This is a data fallback, not a fully offline website or offline map.

## Release review

See [QA report](qa/release-review.md), [Analytics review](qa/analytics-review.md) and [image sources](qa/image-sources.json). The Google and Instagram promotional drafts are separate review artifacts and are not automatically published with the site.

Prices & schedules change — always check the provider before booking.
