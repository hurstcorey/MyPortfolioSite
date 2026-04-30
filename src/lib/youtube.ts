import 'server-only';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { Playlist, PlaylistVideo, PlaylistSnapshot } from './youtube.types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_API_KEY is not set in the environment');
  }
  return key;
}

export async function fetchChannelPlaylists(channelId: string): Promise<Playlist[]> {
  const url = new URL(`${API_BASE}/playlists`);
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('key', getApiKey());

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return (data.items ?? []).map(normalizePlaylist);
}

function normalizePlaylist(item: any): Playlist {
  const thumbnails = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
  return {
    id: item.id,
    title: item.snippet?.title ?? '',
    description: item.snippet?.description ?? '',
    videoCount: item.contentDetails?.itemCount ?? 0,
    thumbnailUrl,
    publishedAt: item.snippet?.publishedAt ?? '',
    channelTitle: item.snippet?.channelTitle ?? '',
  };
}

export async function fetchPlaylistItems(playlistId: string): Promise<PlaylistVideo[]> {
  const url = new URL(`${API_BASE}/playlistItems`);
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('key', getApiKey());

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return (data.items ?? []).map(normalizePlaylistItem);
}

function normalizePlaylistItem(item: any): PlaylistVideo {
  const thumbnails = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
  return {
    id: item.contentDetails?.videoId ?? '',
    title: item.snippet?.title ?? '',
    description: item.snippet?.description ?? '',
    thumbnailUrl,
    position: item.snippet?.position ?? 0,
    durationSeconds: null,
  };
}

export async function readSnapshotFallback(): Promise<Playlist[]> {
  const snapshotPath = path.join(process.cwd(), 'data', 'playlists-snapshot.json');
  const json = await fs.readFile(snapshotPath, 'utf-8');
  const parsed = JSON.parse(json) as PlaylistSnapshot;
  return parsed.playlists.map(({ videos: _videos, ...playlist }) => playlist);
}

export async function readSnapshotPlaylistVideos(playlistId: string): Promise<PlaylistVideo[]> {
  const snapshotPath = path.join(process.cwd(), 'data', 'playlists-snapshot.json');
  const json = await fs.readFile(snapshotPath, 'utf-8');
  const parsed = JSON.parse(json) as PlaylistSnapshot;
  const playlist = parsed.playlists.find((p) => p.id === playlistId);
  return playlist?.videos ?? [];
}

export async function fetchChannelPlaylistsWithFallback(
  channelId: string,
): Promise<Playlist[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    return readSnapshotFallback();
  }
  try {
    return await fetchChannelPlaylists(channelId);
  } catch (err) {
    console.warn('[youtube] live fetch failed, falling back to snapshot:', err);
    return readSnapshotFallback();
  }
}

export async function fetchPlaylistItemsWithFallback(
  playlistId: string,
): Promise<PlaylistVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    return readSnapshotPlaylistVideos(playlistId);
  }
  try {
    return await fetchPlaylistItems(playlistId);
  } catch (err) {
    console.warn('[youtube] playlist items fetch failed, falling back to snapshot:', err);
    return readSnapshotPlaylistVideos(playlistId);
  }
}
