import 'server-only';

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
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
