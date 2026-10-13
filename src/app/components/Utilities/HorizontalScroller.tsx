"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

interface HorizontalScrollerProps {
  ariaLabel: string;
  children: React.ReactNode;
}

const DRAG_THRESHOLD_PX = 5;

const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({
  ariaLabel,
  children,
}) => {
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
          aria-label={`Scroll ${ariaLabel.toLowerCase()} left`}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByViewport(1)}
          aria-label={`Scroll ${ariaLabel.toLowerCase()} right`}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth cursor-grab"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalScroller;
