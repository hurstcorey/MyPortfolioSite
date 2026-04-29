"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCarouselProps {
  playlists: Playlist[];
}

const DRAG_THRESHOLD_PX = 5;

const PlaylistCarousel: React.FC<PlaylistCarouselProps> = ({ playlists }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    movedDistance: 0,
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scrollByViewport = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 0.8 * el.clientWidth, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      movedDistance: 0,
    };
    el.classList.add("cursor-grabbing");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag.isDragging) return;
    const dx = e.clientX - drag.startX;
    drag.movedDistance = Math.max(drag.movedDistance, Math.abs(dx));
    el.scrollLeft = drag.startScrollLeft - dx;
  };

  const endDrag = () => {
    const el = scrollRef.current;
    if (el) el.classList.remove("cursor-grabbing");
    dragRef.current.isDragging = false;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current.movedDistance > DRAG_THRESHOLD_PX) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.movedDistance = 0;
    }
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByViewport(-1)}
          aria-label="Scroll playlists left"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByViewport(1)}
          aria-label="Scroll playlists right"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth cursor-grab"
        role="region"
        aria-label="Playlists"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
      >
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
      </div>
    </div>
  );
};

export default PlaylistCarousel;
