# YouTube Playlists Feature — Design

**Date:** 2026-04-28
**Status:** Approved, ready for implementation plan
**Scope:** Website feature only. The cron + S3 + transcripts archival pipeline is deferred to a separate brainstorm/spec.

## Summary

Add a YouTube playlist browsing experience to the portfolio site. Visitors get a "Lists" entry in the sticky navbar that routes to a dedicated `/lists` page showing every public playlist on the channel (`UCGAiBWuPb3WfFlmmnw_wbRw`). The home page also gets a small preview section linking to the full page. Users can search playlists by title/description, click a card to inline-expand an embedded YouTube player with the playlist's video list, and follow deep links to subscribe or save to their library.

## Goals

- Surface every public playlist on the channel with thumbnails, titles, video counts, and descriptions
- Provide a YouTube-like browse-and-watch experience without leaving the site
- Keep YouTube Data API quota usage low (well under the 10,000 unit/day free tier)
- Keep the YouTube API key server-only — never shipped to the browser
- Maintain the existing dark-themed look and Framer Motion feel of the rest of the site
- Provide a manual local snapshot mechanism so playlist metadata is preserved in git as a fallback (and a starting point for the future archival pipeline)

## Non-Goals (deferred)

- Scheduled cron archival of playlists/videos
- Transcript extraction or display
- S3 (or any external) storage of playlist data
- OAuth-based YouTube access (we use API-key-only access)
- Pagination beyond YouTube's `maxResults=50` per call (acceptable for v1; will add a `// TODO` if exceeded)

## Architecture

```
┌─ Server (Next.js App Router) ──────────────────────┐
│                                                    │
│  src/lib/youtube.ts        ◀──── reads YOUTUBE_API_KEY
│   ├─ fetchChannelPlaylists(channelId)              │
│   ├─ fetchPlaylistItems(playlistId)                │
│   ├─ readSnapshotFallback()                        │
│   └─ fetchChannelPlaylistsWithFallback()           │
│         │                                          │
│         │ fetch(..., { next: { revalidate: 3600 } })
│         ▼                                          │
│  Server Components:                                │
│   • src/app/page.tsx              → ListsPreview   │
│   • src/app/lists/page.tsx        → ListsPage      │
│   • src/app/api/youtube/playlist/[id]/route.tsx    │
│         │                                          │
│         │ props / JSON: Playlist[] / PlaylistVideo[]
└─────────┼──────────────────────────────────────────┘
          ▼
┌─ Browser (client) ─────────────────────────────────┐
│                                                    │
│  Client Components ("use client"):                 │
│   • ListsGrid    — owns search + expand state      │
│   • PlaylistCard — click to expand                 │
│   • PlaylistDetail — iframe player + video list    │
│   • PlaylistSearchBar — debounced filter input     │
│   • YouTubeEmbed — lazy iframe wrapper             │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ Local script (manual, run by Corey) ──────────────┐
│  scripts/snapshot-youtube.mjs                      │
│   $ pnpm run snapshot:youtube                      │
│   → writes data/playlists-snapshot.json (committed)│
└────────────────────────────────────────────────────┘
```

### Key invariants

- `YOUTUBE_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix). It is never imported by a `"use client"` file.
- `src/lib/youtube.ts` is the single point of contact with the YouTube API. Server components, the internal route, and the snapshot script all consume it.
- All YouTube response shapes are flattened to internal `Playlist` / `PlaylistVideo` types inside `lib/youtube.ts` and never escape.
- If the live YouTube fetch fails, `fetchChannelPlaylistsWithFallback` reads `data/playlists-snapshot.json` so the page still renders.

## Data Model

```ts
// src/lib/youtube.types.ts

export interface Playlist {
  id: string;                       // YouTube playlist ID
  title: string;
  description: string;
  videoCount: number;
  thumbnailUrl: string;             // medium-res, ~320×180
  publishedAt: string;              // ISO8601
  channelTitle: string;
}

