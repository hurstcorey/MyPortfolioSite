import { describe, expect, it } from 'vitest';
import {
  formatUsd,
  getTavernInventory,
  listingUrl,
  listingsUrl,
  sortInventory,
  STOREFRONT_URL,
} from './tavern';
import type { TavernItem } from './tavern.types';

function item(overrides: Partial<TavernItem>): TavernItem {
  return {
    key: 'mtg:1:nonfoil',
    game: 'mtg',
    tcgplayerId: 1,
    sourceId: 'abc',
    name: 'Card',
    setName: 'Set',
    setCode: 'set',
    number: '1',
    rarity: 'rare',
    finish: 'nonfoil',
    imageUrl: 'https://cards.scryfall.io/normal/front/a/b/abc.jpg',
    listPrice: 1,
    ...overrides,
  };
}

describe('listingsUrl', () => {
  it('links to every listing in the store', () => {
    expect(listingsUrl()).toBe(
      'https://www.tcgplayer.com/search/all/product?seller=47076537&view=grid',
    );
  });

  it('narrows the store to one card by name', () => {
    expect(listingUrl({ name: "Galadriel's Dismissal" })).toBe(
      'https://www.tcgplayer.com/search/all/product?seller=47076537&q=Galadriel%27s+Dismissal&view=grid',
    );
  });
});

describe('STOREFRONT_URL', () => {
  it('points at the seller profile', () => {
    expect(STOREFRONT_URL).toBe(
      'https://www.tcgplayer.com/sellers/TableTopTavern/47076537',
    );
  });
});

describe('sortInventory', () => {
  it('orders by list price, then name, without mutating the input', () => {
    const items = [
      item({ name: 'Cheap', listPrice: 5 }),
      item({ name: 'Zebra', listPrice: 10 }),
      item({ name: 'Apple', listPrice: 10 }),
    ];
    expect(sortInventory(items).map((i) => i.name)).toEqual(['Apple', 'Zebra', 'Cheap']);
    expect(items[0].name).toBe('Cheap');
  });
});

describe('getTavernInventory', () => {
  const inventory = getTavernInventory();

  it('gives every listing a unique key, an image and a price', () => {
    expect(inventory.length).toBeGreaterThan(0);
    expect(new Set(inventory.map((i) => i.key)).size).toBe(inventory.length);
    for (const i of inventory) {
      expect(i.imageUrl).toMatch(/^https:\/\/(cards\.scryfall\.io|cdn\.swu-db\.com)\//);
      expect(i.listPrice).toBeGreaterThan(0);
      expect(['mtg', 'swu']).toContain(i.game);
    }
  });
});

describe('formatUsd', () => {
  it('always shows cents', () => {
    expect(formatUsd(50)).toBe('$50.00');
    expect(formatUsd(6.4)).toBe('$6.40');
  });
});
