import { describe, expect, it } from 'vitest';
import { toMtgListItem } from './mtg.playlist';
import type { MtgDeck } from './archidekt.types';

const deck: MtgDeck = {
  id: 42,
  name: 'Tana Stompy',
  size: 100,
  cardImageUrl: 'https://cdn.example/card_normal.jpg',
  artCropUrl: 'https://cdn.example/card_art_crop.jpg',
  deckUrl: 'https://archidekt.com/decks/42',
  updatedAt: '2026-05-01T12:00:00Z',
};

describe('toMtgListItem', () => {
  it('maps a deck onto the shared list shape', () => {
    expect(toMtgListItem(deck)).toEqual({
      source: 'mtg',
      id: 'mtg-42',
      title: 'Tana Stompy',
      description: '',
      thumbnailUrl: 'https://cdn.example/card_art_crop.jpg',
      cardCount: 100,
      publicUrl: 'https://archidekt.com/decks/42',
      publishedAt: '2026-05-01T12:00:00Z',
    });
  });

  it('prefixes the id so it cannot collide with YouTube/Spotify ids', () => {
    expect(toMtgListItem(deck).id.startsWith('mtg-')).toBe(true);
  });

  it('falls back to the full card image when there is no art crop', () => {
    const result = toMtgListItem({ ...deck, artCropUrl: '' });
    expect(result.thumbnailUrl).toBe(deck.cardImageUrl);
  });
});
