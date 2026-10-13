"use client";
import React, { useState } from "react";
import Image from "next/image";
import type { MtgDeck } from "@/lib/archidekt.types";

const DeckCard = ({ deck }: { deck: MtgDeck }) => {
  // The full card image is derived from the art crop, so fall back to the crop
  // if Archidekt does not have that size for a given printing.
  const [src, setSrc] = useState(deck.cardImageUrl || deck.artCropUrl);

  return (
    <a
      href={deck.deckUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden bg-[#181818] ring-1 ring-[#33353F] transition-all duration-300 group-hover:ring-primary-500 group-hover:-translate-y-1">
        {src ? (
          <Image
            src={src}
            alt={`Commander for ${deck.name}`}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
            onError={() => setSrc(deck.artCropUrl)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[#33353F]" />
        )}
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {deck.size} cards
        </span>
      </div>

      <h3 className="text-white text-sm md:text-base font-semibold mt-3 line-clamp-2 group-hover:text-primary-500 transition-colors duration-300">
        {deck.name}
      </h3>
    </a>
  );
};

export default DeckCard;
