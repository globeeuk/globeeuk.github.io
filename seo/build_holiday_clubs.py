#!/usr/bin/env python3
"""Render the user-requested December guides after checking every live Sheet binding.

Input is prepared from dated official-source research by prepare_catalog.py.
This seasonal guide is separate from the ordinary weekend renderer. It never
infers a daily run, renews evidence dates, writes the Sheet or publishes a commit.
"""
import argparse
import json
import re
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from xml.etree import ElementTree as ET

from check_sheet_bindings import BINDING_FIELDS, checked_candidates, covered, fetch_queue
from sheet_candidates import REGION_ALIASES

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://globeeuk.github.io'
REGIONS = {'Devon': ('exeter', 'Exeter & Devon'), 'Bristol': ('bristol', 'Bristol'), 'Nottingham': ('nottingham', 'Nottingham & nearby towns')}
e = lambda value: escape(str(value), quote=True)


def validate_records(catalog, queue, now):
    candidates = checked_candidates(queue, now)
    records = catalog['items']
    ids = set()
    for item in records:
        if item['id'] in ids or item['region'] not in REGIONS:
            raise ValueError('Duplicate identity or unsupported region')
        ids.add(item['id'])
        checked = datetime.fromisoformat(item['verified_at'].replace('Z', '+00:00'))
        if checked.tzinfo is None or not 0 <= (now-checked).total_seconds() <= 7*86400:
            raise ValueError(item['id'] + ': actual source review must be within seven days for a new release')
        bindings = item.get('sheet_bindings')
        if not bindings:
            raise ValueError(item['id'] + ': missing reviewed Sheet binding')
        event_rows = []
        source_urls = {s['url'] for s in item['sources']}
        for binding in bindings:
            candidate = candidates.get(binding.get('candidate_id'))
            if not candidate or any(binding.get(k) != candidate[k] for k in BINDING_FIELDS):
                raise ValueError(item['id'] + ': live Sheet content changed')
            if candidate['master_row'] is None or candidate['region'] != REGION_ALIASES[item['region']] or candidate['source_url'] not in source_urls:
                raise ValueError(item['id'] + ': master identity, region or source mismatch')
            event_rows.extend(candidate['matching_event_rows'])
        for occurrence in item['occurrences']:
            if not occurrence['start'].startswith('2026-12-') or not covered(occurrence, event_rows):
                raise ValueError(item['id'] + ': a published date is not covered by the bound Sheet events')
        if item['placement'] not in ('featured','additional') or not item['sessions']:
            raise ValueError(item['id'] + ': unverified or unplaced programme')
    return records


def link(url, title, cls=''):
    attribute = f' class="{e(cls)}"' if cls else ''
    return f'<a{attribute} href="{e(url)}">{e(title)}</a>'


def funding(region):
    if region == 'Devon':
        return '''<p>Devon’s winter HAF bookings opened on 2 November. Funded places are mainly for eligible children receiving benefits-related free school meals, usually Reception to Year 11. A funded place includes a meal; eligible children can book up to four winter days. Paid places and extended hours are separate where offered.</p><p>Reception-age four-year-olds and discretionary or transitional eligibility need confirmation. Plymouth and Torbay run separate schemes.</p>''' + link('https://www.devon.gov.uk/children-families-education/child-family-support/family-support/haf-programme/information-for-parents/','Devon HAF eligibility & booking guidance')
    if region == 'Bristol':
        return '''<p>Your Holiday Hub winter bookings are open. Standard funded HAF places are for children eligible for targeted free school meals; universal infant meals or the expanded free-school-meals offer do not automatically qualify. A meal is included.</p><p>Open-access play and targeted family sessions have their own rules, shown below. Bristol City, South Gloucestershire, North Somerset and Bath & North East Somerset are separate schemes.</p>''' + link('https://www.yourholidayhubbristol.co.uk/about-yhh/','Bristol HAF eligibility') + ' · ' + link('https://www.yourholidayhubbristol.co.uk/activities/','All Your Holiday Hub activities')
    return '''<p>The dated programmes below are paid options. Nottingham City’s Christmas HAF opening has not yet been confirmed on its official page; Nottinghamshire County Council says winter bookings will open soon.</p><p>City and county schemes have separate eligibility checks. West Bridgford, Bunny and Arnold are in Nottinghamshire. Check the council for the child’s home area before applying for a funded place.</p>''' + link('https://www.nottinghamcity.gov.uk/haf','Nottingham City HAF updates') + ' · ' + link('https://www.nottinghamshire.gov.uk/education/holiday-activities-and-food/activities-and-venues','Nottinghamshire winter HAF updates')


