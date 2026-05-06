import 'server-only';

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const TOKEN_TTL_BUFFER_SECONDS = 300; // shave 5 min off Spotify's 1h TTL

let cachedToken: { value: string; expiresAt: number } | null = null;

export function __resetTokenCacheForTests(): void {
  cachedToken = null;
}

export async function fetchClientCredentialsToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('Spotify credentials are not set in the environment');
  }

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

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - TOKEN_TTL_BUFFER_SECONDS) * 1000,
  };
  return cachedToken.value;
}
