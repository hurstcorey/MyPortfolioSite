export type TavernGame = 'mtg' | 'swu';

export type TavernFinish = 'nonfoil' | 'foil';

export interface TavernItem {
  /** Stable id for the listing: `<game>:<tcgplayerId>:<finish>`. */
  key: string;
  game: TavernGame;
  /** TCGplayer product id. */
  tcgplayerId: number;
  /** Scryfall card id for Magic, `<SET>/<NUMBER>` on SWU-DB for Star Wars Unlimited. */
  sourceId: string;
  name: string;
  setName: string;
  setCode: string;
  /** Collector number within the set. */
  number: string;
  rarity: string;
  finish: TavernFinish;
  /** Card image from Scryfall or SWU-DB. */
  imageUrl: string;
  /** The price the card is listed at in the store, in USD. */
  listPrice: number;
}

export interface TavernSnapshot {
  snapshotAt: string;
  sellerId: string;
  items: TavernItem[];
}
