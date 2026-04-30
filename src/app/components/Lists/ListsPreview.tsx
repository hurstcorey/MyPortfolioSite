import React from "react";
import Link from "next/link";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";
import PlaylistCarousel from "./PlaylistCarousel";
import type { Playlist } from "@/lib/youtube.types";

const ListsPreview = async () => {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";

  let playlists: Playlist[] = [];
  try {
    playlists = await fetchChannelPlaylistsWithFallback(channelId);
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
