"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlaylistCard from "./PlaylistCard";
import PlaylistDetail from "./PlaylistDetail";
import PlaylistSearchBar from "./PlaylistSearchBar";
import type { Playlist } from "@/lib/youtube.types";

interface ListsGridProps {
  playlists: Playlist[];
}

const COLS_MD = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const ListsGrid: React.FC<ListsGridProps> = ({ playlists }) => {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && playlists.some((p) => p.id === hash)) {
      setActiveId(hash);
    }
  }, [playlists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [playlists, query]);

  const rows = useMemo(() => chunk(filtered, COLS_MD), [filtered]);

  const handleCardClick = (playlistId: string) => {
    setActiveId((prev) => (prev === playlistId ? null : playlistId));
  };

  const activePlaylist =
    activeId !== null ? filtered.find((p) => p.id === activeId) ?? null : null;

  return (
    <section id="lists">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <div className="flex justify-center mb-8">
        <PlaylistSearchBar value={query} onChange={setQuery} />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[#ADB7BE]">
          No playlists match &ldquo;{query}&rdquo;.
        </p>
      )}

      <div className="space-y-8">
        {rows.map((row, rowIdx) => {
          const activeIsInRow = activePlaylist
            ? row.some((p) => p.id === activePlaylist.id)
            : false;

          return (
            <React.Fragment key={`row-${rowIdx}`}>
              <AnimatePresence initial={false}>
                {activeIsInRow && activePlaylist && (
                  <motion.div
                    key={`detail-${activePlaylist.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <PlaylistDetail playlist={activePlaylist} channelId={channelId} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {row.map((playlist) => (
                  <div key={playlist.id} id={playlist.id}>
                    <PlaylistCard
                      playlist={playlist}
                      isActive={activeId === playlist.id}
                      onClick={() => handleCardClick(playlist.id)}
                    />
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default ListsGrid;
