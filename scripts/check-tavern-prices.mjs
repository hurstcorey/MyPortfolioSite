// Daily price check for the TableTopTavern inventory. Compares today's market
// prices with the stored history and emails an alert when a card moves a lot.
// Has no dependencies, so the scheduled workflow runs it without an install.
//
//   RESEND_API_KEY, FROM_EMAIL, TAVERN_ALERT_TO   needed to send an alert
//   TAVERN_DRY_RUN=true                           print the alert, write nothing
//   TAVERN_HISTORY_FILE                           override the history location

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, renderEmail, toDateKey } from './lib/tavern-alerts.mjs';
import { fetchMarketPrices } from './lib/tavern-sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SNAPSHOT = path.join(REPO_ROOT, 'data', 'tavern-snapshot.json');
const HISTORY = process.env.TAVERN_HISTORY_FILE
  ? path.resolve(process.env.TAVERN_HISTORY_FILE)
  : path.join(REPO_ROOT, '.cache', 'tavern-price-history.json');
const DRY_RUN = ['1', 'true'].includes((process.env.TAVERN_DRY_RUN ?? '').toLowerCase());

const RESEND_API = 'https://api.resend.com/emails';
const EMAIL_ENV = ['RESEND_API_KEY', 'FROM_EMAIL', 'TAVERN_ALERT_TO'];

async function loadHistory() {
  try {
    return JSON.parse(await fs.readFile(HISTORY, 'utf-8')).cards ?? {};
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    // A damaged file would otherwise fail every run; start a fresh baseline.
    if (err instanceof SyntaxError) {
      console.warn(`  ! ${path.basename(HISTORY)} is not valid JSON; starting over.`);
      return {};
    }
    throw err;
  }
}

async function saveHistory(cards) {
  await fs.mkdir(path.dirname(HISTORY), { recursive: true });
  const body = { updatedAt: new Date().toISOString(), cards };
  await fs.writeFile(HISTORY, JSON.stringify(body, null, 2) + '\n', 'utf-8');
}

async function sendEmail({ subject, html, text }) {
  const missing = EMAIL_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`There are price alerts to send but ${missing.join(', ')} is not set.`);
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL,
      to: process.env.TAVERN_ALERT_TO.split(',').map((address) => address.trim()).filter(Boolean),
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend -> ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function main() {
  const snapshot = JSON.parse(await fs.readFile(SNAPSHOT, 'utf-8'));
  const today = toDateKey(new Date());
  const history = await loadHistory();

  console.log(`Checking ${snapshot.items.length} listings for ${today}…`);
  const prices = await fetchMarketPrices(snapshot.items);
  const quotes = snapshot.items.map((item) => ({
    key: item.key,
    price: prices.get(item.key) ?? null,
  }));

  const { alerts, history: nextHistory } = evaluate(history, quotes, today);
  const alerted = new Set(alerts.map((alert) => alert.key));
  for (const item of snapshot.items) {
    const price = prices.get(item.key) ?? null;
    const label = price === null ? 'no price' : `$${price.toFixed(2)}`;
    console.log(`  ${alerted.has(item.key) ? '!' : '✓'} ${item.name}: ${label}`);
  }

  if (quotes.every((quote) => quote.price === null)) {
    throw new Error('No market prices came back from Scryfall or SWU-DB.');
  }
  if (Object.keys(history).length === 0) {
    console.log('\nNo price history yet, so this run only records a baseline.');
  }

  if (alerts.length > 0) {
    const email = renderEmail(alerts, snapshot.items, {
      today,
      storeUrl: `https://www.tcgplayer.com/sellers/TableTopTavern/${snapshot.sellerId}`,
    });
    if (DRY_RUN) {
      console.log(`\nDry run, not sending:\n\nSubject: ${email.subject}\n\n${email.text}`);
    } else {
      await sendEmail(email);
      console.log(`\n✓ Sent an alert for ${alerts.length} card${alerts.length === 1 ? '' : 's'}.`);
    }
  } else {
    console.log('\n✓ No big price moves.');
  }

  if (DRY_RUN) {
    console.log('Dry run, price history left untouched.');
    return;
  }
  // Saved only after the email went out, so a failed send is retried next run.
  await saveHistory(nextHistory);
  console.log(`  Wrote ${path.relative(REPO_ROOT, HISTORY)}`);
}

main().catch((err) => {
  console.error('Price check failed:', err);
  process.exit(1);
});
