import type { Playlist, PlaylistSource } from './playlists.types';

export type ActiveSource = 'all' | PlaylistSource;

export function sortPlaylists(
  playlists: Playlist[],
  active: ActiveSource,
): Playlist[] {
  const copy = [...playlists];
  if (active === 'all') {
    return copy.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
    );
  }
  if (active === 'youtube') {
    return copy.sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1));
  }
  // 'spotify' → preserve incoming order
  return copy;
}
