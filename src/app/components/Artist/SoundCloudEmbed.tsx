"use client";
import React from "react";

interface SoundCloudEmbedProps {
  profileUrl: string;
  title?: string;
  height?: number;
  visual?: boolean;
  color?: string;
}

const SoundCloudEmbed: React.FC<SoundCloudEmbedProps> = ({
  profileUrl,
  title = "SoundCloud player",
  height = 450,
  visual = false,
  color = "ff5500",
}) => {
  const params = new URLSearchParams({
    url: profileUrl,
    color: `#${color}`,
    auto_play: "false",
    hide_related: "false",
    show_comments: "true",
    show_user: "true",
    show_reposts: "false",
    show_teaser: "true",
    visual: visual ? "true" : "false",
  });

  const src = `https://w.soundcloud.com/player/?${params.toString()}`;

  return (
    <div
      className="w-full rounded-lg overflow-hidden bg-black"
      style={{ height }}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="autoplay"
        scrolling="no"
        frameBorder="no"
        className="w-full h-full border-0"
      />
    </div>
  );
};

export default SoundCloudEmbed;
