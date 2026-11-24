"use client";
import React, { useState } from "react";
import Image from "next/image";
import { formatUsd, listingUrl } from "@/lib/tavern";
import type { TavernItem } from "@/lib/tavern.types";

const TavernCard = ({ item }: { item: TavernItem }) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <a
      href={listingUrl(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden bg-[#181818] ring-1 ring-[#33353F] transition-all duration-300 group-hover:ring-primary-500 group-hover:-translate-y-1">
        {item.imageUrl && !imageFailed ? (
          <Image
            src={item.imageUrl}
            alt={`${item.name} from ${item.setName}`}
            fill
            sizes="200px"
            className="object-cover"
            onError={() => setImageFailed(true)}
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[#33353F]" />
        )}
        {item.finish === "foil" && (
          <span className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-medium px-2 py-1 rounded">
            Foil
          </span>
        )}
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {formatUsd(item.listPrice)}
        </span>
      </div>

      <h3 className="text-white text-sm md:text-base font-semibold mt-3 line-clamp-2 group-hover:text-primary-500 transition-colors duration-300">
        {item.name}
      </h3>
      <p className="text-[#ADB7BE] text-xs md:text-sm mt-1 line-clamp-1">
        {item.setName}
      </p>
    </a>
  );
};

export default TavernCard;
