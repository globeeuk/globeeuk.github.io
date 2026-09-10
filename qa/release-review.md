# Release QA — 10 September 2026

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