def source_links(item):
    primary = link(item['primary_url'],'Official programme')
    if item['booking_url'] != item['primary_url']:
        primary += ' · ' + link(item['booking_url'],'Booking page')
    if item['id'] == 'winter-haf-bristol-7528':
        primary += ' · ' + link('https://bizzykidsclub.ipalbookings.com/','Paid booking')
    if item['id'] == 'winter-haf-bristol-35890':
        primary += ' · ' + link('https://www.yourholidayhubbristol.co.uk/wp-content/uploads/2026/11/YHH-Winter-Booklet-2026-for-Targeted-Groups.pdf','Council targeted-group rules')
    return primary


def area_key(label):
    return re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')


def area_attributes(item):
    return f' data-holiday-programme data-holiday-area="{e(area_key(item["locality"]))}"'


def area_picker(items, region):
    areas = sorted(set(item['locality'] for item in items))
    buttons = '<button type="button" data-holiday-area-choice="all" aria-pressed="true">All areas</button>'
    buttons += ''.join(f'<button type="button" data-holiday-area-choice="{e(area_key(label))}" aria-pressed="false">{e(label)}</button>' for label in areas)
    return f'<section class="holiday-area-picker" id="choose-area" aria-labelledby="holiday-area-title" hidden><h2 id="holiday-area-title">Choose your area in {e(region)}.</h2><div class="holiday-area-buttons" role="group" aria-label="Choose a local area">{buttons}</div><p class="holiday-area-count" id="holiday-area-count" role="status" aria-live="polite" aria-atomic="true">{len(items)} dated programmes across {len(areas)} areas.</p></section>'


def session_details(item):
    days = {}
    for session in item['sessions']:
        day = session['startDate'][:10]
        times = session['startDate'][11:16]+'–'+session['endDate'][11:16]
        days.setdefault(day, set()).add(times)
    rows = ''.join('<li>'+e(datetime.fromisoformat(day).strftime('%a %-d Dec'))+': '+e(', '.join(sorted(times)))+'</li>' for day,times in sorted(days.items()))
    return '<details class="holiday-session-dates"><summary>Exact dates &amp; session times</summary><ul>'+rows+'</ul></details>'


def photo_markup(item, media):
    reference = media.get(item['id'])
    if not reference:
        return ''
    photo = reference.get('photo')
    if not photo:
        return ''
    credit = link(photo['source_url'],photo['title'])+' · '+e(photo['creator'])+' · '+link(photo['licence_url'],photo['licence'])
    position = photo.get('position','50% 50%')
    return f'''<figure class="holiday-pick-photo"><img src="{e(photo['src'])}" alt="{e(photo['alt'])}" width="720" height="480" style="object-position:{e(position)}" loading="lazy" decoding="async"><figcaption><span class="holiday-photo-label">{e(photo['label'])}</span><span>{e(photo['caption'])}</span><details><summary>Photo credit</summary><p>{credit}. {e(photo['changes'])}</p></details></figcaption></figure>'''


def load_media(path, records):
    data = json.loads(path.read_text())
    if data.get('schema_version') != 1:
        raise ValueError('Unsupported photo reference schema')
    allowed = {r['id']: r for r in records if r['placement']=='featured'}
    result = {}
    for reference in data['records']:
        identity = reference['id']
        if identity not in allowed or identity in result or reference['gallery_url'] != allowed[identity]['primary_url']:
            raise ValueError('Photo must match an existing featured programme and its official source')
        photo = reference.get('photo')
        if photo:
            if photo.get('kind') not in ('venue','activity-reference'):
                raise ValueError('Photo must be a reviewed venue or activity reference')
            if photo['kind'] == 'activity-reference' and (photo.get('label') != 'Activity reference' or 'not this club' not in photo.get('caption','')):
                raise ValueError('Activity reference must be distinguished from the actual club')
            src = photo['src']
            if not src.startswith('/assets/images/') or '..' in Path(src).parts or not (ROOT/src.lstrip('/')).is_file():
                raise ValueError('Photo asset is missing or outside the reviewed image directory')
            for key in ('alt','label','caption','creator','title','source_url','licence','licence_url','changes'):
                if not photo.get(key):
                    raise ValueError('Missing photo context or licence: '+key)
            if not re.fullmatch(r'\d{1,3}% \d{1,3}%',photo.get('position','50% 50%')):
                raise ValueError('Photo position must use two reviewed percentages')
        result[identity] = reference
    return result


