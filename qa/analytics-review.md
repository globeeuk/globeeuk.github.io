# Google Analytics review — 10 September 2026

The previous public site contained GA4 measurement ID `G-YRRY654LS1`. This release keeps that ID; it does not create another property.

## Implemented and checked

- Basic opt-in: the Google tag is not requested before a visitor chooses Allow analytics. No thanks leaves the directory fully usable. The choice persists locally and can be changed in the footer. The first-visit choice appears in normal page flow above the footer, not as a floating banner or modal; on the privacy page it sits inside the analytics section.
- Local previews never load Google Analytics, including when Allow analytics is chosen.
- One explicit page view is sent per document load. Automatic initial page views are disabled in the website configuration.
- Page location is reduced to origin and pathname. Referrers are reduced to their origin. The website's custom events do not include search text, child age selections or date ranges.
- Custom events cover list/map switching, opening an edit, pagination and following an official provider link. Custom parameters are allow-listed.
- Advertising consent stays denied. Google signals and advertising personalisation are disabled in the website configuration.
- Withdrawal disables the measurement ID, updates consent and expires the site's `_ga` cookies.
- Automated checks cover opt-in, local-host exclusion, a single sanitised page view and withdrawal. The footer preference control was also checked in the browser.

## Not verified in the property dashboard

Property ownership, Realtime/DebugView receipt, retention settings and enhanced-measurement settings have not been verified in the Google Analytics dashboard. Successful script loading alone must not be reported as confirmed data receipt. No historical traffic figures are asserted.

The property owner should check the matching web stream and Realtime after opting in on the live site, review automatic site-search/form/history measurement, and confirm appropriate retention settings. Optional analytics means the dashboard will not count visitors who decline. This review is an implementation review, not a legal compliance certification.

## Search visibility and campaign drafts

Canonical URLs, descriptions, robots.txt and a sitemap now refer to the active root site. Search Console verification and indexing requests have not been made. Google chooses the actual search title and snippet. UTM links are included in the promotional copy, but this release strips query strings from its explicit page-view URL; campaign-attribution reporting should be checked in GA before relying on it.

## References

- [Google consent implementation guidance](https://developers.google.com/tag-platform/security/guides/consent)
- [Basic and advanced consent behaviour](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [GA4 configuration reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [Google search snippets](https://developers.google.com/search/docs/appearance/snippet)
