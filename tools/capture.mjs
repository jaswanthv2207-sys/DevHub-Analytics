/**
 * DevHub screenshot capture.
 *
 * Drives the system Chrome against a running DevHub instance and writes the
 * marketing/README screenshots to docs/screenshots.
 *
 *   node tools/capture.mjs [baseUrl] [outDir]
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.argv[3] ?? new URL('../docs/screenshots/', import.meta.url).pathname;
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForText(page, text, timeout = 30000) {
  await page.waitForFunction(
    (needle) => document.body && document.body.innerText.includes(needle),
    { timeout },
    text,
  );
}

async function shot(page, name, { fullPage = false } = {}) {
  await sleep(600);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  console.log(`✓ ${name}.png`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1'],
});

try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 1 — Landing
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Explore the GitHub');
  await shot(page, 'landing');

  // 2 — Explore search results
  await page.goto(`${BASE}/explore?q=sindresorhus`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'results');
  await shot(page, 'explore');

  // 3 — Developer profile
  await page.goto(`${BASE}/dev/sindresorhus`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Language history', 40000).catch(() => waitForText(page, 'FOLLOWERS'));
  await sleep(1500);
  await shot(page, 'developer');

  // 4 — Repository page
  await page.goto(`${BASE}/repo/vuejs/core`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Language DNA', 40000);
  await sleep(1500);
  await shot(page, 'repository');

  // 5 — Comparison (bonus)
  await page.goto(`${BASE}/compare?a=facebook%2Freact&b=vuejs%2Fcore`, {
    waitUntil: 'networkidle2',
  });
  await waitForText(page, 'edges out', 40000).catch(() => waitForText(page, 'takes it'));
  await sleep(800);
  await shot(page, 'compare');

  // 6/7 — Authenticated surfaces (sign in through the API so the cookie sticks)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(
    async (base, creds) => {
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(creds),
      });
      if (!res.ok) throw new Error(`login failed: ${res.status}`);
    },
    BASE,
    {
      identifier: process.env.DEVHUB_USER ?? 'demo@devhub.io',
      password: process.env.DEVHUB_PASS ?? 'demo1234pass',
    },
  );

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Welcome back', 40000);
  await sleep(1200);
  await shot(page, 'dashboard');

  await page.goto(`${BASE}/collections`, { waitUntil: 'networkidle2' });
  await waitForText(page, 'Your saved orbit', 40000);
  await sleep(800);
  await shot(page, 'collections');

  // 8 — Mobile layout (responsive proof)
  const mobile = await browser.newPage();
  await mobile.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
  });
  await mobile.goto(`${BASE}/dev/sindresorhus`, { waitUntil: 'networkidle2' });
  await waitForText(mobile, 'FOLLOWERS', 40000);
  await sleep(1200);
  await mobile.screenshot({ path: `${OUT}mobile-developer.png` });
  console.log('✓ mobile-developer.png');
} finally {
  await browser.close();
}
