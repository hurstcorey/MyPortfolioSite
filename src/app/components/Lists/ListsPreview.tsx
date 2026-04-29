import React from "react";
import Link from "next/link";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";
import PlaylistCard from "./PlaylistCard";
import type { Playlist } from "@/lib/youtube.types";

const PREVIEW_COUNT = 4;

const ListsPreview = async () => {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) return null;

  let playlists: Playlist[] = [];
  try {
    playlists = await fetchChannelPlaylistsWithFallback(channelId);
  } catch {
    return null;
  }

  const recent = [...playlists]
    .sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1))
    .slice(0, PREVIEW_COUNT);

  if (recent.length === 0) return null;

  return (
    <section id="lists" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recent.map((playlist) => (
          <Link key={playlist.id} href={`/lists#${playlist.id}`}>
            <PlaylistCard playlist={playlist} isActive={false} onClick={() => {}} />
          </Link>
        ))}
      </div>

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
