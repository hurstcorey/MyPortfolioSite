"use client";
import React from "react";
import type { ActiveSource } from "@/lib/playlists.sort";

interface SourceTabsProps {
  active: ActiveSource;
  counts: { all: number; youtube: number; spotify: number };
  onChange: (next: ActiveSource) => void;
}

const TABS: Array<{ key: ActiveSource; label: string }> = [
  { key: "all", label: "All" },
  { key: "youtube", label: "YouTube" },
  { key: "spotify", label: "Spotify" },
];

const SourceTabs: React.FC<SourceTabsProps> = ({ active, counts, onChange }) => {
  return (
    <div
      role="tablist"
      aria-label="Playlist source"
      className="flex justify-center gap-2 mb-6"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary-500 text-white"
                : "bg-[#181818] text-[#ADB7BE] hover:bg-[#222] hover:text-white"
            }`}
          >
            {tab.label}{" "}
            <span className={isActive ? "opacity-80" : "opacity-60"}>
              ({counts[tab.key]})
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SourceTabs;
