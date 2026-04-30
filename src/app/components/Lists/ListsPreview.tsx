import React from "react";
import Link from "next/link";
import { fetchChannelPlaylistsWithFallback, readSnapshotFallback } from "@/lib/youtube";
import PlaylistCarousel from "./PlaylistCarousel";
import type { Playlist } from "@/lib/youtube.types";

const ListsPreview = async () => {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    console.warn('[lists/preview] NEXT_PUBLIC_YOUTUBE_CHANNEL_ID is not set — rendering from snapshot');
  }

  let playlists: Playlist[] = [];
  try {
    playlists = channelId
      ? await fetchChannelPlaylistsWithFallback(channelId)
      : await readSnapshotFallback();
  } catch {
    return null;
  }

  const sorted = [...playlists].sort((a, b) =>
    b.publishedAt > a.publishedAt ? 1 : -1,
  );

  if (sorted.length === 0) return null;

  return (
    <section id="lists" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <PlaylistCarousel playlists={sorted} />

      <div className="text-center mt-8">
        <Link
          href="/lists"
          className="inline-flex items-center gap-2 text-primary-500 hover:underline font-semibold"
        >
          View all playlists →
        </Link>
      </div>
    </section>
  );
};

export default ListsPreview;
