const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

function setup({ supported = true, track = true, reject = false } = {}) {
  const element = () => ({ listeners: {}, attrs: {}, isConnected: true,
    addEventListener(name, callback) { this.listeners[name] = callback; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name] || null; },
    focus() { this.focused = true; }
  });
  const links = [element(), element()], close = element(), dialog = element(), video = element();
  dialog.id = 'founder-story-dialog';
  dialog.querySelector = () => close;
  if (supported) dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.listeners.close(); };
  dialog.getBoundingClientRect = () => ({ left: 10, top: 10, right: 200, bottom: 300 });
  video.dataset = { videoSrc: 'assets/founder-story/still-curious-76s.mp4' };
  Object.defineProperty(video, 'src', { set(value) { video.attrs.src = value; } });
  video.play = () => { video.plays = (video.plays || 0) + 1; return reject ? Promise.reject(Error('blocked')) : Promise.resolve(); };
  video.pause = () => { video.paused = true; };
  const status = { hidden: true }, classes = new Set(), events = [];
  const context = { document: {
    getElementById: id => ({ 'founder-story-dialog': dialog, 'founder-film': video, 'founder-film-status': status })[id],
    querySelectorAll: () => links,
    documentElement: { classList: { add: c => classes.add(c), remove: c => classes.delete(c) } }
  } };
  context.window = context;
  if (track) context.globeeTrack = (...args) => events.push(args);
  vm.runInNewContext(read('founder-story.js'), context);
  const click = extras => {
    const event = { button: 0, preventDefault() { this.prevented = true; }, ...extras };
    links[0].listeners.click?.(event);
    return event;
  };
  return { links, close, dialog, video, status, classes, events, click };
}

test('Homepage shows the owner-provided story and correct profile without a third-party embed', () => {
  const html = read('index.html');
  assert.match(html, /id="our-story"/);
  assert.match(html, /https:\/\/www.instagram.com\/p\/Dejg0QpNW9s\//);
  assert.match(html, /https:\/\/www.instagram.com\/globee.uk\//);
  assert.doesNotMatch(html, /instagram.com\/embed|embed.js|<iframe/i);
  const video = html.match(/<video\b[^>]*>/)[0];
  assert.match(video, /preload="none"/);
  assert.match(video, /controls playsinline/);
  assert.doesNotMatch(video, /\ssrc=|autoplay|loop/);
  assert.match(html, /<track kind="captions"/);
  assert.match(html, /Read the film transcript/);
  assert.match(read('founder-story.css'), /\.map-mode \.founder-story\{display:none\}/);
});

test('Movie is loaded only after an ordinary click and stops on close, with focus restored', () => {
  const a = setup();
  assert.equal(a.video.getAttribute('src'), null);
  assert.equal(a.click({ ctrlKey: true }).prevented, undefined);
  assert.equal(a.video.plays, undefined);
  assert.equal(a.click().prevented, true);
  assert.equal(a.dialog.open, true);
  assert.equal(a.video.getAttribute('src'), a.video.dataset.videoSrc);
  assert(a.classes.has('founder-film-open'));
  a.video.listeners.playing(); a.video.listeners.playing();
  assert.equal(a.events.length, 1);
  assert.equal(a.events[0][0], 'founder_story_play');
  a.close.listeners.click();
  assert.equal(a.video.paused, true);
  assert.equal(a.links[0].focused, true);
  assert.equal(a.classes.size, 0);
  a.click(); a.video.listeners.playing();
  assert.equal(a.events.length, 2);
});

test('Instagram fallback survives unavailable dialogs, failed playback and absent analytics', async () => {
  const unsupported = setup({ supported: false });
  assert.equal(unsupported.links[0].listeners.click, undefined);
  const a = setup({ reject: true, track: false });
  a.click(); await new Promise(setImmediate);
  assert.equal(a.status.hidden, false);
  a.video.listeners.playing();
  a.dialog.close();
  a.video.listeners.playing();
  assert.equal(a.video.paused, true);
});

test('Public media assets are local, caption timings stay in the 76-second edit and MP4 is streamable', () => {
  const captions = read('assets/founder-story/still-curious-en.vtt');
  assert(captions.startsWith('WEBVTT'));
  assert.equal((captions.match(/ --> /g) || []).length, 22);
  assert.match(captions, /00:01:10.525 --> 00:01:12.325/);
  const bytes = fs.readFileSync(path.join(__dirname, '../assets/founder-story/still-curious-76s.mp4'));
  assert(bytes.length < 12 * 1024 * 1024);
  assert(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')));
  for (const name of ['family.webp', 'title.webp']) assert(fs.statSync(path.join(__dirname, '../assets/founder-story', name)).size < 100000);
});
