import { NextResponse } from 'next/server';
import { fetchPlaylistItemsWithFallback } from '@/lib/youtube';
import { clientKey, rateLimit } from '@/lib/rateLimit';

export const revalidate = 3600;

// YouTube playlist ids are URL-safe base64-ish tokens.
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(`playlist:${clientKey(req)}`, 60, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      },
    );
  }

  const { id } = await params;
  if (!PLAYLIST_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'invalid_playlist_id' }, { status: 400 });
  }
  try {
    const videos = await fetchPlaylistItemsWithFallback(id);
    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[api/youtube/playlist] error:', err);
    return NextResponse.json(
      { error: 'youtube_api_error' },
      { status: 502 },
    );
  }
}
