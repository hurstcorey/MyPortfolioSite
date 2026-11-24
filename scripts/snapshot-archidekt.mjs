import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env when dotenv is installed; scheduled runs have no install step.
await import('dotenv/config').catch(() => {});

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

  // The snapshot is only a fallback, so a deck merely being edited (new
  // updatedAt) is not worth a new commit. Compare everything else.
  const identity = (list) =>
    JSON.stringify(
      list
        .map(({ updatedAt, ...rest }) => rest)
        .sort((a, b) => a.id - b.id),
    );
  try {
    const existing = JSON.parse(await fs.readFile(OUTPUT, 'utf-8'));
    if (existing.folderId === FOLDER_ID && identity(existing.decks) === identity(decks)) {
      console.log(`\n✓ Snapshot already current (${decks.length} decks); nothing to write.`);
      return;
    }
  } catch {
    // No usable snapshot yet; write one below.
  }

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
