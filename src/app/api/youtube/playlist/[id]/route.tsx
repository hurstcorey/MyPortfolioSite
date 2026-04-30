import { NextResponse } from 'next/server';
import { fetchPlaylistItemsWithFallback } from '@/lib/youtube';

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const videos = await fetchPlaylistItemsWithFallback(params.id);
    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[api/youtube/playlist] error:', err);
    return NextResponse.json(
      { error: 'youtube_api_error' },
      { status: 502 },
    );
  }
}
