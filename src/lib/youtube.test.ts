import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchChannelPlaylists,
  fetchChannelPlaylistsWithFallback,
  fetchPlaylistItems,
  fetchPlaylistItemsWithFallback,
} from './youtube';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const SAMPLE_RESPONSE = {
  items: [
    {
      id: 'PL123',
      snippet: {
        title: 'Gaming Highlights',
        description: 'Best moments from streams',
        publishedAt: '2024-01-15T10:00:00Z',
        channelTitle: 'Corey Hurst',
        thumbnails: {
          medium: { url: 'https://i.ytimg.com/medium.jpg' },
          default: { url: 'https://i.ytimg.com/default.jpg' },
        },
      },
      contentDetails: { itemCount: 12 },
    },
  ],
};

describe('fetchChannelPlaylists', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('hits the playlists endpoint with the channel id and api key', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_RESPONSE,
    });

    await fetchChannelPlaylists('UC_TEST');

    const callArgs = (global.fetch as any).mock.calls[0];
    const url = callArgs[0] as URL;
    expect(url.toString()).toContain('youtube/v3/playlists');
    expect(url.searchParams.get('channelId')).toBe('UC_TEST');
    expect(url.searchParams.get('key')).toBe('test-key');
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails');
    expect(url.searchParams.get('maxResults')).toBe('50');
  });

  it('normalizes the YouTube response to Playlist[]', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_RESPONSE,
    });

    const result = await fetchChannelPlaylists('UC_TEST');

    expect(result).toEqual([
      {
        id: 'PL123',
        title: 'Gaming Highlights',
        description: 'Best moments from streams',
        videoCount: 12,
        thumbnailUrl: 'https://i.ytimg.com/medium.jpg',
        publishedAt: '2024-01-15T10:00:00Z',
        channelTitle: 'Corey Hurst',
      },
    ]);
  });

  it('throws when YOUTUBE_API_KEY is missing', async () => {
    delete process.env.YOUTUBE_API_KEY;
    await expect(fetchChannelPlaylists('UC_TEST')).rejects.toThrow(/YOUTUBE_API_KEY/);
  });

  it('throws on non-ok response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });
    await expect(fetchChannelPlaylists('UC_TEST')).rejects.toThrow(/403/);
  });
});

const SAMPLE_ITEMS = {
  items: [
    {
      snippet: {
        title: 'Episode 1',
        description: 'First episode',
        position: 0,
        thumbnails: { medium: { url: 'https://i.ytimg.com/v1.jpg' } },
      },
      contentDetails: { videoId: 'vid_1' },
    },
    {
      snippet: {
        title: 'Episode 2',
        description: 'Second episode',
        position: 1,
        thumbnails: { default: { url: 'https://i.ytimg.com/v2.jpg' } },
      },
      contentDetails: { videoId: 'vid_2' },
    },
  ],
};

describe('fetchPlaylistItems', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('hits the playlistItems endpoint with the playlist id', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => SAMPLE_ITEMS });

    await fetchPlaylistItems('PL_TEST');

    const url = (global.fetch as any).mock.calls[0][0] as URL;
    expect(url.toString()).toContain('youtube/v3/playlistItems');
    expect(url.searchParams.get('playlistId')).toBe('PL_TEST');
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails');
    expect(url.searchParams.get('maxResults')).toBe('50');
  });

  it('normalizes items to PlaylistVideo[]', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => SAMPLE_ITEMS });

    const result = await fetchPlaylistItems('PL_TEST');

    expect(result).toEqual([
      {
        id: 'vid_1',
        title: 'Episode 1',
        description: 'First episode',
        thumbnailUrl: 'https://i.ytimg.com/v1.jpg',
        position: 0,
        durationSeconds: null,
      },
      {
        id: 'vid_2',
        title: 'Episode 2',
        description: 'Second episode',
        thumbnailUrl: 'https://i.ytimg.com/v2.jpg',
        position: 1,
        durationSeconds: null,
      },
    ]);
  });
});

describe('fetchChannelPlaylistsWithFallback', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('returns live data when fetch succeeds', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'PL_LIVE',
            snippet: {
              title: 'Live',
              description: '',
              publishedAt: '',
              channelTitle: '',
              thumbnails: {},
            },
            contentDetails: { itemCount: 1 },
          },
        ],
      }),
    });

    const result = await fetchChannelPlaylistsWithFallback('UC_TEST');
    expect(result[0].id).toBe('PL_LIVE');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('falls back to snapshot when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockResolvedValue(
      JSON.stringify({
        snapshotAt: '2026-04-28T00:00:00Z',
        channelId: 'UC_TEST',
        playlists: [
          {
            id: 'PL_CACHED',
            title: 'Cached',
            description: '',
            videoCount: 0,
            thumbnailUrl: '',
            publishedAt: '',
            channelTitle: '',
            videos: [],
          },
        ],
      }),
    );

    const result = await fetchChannelPlaylistsWithFallback('UC_TEST');
    expect(result[0].id).toBe('PL_CACHED');
    expect(result[0]).not.toHaveProperty('videos');
  });

  it('throws when both fetch and snapshot fail', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

    await expect(fetchChannelPlaylistsWithFallback('UC_TEST')).rejects.toThrow();
  });
});

const SNAPSHOT_WITH_VIDEOS = JSON.stringify({
  snapshotAt: '2026-04-28T00:00:00Z',
  channelId: 'UC_TEST',
  playlists: [
    {
      id: 'PL_SNAP',
      title: 'Snapshot Playlist',
      description: '',
      videoCount: 1,
      thumbnailUrl: '',
      publishedAt: '',
      channelTitle: '',
      videos: [
        { id: 'vid_snap', title: 'Snap Video', description: '', thumbnailUrl: '', position: 0, durationSeconds: null },
      ],
    },
  ],
});

describe('fetchPlaylistItemsWithFallback', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('returns live videos when fetch succeeds', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            snippet: { title: 'Live Vid', description: '', position: 0, thumbnails: {} },
            contentDetails: { videoId: 'vid_live' },
          },
        ],
      }),
    });

    const result = await fetchPlaylistItemsWithFallback('PL_SNAP');
    expect(result[0].id).toBe('vid_live');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('falls back to snapshot videos when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockResolvedValue(SNAPSHOT_WITH_VIDEOS);

    const result = await fetchPlaylistItemsWithFallback('PL_SNAP');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('vid_snap');
  });

  it('returns empty array when playlist not in snapshot', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockResolvedValue(SNAPSHOT_WITH_VIDEOS);

    const result = await fetchPlaylistItemsWithFallback('PL_MISSING');
    expect(result).toEqual([]);
  });

  it('uses snapshot directly when YOUTUBE_API_KEY is absent', async () => {
    delete process.env.YOUTUBE_API_KEY;
    (fs.readFile as any).mockResolvedValue(SNAPSHOT_WITH_VIDEOS);

    const result = await fetchPlaylistItemsWithFallback('PL_SNAP');
    expect(result[0].id).toBe('vid_snap');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
