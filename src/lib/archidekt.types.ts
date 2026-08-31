export interface MtgDeck {
  id: number;
  name: string;
  /** Number of cards in the deck. */
  size: number;
  /** Full commander card image on the Archidekt CDN. */
  cardImageUrl: string;
  /** Landscape art crop of the same card, used when the full card image is unavailable. */
  artCropUrl: string;
  /** Public deck page on Archidekt. */
  deckUrl: string;
  updatedAt: string;
}

export interface DeckSnapshot {
  snapshotAt: string;
  folderId: string;
  decks: MtgDeck[];
}
