import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";
import ListsGrid from "../components/Lists/ListsGrid";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Playlists | Corey Hurst",
  description: "YouTube playlists from my channel — gaming, dev, art, and more.",
};

export default async function ListsPage() {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";
  const playlists = await fetchChannelPlaylistsWithFallback(channelId);

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
