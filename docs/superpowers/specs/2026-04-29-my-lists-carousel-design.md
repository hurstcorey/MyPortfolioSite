# My Lists Carousel — Design Spec

**Date:** 2026-04-29
**Branch:** `feature/youtube-playlists-design`
**Status:** Approved (verbal)

## Problem

The home page currently has a 4-card grid preview of YouTube playlists, and a separate `/lists` page that holds the rich browsing experience (search, inline expand player, etc.). The Navbar's **Lists** button links to `/lists`. We want the **Lists** nav button to instead scroll the user to a new "My Lists" section on the home page, where all playlists are displayed in a horizontal-scroll carousel they can drag through.

## Goals

- Replace the static 4-card grid on the home page with a draggable horizontal carousel that surfaces **all** playlists.
- Make the **Lists** nav button anchor to the home-page section instead of routing to `/lists`.
- Keep `/lists` as the "View all" destination — same rich UX (search, inline expand player) it currently has.
- Cover all input modalities: mouse drag, touch swipe (native), keyboard navigation.

## Non-Goals

- No changes to the `/lists` page itself.
- No changes to the data layer (`src/lib/youtube.ts`), API route, or snapshot script.
- No new tests — the carousel is visual/interactive; existing data-layer tests still cover the contract.
- No scroll-snap (deferred — adds complexity for marginal polish).

## User Decisions

- **`/lists` page:** Keep it as the "View all" destination.
- **Card click behavior:** Navigate to `/lists#<playlistId>` (no inline expand on home).
- **Carousel interactions:** Drag + visible chevron buttons.
- **Playlist count:** All playlists shown in the carousel.

## Architecture

### Component Tree (after changes)

```
src/app/page.tsx (server)
└── ListsPreview (server, async, existing)
    ├── <h2>My Playlists</h2>
    ├── PlaylistCarousel (NEW, client)
    │   ├── chevron-left button
    │   ├── scroll rail (overflow-x: auto)
    │   │   └── for each playlist:
    │   │       <Link href="/lists#<id>">
    │   │         visual card (thumbnail + title + desc + count badge)
    │   │       </Link>
    │   └── chevron-right button
    └── <Link href="/lists">View all playlists →</Link>
```

### Files to Modify

- `src/app/components/Navigation/Navbar.tsx` — change `Lists` nav entry's `path` from `/lists` to `/#lists`.
- `src/app/components/Lists/ListsPreview.tsx` — replace the 4-card grid with `<PlaylistCarousel playlists={playlists} />`. Drop the 4-card limit (`PREVIEW_COUNT = 4` and `slice(0, PREVIEW_COUNT)`); pass all playlists, sorted by `publishedAt` desc.
- `src/app/components/Lists/PlaylistCarousel.tsx` — **new** client component. Owns scroll state and chevron logic.

### Files Unchanged

- `src/app/lists/page.tsx`, `src/app/lists/loading.tsx`, `src/app/lists/error.tsx`
- `app/lists/page.tsx`, `app/lists/loading.tsx`, `app/lists/error.tsx` (proxies)
- `src/app/components/Lists/ListsGrid.tsx`, `PlaylistCard.tsx`, `PlaylistDetail.tsx`, `PlaylistSearchBar.tsx`, `YouTubeEmbed.tsx`
- `src/app/api/youtube/playlist/[id]/route.tsx` (and proxy)
- `src/lib/youtube.ts`, `src/lib/youtube.types.ts`
- `data/playlists-snapshot.json`

## Component Design

### `PlaylistCarousel` (new, client)

**Props:**
```ts
interface PlaylistCarouselProps {
  playlists: Playlist[];
}
```

**Internal state:**
- `scrollRef: RefObject<HTMLDivElement>` — the scrollable rail.
- `canScrollLeft: boolean`, `canScrollRight: boolean` — drives chevron visibility/disabled state.
- `dragState: { isDragging: boolean; startX: number; startScrollLeft: number; movedDistance: number; }` — managed via refs (no re-renders during drag).

**Layout:**
- Outer container: `relative` positioning so chevrons can absolute-position over the edges.
- Scroll rail: `flex overflow-x-auto gap-4 scroll-smooth scrollbar-none cursor-grab` (uses Tailwind utilities; native scrollbar hidden via custom CSS or arbitrary value).
- Each card: `flex-none w-[260px] md:w-[280px]` — fixed width prevents flex from collapsing the rail.

**Chevron behavior:**
- Left chevron: hidden when `canScrollLeft === false` (scrollLeft <= 0).
- Right chevron: hidden when `canScrollRight === false` (scrollLeft + clientWidth >= scrollWidth - 1; the `-1` absorbs subpixel rounding).
- Click → `scrollBy({ left: ±0.8 * clientWidth, behavior: "smooth" })`.
- Edge state recomputed on `scroll`, `resize`, and after the chevron click settles.

