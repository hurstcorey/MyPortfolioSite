import { describe, expect, it } from 'vitest';
import { sortPlaylists } from './playlists.sort';
import type { Playlist } from './playlists.types';

const yt = (id: string, title: string, publishedAt: string): Playlist => ({
  source: 'youtube',
  id,
  title,
  description: '',
  videoCount: 0,
  thumbnailUrl: '',
  publishedAt,
  channelTitle: '',
});

const sp = (id: string, title: string): Playlist => ({
  source: 'spotify',
  id,
  title,
  description: '',
  thumbnailUrl: null,
  trackCount: 0,
  ownerName: '',
  publicUrl: '',
  embedUrl: '',
  publishedAt: '',
});

describe('sortPlaylists', () => {
  it('sorts All tab alphabetically by title, case-insensitive', () => {
    const input: Playlist[] = [
      yt('y1', 'Zelda Lore', '2025-01-01'),
      sp('s1', 'ambient'),
      yt('y2', 'Beat Saber Highlights', '2025-02-01'),
      sp('s2', 'Top 40'),
    ];
    const result = sortPlaylists(input, 'all').map((p) => p.title);
    expect(result).toEqual(['ambient', 'Beat Saber Highlights', 'Top 40', 'Zelda Lore']);
  });

  it('sorts YouTube tab by publishedAt desc (newest first)', () => {
    const input: Playlist[] = [
      yt('a', 'A', '2024-01-01'),
      yt('b', 'B', '2026-05-01'),
      yt('c', 'C', '2025-06-01'),
    ];
    const result = sortPlaylists(input, 'youtube').map((p) => p.id);
    expect(result).toEqual(['b', 'c', 'a']);
  });

  it('preserves API order for the Spotify tab', () => {
    const input: Playlist[] = [sp('first', 'X'), sp('second', 'A'), sp('third', 'M')];
    const result = sortPlaylists(input, 'spotify').map((p) => p.id);
    expect(result).toEqual(['first', 'second', 'third']);
  });

  it('does not mutate the input array', () => {
    const input: Playlist[] = [yt('y1', 'B', '2025-01-01'), yt('y2', 'A', '2025-02-01')];
    const snapshot = [...input];
    sortPlaylists(input, 'all');
    expect(input).toEqual(snapshot);
  });
});
