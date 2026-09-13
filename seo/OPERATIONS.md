# Operating the Globee search guides

Keep a small set of useful search pages accurate with little repeated work: use the existing Sheet database, verify the facts being published, and rebuild the guides from that checked material.

## Scope and schedule

Work in the checkout whose origin is `https://github.com/globeeuk/globeeuk.github.io.git`. The public site is `https://globeeuk.github.io/`; do not deploy to the old `/globee/` address.

Keep the existing broad daily research automation **paused**. This procedure does not resume it or establish another general event-research pipeline.

The active narrow SEO heartbeat, **Globee SEO refresh**, runs twice daily in **Europe/London**, following the local clock through summer and winter:

| Time | Purpose |
| --- | --- |
| 07:30 | Review official sources for the selected guides, reconcile relevant Sheet changes and rebuild when appropriate |
| 18:30 | Rebuild primarily to remove expired or ended choices; review source changes only when needed |

**Activated on 13 September 2026** and confirmed in the saved automation. A scheduled invocation is not proof of successful publication. This local scheduled task requires the computer to remain on, the desktop app to be running and the checkout to be available. See [official scheduled-task guidance](https://learn.chatgpt.com/docs/automations?surface=app).

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

Keep the current and next weekend visibly separate. After the current weekend's events finish, next weekend's choices stay under their own dates. Do not relabel them as this weekend. Fewer than two distinct eligible choices across the two weekend sections means `noindex`; keep an honest limited state rather than padding it with unverified activities.

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

This command fetches the live Sheet, validates bindings, renders at that same London time and copies only the generated SEO publication files. Its root sitemap merge preserves metadata for retained SEO URLs and all non-SEO URLs, while removing SEO URLs that become `noindex`. Before copying, it compares the existing and generated HTML bytes; only changed pages receive a new `lastmod` using the current London date. A refresh run, report timestamp or stylesheet change alone does not renew it. It changes working-tree files but does not commit, push or publish. Inspect its report, pages and Git diff before release; do not bypass the guard with a manual copy of older output.

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

On **13 September 2026**, ownership of `https://globeeuk.github.io/` was verified in the owner's Search Console account using the homepage HTML tag. Preserve that tag. The combined `https://globeeuk.github.io/sitemap.xml` was submitted, and the hub plus all three guides were individually accepted into the priority crawl queue through Request indexing. These actions do not prove actual indexing.

The sitemap report initially showed **Couldn't fetch / 0 discovered pages**. A live URL Inspection test of that exact sitemap at **16:15 BST** confirmed **Crawl allowed: Yes**, **Page fetch: Successful** and **Indexing allowed: Yes**. Public HTTP checks also returned 200 with valid XML. The sitemap was resubmitted once after that successful live test. Report processing still needs a later status check; do not describe it as successfully parsed until Search Console says so. If it persists, follow [Google's sitemap troubleshooting guidance](https://support.google.com/webmasters/answer/7451001?hl=en). A new property is not by itself proof that an error is harmless.

**Follow-up — 13 September 2026, 19:21 BST:** the sitemap detail still reported that it could not read the sitemap, with **last read: 13 September 2026** and **0 discovered pages**. No manual action was detected. No sitemap resubmission or settings changes were made during this check. The successful 16:15 live test above remains a historical observation; it was not repeated or refreshed at 19:21.

During the next scheduled SEO run, check this outstanding sitemap status once if access is available, record the result and report a meaningful change or required action. Stop this temporary check after successful processing. Do not submit the same URL repeatedly or invent a resolution time.

Review queries, impressions, clicks and consented site visits manually when useful data and time are available. This procedure does not add a statistics schedule. Assess whether parents are reaching and using the guides before adding more pages or distribution systems.
