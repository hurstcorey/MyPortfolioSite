import 'server-only';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { DeckSnapshot, MtgDeck } from './archidekt.types';

const API_BASE = 'https://archidekt.com/api';

/** The public Archidekt folder backing the "Gamer" section. */
export const DEFAULT_FOLDER_ID = '1708348';

export function getFolderId(): string {
  return process.env.NEXT_PUBLIC_ARCHIDEKT_FOLDER_ID || DEFAULT_FOLDER_ID;
}

export function folderUrl(folderId = getFolderId()): string {
  return `https://archidekt.com/folders/${folderId}`;
}

/**
 * Archidekt's `featured` image is the art crop of the deck's commander. The
 * full card art lives at the same path with a different size suffix, so the
 * card image can be derived without fetching every deck's card list.
 */
export function toCardImageUrl(featured: string): string {
  return featured.endsWith('_art_crop.jpg')
    ? featured.replace(/_art_crop\.jpg$/, '_normal.jpg')
    : featured;
}

export function normalizeDeck(deck: any): MtgDeck {
  const featured: string = deck.featured || deck.customFeatured || '';
  return {
    id: deck.id,
    name: deck.name ?? '',
    size: deck.size ?? 0,
    cardImageUrl: toCardImageUrl(featured),
    artCropUrl: featured,
    deckUrl: `https://archidekt.com/decks/${deck.id}`,
    updatedAt: deck.updatedAt ?? '',
  };
}

/** Decks that a visitor could not open are not worth linking to. */
function isPubliclyViewable(deck: any): boolean {
  return !deck.private && !deck.unlisted;
}

export async function fetchFolderDecks(folderId = getFolderId()): Promise<MtgDeck[]> {
  const res = await fetch(`${API_BASE}/decks/folders/${folderId}/`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Archidekt API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return (data.decks ?? [])
    .filter(isPubliclyViewable)
    .map(normalizeDeck)
    .sort((a: MtgDeck, b: MtgDeck) => (b.updatedAt > a.updatedAt ? 1 : -1));
}

export async function readSnapshotFallback(): Promise<MtgDeck[]> {
  const snapshotPath = path.join(process.cwd(), 'data', 'decks-snapshot.json');
  const json = await fs.readFile(snapshotPath, 'utf-8');
  return (JSON.parse(json) as DeckSnapshot).decks;
}

export async function fetchFolderDecksWithFallback(
  folderId = getFolderId(),
): Promise<MtgDeck[]> {
  try {
    return await fetchFolderDecks(folderId);
  } catch (err) {
    console.warn('[archidekt] live fetch failed, falling back to snapshot:', err);
    return readSnapshotFallback();
  }
}