def pick(item, media):
    facts = [('Where',item['address']),('Dates',item['schedule_text']),('Hours',item['hours']),('Ages',item['age_text']),('Cost',item['price_text'])]
    details = ''.join(f'<div><dt>{label}</dt><dd>{e(value)}</dd></div>' for label,value in facts)
    notes = ' '.join(item['notes'])
    reference = media.get(item['id'])
    gallery = f'<p class="holiday-photo-source"><a class="holiday-photo-link" href="{e(reference["gallery_url"])}" aria-label="View official photos for {e(item["name"])}">View official photos</a></p>' if reference else ''
    return f'''<article class="holiday-pick" id="{e(item['id'])}"{area_attributes(item)}>{photo_markup(item,media)}<p class="holiday-town">{e(item['locality'])}</p><h3>{e(item['name'])}</h3>{gallery}<p class="holiday-why">{e(item['selection_reason'])}</p><span class="holiday-pill">{e(item['format'])}</span><dl>{details}</dl><p>{e(item['description'])}</p><p class="holiday-condition">{e(notes)}</p><p class="holiday-condition">{e(item['booking_text'])}</p><div class="holiday-book">{source_links(item)}</div></article>'''


def table_row(item):
    cells = [
        ('Place', f'<strong>{e(item["locality"])}</strong><small>{e(item["name"])}</small><small>{e(item["address"])}</small><small>{e(item["format"])}</small>'),
        ('Dates', f'<p>{e(item["schedule_text"])}</p><small>{e(item["hours"])}</small>'+session_details(item)),
        ('Ages', f'<p>{e(item["age_text"])}</p>'),
        ('Cost & rules', f'<strong>{e(item["price_text"])}</strong>' + ''.join(f'<small>{e(n)}</small>' for n in item['notes'])),
        ('Book', '<div>'+source_links(item)+'</div><small>'+e(item['booking_text'])+'</small>')]
    return '<tr'+area_attributes(item)+'>'+''.join(f'<td data-label="{label}">{value}</td>' for label,value in cells)+'</tr>'


