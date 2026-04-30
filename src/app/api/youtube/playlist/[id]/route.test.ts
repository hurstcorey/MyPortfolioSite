import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/youtube', () => ({
  fetchPlaylistItemsWithFallback: vi.fn(),
}));

import { GET } from './route';
import { fetchPlaylistItemsWithFallback } from '@/lib/youtube';

describe('GET /api/youtube/playlist/[id]', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with videos on success', async () => {
    (fetchPlaylistItemsWithFallback as any).mockResolvedValue([
      {
        id: 'v1',
        title: 't',
        description: '',
        thumbnailUrl: '',
        position: 0,
        durationSeconds: null,
      },
    ]);

    const res = await GET(new Request('http://localhost/api/youtube/playlist/PL_X'), {
      params: Promise.resolve({ id: 'PL_X' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toHaveLength(1);
    expect(fetchPlaylistItemsWithFallback).toHaveBeenCalledWith('PL_X');
  });

  it('returns 502 without detail on total failure', async () => {
    (fetchPlaylistItemsWithFallback as any).mockRejectedValue(new Error('quota exceeded'));

    const res = await GET(new Request('http://localhost/api/youtube/playlist/PL_X'), {
      params: Promise.resolve({ id: 'PL_X' }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('youtube_api_error');
    expect(body.detail).toBeUndefined();
  });
});
