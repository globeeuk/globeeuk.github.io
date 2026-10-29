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

### Family theatre within Days out — 6 October 2026

Family plays, storybook adaptations, musicals, puppetry and pantomimes belong in the existing Days out directory, not a new permanent theatre section. Use `tab=dayout`, `type=theatre` in the shared master Sheet; the site labels these **Theatre & shows**. Drama, singing and musical-theatre tuition remain Classes & lessons (`tab=lesson`); do not turn lessons into outings.

Keep one master entry per production and region. Add only confirmed public performance dates to `events`, leaving gaps intact rather than representing a selected-date run as daily. Exclude school-only and adult-only performances. The same dates feed **This weekend** and **Next 4 weeks** (today plus 27 days, up to 10 homepage cards, all matches under View all). Verified festive productions with booking links may also receive the existing `bookAhead` annotation; do not copy rows into a separate Christmas database.

Verify venue, year/weekday, age guidance, running time/interval, prices/fees and booking conditions from the organiser. Leave missing ages or duration TBC. Label student/amateur productions clearly. Use licensed venue photographs if production-photo reuse is unconfirmed; never imply that a venue photograph depicts the show. Preserve ended performances and re-check changed schedules during normal reviews. No extra research automation or new-region expansion is authorised by this classification rule.

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

## Seasonal tree guide — 6 October 2026

The user-approved winter homepage entry links to `/exeter/christmas-trees/`, a hand-maintained seasonal guide, not an output of `seo/build.py`. Preserve that route and its root-sitemap entry during routine staging. It summarises the existing Cotley Farm Christmas and Exe Valley Christmas Trees Sheet records; it is not a separate operating database. Their official sites were rechecked on 6 October 2026. Reconcile material factual changes with the Sheet before changing the guide, and do not refresh its checked date without a new official-source review. Exeter rental coverage remains unconfirmed.

This release also replaces nine Devon Christmas search illustrations and four additional Exeter/Bristol venue mappings with licensed photographs. `qa/image-sources.json`, `qa/christmas-photo-sources.json` and `image-credits.html` record licences and provenance. Cotley uses a labelled tree-growing reference, not a Cotley photograph; Exe Valley uses a labelled Thorverton village photograph, not a farm photograph. Other images show venues or locations, not the 2026 event. The decorative tree banner is distinct from event photography. No claim of Google indexing or visitor growth follows from this release.

### Seasonal buying-guide follow-up — 11 October 2026

The user requested purchase places and prices on the existing tree guide. Cotley and Exe Valley details were expanded, and Haldon and Greendale retail options added. This is guide-only shopping information, not four new calendar events. The live published Sheet was read to reconcile existing venue facts (Cotley and Greendale); no Sheet rows, snapshot, event dates or prices were changed. Supplemental buying facts and official-source checks are recorded in `qa/christmas-tree-buying-sources.json`. Preserve this hand-maintained guide when generating ordinary event guides.

Exe Valley explicitly labels its price list 2026. Cotley’s price table has no season label. Haldon publishes 2026 opening dates and prices by minimum height. Greendale’s product collection dates omit a year, so its 2026 availability/prices remain TBC despite visible pre-order pages. Do not silently promote these caveats to confirmed stock, rental coverage or booking availability. No indexing or traffic result is inferred from publication.

## Weekend discovery completion gate — 15 October 2026

The user explicitly authorised ongoing registration and homepage updates for selected, officially checked Exeter/Devon and Bristol Weekend Edit discoveries. A recommendation table or social draft alone is not completion. Prefer varied experiences (science, creative workshops, culture and free activities), not only familiar large attractions; never fill a numerical quota with weak evidence.

Before marking a selected edit ready: reconcile exact names/regions in the native master and events tabs; add missing records and only officially supported dates; preserve historical rows; read back the native cells and complete published CSV; refresh the complete directory snapshot; retain real licensed venue photography where available; run the existing live-binding and staging checks; deploy; then verify the public homepage directory, map reference where verified, and matching Weekend Edit URL. This authorisation covers these bounded event-data/photo integrations, not analytics/privacy changes or new regions. Unconfirmed fees, suitability, capacity and live ticket availability remain explicitly TBC. If a source or deployment blocks completion, distinguish recommendation, DB registration, deployment and Instagram preparation/publication states. File existence never proves an Instagram post.

The 15 October selection is Robot Workshop, Mermaids and Monsters writing, Arrietty and Norman Lockyer Family Fun Day for 17–18 October. Darts Farm/Crealy remain in the directory and next-weekend guide; their omission from the current editorial selection is curation, not cancellation. Eventbrite direct retrieval was rate-limited; only its organiser-authored indexed schedule/age/venue was supported, with price/places/adult arrangements TBC. Do not bypass rate limits or promote placeholder prices to verified admission.

## Search Console and measurement

### Photo-first homepage and directory — 29 October 2026