def render(region, items, media):
    slug, area = REGIONS[region]
    route = f'/{slug}/december-holiday-clubs/'
    title = f'December holiday clubs in {area} 2026 | Globee'
    description = f'Christmas holiday clubs in {area}: compare confirmed December 2026 dates, ages, session times, costs and official booking links.'
    peers = ''.join(link(f'/{s}/december-holiday-clubs/',label) for key,(s,label) in REGIONS.items() if key != region)
    sections = [('days','Days out'),('classes','Classes & lessons'),('holidays','Holiday clubs'),('notes','Parent notes')]
    nav = ''
    for key,label in sections:
        href = '/classes.html' if key=='classes' and region=='Devon' else f'/{slug}/classes/' if key=='classes' else '/?region='+region+('&section='+key if key!='days' else '')
        current = ' aria-current="page"' if key=='holidays' else ''
        nav += f'<a href="{e(href)}"{current}>{e(label)}</a>'
    featured = [i for i in items if i['placement']=='featured']
    extras = [i for i in items if i['placement']=='additional']
    pending = ''
    if region == 'Devon':
        pending = '<aside class="holiday-pending" id="holiday-area-pending"><h2>More winter dates still to confirm.</h2><p>Other Exeter providers, including Puffins at Manston Terrace, advertise winter provision but exact December dates or prices still need confirmation. Tubers and A Touch of the Wild currently show older holiday dates; The Outdoors Group excludes Christmas. FISH Tiverton winter dates are still TBC. These are not counted as confirmed sessions or shown as closed.</p>'+link('https://puffinsofexeter.co.uk/winter-holiday-clubs-at-puffins/','Puffins winter enquiries')+' · '+link('https://fishkids.co.uk/holiday-club/','FISH bookings')+'</aside>'
    elif region == 'Nottingham':
        pending = '<aside class="holiday-pending" id="holiday-area-pending"><h2>More HAF dates are still to come.</h2><p>The council-linked directory has one programme with December dates when checked; the other listings have no published December calendar yet. That does not mean those clubs are closed. Let’s Leap at Nottingham High School currently lists 2027 dates. Camp Williams’ Christmas venue and drop-off remain TBC.</p>'+link('https://eequ.org/nottinghamcityholidayactivitiesandfoodhaf','All Nottingham City HAF listings')+'</aside>'
    structured = {'@context':'https://schema.org','@type':'ItemList','name':title.removesuffix(' | Globee'),'url':BASE+route,'itemListElement':[{'@type':'ListItem','position':n+1,'name':item['name'],'url':item['primary_url']} for n,item in enumerate(items)]}
    structured_json = json.dumps(structured,ensure_ascii=False).replace('</','<\\/')
    checked = max(datetime.fromisoformat(i['verified_at'].replace('Z','+00:00')) for i in items)
    picker = area_picker(items, region)
    style_version = 'club-photos-20261119'
    area_script = '<script defer src="/seo-assets/holiday-clubs.js?v=all-areas-20261119"></script>'
    if region in REGIONS:
        funding_html = '<details class="holiday-funding holiday-funding-compact" id="funding"><summary>Free or paid? Check HAF eligibility.</summary><div>'+funding(region)+'</div></details>'
    else:
        funding_html = '<section class="holiday-funding" id="funding"><h2>Free or paid? Start here.</h2>'+funding(region)+'</section>'
    pending_in_more = '' if region == 'Devon' else pending
    pending_after_more = pending if region == 'Devon' else ''
    return f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{BASE+route}">
