# My Lists Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commit policy:** This project's standing rule is no auto-commits. The executor MUST request explicit user authorization before running any `git commit` step, unless the user has authorized continuous commits at the start of execution.

**Goal:** Replace the 4-card grid in the home-page "My Playlists" section with a horizontal-scroll carousel that surfaces all playlists with mouse-drag, touch-swipe, and chevron-button navigation; redirect the Navbar **Lists** link from `/lists` to the home anchor `/#lists`.

**Architecture:** The existing server component `ListsPreview` keeps fetching playlists via `fetchChannelPlaylistsWithFallback` and now passes the full sorted array to a new client component `PlaylistCarousel`, which owns scroll state, drag handling, and chevron edge detection. Cards are inlined inside `<Link>` elements (no `onClick` boundary crossing) and navigate to `/lists#<id>`.

**Tech Stack:** Next.js 14 App Router, React 18 client components with `"use client"`, Tailwind CSS, `next/image`, `next/link`, Heroicons. No new dependencies. No new vitest tests (interactive UI; existing data-layer tests still cover the contract).

**Spec:** `docs/superpowers/specs/2026-04-29-my-lists-carousel-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/app/components/Lists/PlaylistCarousel.tsx` | Create | Client component owning the scroll rail, drag state, and chevron buttons. Renders `<Link>`-wrapped cards. |
| `src/app/components/Lists/ListsPreview.tsx` | Modify | Drop the 4-card slice; sort all playlists by `publishedAt` desc; pass to `<PlaylistCarousel>`. Keep heading and "View all" link. |
| `src/app/components/Navigation/Navbar.tsx` | Modify | Change `Lists` nav entry's `path` from `/lists` to `/#lists`. |
| `src/app/globals.css` | Modify | Add a `.no-scrollbar` utility class to hide the horizontal scrollbar cross-browser. |

---

### Task 1: Add `.no-scrollbar` utility class

**Why first:** The carousel needs a way to hide the native horizontal scrollbar without using a Tailwind plugin. A small global utility is the lightest touch.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read the current globals.css**

Run: `cat src/app/globals.css | head -40`
Note the existing structure (Tailwind directives + any custom CSS) so the new rule fits the existing style.

- [ ] **Step 2: Append the utility class**

Append to `src/app/globals.css`:

```css

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3: Run lint to verify nothing else broke**

Run: `pnpm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 4: Commit (request authorization first)**

```bash
git add src/app/globals.css
git commit -m "feat(lists): add .no-scrollbar utility for horizontal carousels"
```

---

### Task 2: Create `PlaylistCarousel` skeleton (rail + cards, no interactivity)

**Files:**
- Create: `src/app/components/Lists/PlaylistCarousel.tsx`

- [ ] **Step 1: Create the file with the visual skeleton**

```tsx
"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCarouselProps {
  playlists: Playlist[];
}

const PlaylistCarousel: React.FC<PlaylistCarouselProps> = ({ playlists }) => {
  return (
    <div className="relative">
      <div
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth"
        role="region"
        aria-label="Playlists"
        tabIndex={0}
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
```

- [ ] **Step 2: Run lint and type-check**

Run: `pnpm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 3: Commit (request authorization first)**

```bash
git add src/app/components/Lists/PlaylistCarousel.tsx
git commit -m "feat(lists): add PlaylistCarousel skeleton (rail + cards, no interactivity)"
```

---

### Task 3: Wire `PlaylistCarousel` into `ListsPreview` (replaces 4-card grid)

**Why now:** Wiring it up at this stage gets the visual change in front of the user early — they can see the rail render with all playlists and provide feedback before drag/chevrons are added. The `ListsGrid` on `/lists` is unaffected.

**Files:**
- Modify: `src/app/components/Lists/ListsPreview.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import React from "react";
import Link from "next/link";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";
import PlaylistCarousel from "./PlaylistCarousel";
import type { Playlist } from "@/lib/youtube.types";

const ListsPreview = async () => {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) return null;

  let playlists: Playlist[] = [];
  try {
    playlists = await fetchChannelPlaylistsWithFallback(channelId);
  } catch {
    return null;
  }

  const sorted = [...playlists].sort((a, b) =>
    b.publishedAt > a.publishedAt ? 1 : -1,
  );

  if (sorted.length === 0) return null;

  return (
    <section id="lists" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <PlaylistCarousel playlists={sorted} />

      <div className="text-center mt-8">
        <Link
          href="/lists"
          className="inline-flex items-center gap-2 text-primary-500 hover:underline font-semibold"
        >
          View all playlists →
        </Link>
      </div>
    </section>
  );
};

export default ListsPreview;
```

- [ ] **Step 2: Run lint and tests**

Run: `pnpm run lint && pnpm run test`
Expected: `✔ No ESLint warnings or errors` and `Tests  11 passed (11)`.

- [ ] **Step 3: Commit (request authorization first)**

```bash
git add src/app/components/Lists/ListsPreview.tsx
git commit -m "feat(lists): use PlaylistCarousel for all playlists on home page"
```

---

### Task 4: Update Navbar `Lists` link to `/#lists`

**Files:**
- Modify: `src/app/components/Navigation/Navbar.tsx`

- [ ] **Step 1: Find the Lists nav entry**

Run: `grep -n '"Lists"' src/app/components/Navigation/Navbar.tsx`
Expected: a single line showing the `{ title: "Lists", path: "/lists" }` entry inside the `navLinks` array.

- [ ] **Step 2: Edit the path**

