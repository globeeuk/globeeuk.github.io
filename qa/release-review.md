# Seasonal discovery release — 13 September 2026

## Current behaviour and QA

- Added one optional seasonal rail above This weekend. It renders only during its configured display dates and only when verified, date-confirmed matching records exist in the selected region. Halloween is active 13 September–31 October 2026; Christmas is configured for 1 November–24 December and remains absent when it has no matching data.
- The Halloween home rail shows at most five cards. Its View all count comes from the full matching set and opens the dedicated `/halloween.html` page. The page has a static search title, description, canonical URL, social preview metadata, CollectionPage structured data and a sitemap entry. Full lists still append twelve cards at a time when they exceed the first batch.
- Added Darts Farm Pumpkin Fest, Devon Science Halloween Potions Lab and Seaton Tramway Trick or Treat Tram to both Sheet tabs from official sources. Published CSV propagation and the final 130-master/149-event snapshot were verified. Historical rows were preserved.
- At this check, the current directory has 58 Devon entries and 15 Nottingham entries. The Halloween edit has five Devon and four Nottingham matches; the Devon rail uses the five actual records without padding. This weekend has two current Devon and one Nottingham entry on 13 September.
- The map includes all located results independently of list batches and returns to the loaded list. Darts Farm, Park Life Heavitree and Seaton Tramway were matched to named OpenStreetMap venue records and their official addresses, so all eight Devon Halloween plans now appear on the map. Current coverage is 32 Devon records across 17 locations and 14 Nottingham records across seven locations.
- Desktop layout has four grid columns at 1365px with no document overflow. Mobile at 390px has two columns, a swipeable weekend row and a horizontal filter row. Calendar selection 12–13 September returned exactly five Devon results and hid the weekend row. Map QA now covers every located Nottingham entry, including the final list batch; return to list retains existing cards.
- Forty-five licensed photo assets now cover 57 current cards. Thirty-one cards without a sufficiently specific, reusable source keep a labelled illustration. Repeated venue groups, including the Bristol pilot venues, use different views where possible, bringing the directory to 53 distinct displayed image assets. No venue/location photograph is described as the current event.
- Images total 2,461,748 bytes across 54 reusable assets; individual files are 15–78 KB. Every new source was cropped to 3:2, resized to 640 × 426, converted to WebP and stripped of metadata. Cards still load images only near the viewport, so the 2.4 MB library is not fetched as one bundle. This is not a measured slow-network load-time guarantee.
- Browser QA at desktop and 390px mobile widths confirmed the new crops, photo/illustration labels and horizontal weekend cards without page overflow. Nottingham loaded all 16 rendered image elements with zero broken sources; the browser console had no errors.
- Twenty-three automated tests pass: existing DB/consent/loading regressions, weekend and seasonal boundaries, full seasonal-list retention, twelve-card traversal, image completeness/licences/size, all-map selection, zoom grouping, location validation and dedicated-page search metadata. The saved-data error notice and retry remain available; successful update dates are hidden.
- GA collection behaviour is unchanged. The previous limitations around missing map coordinates and source uncertainties still apply.

## Image provenance

Each detail card and the public Image credits page expose creator/source/licence and resizing/crop notices. `image-sources.json` records all 41 selected licences and local file sizes. Official-site images without confirmed reuse permission remain excluded. `illustrations.md` records the generated themes and full prompts.

## Full map follow-up

- Removed map pagination entirely. All matching coordinates are considered even when the list has only rendered its first twelve cards. No extra geocoding service or clustering dependency is loaded in the browser.
- Added nineteen named venue coordinate records. Current coverage: Devon 25 records across 16 locations; Nottingham 14 records across 7 locations. Existing unlocated records remain in the list. Online and multi-venue programmes are not assigned an arbitrary headquarters pin. The New Hampshire Exeter Library search result and broad forest coordinates were rejected.
- Nearby pins form count groups which zoom in when chosen. A shared venue keeps its activities on one pin and uses previous/next controls on a single preview. The default recommendation is random within the current region's existing recommended places, or another located result when no recommendation is available. It stays stable across list/map toggles and can be dismissed.
- Browser QA counted 25 represented Devon IDs and 14 Nottingham IDs, with no page controls and one preview card. Closing the card kept pins visible; zooming groups preserved all represented IDs; selecting Nottingham Contemporary opened only that place's preview. List/map toggling retained the original selection. No browser console errors were recorded.
- Date-filtered plans (10–23 September, Devon) mapped all seven located results out of ten. At both 480×707 and 1365×900, entering the map positioned it below the sticky filters with the selected card fully in view and separate from the Show list button; neither layout overflowed horizontally.
- Coordinates, matches, scope and sources are recorded in `map-locations.json`. Prices and dates were not changed. Also corrected the Cathedral photo's year label to 2005.