<meta property="og:type" content="article"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{BASE+route}"><meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg?v=child1" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&amp;family=Outfit:wght@400;500;600;700&amp;display=swap" rel="stylesheet"><link rel="stylesheet" href="/seo-assets/holiday-clubs.css?v={style_version}">
{area_script}<script defer src="/basic-analytics.js?v=basic2"></script><script defer src="/analytics.js?v=consent4"></script><script type="application/ld+json">{structured_json}</script></head>
<body class="holiday-guide-page"><a class="skip-link" href="#holiday-main">Skip to holiday clubs</a><header class="holiday-header"><a class="holiday-logo" href="/?region={region}" aria-label="Globee home"><img src="/assets/brand/globee-handwriting-v2.png" alt="Globee" width="132" height="64"></a><details class="holiday-area"><summary><small>Change area</small>{e(area)} ⌄</summary><nav aria-label="December guides by area">{peers}</nav></details></header><p class="holiday-slogan">Dream &amp; explore, together 🌱</p><nav class="holiday-nav" aria-label="Globee sections">{nav}</nav>
<main class="holiday-main" id="holiday-main"><a class="holiday-back" href="/?region={region}&amp;section=holidays">← All holiday clubs</a><header class="holiday-seasonal-banner"><div class="holiday-seasonal-copy"><p class="holiday-kicker">WHEN SCHOOL’S OUT · CHRISTMAS BREAK 2026</p><h1>December holiday clubs<br>in {e(area)}.</h1><p class="holiday-deck">Browse the December programmes we’ve verified in your area. Compare dates, ages, session length and funded or paid booking conditions.</p></div><div class="holiday-seasonal-art" aria-hidden="true"><img src="/seo-assets/december-holiday-crafts-2026.webp" width="1536" height="1024" alt="" decoding="async"></div></header><p class="holiday-checked">Official dates and details checked <time datetime="{checked.date().isoformat()}">{checked.strftime('%-d %B %Y')}</time> · All times are UK time · Places can change</p><nav class="holiday-jumps" aria-label="On this page"><a href="#funding">Free or paid?</a><a href="#local-picks">Places to start</a><a href="#more-clubs">More programmes</a><a href="#how-we-chose">About this list</a></nav>
{picker}{funding_html}
<section id="local-picks"><h2>A few local places to start.</h2><p class="holiday-section-intro">Featured programmes from the full checked list below. Selecting an area shows every verified in-period programme for that area, with no one-programme limit.</p><div class="holiday-picks{' holiday-picks-three' if len(featured)==3 else ''}">{''.join(pick(i,media) for i in featured)}</div></section>
<section id="more-clubs"><h2>More December programmes.</h2><p class="holiday-section-intro">Other local choices, with short sessions, family activities and any important booking conditions labelled. Check whether an adult needs to stay.</p><div class="holiday-table-wrap"><table class="holiday-table"><caption>Additional choices · December 2026 · Latest prices and places are confirmed with the provider</caption><thead><tr><th scope="col">Place &amp; programme</th><th scope="col">Dates &amp; hours</th><th scope="col">Ages</th><th scope="col">Cost &amp; conditions</th><th scope="col">Official link</th></tr></thead><tbody>{''.join(table_row(i) for i in extras)}</tbody></table></div>{pending_in_more}</section>{pending_after_more}
<section class="holiday-how" id="how-we-chose"><h2>About this December list.</h2><p>We reviewed the council-linked official booking directories and checked provider calendars, then included their verified December 2026 sessions. The list includes funded programmes and checked paid camps. Duplicates, undated listings and trips with unresolved meeting details are withheld. Providers may add further dates; this is not a guarantee that every provider has been found. Family activities and short sessions are labelled separately from holiday clubs.</p><ul><li>Choose an actual session date; a run of dates does not mean every day is available.</li><li>Funded HAF needs eligibility checks. Paid places, longer days and extras may cost more.</li><li>Confirm collection, meals, allergies and any support needs with the provider. TBC means we could not confirm that detail.</li></ul><p>{link('/?region='+region+'&section=holidays','Continue to all local holiday clubs')} · {link('/parent-notes/holiday-childcare-alternatives/','Need different childcare hours?')}</p></section></main>
<footer class="holiday-footer"><span>Collected with care. Shared with other families.</span><nav aria-label="Footer"><a href="/privacy.html">Privacy &amp; analytics</a><button type="button" data-analytics-toggle>Analytics settings</button><a href="/?region={region}&amp;section=holidays">Back to holiday clubs</a></nav></footer></body></html>'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog',type=Path,default=ROOT/'seo/holiday-clubs-catalog.json')
    parser.add_argument('--queue',type=Path)
    parser.add_argument('--media',type=Path,default=ROOT/'seo/holiday-club-photos.json')
    args = parser.parse_args()
    queue = json.loads(args.queue.read_text()) if args.queue else fetch_queue()
    # Capture the evaluation time after the live fetch prepares its timestamp.
    now = datetime.now(timezone.utc)
    records = validate_records(json.loads(args.catalog.read_text()),queue,now)
    media = load_media(args.media,records)
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('',namespace)
    sitemap = ET.fromstring((ROOT/'sitemap.xml').read_text())
    for region,(slug,area) in REGIONS.items():
        items = [i for i in records if i['region']==region]
        if len(items)<2 or not any(i['placement']=='featured' for i in items):
            raise ValueError(region+': no practical selection')
        path = ROOT/slug/'december-holiday-clubs/index.html'
        html = render(region,items,media)+'\n'
        changed = not path.exists() or path.read_text()!=html
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(html)
        url = BASE+f'/{slug}/december-holiday-clubs/'
        node = next((n for n in sitemap if n.findtext('{'+namespace+'}loc')==url),None)
        if node is None:
            node = ET.SubElement(sitemap,'{'+namespace+'}url')
            ET.SubElement(node,'{'+namespace+'}loc').text=url
        if changed:
            lastmod=node.find('{'+namespace+'}lastmod')
            if lastmod is None:lastmod=ET.SubElement(node,'{'+namespace+'}lastmod')
            lastmod.text=now.date().isoformat()
        print(f'{area}: {len(items)} programmes, {sum(i["placement"]=="featured" for i in items)} first cards; live bindings passed')
    ET.indent(sitemap,space='  ')
    (ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(sitemap,encoding='unicode')+'\n')


if __name__=='__main__':
    main()
