// Card data sources for the TableTopTavern inventory: Scryfall for Magic and
// SWU-DB for Star Wars Unlimited. Both publish TCGplayer market prices and
// neither needs an API key.

const SCRYFALL_API = 'https://api.scryfall.com';
const SWUDB_API = 'https://api.swu-db.com';

// Scryfall rejects requests without a User-Agent and an Accept header.
const HEADERS = {
  'User-Agent': 'MyPortfolioSite/1.0 (+https://github.com/hurstcorey/MyPortfolioSite)',
  Accept: 'application/json',
};

// Scryfall asks for 50-100ms between requests.
const SCRYFALL_DELAY_MS = 100;
const SCRYFALL_COLLECTION_LIMIT = 75;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Both APIs drop the odd connection, so retry timeouts, 429s and 5xx responses.
async function fetchJson(url, init = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(RETRY_DELAY_MS * (attempt - 1));
    try {
      const res = await fetch(url, { ...init, headers: { ...HEADERS, ...init.headers } });
      if (res.ok) return await res.json();
      const body = await res.text().catch(() => '');
      lastError = new Error(`${url} -> ${res.status}: ${body.slice(0, 200)}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastError = new Error(`${url} -> ${err.cause?.code ?? err.message}`, { cause: err });
    }
  }
  throw lastError;
}

/** Parses the price strings both APIs return ("12.84", "", null) into a number or null. */
export function toPrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** Stable identifier for one listing, shared by the snapshot and the price history. */
export function itemKey(item) {
  return `${item.game}:${item.tcgplayerId}:${item.finish}`;
}

/** Market price for the listed finish, falling back to whichever finish Scryfall has. */
export function mtgMarketPrice(card, finish) {
  const prices = card.prices ?? {};
  const preferred = finish === 'foil' ? prices.usd_foil : prices.usd;
  return (
    toPrice(preferred) ??
    toPrice(prices.usd) ??
    toPrice(prices.usd_foil) ??
    toPrice(prices.usd_etched)
  );
}

export function swuMarketPrice(card, finish) {
  const preferred = finish === 'foil' ? card.FoilPrice : card.MarketPrice;
  return toPrice(preferred) ?? toPrice(card.MarketPrice) ?? toPrice(card.FoilPrice);
}

export async function fetchMtgByTcgplayerId(tcgplayerId) {
  await sleep(SCRYFALL_DELAY_MS);
  return fetchJson(`${SCRYFALL_API}/cards/tcgplayer/${tcgplayerId}`);
}

/** Looks up cards by Scryfall id in batches; returns a Map of id -> card. */
export async function fetchMtgByIds(ids) {
  const cards = new Map();
  for (let i = 0; i < ids.length; i += SCRYFALL_COLLECTION_LIMIT) {
    if (i > 0) await sleep(SCRYFALL_DELAY_MS);
    const batch = ids.slice(i, i + SCRYFALL_COLLECTION_LIMIT);
    const data = await fetchJson(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch.map((id) => ({ id })) }),
    });
    for (const card of data.data ?? []) cards.set(card.id, card);
  }
  return cards;
}

export async function fetchSwuCard(set, number) {
  return fetchJson(`${SWUDB_API}/cards/${set}/${number}?format=json`);
}

/**
 * Current market price for every snapshot item. Returns a Map of item key ->
 * price, with null where the source has no price for the card.
 */
export async function fetchMarketPrices(items) {
  const prices = new Map();

  const mtgItems = items.filter((item) => item.game === 'mtg');
  const mtgCards = await fetchMtgByIds(mtgItems.map((item) => item.sourceId));
  for (const item of mtgItems) {
    const card = mtgCards.get(item.sourceId);
    prices.set(itemKey(item), card ? mtgMarketPrice(card, item.finish) : null);
  }

  for (const item of items.filter((item) => item.game === 'swu')) {
    const [set, number] = item.sourceId.split('/');
    // SWU-DB is fetched card by card; one that stays unreachable is skipped
    // for the day rather than failing the whole run.
    try {
      const card = await fetchSwuCard(set, number);
      prices.set(itemKey(item), swuMarketPrice(card, item.finish));
    } catch (err) {
      console.warn(`  ! ${item.name}: ${err.message}`);
      prices.set(itemKey(item), null);
    }
  }

  return prices;
}
