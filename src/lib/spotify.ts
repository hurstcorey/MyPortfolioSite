import 'server-only';
import type { SpotifyPlaylist } from './spotify.types';

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';
const TOKEN_TTL_BUFFER_SECONDS = 300;

// Module-level cache. Each serverless instance gets its own; that's fine —
// Spotify's TTL is an hour, so even a low hit rate amortizes well.
let cachedToken: { value: string; expiresAt: number } | null = null;
let inflightToken: Promise<string> | null = null;

export function __resetTokenCacheForTests(): void {
  cachedToken = null;
  inflightToken = null;
}

export async function fetchClientCredentialsToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  if (inflightToken) {
    return inflightToken;
  }

  inflightToken = doFetchToken().finally(() => {
    inflightToken = null;
  });
  return inflightToken;
}

async function doFetchToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id) throw new Error('SPOTIFY_CLIENT_ID is not set in the environment');
  if (!secret) throw new Error('SPOTIFY_CLIENT_SECRET is not set in the environment');

  const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Spotify token fetch failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') {
    throw new Error('Spotify token response missing expected fields');
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - TOKEN_TTL_BUFFER_SECONDS) * 1000,
  };
  return cachedToken.value;
}

function mapSpotifyPlaylist(item: any): SpotifyPlaylist {
  const id: string = item.id;
  const firstImage: string | undefined = item.images?.[0]?.url;
  return {
    source: 'spotify',
    id,
    title: item.name ?? '',
    description: item.description ?? '',
    thumbnailUrl: firstImage ?? null,
    trackCount: item.tracks?.total ?? 0,
    ownerName: item.owner?.display_name ?? '',
    publicUrl: item.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${id}`,
    publishedAt: '',
  };
}

export async function fetchUserPlaylists(userId: string): Promise<SpotifyPlaylist[]> {
  const token = await fetchClientCredentialsToken();
  const out: SpotifyPlaylist[] = [];
  let url: string | null = `${API_BASE}/users/${encodeURIComponent(userId)}/playlists?limit=50`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Spotify playlists fetch failed: ${res.status} ${body}`);
    }
    const page = await res.json();
    for (const item of page.items ?? []) out.push(mapSpotifyPlaylist(item));
    url = page.next ?? null;
  }

  return out;
}
