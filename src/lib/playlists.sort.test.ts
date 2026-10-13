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

const mtg = (id: string, title: string, publishedAt: string): Playlist => ({
  source: 'mtg',
  id,
  title,
  description: '',
  thumbnailUrl: '',
  cardCount: 100,
  publicUrl: '',
  publishedAt,
});

describe('sortPlaylists', () => {
  it('sorts MTG tab by last edit desc (newest first)', () => {
    const input: Playlist[] = [
      mtg('mtg-1', 'A', '2024-01-01T00:00:00Z'),
      mtg('mtg-2', 'B', '2026-05-01T00:00:00Z'),
      mtg('mtg-3', 'C', '2025-06-01T00:00:00Z'),
    ];
    const result = sortPlaylists(input, 'mtg').map((p) => p.id);
    expect(result).toEqual(['mtg-2', 'mtg-3', 'mtg-1']);
  });

  it('interleaves all three sources alphabetically on the All tab', () => {
    const input: Playlist[] = [
      mtg('mtg-1', 'Tana', '2025-01-01'),
      yt('y1', 'Zelda', '2025-01-01'),
      sp('s1', 'Ambient'),
    ];
    const result = sortPlaylists(input, 'all').map((p) => p.title);
    expect(result).toEqual(['Ambient', 'Tana', 'Zelda']);
  });

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
