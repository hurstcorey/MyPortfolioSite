export interface SpotifyPlaylist {
  source: "spotify";
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  trackCount: number;
  ownerName: string;
  publicUrl: string;
  embedUrl: string;
  publishedAt: string;
}

export interface SpotifyPlaylistSnapshot {
  snapshotAt: string;
  userId: string;
  playlists: SpotifyPlaylist[];
}
