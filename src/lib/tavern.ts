import snapshot from '../../data/tavern-snapshot.json';
import type { TavernGame, TavernItem, TavernSnapshot } from './tavern.types';

// TCGplayer has no public API, so the inventory is a snapshot built by
// `pnpm snapshot:tavern` from data/tavern-inventory.json.
const SNAPSHOT = snapshot as TavernSnapshot;

export const STORE_NAME = 'TableTopTavern';

export const SELLER_ID = SNAPSHOT.sellerId;

/** The seller profile on TCGplayer. */
export const STOREFRONT_URL = `https://www.tcgplayer.com/sellers/${STORE_NAME}/${SELLER_ID}`;

export const GAME_LABELS: Record<TavernGame, string> = {
  mtg: 'Magic: The Gathering',
  swu: 'Star Wars Unlimited',
};

/** Every listing in the store, or only the ones matching a card name. */
export function listingsUrl(query?: string): string {
  const params = new URLSearchParams({ seller: SELLER_ID });
  if (query) params.set('q', query);
  params.set('view', 'grid');
  return `https://www.tcgplayer.com/search/all/product?${params}`;
}

export function listingUrl(item: Pick<TavernItem, 'name'>): string {
  return listingsUrl(item.name);
}

/** Priciest cards first, then alphabetical so equal prices keep a stable order. */
export function sortInventory(items: TavernItem[]): TavernItem[] {
  return [...items].sort(
    (a, b) => b.listPrice - a.listPrice || a.name.localeCompare(b.name),
  );
}

export function getTavernInventory(): TavernItem[] {
  return sortInventory(SNAPSHOT.items);
}

export function getSnapshotDate(): string {
  return SNAPSHOT.snapshotAt;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
