import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchMtgByTcgplayerId, fetchSwuCard, itemKey } from './lib/tavern-sources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(REPO_ROOT, 'data', 'tavern-inventory.json');
const OUTPUT = path.join(REPO_ROOT, 'data', 'tavern-snapshot.json');

// TCGplayer appends the treatment to product names ("Erode (Borderless)");
// the card itself is found by the bare name.
function stripTreatment(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '');
}

async function resolveMtg(listing) {
  const card = await fetchMtgByTcgplayerId(listing.tcgplayerId);
  // Double-faced cards keep their images on the faces.
  const images = card.image_uris ?? card.card_faces?.[0]?.image_uris ?? {};
  return {
    sourceId: card.id,
    name: stripTreatment(listing.name ?? card.name),
    setName: card.set_name ?? '',
    setCode: card.set ?? '',
    number: card.collector_number ?? '',
    rarity: card.rarity ?? '',
    imageUrl: images.normal ?? images.large ?? '',
  };
}

async function resolveSwu(listing, setNames) {
  const card = await fetchSwuCard(listing.set, listing.number);
  const title = card.Subtitle ? `${card.Name} - ${card.Subtitle}` : card.Name;
  return {
    sourceId: `${card.Set}/${card.Number}`,
    name: stripTreatment(listing.name ?? title),
    setName: setNames[card.Set] ?? card.Set,
    setCode: card.Set.toLowerCase(),
    number: card.Number,
    rarity: (card.Rarity ?? '').toLowerCase(),
    imageUrl: card.FrontArt ?? '',
  };
}

async function main() {
  const inventory = JSON.parse(await fs.readFile(INPUT, 'utf-8'));
  // SWU-DB cards only carry the set code; TCGplayer's set names live here.
  const swuSetNames = { LAW: 'A Lawless Time', ...inventory.swuSetNames };

  console.log(`Resolving ${inventory.items.length} listings…`);
  const items = [];
  for (const listing of inventory.items) {
    const finish = listing.finish ?? 'nonfoil';
    const base = { ...listing, finish };
    const resolved =
      listing.game === 'swu'
        ? await resolveSwu(base, swuSetNames)
        : await resolveMtg(base);
    items.push({
      key: itemKey(base),
      game: listing.game,
      tcgplayerId: listing.tcgplayerId,
      finish,
      listPrice: listing.listPrice,
      ...resolved,
    });
    console.log(`  ✓ ${resolved.name} (${resolved.setName})`);
  }

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    sellerId: inventory.sellerId,
    items,
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  console.log(`\n✓ Snapshotted ${items.length} listings.`);
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