**Drag behavior:**
- `onMouseDown` → record `startX = e.clientX`, `startScrollLeft = scrollRef.current.scrollLeft`, `isDragging = true`, `movedDistance = 0`. Add `cursor-grabbing` class.
- `onMouseMove` → if dragging, set `scrollLeft = startScrollLeft - (e.clientX - startX)` and accumulate `movedDistance`.
- `onMouseUp` / `onMouseLeave` → end drag.
- Card click suppression: if `movedDistance > 5px` at mouseup, the next click event on a child `<Link>` is suppressed via `e.preventDefault()` in a one-shot click handler. Otherwise the click navigates normally.

**Card content (inlined inside `<Link>`):**
- Same visual structure as the current `ListsPreview` link cards — `<Image>` thumbnail, `videoCount` badge, title (line-clamp-2), description (line-clamp-2). No `onClick`, no client-component dependency on `PlaylistCard`.
- `draggable={false}` on the `<Image>` to prevent native image-drag from hijacking the carousel drag.

**Keyboard / a11y:**
- Chevrons are real `<button>` elements with `aria-label="Scroll playlists left"` / `right`. Focusable, Enter/Space activate.
- Cards are `<Link>` — natural tab order, Enter navigates.
- The scroll rail itself has `role="region" aria-label="Playlists"` and `tabIndex={0}` so keyboard users can focus it and use arrow keys (browser-native horizontal scroll on a focused scrollable region).

### `ListsPreview` (modified)

**Before:** Grid of 4 cards (most recent by `publishedAt`).

**After:** All playlists sorted by `publishedAt` desc, passed to `<PlaylistCarousel>`.

**Section ID:** `id="lists"` stays (already present), so `/#lists` anchors here.

**"View all" link:** Unchanged — centered below the carousel, points to `/lists`.

### `Navbar` (modified)

Change the single line:
```ts
{ title: "Lists", path: "/lists" }
```
to
```ts
{ title: "Lists", path: "/#lists" }
```

When the user is already on `/`, the existing in-page anchor scroll behavior handles navigation. When on `/lists` itself, this link still navigates back to home and scrolls to the section.

## Data Flow

1. Server: `ListsPreview` calls `fetchChannelPlaylistsWithFallback(channelId)` (unchanged).
2. Server: sorts by `publishedAt` desc, passes the full array to `<PlaylistCarousel>`.
3. Client: `PlaylistCarousel` renders the static rail. No client-side data fetching.
4. Click → `<Link>` navigates to `/lists#<id>`. The `/lists` page handles deep-link scroll and the rich expand UX.

## Error & Edge Cases

- **Empty playlists array:** `ListsPreview` already returns `null` if there are no playlists. Carousel never renders.
- **Single playlist:** Carousel renders one card. Both chevrons hidden (`canScrollLeft=false`, `canScrollRight=false`). Drag is a no-op.
- **Image load failure:** `playlist.thumbnailUrl === ''` falls back to a neutral gray block (existing pattern in `ListsPreview`).
- **Mobile:** Native horizontal touch scroll works without any of the mouse-drag JS. Chevrons are still visible and functional via tap.
- **Reduced motion:** `scroll-smooth` Tailwind utility maps to `scroll-behavior: smooth`, which the user agent honors `prefers-reduced-motion` settings for. Chevron clicks will jump rather than animate when reduced motion is set — acceptable.

## Testing

- **No new vitest coverage.** The carousel is interactive UI; it adds no business logic. Following the project's existing convention (vitest covers `lib/` and API routes, not components).
- **Manual verification (covered by Task 20 of the parent plan):** drag, click, chevrons, keyboard tab, mobile touch, deep-link to `/lists#<id>`.

## Risks

- **Drag-vs-click suppression** has a known UX trap: if `movedDistance` threshold is too low, accidental microscopic drags eat clicks; if too high, clicks at the end of a drag fire when the user expected to be navigating manually. Threshold ~5px is the industry default and works.
- **Hidden scrollbar styling** can need vendor prefixes (`scrollbar-width: none` for Firefox, `::-webkit-scrollbar { display: none }` for WebKit). Use a small inline style block or a global utility class — don't reach for a Tailwind plugin for one-off use.
- **Focus rings** on `<Link>`-as-card need to be visible; current preview cards rely on default browser focus styles. Carousel cards should preserve that — no `outline: none` shortcuts.

## Out of Scope

- Scroll-snap.
- Auto-scroll/marquee animation.
- "View all" appearing as the trailing card of the carousel (stays as separate centered link below).
- Search bar in the home-page section (search lives on `/lists`).
- Inline expand/play on the home page (deliberately rejected to keep one canonical place for that UX).
