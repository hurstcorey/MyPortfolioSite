export interface Playlist {
  source: "youtube";
  id: string;
  title: string;
  description: string;
  videoCount: number;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  position: number;
  durationSeconds: number | null;
}

export interface PlaylistSnapshot {
  snapshotAt: string;
  channelId: string;
  playlists: Array<Omit<Playlist, "source"> & { videos: PlaylistVideo[] }>;
}
