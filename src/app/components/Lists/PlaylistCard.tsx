"use client";
import React from "react";
import Image from "next/image";
import { ChevronUpIcon, PlayIcon } from "@heroicons/react/24/solid";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCardProps {
  playlist: Playlist;
  isActive: boolean;
  onClick: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`group relative text-left w-full rounded-xl overflow-hidden bg-[#181818] transition-all duration-300 ${
        isActive ? "ring-2 ring-primary-500" : "hover:bg-[#1f1f1f]"
      }`}
    >
      <div className="relative w-full aspect-video bg-black">
        {playlist.thumbnailUrl ? (
          <Image
            src={playlist.thumbnailUrl}
            alt={playlist.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[#33353F]" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <PlayIcon
            className={`h-12 w-12 text-white drop-shadow-lg transition-opacity duration-300 ${
              isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            }`}
          />
        </div>
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {playlist.videoCount} videos
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-white text-lg font-semibold line-clamp-2">{playlist.title}</h3>
        <p className="text-[#ADB7BE] text-sm line-clamp-2 mt-1">{playlist.description}</p>
      </div>

      {isActive && (
        <ChevronUpIcon className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 text-primary-500 bg-[#121212] rounded-full" />
      )}
    </button>
  );
};

export default PlaylistCard;
