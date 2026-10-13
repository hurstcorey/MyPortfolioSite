"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlaylistCard from "./PlaylistCard";
import PlaylistDetail from "./PlaylistDetail";
import PlaylistSearchBar from "./PlaylistSearchBar";
import SourceTabs, { SOURCE_TABS } from "./SourceTabs";
import { sortPlaylists, type ActiveSource } from "@/lib/playlists.sort";
import type { ExpandablePlaylist, Playlist } from "@/lib/playlists.types";

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
  const [activeSource, setActiveSource] = useState<ActiveSource>("all");
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";

  const counts = useMemo(() => {
    const out = {} as Record<ActiveSource, number>;
    for (const tab of SOURCE_TABS) {
      out[tab.key] =
        tab.key === "all"
          ? playlists.length
          : playlists.filter((p) => p.source === tab.key).length;
    }
    return out;
  }, [playlists]);

  // Hash precedence: known source values set the tab; otherwise treat as
  // playlist ID and set both the matching tab and the active card.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const tab = SOURCE_TABS.find((t) => t.key === hash);
    if (tab) {
      setActiveSource(tab.key);
      return;
    }
    const match = playlists.find((p) => p.id === hash);
    if (match) {
      setActiveSource(match.source);
      // MTG decks link out instead of expanding, so only the tab is selected.
      if (match.source !== "mtg") setActiveId(match.id);
    }
  }, [playlists]);

  const handleSourceChange = (next: ActiveSource) => {
    setActiveSource(next);
    setActiveId(null);
    if (typeof window !== "undefined") {
      // Use replaceState so the tab change doesn't pollute browser history.
      const url = `${window.location.pathname}#${next}`;
      window.history.replaceState(null, "", url);
    }
  };

  const filtered = useMemo(() => {
    const sourceFiltered =
      activeSource === "all"
        ? playlists
        : playlists.filter((p) => p.source === activeSource);

    const q = query.trim().toLowerCase();
    const queryFiltered = q
      ? sourceFiltered.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
      : sourceFiltered;

    return sortPlaylists(queryFiltered, activeSource);
  }, [playlists, query, activeSource]);

  const rows = useMemo(() => chunk(filtered, COLS_MD), [filtered]);

  const handleCardClick = (playlistId: string) => {
    setActiveId((prev) => (prev === playlistId ? null : playlistId));
  };

  const activePlaylist: ExpandablePlaylist | null =
    activeId !== null
      ? (filtered.find(
          (p): p is ExpandablePlaylist => p.id === activeId && p.source !== "mtg",
        ) ?? null)
      : null;

  const activeTabLabel =
    SOURCE_TABS.find((t) => t.key === activeSource)?.label ?? "";

  return (
    <section id="lists">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Lists
      </h2>

      <SourceTabs active={activeSource} counts={counts} onChange={handleSourceChange} />

      <div className="flex justify-center mb-8">
        <PlaylistSearchBar value={query} onChange={setQuery} />
      </div>

      {filtered.length === 0 && query !== "" && (
        <p className="text-center text-[#ADB7BE]">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      )}

      {filtered.length === 0 && query === "" && activeSource !== "all" && (
        <p className="text-center text-[#ADB7BE]">
          Couldn&apos;t load {activeTabLabel} right now.
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
                      showSourceBadge={activeSource === "all"}
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
