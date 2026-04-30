"use client";
import React from "react";

interface YouTubeEmbedProps {
  playlistId: string;
  videoId?: string;
  title: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ playlistId, videoId, title }) => {
  const params = new URLSearchParams({ list: playlistId, rel: "0", modestbranding: "1" });
  const src = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;

  return (
    <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full border-0"
      />
    </div>
  );
};

export default YouTubeEmbed;
