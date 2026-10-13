#!/usr/bin/env node
// Exports every stencil in this folder to a PNG at its exact pixel size.
//
//   node _social/render.mjs                 every *.html  ->  out/<name>.png
//   node _social/render.mjs story og-image  just those
//   node _social/render.mjs --guides        the same, with the safe-zone overlays, into out/guides/
//
// No npm install. It drives a headless Chromium that is already on this Mac over the DevTools
// protocol, using only what ships with Node 22+. It looks for, in order: $CHROME, the Chromium
// that Playwright keeps in ~/Library/Caches/ms-playwright, then Chrome / Edge / Chromium / Brave
// in /Applications. The size comes from the page's .frame element, so a template needs no
// settings here. Fonts come from Google Fonts (as on the website), so it needs to be online;
// it stops with an error rather than export a PNG in a fallback font or with a missing image.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const guides = args.includes('--guides');
const wanted = args.filter(a => !a.startsWith('--')).map(a => basename(a, '.html'));
const outDir = join(here, 'out', guides ? 'guides' : '');

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), 'Library/Caches/ms-playwright');
  const found = [];
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).sort().reverse()) {
      found.push(
        join(cache, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
        join(cache, dir, 'chrome-headless-shell-mac-x64/chrome-headless-shell'),
        join(cache, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
        join(cache, dir, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'));
    }
  }
  for (const app of ['Google Chrome', 'Microsoft Edge', 'Chromium', 'Brave Browser']) {
    found.push(`/Applications/${app}.app/Contents/MacOS/${app}`);
  }
  return found.find(existsSync);
}

const chromePath = findChrome();
if (!chromePath) {
  console.error('render: no Chromium found. Set CHROME=/path/to/chrome, or install Google Chrome.');
  process.exit(1);
}

const pages = readdirSync(here)
  .filter(f => f.endsWith('.html'))
  .map(f => basename(f, '.html'))
  .filter(n => wanted.length === 0 || wanted.includes(n));
if (pages.length === 0) {
  console.error('render: no matching templates.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// A throwaway browser profile, deleted at the end.
const profile = mkdtempSync(join(tmpdir(), 'social-render-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--force-color-profile=srgb',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

async function finish(code) {
  // Wait for Chromium to go before deleting its profile, or the folder is left half-removed.
  const gone = new Promise(resolve => chrome.once('exit', resolve));
  if (chrome.exitCode === null) { chrome.kill(); await Promise.race([gone, new Promise(r => setTimeout(r, 3000))]); }
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  process.exit(code);
}

const wsUrl = await new Promise((resolve, reject) => {
  let log = '';
  chrome.stderr.on('data', chunk => {
    log += chunk;
    const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) resolve(m[1]);
  });
  chrome.on('exit', () => reject(new Error('Chromium exited before it was ready:\n' + log)));
  setTimeout(() => reject(new Error('Chromium did not start within 20s')), 20000);
}).catch(e => { console.error('render: ' + e.message); return finish(1); });

const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let nextId = 0;
const pending = new Map();
const listeners = new Set();
ws.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else {
    for (const fn of listeners) fn(msg);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const once = (method, sessionId) => new Promise(resolve => {
  const fn = msg => {
    if (msg.method === method && msg.sessionId === sessionId) { listeners.delete(fn); resolve(msg.params); }
  };
  listeners.add(fn);
});

// Runs in the page: wait for fonts and images, then report the frame's size and anything missing.
const inspect = `(async () => {
  ${guides ? "document.documentElement.classList.add('guides');" : ''}
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const frame = document.querySelector('.frame');
  if (!frame) return { error: 'no .frame element' };
  const clean = family => family.trim().replace(/["']/g, '');
  const loaded = family => [...document.fonts].some(f => clean(f.family) === family && f.status === 'loaded');
  // The first-choice family of every element that holds text (a template with no text needs none).
  const used = new Set();
  for (const el of frame.querySelectorAll('*')) {
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.data.trim())
      || getComputedStyle(el, '::before').content.startsWith('"');
    if (hasText) used.add(clean(getComputedStyle(el).fontFamily.split(',')[0]));
  }
  return {
    width: frame.offsetWidth,
    height: frame.offsetHeight,
    missingFonts: [...used].filter(f => !loaded(f)),
    missingImages: [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')),
  };
})()`;

let failed = 0;
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);

  for (const name of pages) {
    const metrics = (width, height) =>
      send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await metrics(1200, 1920);
    const loaded = once('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url: pathToFileURL(join(here, name + '.html')).href }, sessionId);
    await loaded;
    const { result } = await send('Runtime.evaluate', { expression: inspect, awaitPromise: true, returnByValue: true }, sessionId);
    const info = result.value ?? { error: 'the page did not report back' };
    const problems = [
      info.error,
      info.missingFonts?.length ? 'fonts not loaded: ' + info.missingFonts.join(', ') : null,
      info.missingImages?.length ? 'images not loaded: ' + info.missingImages.join(', ') : null,
    ].filter(Boolean);
    if (problems.length) {
      failed++;
      console.error(`FAILED  ${name}: ${problems.join('; ')}`);
      continue;
    }
    await metrics(info.width, info.height);
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: info.width, height: info.height, scale: 1 },
    }, sessionId);
    const file = join(outDir, name + '.png');
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`${String(info.width).padStart(4)}×${String(info.height).padEnd(4)}  ${file.replace(here + '/', '')}`);
  }
} catch (e) {
  console.error('render: ' + e.message);
  failed++;
}
await finish(failed ? 1 : 0);
