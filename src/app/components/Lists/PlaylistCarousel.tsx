"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import HorizontalScroller from "../Utilities/HorizontalScroller";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCarouselProps {
  playlists: Playlist[];
}

const PlaylistCarousel: React.FC<PlaylistCarouselProps> = ({ playlists }) => {
  return (
    <HorizontalScroller ariaLabel="Playlists">
      {playlists.map((playlist) => (
        <Link
          key={playlist.id}
          href={`/lists#${playlist.id}`}
          className="group flex-none w-[260px] md:w-[280px] rounded-xl overflow-hidden bg-[#181818] hover:bg-[#1f1f1f] transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <div className="relative w-full aspect-video bg-black">
            {playlist.thumbnailUrl ? (
              <Image
                src={playlist.thumbnailUrl}
                alt={playlist.title}
                fill
                sizes="280px"
                className="object-cover"
                unoptimized
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-[#33353F]" />
            )}
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {playlist.videoCount} videos
            </span>
          </div>
          <div className="p-4">
            <h3 className="text-white text-base font-semibold line-clamp-2">{playlist.title}</h3>
            <p className="text-[#ADB7BE] text-sm line-clamp-2 mt-1">{playlist.description}</p>
          </div>
        </Link>
      ))}
    </HorizontalScroller>
  );
};

export default PlaylistCarousel;
