import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import {
  fetchClientCredentialsToken,
  fetchUserPlaylists,
  readSnapshotFallback,
  fetchUserPlaylistsWithFallback,
  __resetTokenCacheForTests,
} from './spotify';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('fetchClientCredentialsToken', () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = 'cid';
    process.env.SPOTIFY_CLIENT_SECRET = 'csecret';
    vi.stubGlobal('fetch', vi.fn());
    __resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  it('POSTs to accounts.spotify.com with Basic auth and returns the token', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'abc', expires_in: 3600 }),
    });

    const token = await fetchClientCredentialsToken();

    expect(token).toBe('abc');
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://accounts.spotify.com/api/token');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(call[1].headers.Authorization).toBe(
      'Basic ' + Buffer.from('cid:csecret').toString('base64'),
    );
    expect(call[1].body).toBe('grant_type=client_credentials');
  });

  it('caches the token across calls within TTL', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'cached', expires_in: 3600 }),
    });

    const t1 = await fetchClientCredentialsToken();
    const t2 = await fetchClientCredentialsToken();

    expect(t1).toBe('cached');
    expect(t2).toBe('cached');
    expect((global.fetch as any).mock.calls).toHaveLength(1);
  });

  it('dedups concurrent first-time calls into a single token request', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'shared', expires_in: 3600 }),
    });

    const [t1, t2, t3] = await Promise.all([
      fetchClientCredentialsToken(),
      fetchClientCredentialsToken(),
      fetchClientCredentialsToken(),
    ]);

    expect(t1).toBe('shared');
    expect(t2).toBe('shared');
    expect(t3).toBe('shared');
    expect((global.fetch as any).mock.calls).toHaveLength(1);
  });

  it('throws when SPOTIFY_CLIENT_ID is missing', async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/SPOTIFY_CLIENT_ID/);
  });

  it('throws when SPOTIFY_CLIENT_SECRET is missing', async () => {
    delete process.env.SPOTIFY_CLIENT_SECRET;
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/SPOTIFY_CLIENT_SECRET/);
  });

  it('throws when token fetch returns non-ok', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 401, text: async () => 'no' });
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/401/);
  });

  it('throws when token response is missing access_token', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ expires_in: 3600 }),
    });
    await expect(fetchClientCredentialsToken()).rejects.toThrow(/missing expected fields/);
  });
});

const SAMPLE_PLAYLIST_ITEM = {
  id: 'P_ABC',
  name: 'Synthwave 84',
  description: 'Late night drives',
  images: [
    { url: 'https://i.scdn.co/image/large.jpg', width: 640, height: 640 },
    { url: 'https://i.scdn.co/image/small.jpg', width: 64, height: 64 },
  ],
  tracks: { total: 42 },
  owner: { display_name: 'corey' },
  external_urls: { spotify: 'https://open.spotify.com/playlist/P_ABC' },
};

describe('fetchUserPlaylists', () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = 'cid';
    process.env.SPOTIFY_CLIENT_SECRET = 'csecret';
    vi.stubGlobal('fetch', vi.fn());
    __resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  it('hits /users/{id}/playlists with the bearer token and normalizes the response', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [SAMPLE_PLAYLIST_ITEM], next: null }),
      });

    const result = await fetchUserPlaylists('USER_X');

    expect(result).toEqual([
      {
        source: 'spotify',
        id: 'P_ABC',
        title: 'Synthwave 84',
        description: 'Late night drives',
        thumbnailUrl: 'https://i.scdn.co/image/large.jpg',
        trackCount: 42,
        ownerName: 'corey',
        publicUrl: 'https://open.spotify.com/playlist/P_ABC',
        embedUrl: 'https://open.spotify.com/embed/playlist/P_ABC',
        publishedAt: '',
      },
    ]);

    const playlistsCall = (global.fetch as any).mock.calls[1];
    expect(playlistsCall[0]).toBe(
      'https://api.spotify.com/v1/users/USER_X/playlists?limit=50',
    );
    expect(playlistsCall[1].headers.Authorization).toBe('Bearer tok');
  });

  it('paginates through next URLs until null', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ ...SAMPLE_PLAYLIST_ITEM, id: 'P1' }],
          next: 'https://api.spotify.com/v1/users/USER_X/playlists?limit=50&offset=50',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ ...SAMPLE_PLAYLIST_ITEM, id: 'P2' }],
          next: null,
        }),
      });

    const result = await fetchUserPlaylists('USER_X');

    expect(result.map((p) => p.id)).toEqual(['P1', 'P2']);
    expect((global.fetch as any).mock.calls).toHaveLength(3); // token + 2 pages
  });

  it('handles missing images by setting thumbnailUrl to null', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ ...SAMPLE_PLAYLIST_ITEM, images: [] }],
          next: null,
        }),
      });

    const result = await fetchUserPlaylists('USER_X');
    expect(result[0].thumbnailUrl).toBeNull();
  });

  it('throws on non-ok playlists response', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'oops',
      });

    await expect(fetchUserPlaylists('USER_X')).rejects.toThrow(/500/);
  });
});

const SAMPLE_SNAPSHOT = JSON.stringify({
  snapshotAt: '2026-05-06T00:00:00Z',
  userId: 'USER_X',
  playlists: [
    {
      source: 'spotify',
      id: 'P_SNAP',
      title: 'Cached Vibes',
      description: '',
      thumbnailUrl: null,
      trackCount: 5,
      ownerName: 'corey',
      publicUrl: 'https://open.spotify.com/playlist/P_SNAP',
      embedUrl: 'https://open.spotify.com/embed/playlist/P_SNAP',
      publishedAt: '',
    },
  ],
});

describe('readSnapshotFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads data/spotify-playlists-snapshot.json and returns the playlists array', async () => {
    (fs.readFile as any).mockResolvedValue(SAMPLE_SNAPSHOT);
    const result = await readSnapshotFallback();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('P_SNAP');
    expect(result[0].source).toBe('spotify');
  });
});

describe('fetchUserPlaylistsWithFallback', () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = 'cid';
    process.env.SPOTIFY_CLIENT_SECRET = 'csecret';
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    __resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;
  });

  it('returns live data when fetch succeeds', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ ...SAMPLE_PLAYLIST_ITEM, id: 'P_LIVE' }], next: null }),
      });

    const result = await fetchUserPlaylistsWithFallback('USER_X');
    expect(result[0].id).toBe('P_LIVE');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('falls back to snapshot when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockResolvedValue(SAMPLE_SNAPSHOT);

    const result = await fetchUserPlaylistsWithFallback('USER_X');
    expect(result[0].id).toBe('P_SNAP');
  });

  it('uses snapshot directly when SPOTIFY_CLIENT_ID is absent', async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    (fs.readFile as any).mockResolvedValue(SAMPLE_SNAPSHOT);

    const result = await fetchUserPlaylistsWithFallback('USER_X');
    expect(result[0].id).toBe('P_SNAP');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns [] when both fetch and snapshot fail', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

    const result = await fetchUserPlaylistsWithFallback('USER_X');
    expect(result).toEqual([]);
  });
});
