"use client";
import React from "react";

interface SpotifyEmbedProps {
  embedUrl: string;
  title?: string;
}

const SpotifyEmbed: React.FC<SpotifyEmbedProps> = ({ embedUrl, title = "Spotify player" }) => {
  return (
    <div className="w-full rounded-lg overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className="w-full h-[420px] border-0"
      />
    </div>
  );
};

export default SpotifyEmbed;
