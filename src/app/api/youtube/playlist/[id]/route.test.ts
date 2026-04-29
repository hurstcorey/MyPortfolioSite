import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/youtube', () => ({
  fetchPlaylistItems: vi.fn(),
}));

import { GET } from './route';
import { fetchPlaylistItems } from '@/lib/youtube';

describe('GET /api/youtube/playlist/[id]', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns 200 with videos on success', async () => {
    (fetchPlaylistItems as any).mockResolvedValue([
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
      params: { id: 'PL_X' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toHaveLength(1);
    expect(fetchPlaylistItems).toHaveBeenCalledWith('PL_X');
  });

  it('returns 502 on YouTube API error', async () => {
    (fetchPlaylistItems as any).mockRejectedValue(new Error('quota exceeded'));

    const res = await GET(new Request('http://localhost/api/youtube/playlist/PL_X'), {
      params: { id: 'PL_X' },
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('youtube_api_error');
  });
});
