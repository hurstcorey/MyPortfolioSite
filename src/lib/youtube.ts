import 'server-only';
import type { Playlist } from './youtube.types';

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
