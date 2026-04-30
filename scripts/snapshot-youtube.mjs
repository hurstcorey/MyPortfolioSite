import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'data', 'playlists-snapshot.json');
const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}. Add it to .env.local.`);
    process.exit(1);
  }
  return v;
}

const API_KEY = getEnv('YOUTUBE_API_KEY');
const CHANNEL_ID = getEnv('NEXT_PUBLIC_YOUTUBE_CHANNEL_ID');

async function ytFetch(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${endpoint} ${res.status}: ${body}`);
  }
  return res.json();
}

function normalizeThumbnail(thumbnails = {}) {
  return thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
}

async function main() {
  console.log(`Fetching playlists for channel ${CHANNEL_ID}…`);
  const playlistsData = await ytFetch('playlists', {
    channelId: CHANNEL_ID,
    part: 'snippet,contentDetails',
    maxResults: '50',
  });

  const playlists = [];
  for (const item of playlistsData.items ?? []) {
    const playlist = {
      id: item.id,
      title: item.snippet?.title ?? '',
      description: item.snippet?.description ?? '',
      videoCount: item.contentDetails?.itemCount ?? 0,
      thumbnailUrl: normalizeThumbnail(item.snippet?.thumbnails),
      publishedAt: item.snippet?.publishedAt ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      videos: [],
    };

    console.log(`  Fetching videos for "${playlist.title}" (${playlist.id})…`);
    const itemsData = await ytFetch('playlistItems', {
      playlistId: playlist.id,
      part: 'snippet,contentDetails',
      maxResults: '50',
    });
    playlist.videos = (itemsData.items ?? []).map((it) => ({
      id: it.contentDetails?.videoId ?? '',
      title: it.snippet?.title ?? '',
      description: it.snippet?.description ?? '',
      thumbnailUrl: normalizeThumbnail(it.snippet?.thumbnails),
      position: it.snippet?.position ?? 0,
      durationSeconds: null,
    }));

    playlists.push(playlist);
  }

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    channelId: CHANNEL_ID,
    playlists,
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  const totalVideos = playlists.reduce((s, p) => s + p.videos.length, 0);
  console.log(`\n✓ Snapshotted ${playlists.length} playlists, ${totalVideos} total videos.`);
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
