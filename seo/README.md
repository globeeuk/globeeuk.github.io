# Globee search guides

Plain HTML guides help parents find a useful answer through search and continue into the existing Globee directory. The publication repository is **`globeeuk/globeeuk.github.io`**, serving **https://globeeuk.github.io/**. The older `globeeuk/globee` repository is not this deployment target.

The guide index and three guides were deployed and checked at their public URLs on **13 September 2026**. The **Globee SEO refresh** schedule is active, and Search Console ownership was verified. The guide index and all three guides were accepted into the crawl request queue. Sitemap processing and actual search indexing are separate outcomes; see [OPERATIONS.md](OPERATIONS.md) for the current Search Console status and regular operating procedure.

## Pages and publication rules

| Route | Content |
| --- | --- |
| `/exeter/` | An index of the three family guides |
| `/exeter/this-weekend/` | Separate **This weekend** and **Next weekend** sections, each with its own Saturday–Sunday dates |
| `/exeter/free-things-to-do/` | General visits in Exeter with explicit evidence of free admission or a free activity |
| `/exeter/rainy-day/` | General visits in Exeter with an indoor activity confirmed by the provider |

The weekend guide contains dated events, not ordinary places inferred to have a weekend event. Each section uses its matching occurrences. A published end time removes an event once that time has passed in Europe/London; without an end time it remains eligible until that local date ends. Removal takes effect on the next rebuild, not continuously between builds.

A production guide needs at least **two distinct, current choices** to be indexable. For the weekend guide, choices across this weekend and next weekend count together; the same activity in both sections still counts once. Thin or empty guides retain an honest empty state, use `noindex,follow` and stay out of the SEO sitemap. This is an editorial rule, not a Google ranking rule.

Event evidence expires after seven days and ordinary-place evidence after 30 days. These are maximum publication ages, not a promise that information cannot change sooner. A build never renews a verification date.

## Data path

```text
Sheet1 + events
  → unverified candidate queue
  → official-source review and Sheet reconciliation
  → dated research export with source bindings
  → generated catalogue + live Sheet binding check
  → preview and checks
  → production HTML, review and publication
```

Sheet1 and events remain the operational source of truth. `catalog.json` is a generated presentation snapshot, not a second event database. Preserve historical rows and unresolved details; do not turn TBC into a confirmed claim.

`sheet_candidates.py` reads the published CSVs with standard CSV handling, explicit region aliases and exact normalised name/region joins. Its queue includes fingerprints and unmatched candidates. **It performs no official-source verification.** `date_added`, `added` and the queue preparation time are never verification dates. The queue cannot be used as a checked research export.

Each checked record retains its own `verified_at`, official `sources`, evidence for its claims and `sheet_bindings`. Each binding holds the candidate's `candidate_id`, `name`, `region` and `fingerprint`. Bind only after reconciling the candidate with the checked facts; copying a fingerprint is not verification.

`check_sheet_bindings.py` checks selected guide records against the live Sheet. Missing or changed bindings, an unmatched master row, a source URL mismatch, missing event occurrences or an invalid queue stop publication. A row move alone does not invalidate a binding. See [the binding procedure](OPERATIONS.md#when-the-sheet-binding-check-fails).

## Local dry run

From the **public repository checkout**, using Python 3.9 or later:

```sh
mkdir -p seo/preview
python3 seo/sheet_candidates.py --output seo/research/sheet-candidates.json
python3 seo/prepare_catalog.py seo/research/verified-candidates-2026-09-14.json --output seo/preview/catalog-review.json
python3 seo/check_sheet_bindings.py --catalog seo/preview/catalog-review.json --queue seo/research/sheet-candidates.json
python3 seo/build.py --catalog seo/preview/catalog-review.json --output seo/preview
python3 -B -m unittest discover -s seo -p 'test_*.py'
python3 -m http.server --directory seo/preview
```

Replace the dated example with the latest genuinely checked export. Resolve a binding failure before proceeding. Preview files and the queue are ignored by Git; this dry run does not update the live site or the checked-in catalogue.

Open `/exeter/` on the local server. Preview pages use `noindex,follow`, an empty SEO sitemap and no analytics script. For historical tests, `build.py --as-of YYYY-MM-DD` evaluates at London midnight on that date. **Omit `--as-of` from production and recurring runs** so the current London date and time are used.

## Production release

After official review, reconciliation and successful checks, use the same reviewed export:

```sh
python3 seo/prepare_catalog.py seo/research/verified-candidates-2026-09-14.json --output seo/catalog.json
python3 -B -m unittest discover -s seo -p 'test_*.py'
python3 seo/stage.py
```

`stage.py` fetches the live Sheet, checks bindings and builds production pages using the same London time. It copies only the six generated SEO files into their root publication paths and merges the SEO entries into root `sitemap.xml`, preserving metadata for retained SEO URLs and all non-SEO URLs. Only a URL whose corresponding HTML bytes changed receives a new `lastmod`, using the current London date; merely running a refresh does not change it. It prepares working-tree files; it does not commit, push or publish to GitHub.

Review `seo/production/build-report.json`, the rendered pages and the Git diff before committing and publishing. The report contains the evaluation time, selected IDs and indexability; it is not evidence of a new source check.

Recurring publication is limited to reviewed SEO source/export files under `seo/`, generated `exeter/` and `seo-assets/`, and root `seo-sitemap.xml` and `sitemap.xml`. Do not publish preview directories, candidate queues or build reports. Use `stage.py` for the production preparation step rather than manually bypassing its live binding check.

The homepage's guide links, footer, branding and privacy setup are separate integration changes. Preserve them during refreshes. Do not replace the root homepage with the old prototype or overwrite unrelated application files.

## Analytics and search setup

Production guides reuse root `/analytics.js` and its existing optional analytics consent controls. Privacy and Cookie settings are available; provider links use the existing `detail-link` hook. The generator does not embed or start Google Analytics directly. The existing consent state and host checks govern collection.

Each guide has a unique title and description, a root-domain canonical, crawlable links and CollectionPage/ItemList structured data. There are no invented ratings or unsupported Event rich-result claims. The generated `seo-sitemap.xml` omits `lastmod`; the root sitemap retains it or updates it only when the page HTML changes.

Search Console ownership and sitemap submission are confirmed; sitemap processing remains a separate outcome tracked in [OPERATIONS.md](OPERATIONS.md). Inspect indexing, search impressions and clicks manually when useful; no additional statistics schedule is established here. Indexability and sitemap submission do not guarantee ranking.

There is no email signup form in these guides. Subscription collection and newsletter sending belong to a separate implementation.

## Checks

The tests retain the 10 September regression fixture. They cover date rollover, explicit end-time expiry, British summer/winter time, unknown end times, next-weekend separation, verification expiry, admission classification, regional boundaries, escaping, duplicate anchors, sitemap rules and consent-based analytics markup. Run the full `test_*.py` suite after pipeline changes.
