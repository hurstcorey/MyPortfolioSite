import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchFolderDecks,
  fetchFolderDecksWithFallback,
  folderUrl,
  toCardImageUrl,
} from './archidekt';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const CDN = 'https://storage.googleapis.com/archidekt-card-images/mkc';
const UID = '2ef59aa9-f5e1-413a-869b-d287db95efd0';

const SAMPLE_RESPONSE = {
  decks: [
    {
      id: 25591247,
      name: 'The Accuser',
      size: 100,
      featured: `${CDN}/${UID}_art_crop.jpg`,
      customFeatured: '',
      updatedAt: '2026-08-29T14:05:53.397495Z',
      private: false,
      unlisted: false,
    },
    {
      id: 25636565,
      name: 'Sidisi Reanimator Queen',
      size: 100,
      featured: `${CDN}/other_art_crop.jpg`,
      customFeatured: '',
      updatedAt: '2026-09-02T14:24:07.344983Z',
      private: false,
      unlisted: false,
    },
  ],
};

describe('toCardImageUrl', () => {
  it('promotes an art crop to the full card image', () => {
    expect(toCardImageUrl(`${CDN}/${UID}_art_crop.jpg`)).toBe(`${CDN}/${UID}_normal.jpg`);
  });

  it('leaves other image urls alone', () => {
    expect(toCardImageUrl('https://example.com/custom.png')).toBe(
      'https://example.com/custom.png',
    );
    expect(toCardImageUrl('')).toBe('');
  });
});

describe('folderUrl', () => {
  it('builds the public Archidekt folder link', () => {
    expect(folderUrl('1708348')).toBe('https://archidekt.com/folders/1708348');
  });
});

describe('fetchFolderDecks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('normalizes decks and sorts them most recently updated first', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_RESPONSE,
    } as Response);

    const decks = await fetchFolderDecks('1708348');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://archidekt.com/api/decks/folders/1708348/',
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
    expect(decks.map((d) => d.name)).toEqual(['Sidisi Reanimator Queen', 'The Accuser']);
    expect(decks[1]).toEqual({
      id: 25591247,
      name: 'The Accuser',
      size: 100,
      cardImageUrl: `${CDN}/${UID}_normal.jpg`,
      artCropUrl: `${CDN}/${UID}_art_crop.jpg`,
      deckUrl: 'https://archidekt.com/decks/25591247',
      updatedAt: '2026-08-29T14:05:53.397495Z',
    });
  });

  it('drops private and unlisted decks a visitor could not open', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        decks: [
          { ...SAMPLE_RESPONSE.decks[0], private: true },
          { ...SAMPLE_RESPONSE.decks[1], unlisted: true },
        ],
      }),
    } as Response);

    await expect(fetchFolderDecks('1708348')).resolves.toEqual([]);
  });

  it('throws when the API responds with an error', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as Response);

    await expect(fetchFolderDecks('1708348')).rejects.toThrow('Archidekt API error: 404');
  });
});

describe('fetchFolderDecksWithFallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('falls back to the snapshot when the live fetch fails', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network down'));
    const snapshotDeck = {
      id: 1,
      name: 'Snapshot Deck',
      size: 100,
      cardImageUrl: `${CDN}/${UID}_normal.jpg`,
      artCropUrl: `${CDN}/${UID}_art_crop.jpg`,
      deckUrl: 'https://archidekt.com/decks/1',
      updatedAt: '2026-08-01T00:00:00Z',
    };
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ snapshotAt: '', folderId: '1708348', decks: [snapshotDeck] }),
    );

    await expect(fetchFolderDecksWithFallback('1708348')).resolves.toEqual([snapshotDeck]);
  });
});
