import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchChannelPlaylists, fetchPlaylistItems } from './youtube';

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