---

# Earlier release checks — superseded layout

The notes below describe earlier builds on 10 September and are retained as a historical record. Current behaviour is described above.

## Data and functional checks

- Read the actual master and events tabs: 116 master rows and 135 event rows. Published CSV responses returned HTTP 200 and allowed browser cross-origin reading. Browser status confirmed a live refresh.
- Twelve automated checks passed, covering CSV edge cases, real-data joins, aliases, recurring dates, cancellation/history handling, unknown fields, unsafe URLs, price classification, consent and failed/partial Sheet refreshes.
- JavaScript syntax and local HTML asset references passed. Existing unrelated local project changes were preserved.
- Browser QA covered Devon/Nottingham switching, calendar date selection, resetting pagination after filters, View all, next-page results, free-price filtering, list/map toggling, and multiple activities at the same location.
- At review time, the all-plans view showed 33 Devon plans and 15 Nottingham plans. Devon 12–13 September returned five matching plans. These counts are date- and data-dependent.
- Mobile viewport width was 390 pixels, with no page-level horizontal overflow. Filter and card rails scroll intentionally. Desktop layout was also inspected. No JavaScript console errors were observed during the final checks.
- An animated map fit caused one marker click to miss during QA; map fitting now uses stable positioning with space below for its selection card. Three RAMM activities were then selectable through the shared marker.
- A master `free` flag had included low-cost and conditional offers. The adapter now excludes those from the Free filter and has a regression check. Original source price text remains visible.

## Connections and performance

Current-master official-link audit: 59 HTTP 200, two HTTP 403, zero HTTP 404. The two restricted pages are Libraries Unlimited's Summer Book Quest and the Donkey Sanctuary Sidmouth page. A 403 is an access limitation, not evidence that an event is cancelled. See `link-audit.json` for URLs and redirect destinations.

The link audit checks availability; it is not a fresh verification of every schedule or price. The two live CSV responses total about 54 KB uncompressed. The bundled snapshot is about 85 KB. Cards render twelve at a time and photos load near the viewport. The map loads on demand. Connection-failure tests retained saved results and offered retry. No measured slow-network speed guarantee is claimed; first visits still need the page and its scripts, and map tiles need a network connection.

## Content limits recorded honestly

- Coordinates and photographs are not columns in the current DB. Only annotated positions appear on the map. Missing positions remain in the list with a visible map-coverage note. Photos are not available for every card.
- BEST 10 is being built from four current Devon picks. Rainy-day rescues has two picks; Eat, then play has one. Nottingham's unfilled edits are marked as being checked. No fabricated ratings, cafés or ten-place ranking were introduced.
- Exeter Cathedral's database price can describe a family activity rather than general admission. Its card asks visitors to check admission details and is excluded from the Free filter.
- Powderham Food Festival's official page heading gives 3–4 October 2026 while body text gives different dates. Source dates have not been silently changed; the card records the inconsistency and asks visitors to confirm before booking.
- Provider photographs are credited reference images, not evidence of a particular event date. New provider images are linked remotely and not copied into this repository. No reuse licence is inferred from source credit; see `image-sources.json`.
- Analytics dashboard receipt remains unverified; see `analytics-review.md`. Promotional files are drafts and have not been posted to Google or Instagram.


## Next two weeks edit — 10 September 2026

Added a first edit linking to the existing plans page for today through today + 13 days in Europe/London. Counts come from the same normalised DB as the destination page: Devon 10 plans, Nottingham 3 at this check. Recurring sessions count once; ongoing events and the final day are included. Undated, past and out-of-window events are excluded. No Sheet rows were created or changed.

Verified the four-edit home layout and link on a 1440px desktop and 390px mobile viewport, matching destination counts, retained date filters in map/list views, no document overflow and no browser console errors. All 12 existing tests passed. Additional boundary checks covered TBC dates, ongoing events, the final day, recurring clubs, year rollover and the autumn DST change. The existing twelve-card pagination remains in use. GA opt-in behaviour is unchanged.
