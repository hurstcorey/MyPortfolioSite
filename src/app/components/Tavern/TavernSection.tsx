import React from "react";
import Image from "next/image";
import TavernInventory from "./TavernInventory";
import {
  getSnapshotDate,
  getTavernInventory,
  listingsUrl,
  STOREFRONT_URL,
  STORE_NAME,
} from "@/lib/tavern";

const TavernSection = () => {
  const items = getTavernInventory();
  if (items.length === 0) return null;

  const asOf = new Date(getSnapshotDate()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <section id="tavern" className="my-12">
      <a
        href={STOREFRONT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full overflow-hidden ring-1 ring-[#33353F] hover:ring-primary-500 transition-all duration-300"
      >
        <Image
          src="/images/tavern/tabletop-tavern-logo.png"
          alt={`${STORE_NAME} logo`}
          width={112}
          height={112}
          className="w-full h-full object-cover"
        />
      </a>
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-2">
        {STORE_NAME}
      </h2>
      <p className="text-center text-[#ADB7BE] mb-8 md:mb-12">
        My online trading card shop on TCGplayer. {items.length} singles in stock
        right now. Click any card to buy it from the store.
      </p>

      <TavernInventory items={items} />

      <div className="text-center mt-8">
        <a
          href={listingsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary-500 hover:underline font-semibold"
        >
          Shop the full store on TCGplayer →
        </a>
        <p className="text-[#ADB7BE] text-xs mt-2">
          Inventory and prices as of {asOf}. TCGplayer has the live listings.
        </p>
      </div>
    </section>
  );
};

export default TavernSection;
