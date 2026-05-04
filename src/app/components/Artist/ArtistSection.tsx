import React from "react";
import SoundCloudEmbed from "./SoundCloudEmbed";
import FlowMusicPlayer from "./FlowMusicPlayer";

const SOUNDCLOUD_PROFILE = "https://soundcloud.com/user-878079272";

const ArtistSection = () => {
  return (
    <section id="artist" className="my-12 py-8">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-4">
        Artist
      </h2>
      <p className="text-center text-[#ADB7BE] max-w-2xl mx-auto mb-12">
        A small corner of the portfolio for the music side of things — original
        tracks on SoundCloud, plus an experimental player built around clips
        produced with Google&apos;s Flow Music.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">SoundCloud</h3>
          <SoundCloudEmbed
            profileUrl={SOUNDCLOUD_PROFILE}
            title="Corey Hurst on SoundCloud"
            height={720}
            visual={true}
            color="14b8a6"
          />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Neural Link — Flow Music
          </h3>
          <FlowMusicPlayer />
        </div>
      </div>
    </section>
  );
};

export default ArtistSection;