export interface PlaylistVideo {
  id: string;                       // YouTube video ID
  title: string;
  description: string;
  thumbnailUrl: string;
  position: number;                 // 0-indexed within the playlist
  durationSeconds: number | null;   // null when not available
}
```

### Snapshot file shape

```json
{
  "snapshotAt": "2026-04-28T12:34:56.000Z",
  "channelId": "UCGAiBWuPb3WfFlmmnw_wbRw",
  "playlists": [
    { "id": "...", "title": "...", "description": "...", "videoCount": 12,
      "thumbnailUrl": "...", "publishedAt": "...", "channelTitle": "...",
      "videos": [{ "id": "...", "title": "...", "description": "...",
                   "thumbnailUrl": "...", "position": 0, "durationSeconds": 240 }]
    }
  ]
}
```

## YouTube API Surface

| Endpoint | When called | What we extract |
|----------|-------------|-----------------|
| `GET /playlists?channelId={CHANNEL_ID}&part=snippet,contentDetails&maxResults=50` | Server-side, on `/lists` and home renders (ISR 1h) | `id`, `snippet.title/description/thumbnails/publishedAt/channelTitle`, `contentDetails.itemCount` |
| `GET /playlistItems?playlistId={ID}&part=snippet,contentDetails&maxResults=50` | Internal route, when a playlist is expanded (ISR 1h) | Each item's `snippet.title/description/thumbnails/position`, `contentDetails.videoId` |
| `GET /videos?id={comma-list}&part=contentDetails` | Same expansion call, second hop, for durations | `contentDetails.duration` (ISO8601 → seconds) |

**Quota math:** Each call costs 1 unit. With ISR revalidating hourly, the playlist list costs 24 units/day. Each unique expanded playlist costs 2 units/hour at most (playlistItems + videos), batched across all visitors. Even with heavy traffic, daily usage stays in the low hundreds — well under the 10,000 unit/day free tier.

## Component Inventory

### New files

```
src/app/lists/
  page.tsx                          ← server component, route /lists, exports revalidate = 3600
  loading.tsx                       ← skeleton shimmer
  error.tsx                         ← graceful fallback when API + snapshot both fail

src/app/components/Lists/
  ListsPreview.tsx                  ← server fetch + client render, used on home page
  ListsGrid.tsx                     ← "use client" — full grid + search + expand
  PlaylistCard.tsx                  ← presentational; thumbnail + title + count
  PlaylistDetail.tsx                ← "use client" — embed player + video list + CTAs
  PlaylistSearchBar.tsx             ← "use client" — debounced controlled input
  YouTubeEmbed.tsx                  ← thin iframe wrapper, lazy + youtube-nocookie

src/lib/
  youtube.ts                        ← server-only API helpers + fallback wrapper
  youtube.types.ts                  ← Playlist / PlaylistVideo

src/app/api/youtube/playlist/[id]/
  route.tsx                         ← GET videos for one playlist on demand

scripts/
  snapshot-youtube.mjs              ← `pnpm run snapshot:youtube`

data/
  playlists-snapshot.json           ← committed; written by snapshot script