The owner reiterated that directory cards must use relevant real photographs, with generated illustrations excluded. The shared image catalogue now returns no image when an appropriate licensed photograph is unavailable. Keep these listings readable as compact text-only cards, without a decorative placeholder or blank photo-height block, in the homepage, Holiday clubs, Plans and map details. Do not restore the theme-based illustration fallback. This does not remove any activity or change event facts, evidence dates, the Sheet or analytics/consent settings.

Nineteen current Exeter/Devon records gain photo mappings, including Cathedral activities, Theatre Alibi at Emmanuel Hall, Exeter Library, Barnfield shows and the Killerton/Greenway/Arlington Court seasonal records. Five new licensed venue assets and their credits are documented in `qa/photo-first-2026-10-29.json` and the image register. These are historical venue photographs, not the current event or decorations. The family's explicitly approved rocket and handprint seasonal banners remain unchanged. Preserve `photo-first.css` and the matching image-catalogue/app cache versions during the 30 October seasonal switch and future homepage updates. Presentation changes do not establish visitor growth or a new marketing test.

### Classes comparison placement correction — 29 October 2026

The user clarified that the approved price-first course comparison design belongs to the **Classes & lessons tab itself**, not separate Parent notes posts. `/classes.html` and `/bristol/classes/` now contain all twenty detailed course comparisons per region, including fees/extras, tasters, ages, times, adult-stay rules and source disclosures. All original 28 Exeter and 27 Bristol directory entries are preserved; split age groups produce 35 and 37 displayed options, not that many newly verified providers. No new source review or live availability check is claimed. Detailed source dates remain 21 October; older directory facts retain their previous context. Nottingham's existing eighteen listings are unchanged.

The two former `/parent-notes/*-childrens-classes-costs/` routes are immediate, canonicalised move pages with visible fallback links; their script preserves course hashes. They are removed from the sitemap, while existing class routes retain their canonicals and receive the content-change date. Do not restore the old class-post cards to Parent notes. The comparison table links directly to inline class-course anchors and identifies Classes as its active section. Birthday, travel and childcare Parent notes remain. The private migration builder is `reviews/globee-classes-main-2026-10-29/build.mjs`; public mapping/scope evidence is `qa/classes-main-migration-2026-10-29.json`. This is a correction to the 21 October placement, not a new acquisition campaign, reverified database or a social post. Preserve the existing analytics/privacy settings and generated event guides.

### Shared family-travel Parent note — 29 October 2026

The user approved `/parent-notes/amsterdam-with-kids/` for publication. This hand-maintained, static article is one shared Parent note, not three regional copies or a new event/region. The first compact card in the homepage Parent notes section is visible for Exeter/Devon, Bristol and Nottingham; the Days out seasonal banners are unchanged. Preserve the article, its assets and the root sitemap entry during ordinary staging. The private export source is `reviews/globee-family-travel-notes-2026-10-29/publish.mjs` in the project workspace; public source qualifications are in `qa/amsterdam-family-travel-sources-2026-10-29.json`.

The account describes 23–28 October travel. The coast was planned but cancelled; Zuid-Kennemerland and Zaanse Schans are researched extras, not first-hand visits. Unknown actual spending, menu names and the Haarlem museum name are not invented. Operator facts and UK routes are dated guidance, not live availability. Only twelve user-supplied, resized and metadata-stripped trip photographs are reproduced, with no child faces. Original HEIC/MOV files, the unlicensed Stayokay room image and the third-party sign screenshot are excluded. Stayokay room photographs are linked on its official website. Saving deterrents and a display watermark are not copy protection; raw web JPEGs remain retrievable.

The article retains the existing analytics scripts and consent controls without new collection settings. Publication is not evidence of indexing or visitor growth. The owner's planned 30 October Instagram post remains planned until confirmed; do not count preparation or this web release as a social post. No indexing request or sitemap resubmission is authorised by the release.

### Wednesday selection — 21 October 2026

The dated `verified-candidates-2026-10-21.json` review supplements the existing weekend choices with Exeter's RAMM Bayeux digital trail and Wildwood, and Bristol's Adire family workshop. The Adire workshop has a confirmed 24 October date but its time, fee, booking rule and numerical ages remain TBC. Its new native master/event rows are 272/532; it has no verified map point and uses the existing licensed Bristol Museum venue photograph. Blaise's event periods were split into 24–25 October and 29 October–1 November (events 184/533), excluding the closed days in between. Its specific 24–25 October booking pages quote adult £5/child 4–16 £3/under-4 free, differing from the general event page. Preserve that qualification and the separate under-4 ticket requirement. Other item verification dates were retained. The Bristol five-card carousel is preparation only, not evidence of publication or visitor growth.

### Birthday Parent note — 20 October 2026

The shared notebook header now presents a prominent two-line “Change area” control in `notebook.css` and `notebook.js`; retain it and its cache versions when updating the homepage or regional classes. The birthday article uses a native region menu with an explicit Exeter-only qualifier: its links open the selected area's directory, not a nonexistent regional version of this article. Its export source is `reviews/globee-birthday-parent-notes-2026-10-20/publish.mjs` in the private project workspace. This usability change does not add tracking or establish a traffic increase.

