# Globee

A family activities directory for Exeter · Devon and Nottingham.

Live site: https://globeeuk.github.io/

## Run and check

This is a static, build-free site. Serve the repository with `python3 -m http.server 8767`, then open the local address. Run `node --test tests/*.test.cjs` for the data-loading, discovery, image and analytics checks. Analytics is disabled on local hosts.

## Data flow

The existing published Google Sheet is the source of truth. `db-loader.js` reads the master tab (`gid=0`) and curated events (`gid=1801686098`) as public CSV. Both must load and validate before replacing displayed data. No browser write credentials are used.

`db-snapshot.js` preserves a dated copy of all public rows for first paint and connection failures. The release snapshot contains 116 master records and 135 event rows; these overlap and are not 251 unique activities. Historical rows remain in the source and snapshot; expired or cancelled activities are excluded from current browsing. `db-adapter.js` joins explicit name aliases and normalises schedules without guessing dates, ages or prices.

`editorial.js` contains display-only name aliases, checked map positions and editorial notes. It is not a second event database. Add a new record to the Sheet first. Dates and prices stay in the Sheet. Unknown positions stay off the map; unknown ages and dates stay TBC.

## Home and discovery

One horizontal shortlist leads the home page: This weekend, with up to five date-confirmed entries from the selected region. Saturday and Sunday are calculated using the current Europe/London date; on Sunday only the remaining day is shown. Ongoing programmes can qualify. Recurring entries count once; TBC and out-of-window activities never fill empty slots. Shorter dated outings come first, with names breaking ties. This is a date-based selection, not a quality or popularity ranking.

Below it, Explore all shows the complete current directory, including places, events and holiday clubs, ordered by next confirmed date with undated entries afterwards. Active filters hide the weekend shortlist. The existing plans page remains available for dated activities and clubs. Dates and prices still come from the Sheet; this change does not crawl or write new event rows.

## Loading and display limits

- Both lists start with twelve cards; a near-bottom observer adds the next twelve. A Show more button supports manual and keyboard access. The last batch can be smaller, with a visible end-of-results message. No arbitrary total-results cap: at this review there are 47 Devon and 15 Nottingham entries.
- A filter change returns the list to its first batch. Map/list switching retains loaded list cards and its scroll position. The map uses every matching record with a known location, independently of list batching. Nearby pins form numbered groups that zoom in on click; activities at the same venue share one pin.
- On first map opening, one current regional recommendation is randomly selected (falling back to another located result). Selection remains stable on list/map toggles and can be closed. Only one preview card/photo is rendered at a time.
- Both CSV files load together; a five-minute browser cache reduces repeat requests. Batching applies to card rendering, not Sheet downloads.
- Local WebP images are 640px wide and at most 74 KB. They load near the viewport; the 2.2 MB image library is never downloaded as one bundle. Leaflet and map tiles load on demand.
- Normal loading/update dates are hidden. A failed refresh still exposes the saved-data date and Refresh button. This is a data fallback, not a fully offline website or map.

## Map locations

As of this review, 25 of 47 Devon records and 14 of 15 Nottingham records have map coordinates, covering 16 and 7 locations respectively. Nineteen named venue location records were added from published coordinates, matched against existing provider addresses; provenance is in `qa/map-locations.json`. Pins represent a venue or its grounds, not a verified entrance. Online, multi-venue and uncertain locations remain in the list. No coordinates are geocoded at visit time.

## Image policy

`image-catalog.js` decorates DB entries without changing the Sheet. Confirmed, licensed venue/location photographs take priority. At this review, 46 of 62 current cards use 41 licensed photo assets; 16 cards use six shared illustration themes. Multiple activities at RAMM, Exeter Phoenix, Lakeside Arts, Theatre Royal, Royal Concert Hall, the National Justice Museum and Wollaton use different venue views where the source library allows it. Where no suitable reusable photograph is confirmed, labelled activity illustrations fill the image area. A generic chess photograph is marked Activity photo. Generated visuals never claim to show a real venue or programme.

All photographs have creator, source, licence and modification notices in place details and `image-credits.html`. WebP derivatives retain their source licences. Previous remote provider images with no confirmed reuse permission have been removed. A public website image or a credit alone is not evidence of permission. See `qa/image-sources.json` and `qa/illustrations.md` for the source records and illustration prompts.

## Release review

See [QA report](qa/release-review.md), [Analytics review](qa/analytics-review.md) and [image sources](qa/image-sources.json). The Google and Instagram promotional drafts are separate review artifacts and are not automatically published with the site.

Prices & schedules change — always check the provider before booking.
