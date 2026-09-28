/**
 * DevHub demo recording.
 *
 * Replays a scripted 60-second product tour (screenshots at 4 fps) and drops
 * numbered PNGs into tools/.frames/ for the GIF/MP4 assembly step.
 *
 *   node tools/demo.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.DEMO_URL ?? 'http://localhost:5173';
const OUT = new URL('./.frames/', import.meta.url).pathname;
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const FRAME_MS = 250;
const WIDTH = 1280;
const HEIGHT = 800;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let frame = 0;
async function snap(page) {
  frame += 1;
  await page.screenshot({ path: join(OUT, `frame_${String(frame).padStart(4, '0')}.png`) });
}

/** Capture continuously for `ms`, executing `during` (if any) once at the start. */
async function hold(page, ms, during) {
  if (during) await during(page);
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const started = Date.now();
    await snap(page);
    // Keep a steady FRAME_MS cadence — screenshots themselves take time.
    const budget = FRAME_MS - (Date.now() - started);
    const remaining = until - Date.now();
    if (budget <= 0 || remaining <= 0) continue;
    await sleep(Math.min(budget, remaining));
  }
}

async function waitForText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (needle) => document.body && document.body.innerText.includes(needle),
    { timeout },
    text,
  );
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, needle) =>
      [...document.querySelectorAll(sel)].find((el) => (el.textContent || '').includes(needle)),
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`no ${selector} containing "${text}"`);
  await el.click();
  await handle.dispose();
}

async function scrollBy(page, y) {
  await page.evaluate((dy) => window.scrollTo({ top: dy, behavior: 'smooth' }), y);
  await sleep(700);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

try {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  /* ── 1. Landing ─────────────────────────────────────────────────────────── */
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Explore the GitHub');
  await hold(page, 4000);

  /* ── 2. Landing → CTA ───────────────────────────────────────────────────── */
  await hold(page, 3000, () => scrollBy(page, 700));

  /* ── 3. Explore ─────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Search the entire GitHub graph');
  await hold(page, 3000);

  /* ── 4. Type a query and search ─────────────────────────────────────────── */
  await hold(page, 4500, async () => {
    await page.type('input[aria-label="Search query"]', 'sindresorhus', { delay: 70 });
    await page.keyboard.press('Enter');
    await waitForText(page, 'results').catch(() => {});
  });

  /* ── 5. Developer profile ───────────────────────────────────────────────── */
  await page.goto(`${BASE}/dev/sindresorhus`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'FOLLOWERS', 40000);
  await hold(page, 3500);

  /* ── 6. Contribution heatmap ────────────────────────────────────────────── */
  await hold(page, 4000, () => scrollBy(page, 950));

  /* ── 7. Developer repositories ──────────────────────────────────────────── */
  await hold(page, 3000, () => scrollBy(page, 2100));

  /* ── 8. Repository page ─────────────────────────────────────────────────── */
  await page.goto(`${BASE}/repo/vuejs/core`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Language DNA', 40000);
  await hold(page, 3500);

  /* ── 9. Activity charts + code frequency toggle ─────────────────────────── */
  await hold(page, 4500, async () => {
    await scrollBy(page, 700);
    await clickByText(page, 'button', 'Code frequency').catch(() => {});
  });

  /* ── 10. Contributors ───────────────────────────────────────────────────── */
  await hold(page, 2500, () => scrollBy(page, 1800));

  /* ── 11. Repository comparison ──────────────────────────────────────────── */
  await page.goto(`${BASE}/compare?a=facebook%2Freact&b=vuejs%2Fcore`, {
    waitUntil: 'networkidle2',
  });
  await waitForText(page, 'edges out', 40000).catch(() => {});
  await hold(page, 4500);

  /* ── 12. Developer comparison ───────────────────────────────────────────── */
  await page.goto(`${BASE}/compare?mode=devs&a=sindresorhus&b=gaearon`, {
    waitUntil: 'networkidle2',
  });
  await waitForText(page, 'takes it', 40000).catch(() => {});
  await hold(page, 4500);

  /* ── 13. Sign in ────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Sign in to DevHub');
  await hold(page, 4000, async () => {
    await page.type('input[placeholder="you@studio.dev"]', 'demo@devhub.io', { delay: 45 });
    await page.type('input[type="password"]', 'demo1234pass', { delay: 45 });
    await clickByText(page, 'button', 'Enter DevHub');
    await waitForText(page, 'Welcome back', 30000).catch(() => {});
  });

  /* ── 14. Dashboard ──────────────────────────────────────────────────────── */
  await hold(page, 4500);

  /* ── 15. Collections ────────────────────────────────────────────────────── */
  await page.goto(`${BASE}/collections`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Your saved orbit', 30000).catch(() => {});
  await hold(page, 3500);

  /* ── 16. Outro ──────────────────────────────────────────────────────────── */
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Explore the GitHub');
  await hold(page, 3500);

  const files = await readdir(OUT);
  console.log(`captured ${files.length} frames (~${((files.length * FRAME_MS) / 1000).toFixed(1)}s)`);
} finally {
  await browser.close();
}