The birthday SEO follow-up adds a descriptive, static link from each Exeter guide footer, maintained in `seo/build.py`, and a return link plus BreadcrumbList in the article. Keep this navigation local to Exeter; it is not a Bristol party list. Rebuild generated footers with `seo/stage.py` and its live Sheet binding guard, not hand-copied HTML. Do not alter the provider verification dates merely to promote the article. Social carousel files are preparation only until the owner confirms publication.

The user approved the researched birthday guide and its compact capacity, minimum-hire, maximum-hire and separately qualified party-slot labels. The hand-maintained, static route `/parent-notes/exeter-birthday-parties/` is linked from the homepage's Parent notes section and included in the root sitemap. Preserve it during ordinary SEO staging; it is not an event export or another regional directory. All twenty provider entries, including the subsequently requested Tenpin Exeter bowling package, must remain readable without JavaScript. Research provenance and hire qualifications are recorded in `qa/birthday-sources-2026-10-20.json`. Tenpin's national party page and Exeter price were checked on 20 October; its unknown maximum party capacity must not be inferred from the 36-person online booking limit. Its specific 4–13 party guidance and no-staff-cake-presentation FAQ take precedence over broader or older marketing wording. Link to official venue photos; no Tenpin photo reproduction licence has been confirmed.

This is Yewon's planning-stage note, not a completed-party review, a sponsored placement, a verified availability list or a live quote. Missing hire limits remain “Ask venue”; do not infer maximum hours from building opening times. Meraki off-site work requires direct agreement. Do not present a January voucher sale as confirmed. Published provider starting prices retain their basis, travel and eligibility conditions.

Only the licensed Community Centre and Beacon exteriors and the credited Unsplash cake are reproduced. Six permission-pending official venue images from the private mockup are replaced by links to official photo pages. Do not add them back without documented permission or an appropriate licence. No child faces or AI venue placeholders are used. The article retains the site's existing analytics scripts and consent settings without changing collection policy. Publication does not prove search indexing, Instagram publication or visitor growth; marketing outreach and social posting require separate approval.

On **13 September 2026**, ownership of `https://globeeuk.github.io/` was verified in the owner's Search Console account using the homepage HTML tag. Preserve that tag. The combined `https://globeeuk.github.io/sitemap.xml` was submitted, and the hub plus all three guides were individually accepted into the priority crawl queue through Request indexing. These actions do not prove actual indexing.

The sitemap report initially showed **Couldn't fetch / 0 discovered pages**. A live URL Inspection test of that exact sitemap at **16:15 BST** confirmed **Crawl allowed: Yes**, **Page fetch: Successful** and **Indexing allowed: Yes**. Public HTTP checks also returned 200 with valid XML. The sitemap was resubmitted once after that successful live test. Report processing still needs a later status check; do not describe it as successfully parsed until Search Console says so. If it persists, follow [Google's sitemap troubleshooting guidance](https://support.google.com/webmasters/answer/7451001?hl=en). A new property is not by itself proof that an error is harmless.

**Follow-up — 13 September 2026, 19:21 BST:** the sitemap detail still reported that it could not read the sitemap, with **last read: 13 September 2026** and **0 discovered pages**. No manual action was detected. No sitemap resubmission or settings changes were made during this check. The successful 16:15 live test above remains a historical observation; it was not repeated or refreshed at 19:21.

**Morning follow-up — 14 September 2026:** the source review covers the weekends of 19–20 and 26–27 September. The existing Pennywell Pumpkin Festival candidate is included for 26–27 September only, with date-specific 2026 booking evidence, daytime hours, advance-booking requirements and extra purchases. Native Sheet descriptions `시트1!N5` and `시트1!N104` were supplemented and checked through native readback, the rendered Sheet and the published CSV before bindings were updated. Historical records remain. Exeter Library retains its 13 September item verification date because its opening-hours source timed out in web, direct retrieval and the browser; its other branch information was checked without treating that as a fresh hours check.

At **08:47 BST**, Search Console still showed that `sitemap.xml` could not be read, with last read **13 September** and **0 discovered pages**. No detailed HTTP/XML error was exposed. Public checks returned valid XML and HTTP 200 at the exact URL, no crawler restriction and the expected robots sitemap reference. The cause remains unresolved; no resubmission, live test, indexing request or statistics query was made. Discovered-page count is not an indexed-page count. The earlier successful Google live tests remain historical observations.

During the next scheduled SEO run, check this outstanding sitemap status once if access is available, record the result and report a meaningful change or required action. Stop this temporary check after successful processing. Do not submit the same URL repeatedly or invent a resolution time.

Review queries, impressions, clicks and consented site visits manually when useful data and time are available. This procedure does not add a statistics schedule. Assess whether parents are reaching and using the guides before adding more pages or distribution systems.
