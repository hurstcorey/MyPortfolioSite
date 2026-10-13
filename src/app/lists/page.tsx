import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";
import ListsGrid from "../components/Lists/ListsGrid";
import { fetchChannelPlaylistsWithFallback, readSnapshotFallback as readYouTubeSnapshot } from "@/lib/youtube";
import { fetchUserPlaylistsWithFallback } from "@/lib/spotify";
import { fetchFolderDecksWithFallback } from "@/lib/archidekt";
import { toMtgListItem } from "@/lib/mtg.playlist";
import type { Playlist } from "@/lib/playlists.types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lists | Corey Hurst",
  description:
    "YouTube playlists, Spotify playlists and Magic: The Gathering decks curated by Corey Hurst.",
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

async function loadMtg(): Promise<Playlist[]> {
  try {
    return (await fetchFolderDecksWithFallback()).map(toMtgListItem);
  } catch {
    return [];
  }
}

export default async function ListsPage() {
  const [youtubePlaylists, spotifyPlaylists, mtgDecks] = await Promise.all([
    loadYouTube(),
    loadSpotify(),
    loadMtg(),
  ]);

  const playlists: Playlist[] = [...youtubePlaylists, ...spotifyPlaylists, ...mtgDecks];

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