```

### Modified files

- `src/app/components/Navigation/Navbar.tsx` — add "Lists" nav link; prefix existing anchor links with `/`
- `src/app/page.tsx` — insert `<ListsPreview />` between `<ProjectsSection />` and `<EmailSection />`
- `package.json` — add `snapshot:youtube` script and `dotenv` devDependency
- `CLAUDE.md` — document new env vars and the snapshot script
- `README.md` — setup steps for the YouTube API key
- `.env.local.example` — new file documenting required env vars (no real values)

### Component responsibilities

- **`ListsPreview`** (server component wrapper) — fetches playlists server-side, slices the 4 most recent, renders a horizontal row of `PlaylistCard`s with a "View all playlists →" link to `/lists`. Cards in the preview are **non-expandable** (click routes to `/lists`).
- **`ListsGrid`** (client) — owns `searchQuery: string` and `expandedPlaylistId: string | null` state. Filters playlists client-side via `useMemo` over title + description (case-insensitive). Renders the grid in row-chunks; if the active playlist is in a row, emits a `PlaylistDetail` panel **above** that row.
- **`PlaylistCard`** — pure presentational. Shows thumbnail, title, video count, and a small "playing" indicator + upward caret when active. Visually mirrors the existing `ProjectCard` (rounded corners, `bg-[#181818]`, hover overlay).
- **`PlaylistDetail`** — when expanded, fetches videos via `GET /api/youtube/playlist/{id}` (only on first open), shows `YouTubeEmbed` on the left (or top on mobile), scrollable video list on the right (or below). Footer has two outbound CTAs: **Subscribe to channel** (`https://youtube.com/channel/{CHANNEL_ID}?sub_confirmation=1`) and **Save playlist to library** (`https://www.youtube.com/playlist?list={PLAYLIST_ID}`). Uses Framer Motion `<AnimatePresence>` for height/opacity transitions.
- **`PlaylistSearchBar`** — debounced ~150ms controlled input. Placeholder *"Search playlists…"*. Reuses the site's dark theme styling.
- **`YouTubeEmbed`** — `<iframe>` wrapper with `loading="lazy"`, `allowFullScreen`, `youtube-nocookie.com` privacy domain. Props: `playlistId` (required), `videoId` (optional, for re-targeting from the side list).

### Player behavior

- One playlist expanded at a time (`expandedPlaylistId` is a single string, not an array).
- Clicking a different playlist card collapses the previous one — its iframe unmounts and the video stops.
- Clicking a video in the side list updates the same embed's `videoId` prop. The iframe re-targets in place; no second player instance.
- YouTube's native player handles next/previous within a playlist (we hand it the `playlistId`).
- On expand, smoothly scroll the panel into the viewport via `scrollIntoView({ behavior: 'smooth', block: 'start' })` so the player anchors at the user's reading position.

### Internal route contract

```
GET /api/youtube/playlist/{id}
→ 200  { videos: PlaylistVideo[] }
→ 404  { error: "playlist_not_found" }
→ 502  { error: "youtube_api_error", detail: string }
```

Cache: `revalidate: 3600`.

## Routing & Navigation

### Updated nav links

```ts
const navLinks = [
  { title: "My Story", path: "/#mystory" },
  { title: "Engineer", path: "/#engineer" },
  { title: "Writer",   path: "/#writer" },
  { title: "Gamer",    path: "/#gamer" },
  { title: "Artist",   path: "/#artist" },
  { title: "Projects", path: "/#projects" },
  { title: "Lists",    path: "/lists" },        // NEW — full route
  { title: "Contact",  path: "/#contact" },
];
```

All anchor links are prefixed with `/` so they continue to work from `/lists`.

### Home page composition

```tsx
<HeroSection />
<AchievementsSection />
<AboutSection />
<ProjectsSection />
<ListsPreview />           // NEW
<EmailSection />
```

### `/lists` page

```tsx
export const revalidate = 3600;

export const metadata = {
  title: "Playlists | Corey Hurst",
  description: "YouTube playlists from my channel — gaming, dev, and more.",
};

export default async function ListsPage() {
  const playlists = await fetchChannelPlaylistsWithFallback(CHANNEL_ID);
  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <ListsGrid playlists={playlists} />
      </div>
      <Footer />
    </main>
  );
}
```

## Visual Layout

### `/lists` page — full

```
┌─────────────────────── Navbar ───────────────────────┐
└──────────────────────────────────────────────────────┘
   container mt-24 px-12 py-4
   ┌──────────────────────────────────────────────────┐
   │  My Playlists                              h2     │
   │  [🔍 Search playlists…             ]  search bar  │
   │                                                   │
   │  ┌────┐  ┌────┐  ┌────┐                          │
   │  │card│  │card│  │card│   row 1                  │
   │  └────┘  └────┘  └────┘                          │
   │                                                   │
   │  ┌─────────────────────────────────────────────┐ │
   │  │  PlaylistDetail (full width ABOVE row)      │ │
   │  │  ┌───────────────┐  ┌──────────────────┐   │ │
   │  │  │  iframe       │  │  video list      │   │ │
   │  │  │  16:9 player  │  │  scrollable      │   │ │
   │  │  └───────────────┘  └──────────────────┘   │ │
   │  │  [Subscribe to channel] [Save to library]   │ │
   │  └─────────────────────────────────────────────┘ │
   │                                                   │
   │  ┌────┐  ┌▼───┐  ┌────┐                          │
   │  │card│  │card│  │card│   row 2 (card 2 active)  │
   │  └────┘  └────┘  └────┘                          │
   │                                                   │
   │  ┌────┐  ┌────┐  ┌────┐                          │
   │  │card│  │card│  │card│   row 3                  │
   │  └────┘  └────┘  └────┘                          │
   └──────────────────────────────────────────────────┘
```

- Grid: `grid md:grid-cols-3 gap-8` (matches `ProjectsSection`)
- At `< md`: single-column; the side-by-side player+video-list stacks (player on top, video list below)
- Active card shows a small upward caret pointing at the panel above it

### Home page preview

```
┌──────────────────────── #lists ───────────────────────┐
│  My Playlists                                          │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐                       │
│  │card│  │card│  │card│  │card│   (4 most recent)    │
│  └────┘  └────┘  └────┘  └────┘                       │
│              View all playlists →                      │
└────────────────────────────────────────────────────────┘
```

Cards are non-expandable; the section links to `/lists` for the full experience.

### Theme

Reuses the existing palette:
- `bg-[#121212]` page bg
- `bg-[#181818]` card bg
- `text-[#ADB7BE]` muted text
- `text-white` primary text
- Tailwind `primary` (teal) / `secondary` (green) for search-focus rings and CTAs

## Snapshot & Fallback

### `pnpm run snapshot:youtube`

Plain Node ESM script (`scripts/snapshot-youtube.mjs`):

1. Loads `YOUTUBE_API_KEY` from `.env.local` via `dotenv`
2. Calls `fetchChannelPlaylists(CHANNEL_ID)`
3. For each playlist, calls `fetchPlaylistItems(playlist.id)`
4. Writes `data/playlists-snapshot.json` with `snapshotAt`, `channelId`, and full `playlists` array (each playlist includes its `videos`)
5. Prints summary: `Snapshotted N playlists, M total videos.`

Reuses `src/lib/youtube.ts` helpers — single source of truth.

### Fallback path in `lib/youtube.ts`

```ts
export async function fetchChannelPlaylistsWithFallback(channelId: string): Promise<Playlist[]> {
  try {
    return await fetchChannelPlaylists(channelId);
  } catch (err) {
    console.warn('[youtube] live fetch failed, falling back to snapshot', err);
    return readSnapshotFallback();
  }
}
```

`readSnapshotFallback()` reads `data/playlists-snapshot.json` from disk via `fs/promises`. If neither succeeds, the page renders an empty state via `error.tsx`.

The fallback works on Amplify and Docker because both run `pnpm install && pnpm build` against the repo, bundling `data/playlists-snapshot.json` into the deployment.

## Environment & Setup

### New env vars

```
YOUTUBE_API_KEY=...                                # server-only
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCGAiBWuPb3WfFlmmnw_wbRw
```

### API key acquisition (human-in-the-loop step)

Per project policy (CLAUDE.md), Corey creates the API key — Claude does not. Steps:

1. Google Cloud Console → create or select project
2. APIs & Services → Library → enable "YouTube Data API v3"
3. Credentials → Create Credentials → API key
4. Restrict the key (HTTP referrer restriction to portfolio domains) for defense in depth
5. Add to `.env.local` and to Amplify environment variables

The implementation plan will explicitly include a checkpoint where Corey creates the key before code that depends on it executes.

### `package.json`

```json
{
  "scripts": {
    "snapshot:youtube": "node scripts/snapshot-youtube.mjs"
  },
  "devDependencies": {
    "dotenv": "^16.4.0"
  }
}
```

No new runtime dependencies — iframe is plain HTML, API calls use built-in `fetch`, search is plain string matching.

### Amplify

Add `YOUTUBE_API_KEY` and `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` to the Amplify console environment variables. No `amplify.yml` changes.

## Failure Modes & Edge Cases

| Failure | Behavior |
|---------|----------|
| YouTube API returns non-200 (network, quota, key bad) | `fetchChannelPlaylistsWithFallback` reads snapshot and the page renders normally |
| Snapshot file missing AND live fetch fails | `error.tsx` renders a friendly message + link back to `/` |
| User expands a playlist but its videos call fails | The detail panel shows an inline error with a retry button; the embed still loads (it can play the playlist directly via YouTube) |
| Channel has > 50 playlists | v1 caps at 50 with a `// TODO: paginate` comment in `fetchChannelPlaylists` |
| User has the embed playing and clicks a different card | Previous iframe unmounts (audio stops); new panel scrolls into view |
| `YOUTUBE_API_KEY` not set in `.env.local` | `lib/youtube.ts` throws a clear error at first call; in dev, caught by the fallback wrapper if a snapshot exists, otherwise visible in the build log |

## Out of Scope (for follow-up brainstorms)

- **Archival pipeline**: scheduled cron (likely n8n in `git/n8n-hosting/`), pulling playlists + videos + transcripts (likely via `yt-dlp` since YouTube `captions.download` requires OAuth), writing to S3 with retention.
- **Site integration with archive**: serving transcripts on the `/lists` page, showing "last archived" timestamps, reading from S3 as a richer fallback than the local JSON snapshot.
- **OAuth-based YouTube features**: anything that requires the channel-owner identity (managing playlists from the site, downloading captions via the official API).
