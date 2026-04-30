"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import YouTubeEmbed from "./YouTubeEmbed";
import type { Playlist, PlaylistVideo } from "@/lib/youtube.types";

interface PlaylistDetailProps {
  playlist: Playlist;
  channelId: string;
}

const PlaylistDetail: React.FC<PlaylistDetailProps> = ({ playlist, channelId }) => {
  const [videos, setVideos] = useState<PlaylistVideo[] | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setVideos(null);
    setActiveVideoId(undefined);

    fetch(`/api/youtube/playlist/${playlist.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { videos: PlaylistVideo[] }) => {
        if (!cancelled) setVideos(data.videos);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load videos");
      });

    return () => {
      cancelled = true;
    };
  }, [playlist.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, [playlist.id]);

  const subscribeUrl = `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`;
  const saveToLibraryUrl = `https://www.youtube.com/playlist?list=${playlist.id}`;

  return (
    <div
      ref={containerRef}
      className="col-span-full bg-[#181818] rounded-xl p-6 md:p-8 my-2 scroll-mt-32"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <YouTubeEmbed
            playlistId={playlist.id}
            videoId={activeVideoId}
            title={playlist.title}
          />
        </div>

        <div className="md:col-span-1 flex flex-col min-h-0">
          <h3 className="text-white text-xl font-bold mb-2">{playlist.title}</h3>
          <p className="text-[#ADB7BE] text-sm mb-4 line-clamp-3">{playlist.description}</p>

          {error && (
            <div className="text-red-400 text-sm">
              Couldn&apos;t load videos: {error}
            </div>
          )}

          {!videos && !error && (
            <div className="text-[#ADB7BE] text-sm">Loading videos…</div>
          )}

          {videos && (
            <ul className="overflow-y-auto max-h-[420px] space-y-2 pr-2">
              {videos.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActiveVideoId(v.id)}
                    className={`w-full text-left flex gap-3 p-2 rounded-lg transition-colors ${
                      activeVideoId === v.id ? "bg-[#33353F]" : "hover:bg-[#222]"
                    }`}
                  >
                    <div className="relative w-24 aspect-video flex-shrink-0 bg-black rounded overflow-hidden">
                      {v.thumbnailUrl && (
                        <Image
                          src={v.thumbnailUrl}
                          alt={v.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <span className="text-white text-sm line-clamp-2">{v.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[#33353F]">
        <Link
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          Subscribe to channel
        </Link>
        <Link
          href={saveToLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#33353F] hover:bg-[#444] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <BookmarkIcon className="h-4 w-4" />
          Save playlist to library
        </Link>
      </div>
    </div>
  );
};

export default PlaylistDetail;