Change the line from:
```ts
{ title: "Lists", path: "/lists" },
```
to:
```ts
{ title: "Lists", path: "/#lists" },
```

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 4: Commit (request authorization first)**

```bash
git add src/app/components/Navigation/Navbar.tsx
git commit -m "feat(nav): point Lists nav link to /#lists home anchor"
```

---

### Task 5: Add chevron buttons + edge-state detection

**Files:**
- Modify: `src/app/components/Lists/PlaylistCarousel.tsx`

- [ ] **Step 1: Replace the component with chevron-aware version**

```tsx
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCarouselProps {
  playlists: Playlist[];
}

const PlaylistCarousel: React.FC<PlaylistCarouselProps> = ({ playlists }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
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
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth"
        role="region"
        aria-label="Playlists"
        tabIndex={0}
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
```

- [ ] **Step 2: Run lint and tests**

Run: `pnpm run lint && pnpm run test`
Expected: lint clean, all 11 tests pass.

- [ ] **Step 3: Commit (request authorization first)**

```bash
git add src/app/components/Lists/PlaylistCarousel.tsx
git commit -m "feat(lists): add chevron buttons with edge-state detection to carousel"
```

---

### Task 6: Add mouse-drag scroll with click suppression

**Files:**
- Modify: `src/app/components/Lists/PlaylistCarousel.tsx`

- [ ] **Step 1: Replace the component with the drag-aware version**

```tsx
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
```

- [ ] **Step 2: Run lint and tests**

Run: `pnpm run lint && pnpm run test`
Expected: lint clean, all 11 tests pass.

- [ ] **Step 3: Commit (request authorization first)**

```bash
git add src/app/components/Lists/PlaylistCarousel.tsx
git commit -m "feat(lists): add mouse-drag scroll with click suppression to carousel"
```

---

### Task 7: Manual verification

**Files:** none modified.

- [ ] **Step 1: Production build (Docker)**

Run: `pnpm run docker:local`
Expected: build succeeds, container starts, "Ready in <ms>" appears in logs.

- [ ] **Step 2: Verify routes return 200**

Run:
```bash
curl -so /dev/null -w 'home: %{http_code}\n' http://localhost:3000
curl -so /dev/null -w 'lists: %{http_code}\n' http://localhost:3000/lists
```
Expected: `home: 200`, `lists: 200`.

- [ ] **Step 3: Browser checklist**

Open http://localhost:3000 in a desktop browser and verify:

1. Scroll to the "My Playlists" section. The cards render in a horizontal rail.
2. The right chevron is visible at rest; the left chevron is hidden.
3. Click the right chevron — the rail scrolls smoothly by ~80% of the visible width. Both chevrons are now visible.
4. Click the right chevron repeatedly until the end. Right chevron disappears at the end.
5. Click the left chevron — rail scrolls back. Left chevron disappears at the start.
6. Mouse-drag from inside a card across to the next card. The rail follows the mouse. On release, no navigation happens (drag-vs-click suppression).
7. Click a card without dragging. Page navigates to `/lists#<id>`. The `/lists` page renders with the matching playlist visible/active.
8. Tab through the page. Chevron buttons receive a focus ring; cards receive a focus ring; Enter on a focused card navigates to `/lists#<id>`.
9. Click the Navbar **Lists** link from the home page — page scrolls to the "My Playlists" section.
10. Navigate to `/lists`, then click the Navbar **Lists** link — returns to home and scrolls to the section.

- [ ] **Step 4: Mobile/touch sanity check**

Resize the browser to <768px width OR use device-toolbar emulation:
- Chevrons are hidden (the `hidden md:flex` classes).
- Native horizontal swipe scrolls the rail.
- Tap on a card navigates to `/lists#<id>`.

- [ ] **Step 5: If everything passes**

Stop the Docker container:
```bash
docker rm -f portfolio-local
```
Mark this plan complete. The branch is ready for the existing pending PR (Task 20 of the parent YouTube playlists plan).

---

## Self-Review

**Spec coverage:**
- "Replace 4-card grid with carousel showing all playlists" → Tasks 2, 3
- "Drag + chevron buttons" → Tasks 5, 6
- "Click navigates to `/lists#<id>`" → Task 2 (`<Link href="/lists#${playlist.id}">`)
- "Nav button anchors to `/#lists`" → Task 4
- "`/lists` page unchanged" → no task touches it
- "Hide scrollbar" → Task 1
- "Keyboard accessible" → Task 5 (real `<button>` chevrons; `tabIndex={0}` + `role="region"` on rail)
- "Drag-vs-click suppression at 5px threshold" → Task 6 (`DRAG_THRESHOLD_PX`)
- "Mobile native scroll" → Task 6 (chevrons hidden via `md:flex`; touch scroll comes free with `overflow-x-auto`)
- "Empty/single-playlist edge cases" → Task 3 (`if (sorted.length === 0) return null;`); Task 5 chevron-edge logic naturally hides both chevrons when there's nothing to scroll.

**Placeholder scan:** No TBD/TODO. Every code step shows the full file contents or the exact diff. Manual verification steps are explicit checklists.

**Type consistency:** `Playlist` imported from `@/lib/youtube.types` consistently in `PlaylistCarousel` and `ListsPreview`. `PlaylistCarouselProps` interface stays the same across Tasks 2, 5, 6. `scrollRef` typed `RefObject<HTMLDivElement>` consistently. `dragRef` shape (`isDragging`, `startX`, `startScrollLeft`, `movedDistance`) introduced once in Task 6.

No issues found.
