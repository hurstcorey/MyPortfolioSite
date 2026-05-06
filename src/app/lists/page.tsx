import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";
import ListsGrid from "../components/Lists/ListsGrid";
import { fetchChannelPlaylistsWithFallback, readSnapshotFallback as readYouTubeSnapshot } from "@/lib/youtube";
import { fetchUserPlaylistsWithFallback } from "@/lib/spotify";
import type { Playlist } from "@/lib/playlists.types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Playlists | Corey Hurst",
  description: "YouTube and Spotify playlists curated by Corey Hurst.",
};

async function loadYouTube(): Promise<Playlist[]> {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    console.warn('[lists] NEXT_PUBLIC_YOUTUBE_CHANNEL_ID is not set — rendering YouTube from snapshot');
    try {
      return await readYouTubeSnapshot();
    } catch {
      return [];
    }
  }
  try {
    return await fetchChannelPlaylistsWithFallback(channelId);
  } catch {
    return [];
  }
}

async function loadSpotify(): Promise<Playlist[]> {
  const userId = process.env.NEXT_PUBLIC_SPOTIFY_USER_ID;
  if (!userId) {
    console.warn('[lists] NEXT_PUBLIC_SPOTIFY_USER_ID is not set — skipping Spotify');
    return [];
  }
  return fetchUserPlaylistsWithFallback(userId);
}

export default async function ListsPage() {
  const [youtubePlaylists, spotifyPlaylists] = await Promise.all([
    loadYouTube(),
    loadSpotify(),
  ]);

  const playlists: Playlist[] = [...youtubePlaylists, ...spotifyPlaylists];

  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <ListsGrid playlists={playlists} />
      </div>
      <Footer />
    </main>
  );
}
