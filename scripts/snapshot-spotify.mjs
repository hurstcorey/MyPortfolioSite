import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'data', 'spotify-playlists-snapshot.json');
const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';

function getEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}. Add it to .env.local.`);
    process.exit(1);
  }
  return v;
}

const CLIENT_ID = getEnv('SPOTIFY_CLIENT_ID');
const CLIENT_SECRET = getEnv('SPOTIFY_CLIENT_SECRET');
const USER_ID = getEnv('NEXT_PUBLIC_SPOTIFY_USER_ID');

async function getToken() {
  const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`Token fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

function mapPlaylist(item) {
  const firstImage = item.images?.[0]?.url ?? null;
  return {
    source: 'spotify',
    id: item.id,
    title: item.name ?? '',
    description: item.description ?? '',
    thumbnailUrl: firstImage,
    trackCount: item.tracks?.total ?? 0,
    ownerName: item.owner?.display_name ?? '',
    publicUrl: item.external_urls?.spotify ?? `https://open.spotify.com/playlist/${item.id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${item.id}`,
    publishedAt: '',
  };
}

async function main() {
  console.log(`Fetching Spotify playlists for user ${USER_ID}…`);
  const token = await getToken();

  const playlists = [];
  let url = `${API_BASE}/users/${encodeURIComponent(USER_ID)}/playlists?limit=50`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Playlists fetch failed: ${res.status} ${await res.text()}`);
    }
    const page = await res.json();
    for (const item of page.items ?? []) playlists.push(mapPlaylist(item));
    url = page.next;
  }

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    userId: USER_ID,
    playlists,
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  console.log(`\n✓ Snapshotted ${playlists.length} Spotify playlists.`);
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
