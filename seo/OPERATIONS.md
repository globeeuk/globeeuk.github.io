# Operating the Globee search guides

Keep a small set of useful search pages accurate with little repeated work: use the existing Sheet database, verify the facts being published, and rebuild the guides from that checked material.

## Scope and schedule

Work in the checkout whose origin is `https://github.com/globeeuk/globeeuk.github.io.git`. The public site is `https://globeeuk.github.io/`; do not deploy to the old `/globee/` address.

Keep the existing broad daily research automation **paused**. This procedure does not resume it or establish another general event-research pipeline.

The proposed narrow SEO heartbeat runs twice daily in **Europe/London**, following the local clock through summer and winter:

| Time | Purpose |
| --- | --- |
| 07:30 | Review official sources for the selected guides, reconcile relevant Sheet changes and rebuild when appropriate |
| 18:30 | Rebuild primarily to remove expired or ended choices; review source changes only when needed |

**Activation is pending confirmation of the saved automation.** Record the actual result before describing this schedule as active. A scheduled invocation is not proof of successful publication.

Twice-daily builds do not remove an event at the exact second it ends. An urgent cancellation or material correction can justify an additional run.

## Morning review

1. Confirm the repository and inspect its working state. Preserve unrelated work and start from the current public version.
2. Read Sheet1 and events with `sheet_candidates.py`. Identify relevant changes and missing matches. A row's added date or a successful download does not establish verification.
3. Review official provider sources for the choices to be shown this weekend, next weekend, in the free guide and in the rainy-day guide. Confirm the year, dates or opening schedule, admission basis, location, age guidance and material conditions. A working URL alone does not verify its contents.
4. Reconcile corrected or new facts with the operational Sheet. Keep the shared regional schema, preserve historical rows and leave unresolved values as TBC. A similarly named venue is not automatically the same dated event.
5. Update the dated research export with supported facts. Change each item's `verified_at` only after reviewing its official source; retain the older date for an item not rechecked. Keep separate building hours, last admission, parking costs and booking conditions in visible practical notes as well as source evidence.
6. Refresh the relevant `sheet_bindings` after reconciliation. Build a review catalogue, run the binding check, render the preview and run the tests. Follow the release procedure if the output changes.

Use the dated exports in `research/` as format examples. Include official URLs and concise evidence notes so another reviewer can reproduce the decision. Keep unrelated personal context out of public research exports.

## Evening expiry refresh

Use the most recently checked export and preserve its verification dates. Fetch a current queue or let the binding checker fetch the CSVs itself. Run checks and the production build at the current time, without `--as-of`.

The renderer excludes events after their confirmed end time. With no end time it uses the end of the local date. It also excludes evidence older than seven days for events or 30 days for ordinary places. These exclusions affect the guides, not historical Sheet records.

If public files are unchanged, do not make an empty publication. Never renew `verified_at` simply to keep an activity visible. Review any selected item's material source or Sheet change before publishing it.

Keep the current and next weekend visibly separate. After the current weekend's events finish, next weekend's choices stay under their own dates. Do not relabel them as this weekend. Fewer than two distinct current choices means `noindex`; keep an honest limited state rather than padding it with unverified activities.

## When the Sheet binding check fails

Check the catalogue that will actually be rendered:

```sh
python3 seo/check_sheet_bindings.py --catalog seo/catalog.json
```

The default command fetches both published CSVs. A just-created queue can be reused:

```sh
python3 seo/check_sheet_bindings.py --catalog seo/catalog.json --queue seo/research/sheet-candidates.json
```

A reusable queue must be no more than one hour old, have a valid UTC preparation timestamp and identify the existing published CSV sources. Future timestamps, unexpected sources and queue integrity errors are rejected. Freshness uses the actual clock, including during fixed-date tests.

The checker covers records selected for this weekend, next weekend, free activities and rainy days. Each needs a binding to a master candidate, a matching official source URL and, for events, matching dated occurrences. Changing the bound contents or adding/removing matching event rows changes the fingerprint; moving an unchanged row does not.

On failure, stop publication and resolve the cause:

- **Old or invalid queue:** fetch a fresh one and repeat the check.
- **Missing or ambiguous candidate:** reconcile the exact activity and region in the Sheet. Do not manufacture a match from a nearby venue or similar title.
- **Changed dates, prices, URL or occurrences:** review the official source, reconcile the Sheet and update the checked export and binding together.
- **Source temporarily unavailable:** retain the existing evidence date and report the unresolved check. Do not substitute sample data or claim a fresh verification.

Published CSVs can briefly lag behind a Sheet edit. Confirm the actual values in the native Sheet, then fetch the CSVs again; do not change the evidence or bypass the guard to make an old cached response pass.

Do not edit a fingerprint just to silence an error. It records the reviewed relationship between the Sheet and export; it does not replace that review.

## Release and verify

Use the preview and production commands in [README.md](README.md). After preparing the reviewed `seo/catalog.json` and passing the tests, run:

```sh
python3 seo/stage.py
```

This command fetches the live Sheet, validates bindings, renders at that same London time and copies only the generated SEO publication files. It also merges the root sitemap while preserving non-SEO URLs and their metadata. It changes working-tree files but does not commit, push or publish. Inspect its report, pages and Git diff before release; do not bypass the guard with a manual copy of older output.

Recurring releases are limited to:

- Relevant checked SEO source/export files under `seo/`, including generated `catalog.json`.
- Generated root `exeter/` and `seo-assets/` directories.
- Root `seo-sitemap.xml` and corresponding changes to root `sitemap.xml`.

Do not stage ignored preview/production directories, the raw candidate queue or build reports. Preserve non-SEO sitemap URLs and the homepage's guide links, footer and privacy controls. A recurring release must not replace root `index.html`, `analytics.js`, `privacy.html`, application code or unrelated assets.

Review the change list explicitly before committing. A source review with no resulting public change does not require redundant site publication. After a push, confirm the public result:

1. The guide index and three guide routes return usable pages at their root-domain URLs.
2. Dates and the current/next-weekend distinction match the release; ended activities are absent from upcoming choices.
3. Canonicals, `noindex` states and both sitemaps agree with the build report. Thin guides stay out of the SEO sitemap.
4. Official links and the stylesheet work. Privacy and Cookie settings retain the existing consent flow; no inline guide script starts analytics directly.
5. The homepage's directory and existing navigation still work.

Report meaningful corrections, publication failures or required action. Keep routine unchanged runs quiet. Record deployment as complete only after public verification succeeds.

## Search Console and measurement

Search Console ownership and sitemap setup are **pending until verified in the actual owner's property**. Once access is confirmed, use the root-domain property and submit the combined `https://globeeuk.github.io/sitemap.xml`, retaining its existing URLs. Inspect guide URLs and indexability; sitemap submission does not prove indexing.

Review queries, impressions, clicks and consented site visits manually when useful data and time are available. This procedure does not add a statistics schedule. Assess whether parents are reaching and using the guides before adding more pages or distribution systems.
