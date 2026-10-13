"use client";
import React from "react";
import Image from "next/image";
import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import type { Playlist } from "@/lib/playlists.types";

interface PlaylistCardProps {
  playlist: Playlist;
  isActive: boolean;
  onClick: () => void;
  showSourceBadge?: boolean;
}

const BADGE_COLOR: Record<Playlist["source"], string> = {
  youtube: "bg-red-600",
  spotify: "bg-[#1DB954]",
  mtg: "bg-purple-600",
};

function itemCountLabel(playlist: Playlist): string {
  switch (playlist.source) {
    case "youtube":
      return `${playlist.videoCount} videos`;
    case "spotify":
      return `${playlist.trackCount} tracks`;
    case "mtg":
      return `${playlist.cardCount} cards`;
  }
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  isActive,
  onClick,
  showSourceBadge = false,
}) => {
  const thumbnail = playlist.thumbnailUrl;
  const isExternal = playlist.source === "mtg";
  const HoverIcon = isExternal ? ArrowTopRightOnSquareIcon : PlayIcon;

  const containerClass = `group relative text-left block w-full rounded-xl overflow-hidden bg-[#181818] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
    isActive ? "ring-2 ring-primary-500" : "hover:bg-[#1f1f1f]"
  }`;

  const content = (
    <>
      <div className="relative w-full aspect-video bg-black">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={playlist.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[#33353F] flex items-center justify-center">
            <span className="text-white/40 text-3xl font-bold">
              {playlist.title.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <HoverIcon
            className={`h-12 w-12 text-white drop-shadow-lg transition-opacity duration-300 ${
              isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            }`}
          />
        </div>
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {itemCountLabel(playlist)}
        </span>
        {showSourceBadge && (
          <span
            className={`absolute top-2 left-2 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
              BADGE_COLOR[playlist.source]
            }`}
          >
            {playlist.source}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-white text-lg font-semibold line-clamp-2">{playlist.title}</h3>
        {playlist.description && (
          <p className="text-[#ADB7BE] text-sm line-clamp-2 mt-1">{playlist.description}</p>
        )}
      </div>

      {isActive && (
        <ChevronUpIcon className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 text-primary-500 bg-[#121212] rounded-full" />
      )}
    </>
  );

  // MTG decks have no inline player, so they open on Archidekt instead of expanding.
  if (playlist.source === "mtg") {
    return (
      <a
        href={playlist.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={containerClass}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={containerClass}
    >
      {content}
    </button>
  );
};

export default PlaylistCard;
