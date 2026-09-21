import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'data', 'decks-snapshot.json');
const API_BASE = 'https://archidekt.com/api';

const FOLDER_ID = process.env.NEXT_PUBLIC_ARCHIDEKT_FOLDER_ID || '1708348';

function toCardImageUrl(featured) {
  return featured.endsWith('_art_crop.jpg')
    ? featured.replace(/_art_crop\.jpg$/, '_normal.jpg')
    : featured;
}

async function main() {
  console.log(`Fetching Archidekt folder ${FOLDER_ID}…`);
  const res = await fetch(`${API_BASE}/decks/folders/${FOLDER_ID}/`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body}`);
  }
  const data = await res.json();

  const decks = (data.decks ?? [])
    .filter((deck) => !deck.private && !deck.unlisted)
    .map((deck) => {
      const featured = deck.featured || deck.customFeatured || '';
      return {
        id: deck.id,
        name: deck.name ?? '',
        size: deck.size ?? 0,
        cardImageUrl: toCardImageUrl(featured),
        artCropUrl: featured,
        deckUrl: `https://archidekt.com/decks/${deck.id}`,
        updatedAt: deck.updatedAt ?? '',
      };
    })
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    folderId: FOLDER_ID,
    decks,
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  console.log(`\n✓ Snapshotted ${decks.length} decks.`);
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
