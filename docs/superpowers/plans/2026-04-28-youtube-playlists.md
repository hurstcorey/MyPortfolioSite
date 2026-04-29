# YouTube Playlists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/lists` page and home-page preview that surface every public YouTube playlist on channel `UCGAiBWuPb3WfFlmmnw_wbRw`, with inline-expand embedded player, search, ISR-cached server fetches, and a manual snapshot fallback committed to git.

**Architecture:** Server Component fetches playlists via `src/lib/youtube.ts` using the YouTube Data API v3 with `revalidate: 3600` ISR. Client Components render the interactive grid, search, and inline-expanded `PlaylistDetail` panel that holds the embedded YouTube iframe. An internal route handler at `/api/youtube/playlist/[id]` lazy-loads each playlist's videos when expanded. A standalone Node script (`pnpm run snapshot:youtube`) writes a JSON snapshot into `data/playlists-snapshot.json` that the runtime falls back to if the live API call fails.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion (already in repo), Vitest (new dev dep, for `lib/` only), dotenv (new dev dep, for the snapshot script). No new runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-28-youtube-playlists-design.md`](../specs/2026-04-28-youtube-playlists-design.md)

---

## Testing Strategy

| Layer | Approach | Rationale |
|-------|----------|-----------|
| `src/lib/youtube.ts` (URL building, response normalization, fallback selection) | Vitest unit tests with mocked `fetch` | Pure logic — high ROI, fast feedback |
| `scripts/snapshot-youtube.mjs` | Run it; verify the JSON file | Imperative script, exercised end-to-end |
| API route `/api/youtube/playlist/[id]` | Vitest with mocked `lib/youtube` | Verifies error → status code mapping |
| React components (`Lists*`, `PlaylistCard`, etc.) | Manual browser checklist (per project CLAUDE.md) | UI in a marketing site; visual correctness matters more than DOM assertions |
| `pnpm run lint` | Runs in CI on every PR | Existing safety net |

---

## File Structure

### New files

| Path | Responsibility |
|------|----------------|
| `vitest.config.ts` | Vitest config — restrict to `src/lib/**` and `src/app/api/**` |
| `src/lib/youtube.types.ts` | `Playlist`, `PlaylistVideo`, snapshot file type |
| `src/lib/youtube.ts` | Server-only fetchers + fallback wrapper |
| `src/lib/youtube.test.ts` | Vitest tests for the lib |
| `src/app/api/youtube/playlist/[id]/route.tsx` | Lazy-load videos for one playlist |
| `src/app/api/youtube/playlist/[id]/route.test.ts` | Route tests |
| `src/app/lists/page.tsx` | Server component, full `/lists` route |
| `src/app/lists/loading.tsx` | Skeleton |
| `src/app/lists/error.tsx` | Friendly fallback if both API + snapshot fail |
| `src/app/components/Lists/ListsPreview.tsx` | Server-fetched home-page preview |
| `src/app/components/Lists/ListsGrid.tsx` | Client; search + expand state, row chunking |
| `src/app/components/Lists/PlaylistCard.tsx` | Presentational card |
| `src/app/components/Lists/PlaylistDetail.tsx` | Client; embed + video list + CTAs |
| `src/app/components/Lists/PlaylistSearchBar.tsx` | Client; debounced controlled input |
| `src/app/components/Lists/YouTubeEmbed.tsx` | Lazy iframe wrapper |
| `scripts/snapshot-youtube.mjs` | `pnpm run snapshot:youtube` |
| `data/playlists-snapshot.json` | Committed fallback (created by Task 8) |
| `.env.local.example` | Documents required env vars |

### Modified files

| Path | Change |
|------|--------|
| `src/app/components/Navigation/Navbar.tsx` | Add "Lists" nav link; prefix anchor links with `/` |
| `src/app/page.tsx` | Insert `<ListsPreview />` between Projects and Email |
| `package.json` | Add `vitest`, `dotenv` devDeps; add `test`, `snapshot:youtube` scripts |
| `CLAUDE.md` | Document new env vars and snapshot script |
| `README.md` | Setup steps for the YouTube API key |

---

## Tasks

### Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1.1: Add Vitest as a devDependency**

Run:
```bash
pnpm add -D vitest@^1.6.0 @vitest/ui@^1.6.0
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated, no errors.

- [ ] **Step 1.2: Add `test` script to package.json**

Edit `package.json` `scripts` section to look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 1.3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts', 'src/app/api/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 1.4: Verify Vitest runs (no tests yet)**

Run: `pnpm test`
Expected: `No test files found, exiting with code 1` OR a clean "0 tests" output. Either is fine — confirms the runner is wired up.

- [ ] **Step 1.5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "test: Add Vitest test runner for src/lib and api routes."
```

---

### Task 2: Define YouTube types

**Files:**
- Create: `src/lib/youtube.types.ts`

- [ ] **Step 2.1: Create the types file**

```ts
// src/lib/youtube.types.ts

export interface Playlist {
  id: string;
  title: string;
  description: string;
  videoCount: number;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
}

export interface PlaylistVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  position: number;
  durationSeconds: number | null;
}

export interface PlaylistSnapshot {
  snapshotAt: string;
  channelId: string;
  playlists: Array<Playlist & { videos: PlaylistVideo[] }>;
}
```

- [ ] **Step 2.2: Type-check passes**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/youtube.types.ts
git commit -m "feat(youtube): Add Playlist and PlaylistVideo types."
```

---

### Task 3: Implement `fetchChannelPlaylists` (TDD)

**Files:**
- Create: `src/lib/youtube.ts`
- Create: `src/lib/youtube.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `src/lib/youtube.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchChannelPlaylists } from './youtube';

const SAMPLE_RESPONSE = {
  items: [
    {
      id: 'PL123',
      snippet: {
        title: 'Gaming Highlights',
        description: 'Best moments from streams',
        publishedAt: '2024-01-15T10:00:00Z',
        channelTitle: 'Corey Hurst',
        thumbnails: {
          medium: { url: 'https://i.ytimg.com/medium.jpg' },
          default: { url: 'https://i.ytimg.com/default.jpg' },
        },
      },
      contentDetails: { itemCount: 12 },
    },
  ],
};

describe('fetchChannelPlaylists', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('hits the playlists endpoint with the channel id and api key', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_RESPONSE,
    });

    await fetchChannelPlaylists('UC_TEST');

    const callArgs = (global.fetch as any).mock.calls[0];
    const url = callArgs[0] as URL;
    expect(url.toString()).toContain('youtube/v3/playlists');
    expect(url.searchParams.get('channelId')).toBe('UC_TEST');
    expect(url.searchParams.get('key')).toBe('test-key');
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails');
    expect(url.searchParams.get('maxResults')).toBe('50');
  });

  it('normalizes the YouTube response to Playlist[]', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_RESPONSE,
    });

    const result = await fetchChannelPlaylists('UC_TEST');

    expect(result).toEqual([
      {
        id: 'PL123',
        title: 'Gaming Highlights',
        description: 'Best moments from streams',
        videoCount: 12,
        thumbnailUrl: 'https://i.ytimg.com/medium.jpg',
        publishedAt: '2024-01-15T10:00:00Z',
        channelTitle: 'Corey Hurst',
      },
    ]);
  });

  it('throws when YOUTUBE_API_KEY is missing', async () => {
    delete process.env.YOUTUBE_API_KEY;
    await expect(fetchChannelPlaylists('UC_TEST')).rejects.toThrow(/YOUTUBE_API_KEY/);
  });

  it('throws on non-ok response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });
    await expect(fetchChannelPlaylists('UC_TEST')).rejects.toThrow(/403/);
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — "Cannot find module './youtube'" or similar.

- [ ] **Step 3.3: Write minimal implementation**

Create `src/lib/youtube.ts`:

```ts
import 'server-only';
import type { Playlist } from './youtube.types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_API_KEY is not set in the environment');
  }
  return key;
}

export async function fetchChannelPlaylists(channelId: string): Promise<Playlist[]> {
  const url = new URL(`${API_BASE}/playlists`);
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('key', getApiKey());

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return (data.items ?? []).map(normalizePlaylist);
}

function normalizePlaylist(item: any): Playlist {
  const thumbnails = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
  return {
    id: item.id,
    title: item.snippet?.title ?? '',
    description: item.snippet?.description ?? '',
    videoCount: item.contentDetails?.itemCount ?? 0,
    thumbnailUrl,
    publishedAt: item.snippet?.publishedAt ?? '',
    channelTitle: item.snippet?.channelTitle ?? '',
  };
}
```

> **Note:** `'server-only'` is a built-in Next.js package; no install required. It throws at build time if imported into a `"use client"` file.

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 4 tests in `src/lib/youtube.test.ts`.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat(youtube): Add fetchChannelPlaylists with normalization and error handling."
```

---

### Task 4: Implement `fetchPlaylistItems` (TDD)

**Files:**
- Modify: `src/lib/youtube.ts`
- Modify: `src/lib/youtube.test.ts`

- [ ] **Step 4.1: Append failing tests**

Add to the bottom of `src/lib/youtube.test.ts`:

```ts
import { fetchPlaylistItems } from './youtube';

const SAMPLE_ITEMS = {
  items: [
    {
      snippet: {
        title: 'Episode 1',
        description: 'First episode',
        position: 0,
        thumbnails: { medium: { url: 'https://i.ytimg.com/v1.jpg' } },
      },
      contentDetails: { videoId: 'vid_1' },
    },
    {
      snippet: {
        title: 'Episode 2',
        description: 'Second episode',
        position: 1,
        thumbnails: { default: { url: 'https://i.ytimg.com/v2.jpg' } },
      },
      contentDetails: { videoId: 'vid_2' },
    },
  ],
};

describe('fetchPlaylistItems', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('hits the playlistItems endpoint with the playlist id', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => SAMPLE_ITEMS });

    await fetchPlaylistItems('PL_TEST');

    const url = (global.fetch as any).mock.calls[0][0] as URL;
    expect(url.toString()).toContain('youtube/v3/playlistItems');
    expect(url.searchParams.get('playlistId')).toBe('PL_TEST');
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails');
    expect(url.searchParams.get('maxResults')).toBe('50');
  });

  it('normalizes items to PlaylistVideo[]', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => SAMPLE_ITEMS });

    const result = await fetchPlaylistItems('PL_TEST');

    expect(result).toEqual([
      {
        id: 'vid_1',
        title: 'Episode 1',
        description: 'First episode',
        thumbnailUrl: 'https://i.ytimg.com/v1.jpg',
        position: 0,
        durationSeconds: null,
      },
      {
        id: 'vid_2',
        title: 'Episode 2',
        description: 'Second episode',
        thumbnailUrl: 'https://i.ytimg.com/v2.jpg',
        position: 1,
        durationSeconds: null,
      },
    ]);
  });
});
```

- [ ] **Step 4.2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `fetchPlaylistItems` is not exported.

- [ ] **Step 4.3: Add the implementation**

Append to `src/lib/youtube.ts`:

```ts
import type { PlaylistVideo } from './youtube.types';

export async function fetchPlaylistItems(playlistId: string): Promise<PlaylistVideo[]> {
  const url = new URL(`${API_BASE}/playlistItems`);
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('key', getApiKey());

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`YouTube API error: ${res.status} ${body}`);
  }
  const data = await res.json();
  return (data.items ?? []).map(normalizePlaylistItem);
}

function normalizePlaylistItem(item: any): PlaylistVideo {
  const thumbnails = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
  return {
    id: item.contentDetails?.videoId ?? '',
    title: item.snippet?.title ?? '',
    description: item.snippet?.description ?? '',
    thumbnailUrl,
    position: item.snippet?.position ?? 0,
    durationSeconds: null,
  };
}
```

> **Note:** Merge the existing `import type { Playlist }` line with the new `PlaylistVideo` import: `import type { Playlist, PlaylistVideo } from './youtube.types';`

- [ ] **Step 4.4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 6 tests total.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat(youtube): Add fetchPlaylistItems for video lists."
```

---

### Task 5: Implement snapshot fallback (TDD)

**Files:**
- Modify: `src/lib/youtube.ts`
- Modify: `src/lib/youtube.test.ts`

- [ ] **Step 5.1: Append failing tests**

Add to `src/lib/youtube.test.ts`:

```ts
import { fetchChannelPlaylistsWithFallback } from './youtube';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('fetchChannelPlaylistsWithFallback', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('returns live data when fetch succeeds', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'PL_LIVE',
            snippet: {
              title: 'Live',
              description: '',
              publishedAt: '',
              channelTitle: '',
              thumbnails: {},
            },
            contentDetails: { itemCount: 1 },
          },
        ],
      }),
    });

    const result = await fetchChannelPlaylistsWithFallback('UC_TEST');
    expect(result[0].id).toBe('PL_LIVE');
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('falls back to snapshot when fetch fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockResolvedValue(JSON.stringify({
      snapshotAt: '2026-04-28T00:00:00Z',
      channelId: 'UC_TEST',
      playlists: [
        {
          id: 'PL_CACHED',
          title: 'Cached',
          description: '',
          videoCount: 0,
          thumbnailUrl: '',
          publishedAt: '',
          channelTitle: '',
          videos: [],
        },
      ],
    }));

    const result = await fetchChannelPlaylistsWithFallback('UC_TEST');
    expect(result[0].id).toBe('PL_CACHED');
    // Strip the videos[] when returning Playlist[]
    expect(result[0]).not.toHaveProperty('videos');
  });

  it('throws when both fetch and snapshot fail', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));

    await expect(fetchChannelPlaylistsWithFallback('UC_TEST')).rejects.toThrow();
  });
});
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `fetchChannelPlaylistsWithFallback` not exported.

- [ ] **Step 5.3: Add the implementation**

Append to `src/lib/youtube.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PlaylistSnapshot } from './youtube.types';

export async function readSnapshotFallback(): Promise<Playlist[]> {
  const snapshotPath = path.join(process.cwd(), 'data', 'playlists-snapshot.json');
  const json = await fs.readFile(snapshotPath, 'utf-8');
  const parsed = JSON.parse(json) as PlaylistSnapshot;
  return parsed.playlists.map(({ videos: _videos, ...playlist }) => playlist);
}

export async function fetchChannelPlaylistsWithFallback(
  channelId: string,
): Promise<Playlist[]> {
  try {
    return await fetchChannelPlaylists(channelId);
  } catch (err) {
    console.warn('[youtube] live fetch failed, falling back to snapshot:', err);
    return readSnapshotFallback();
  }
}
```

> **Note:** Update the type import to include `PlaylistSnapshot`: `import type { Playlist, PlaylistVideo, PlaylistSnapshot } from './youtube.types';`

- [ ] **Step 5.4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 9 tests total.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/youtube.ts src/lib/youtube.test.ts
git commit -m "feat(youtube): Add snapshot fallback for offline/quota-exhausted resilience."
```

---

### Task 6: Add env-var scaffolding

**Files:**
- Create: `.env.local.example`
- Modify: `.gitignore` (verify `.env.local` is ignored)

- [ ] **Step 6.1: Create `.env.local.example`**

```
# YouTube Data API v3 key — server-only, never exposed to the browser.
# Acquire at: https://console.cloud.google.com/apis/credentials
# Required APIs: YouTube Data API v3
YOUTUBE_API_KEY=

# Public YouTube channel ID — surfaced in the browser for the "Subscribe" deep link.
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCGAiBWuPb3WfFlmmnw_wbRw

# Resend transactional email API key (existing — required for the contact form)
RESEND_API_KEY=
FROM_EMAIL=
```

- [ ] **Step 6.2: Verify `.env.local` is gitignored**

Run: `grep -E '^\.env\.local$|^\.env\*$' .gitignore || echo "MISSING"`
Expected: line(s) printed, NOT "MISSING".

If MISSING, append `.env.local` to `.gitignore`.

- [ ] **Step 6.3: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "chore: Document YOUTUBE_API_KEY and channel id env vars."
```

---

### Task 7: Snapshot script

**Files:**
- Create: `scripts/snapshot-youtube.mjs`
- Modify: `package.json`

- [ ] **Step 7.1: Add `dotenv` as a devDependency**

Run:
```bash
pnpm add -D dotenv@^16.4.0
```

- [ ] **Step 7.2: Add `snapshot:youtube` script to `package.json`**

Update the `scripts` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "snapshot:youtube": "node scripts/snapshot-youtube.mjs"
}
```

- [ ] **Step 7.3: Create the snapshot script**

```js
// scripts/snapshot-youtube.mjs
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'data', 'playlists-snapshot.json');
const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}. Add it to .env.local.`);
    process.exit(1);
  }
  return v;
}

const API_KEY = getEnv('YOUTUBE_API_KEY');
const CHANNEL_ID = getEnv('NEXT_PUBLIC_YOUTUBE_CHANNEL_ID');

async function ytFetch(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${endpoint} ${res.status}: ${body}`);
  }
  return res.json();
}

function normalizeThumbnail(thumbnails = {}) {
  return thumbnails.medium?.url ?? thumbnails.default?.url ?? thumbnails.high?.url ?? '';
}

async function main() {
  console.log(`Fetching playlists for channel ${CHANNEL_ID}…`);
  const playlistsData = await ytFetch('playlists', {
    channelId: CHANNEL_ID,
    part: 'snippet,contentDetails',
    maxResults: '50',
  });

  const playlists = [];
  for (const item of playlistsData.items ?? []) {
    const playlist = {
      id: item.id,
      title: item.snippet?.title ?? '',
      description: item.snippet?.description ?? '',
      videoCount: item.contentDetails?.itemCount ?? 0,
      thumbnailUrl: normalizeThumbnail(item.snippet?.thumbnails),
      publishedAt: item.snippet?.publishedAt ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      videos: [],
    };

    console.log(`  Fetching videos for "${playlist.title}" (${playlist.id})…`);
    const itemsData = await ytFetch('playlistItems', {
      playlistId: playlist.id,
      part: 'snippet,contentDetails',
      maxResults: '50',
    });
    playlist.videos = (itemsData.items ?? []).map((it) => ({
      id: it.contentDetails?.videoId ?? '',
      title: it.snippet?.title ?? '',
      description: it.snippet?.description ?? '',
      thumbnailUrl: normalizeThumbnail(it.snippet?.thumbnails),
      position: it.snippet?.position ?? 0,
      durationSeconds: null,
    }));

    playlists.push(playlist);
  }

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    channelId: CHANNEL_ID,
    playlists,
  };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  const totalVideos = playlists.reduce((s, p) => s + p.videos.length, 0);
  console.log(`\n✓ Snapshotted ${playlists.length} playlists, ${totalVideos} total videos.`);
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
```

- [ ] **Step 7.4: Verify the script syntax-checks**

Run: `node --check scripts/snapshot-youtube.mjs`
Expected: no output (success).

- [ ] **Step 7.5: Commit**

```bash
git add scripts/snapshot-youtube.mjs package.json pnpm-lock.yaml
git commit -m "feat(youtube): Add snapshot script for local archive of playlists."
```

---

### Task 8: HUMAN CHECKPOINT — Create API key and run first snapshot

> **This task requires the user (Corey). Do not attempt to automate API key creation.**

- [ ] **Step 8.1: User creates the YouTube Data API v3 key**

Walk Corey through:
1. https://console.cloud.google.com/ → create or select project
2. APIs & Services → Library → search "YouTube Data API v3" → Enable
3. APIs & Services → Credentials → Create Credentials → API key
4. Optional: Restrict key by HTTP referrers (his portfolio domains)
5. Copy the key

- [ ] **Step 8.2: User adds the key to `.env.local`**

```
YOUTUBE_API_KEY=AIza...the-real-key...
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCGAiBWuPb3WfFlmmnw_wbRw
```

(Plus the existing `RESEND_API_KEY` and `FROM_EMAIL`.)

- [ ] **Step 8.3: Run the snapshot**

Run: `pnpm run snapshot:youtube`
Expected: console output ending in `✓ Snapshotted N playlists, M total videos.`

- [ ] **Step 8.4: Inspect the output**

Run: `head -30 data/playlists-snapshot.json`
Expected: valid JSON with `snapshotAt`, `channelId`, and a `playlists` array containing the user's actual playlists.

- [ ] **Step 8.5: Commit the snapshot**

```bash
git add data/playlists-snapshot.json
git commit -m "data: Initial YouTube playlists snapshot."
```

---

### Task 9: API route for on-demand video loading (TDD)

**Files:**
- Create: `src/app/api/youtube/playlist/[id]/route.tsx`
- Create: `src/app/api/youtube/playlist/[id]/route.test.ts`

- [ ] **Step 9.1: Write the failing test**

```ts
// src/app/api/youtube/playlist/[id]/route.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/youtube', () => ({
  fetchPlaylistItems: vi.fn(),
}));

import { GET } from './route';
import { fetchPlaylistItems } from '@/lib/youtube';

describe('GET /api/youtube/playlist/[id]', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns 200 with videos on success', async () => {
    (fetchPlaylistItems as any).mockResolvedValue([
      { id: 'v1', title: 't', description: '', thumbnailUrl: '', position: 0, durationSeconds: null },
    ]);

    const res = await GET(new Request('http://localhost/api/youtube/playlist/PL_X'), {
      params: { id: 'PL_X' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toHaveLength(1);
    expect(fetchPlaylistItems).toHaveBeenCalledWith('PL_X');
  });

  it('returns 502 on YouTube API error', async () => {
    (fetchPlaylistItems as any).mockRejectedValue(new Error('quota exceeded'));

    const res = await GET(new Request('http://localhost/api/youtube/playlist/PL_X'), {
      params: { id: 'PL_X' },
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('youtube_api_error');
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 9.3: Implement the route**

```tsx
// src/app/api/youtube/playlist/[id]/route.tsx
import { NextResponse } from 'next/server';
import { fetchPlaylistItems } from '@/lib/youtube';

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const videos = await fetchPlaylistItems(params.id);
    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[api/youtube/playlist] error:', err);
    return NextResponse.json(
      { error: 'youtube_api_error', detail: (err as Error).message },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 9.4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 11 tests total.

- [ ] **Step 9.5: Commit**

```bash
git add src/app/api/youtube/
git commit -m "feat(api): Add /api/youtube/playlist/[id] route for lazy video loading."
```

---

### Task 10: `YouTubeEmbed` component

**Files:**
- Create: `src/app/components/Lists/YouTubeEmbed.tsx`

- [ ] **Step 10.1: Implement the component**

```tsx
// src/app/components/Lists/YouTubeEmbed.tsx
"use client";
import React from "react";

interface YouTubeEmbedProps {
  playlistId: string;
  videoId?: string;
  title: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ playlistId, videoId, title }) => {
  const params = new URLSearchParams({ list: playlistId, rel: "0", modestbranding: "1" });
  const src = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;

  return (
    <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full border-0"
      />
    </div>
  );
};

export default YouTubeEmbed;
```

- [ ] **Step 10.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 10.3: Commit**

```bash
git add src/app/components/Lists/YouTubeEmbed.tsx
git commit -m "feat(lists): Add YouTubeEmbed iframe wrapper."
```

---

### Task 11: `PlaylistCard` component

**Files:**
- Create: `src/app/components/Lists/PlaylistCard.tsx`

- [ ] **Step 11.1: Implement the component**

```tsx
// src/app/components/Lists/PlaylistCard.tsx
"use client";
import React from "react";
import Image from "next/image";
import { ChevronUpIcon, PlayIcon } from "@heroicons/react/24/solid";
import type { Playlist } from "@/lib/youtube.types";

interface PlaylistCardProps {
  playlist: Playlist;
  isActive: boolean;
  onClick: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`group relative text-left w-full rounded-xl overflow-hidden bg-[#181818] transition-all duration-300 ${
        isActive ? "ring-2 ring-primary-500" : "hover:bg-[#1f1f1f]"
      }`}
    >
      <div className="relative w-full aspect-video bg-black">
        {playlist.thumbnailUrl ? (
          <Image
            src={playlist.thumbnailUrl}
            alt={playlist.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-[#33353F]" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <PlayIcon
            className={`h-12 w-12 text-white drop-shadow-lg transition-opacity duration-300 ${
              isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            }`}
          />
        </div>
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
          {playlist.videoCount} videos
        </span>
      </div>

      <div className="p-4">
        <h3 className="text-white text-lg font-semibold line-clamp-2">{playlist.title}</h3>
        <p className="text-[#ADB7BE] text-sm line-clamp-2 mt-1">{playlist.description}</p>
      </div>

      {isActive && (
        <ChevronUpIcon className="absolute -top-2 left-1/2 -translate-x-1/2 h-6 w-6 text-primary-500 bg-[#121212] rounded-full" />
      )}
    </button>
  );
};

export default PlaylistCard;
```

- [ ] **Step 11.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. If `primary-500` is not in the Tailwind theme, replace with the existing `primary` color reference (check `tailwind.config.ts`).

- [ ] **Step 11.3: Commit**

```bash
git add src/app/components/Lists/PlaylistCard.tsx
git commit -m "feat(lists): Add PlaylistCard with thumbnail, count, and active indicator."
```

---

### Task 12: `PlaylistSearchBar` component

**Files:**
- Create: `src/app/components/Lists/PlaylistSearchBar.tsx`

- [ ] **Step 12.1: Implement the component**

```tsx
// src/app/components/Lists/PlaylistSearchBar.tsx
"use client";
import React, { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface PlaylistSearchBarProps {
  value: string;
  onChange: (next: string) => void;
  debounceMs?: number;
}

const PlaylistSearchBar: React.FC<PlaylistSearchBarProps> = ({
  value,
  onChange,
  debounceMs = 150,
}) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (local !== value) onChange(local);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [local, value, debounceMs, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative max-w-md w-full">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ADB7BE] pointer-events-none" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search playlists…"
        className="w-full bg-[#181818] border border-[#33353F] rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        aria-label="Search playlists"
      />
    </div>
  );
};

export default PlaylistSearchBar;
```

- [ ] **Step 12.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 12.3: Commit**

```bash
git add src/app/components/Lists/PlaylistSearchBar.tsx
git commit -m "feat(lists): Add debounced PlaylistSearchBar."
```

---

### Task 13: `PlaylistDetail` component

**Files:**
- Create: `src/app/components/Lists/PlaylistDetail.tsx`

- [ ] **Step 13.1: Implement the component**

```tsx
// src/app/components/Lists/PlaylistDetail.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowTopRightOnSquareIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import YouTubeEmbed from "./YouTubeEmbed";
import type { Playlist, PlaylistVideo } from "@/lib/youtube.types";

interface PlaylistDetailProps {
  playlist: Playlist;
  channelId: string;
}

const PlaylistDetail: React.FC<PlaylistDetailProps> = ({ playlist, channelId }) => {
  const [videos, setVideos] = useState<PlaylistVideo[] | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setVideos(null);
    setActiveVideoId(undefined);

    fetch(`/api/youtube/playlist/${playlist.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { videos: PlaylistVideo[] }) => {
        if (!cancelled) setVideos(data.videos);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load videos");
      });

    return () => {
      cancelled = true;
    };
  }, [playlist.id]);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [playlist.id]);

  const subscribeUrl = `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`;
  const saveToLibraryUrl = `https://www.youtube.com/playlist?list=${playlist.id}`;

  return (
    <div
      ref={containerRef}
      className="col-span-full bg-[#181818] rounded-xl p-6 md:p-8 my-2 scroll-mt-24"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <YouTubeEmbed
            playlistId={playlist.id}
            videoId={activeVideoId}
            title={playlist.title}
          />
        </div>

        <div className="md:col-span-1 flex flex-col min-h-0">
          <h3 className="text-white text-xl font-bold mb-2">{playlist.title}</h3>
          <p className="text-[#ADB7BE] text-sm mb-4 line-clamp-3">{playlist.description}</p>

          {error && (
            <div className="text-red-400 text-sm">
              Couldn&apos;t load videos: {error}
            </div>
          )}

          {!videos && !error && (
            <div className="text-[#ADB7BE] text-sm">Loading videos…</div>
          )}

          {videos && (
            <ul className="overflow-y-auto max-h-[420px] space-y-2 pr-2">
              {videos.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActiveVideoId(v.id)}
                    className={`w-full text-left flex gap-3 p-2 rounded-lg transition-colors ${
                      activeVideoId === v.id ? "bg-[#33353F]" : "hover:bg-[#222]"
                    }`}
                  >
                    <div className="relative w-24 aspect-video flex-shrink-0 bg-black rounded overflow-hidden">
                      {v.thumbnailUrl && (
                        <Image
                          src={v.thumbnailUrl}
                          alt={v.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <span className="text-white text-sm line-clamp-2">{v.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[#33353F]">
        <Link
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          Subscribe to channel
        </Link>
        <Link
          href={saveToLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#33353F] hover:bg-[#444] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <BookmarkIcon className="h-4 w-4" />
          Save playlist to library
        </Link>
      </div>
    </div>
  );
};

export default PlaylistDetail;
```

- [ ] **Step 13.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 13.3: Commit**

```bash
git add src/app/components/Lists/PlaylistDetail.tsx
git commit -m "feat(lists): Add PlaylistDetail with player, video list, and CTAs."
```

---

### Task 14: `ListsGrid` component (search + row-chunked expand)

**Files:**
- Create: `src/app/components/Lists/ListsGrid.tsx`

- [ ] **Step 14.1: Implement the component**

```tsx
// src/app/components/Lists/ListsGrid.tsx
"use client";
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlaylistCard from "./PlaylistCard";
import PlaylistDetail from "./PlaylistDetail";
import PlaylistSearchBar from "./PlaylistSearchBar";
import type { Playlist } from "@/lib/youtube.types";

interface ListsGridProps {
  playlists: Playlist[];
}

const COLS_MD = 3;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const ListsGrid: React.FC<ListsGridProps> = ({ playlists }) => {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [playlists, query]);

  const rows = useMemo(() => chunk(filtered, COLS_MD), [filtered]);

  const handleCardClick = (playlistId: string) => {
    setActiveId((prev) => (prev === playlistId ? null : playlistId));
  };

  const activePlaylist =
    activeId !== null ? filtered.find((p) => p.id === activeId) ?? null : null;

  return (
    <section id="lists">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <div className="flex justify-center mb-8">
        <PlaylistSearchBar value={query} onChange={setQuery} />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[#ADB7BE]">No playlists match &ldquo;{query}&rdquo;.</p>
      )}

      <div className="space-y-8">
        {rows.map((row, rowIdx) => {
          const activeIsInRow = activePlaylist
            ? row.some((p) => p.id === activePlaylist.id)
            : false;

          return (
            <React.Fragment key={`row-${rowIdx}`}>
              <AnimatePresence initial={false}>
                {activeIsInRow && activePlaylist && (
                  <motion.div
                    key={`detail-${activePlaylist.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <PlaylistDetail playlist={activePlaylist} channelId={channelId} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {row.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    isActive={activeId === playlist.id}
                    onClick={() => handleCardClick(playlist.id)}
                  />
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

export default ListsGrid;
```

- [ ] **Step 14.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 14.3: Commit**

```bash
git add src/app/components/Lists/ListsGrid.tsx
git commit -m "feat(lists): Add ListsGrid with search and inline-expand row chunking."
```

---

### Task 15: `ListsPreview` component (home page section)

**Files:**
- Create: `src/app/components/Lists/ListsPreview.tsx`

- [ ] **Step 15.1: Implement the component**

`ListsPreview` is a **server component** (no `"use client"` directive) — it fetches playlists and renders client `PlaylistCard` children.

```tsx
// src/app/components/Lists/ListsPreview.tsx
import React from "react";
import Link from "next/link";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";
import PlaylistCard from "./PlaylistCard";
import type { Playlist } from "@/lib/youtube.types";

const PREVIEW_COUNT = 4;

const ListsPreview = async () => {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) return null;

  let playlists: Playlist[] = [];
  try {
    playlists = await fetchChannelPlaylistsWithFallback(channelId);
  } catch {
    return null; // home page should never crash because of YouTube
  }

  const recent = [...playlists]
    .sort((a, b) => (b.publishedAt > a.publishedAt ? 1 : -1))
    .slice(0, PREVIEW_COUNT);

  if (recent.length === 0) return null;

  return (
    <section id="lists" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-8 md:mb-12">
        My Playlists
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recent.map((playlist) => (
          <Link key={playlist.id} href={`/lists#${playlist.id}`}>
            <PlaylistCard playlist={playlist} isActive={false} onClick={() => {}} />
          </Link>
        ))}
      </div>

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

> **Note:** `PlaylistCard` is a client component (`"use client"`); it renders fine as a child of a server component.

- [ ] **Step 15.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 15.3: Commit**

```bash
git add src/app/components/Lists/ListsPreview.tsx
git commit -m "feat(lists): Add ListsPreview server component for home page."
```

---

### Task 16: `/lists` page, loading, and error boundaries

**Files:**
- Create: `src/app/lists/page.tsx`
- Create: `src/app/lists/loading.tsx`
- Create: `src/app/lists/error.tsx`

- [ ] **Step 16.1: Create `page.tsx`**

```tsx
// src/app/lists/page.tsx
import React from "react";
import type { Metadata } from "next";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";
import ListsGrid from "../components/Lists/ListsGrid";
import { fetchChannelPlaylistsWithFallback } from "@/lib/youtube";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Playlists | Corey Hurst",
  description: "YouTube playlists from my channel — gaming, dev, art, and more.",
};

export default async function ListsPage() {
  const channelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    throw new Error("NEXT_PUBLIC_YOUTUBE_CHANNEL_ID is not set");
  }

  const playlists = await fetchChannelPlaylistsWithFallback(channelId);

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

- [ ] **Step 16.2: Create `loading.tsx`**

```tsx
// src/app/lists/loading.tsx
import React from "react";
import Navbar from "../components/Navigation/Navbar";
import Footer from "../components/Footer";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <h2 className="text-center text-4xl font-bold text-white mt-4 mb-12">
          My Playlists
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-[#181818] animate-pulse"
              style={{ aspectRatio: "16 / 13" }}
            />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
```

- [ ] **Step 16.3: Create `error.tsx`**

```tsx
// src/app/lists/error.tsx
"use client";
import React from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#121212] px-6 text-center">
      <h2 className="text-3xl font-bold text-white mb-4">
        Playlists are temporarily unavailable
      </h2>
      <p className="text-[#ADB7BE] mb-6 max-w-md">
        I couldn&apos;t reach YouTube and there&apos;s no local snapshot to show.
        Please try again in a few minutes.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          Try again
        </button>
        <Link
          href="/"
          className="bg-[#33353F] hover:bg-[#444] text-white px-4 py-2 rounded-lg font-medium"
        >
          Back to home
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <pre className="mt-8 text-xs text-[#666] max-w-xl overflow-auto">{error.message}</pre>
      )}
    </main>
  );
}
```

- [ ] **Step 16.4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 16.5: Commit**

```bash
git add src/app/lists/
git commit -m "feat(lists): Add /lists route with loading skeleton and error boundary."
```

---

### Task 17: Update Navbar — add Lists link, prefix anchors with `/`

**Files:**
- Modify: `src/app/components/Navigation/Navbar.tsx`

- [ ] **Step 17.1: Update the `navLinks` array**

Replace the existing `navLinks` array with:

```ts
const navLinks = [
  { title: "My Story", path: "/#mystory" },
  { title: "Engineer", path: "/#engineer" },
  { title: "Writer",   path: "/#writer" },
  { title: "Gamer",    path: "/#gamer" },
  { title: "Artist",   path: "/#artist" },
  { title: "Projects", path: "/#projects" },
  { title: "Lists",    path: "/lists" },
  { title: "Contact",  path: "/#contact" },
];
```

- [ ] **Step 17.2: Type-check and lint**

Run: `pnpm exec tsc --noEmit && pnpm run lint`
Expected: no errors.

- [ ] **Step 17.3: Commit**

```bash
git add src/app/components/Navigation/Navbar.tsx
git commit -m "feat(nav): Add Lists nav link and prefix anchor links with /."
```

---

### Task 18: Add `ListsPreview` to home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 18.1: Update `page.tsx`**

```tsx
import HeroSection from "./components/AboutMe/HeroSection";
import Navbar from "./components/Navigation/Navbar";
import AboutSection from "./components/AboutMe/AboutSection";
import AchievementsSection from "./components/AboutMe/AchievementsSection";
import ProjectsSection from "./components/Projects/ProjectsSection";
import ListsPreview from "./components/Lists/ListsPreview";
import EmailSection from "./components/Utilities/EmailSection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#121212]">
      <Navbar />
      <div className="container mt-24 mx-auto px-12 py-4">
        <HeroSection />
        <AchievementsSection />
        <AboutSection />
        <ProjectsSection />
        <ListsPreview />
        <EmailSection />
      </div>
      <Footer />
    </main>
  );
}
```

- [ ] **Step 18.2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 18.3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: Surface YouTube playlists preview on home page."
```

---

### Task 19: Update CLAUDE.md and README

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 19.1: Update CLAUDE.md env-vars section**

Find the existing env vars block in `CLAUDE.md` and replace with:

```
Create `.env.local` (never commit):
\`\`\`
RESEND_API_KEY=your_resend_key
FROM_EMAIL=your_email@example.com
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCGAiBWuPb3WfFlmmnw_wbRw
\`\`\`

`YOUTUBE_API_KEY` is server-only. `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID` is exposed to the browser for the "Subscribe" deep link.
```

Add a new commands subsection:

```
### YouTube Playlist Snapshot

`pnpm run snapshot:youtube` — Fetches all public playlists from the YouTube channel and writes `data/playlists-snapshot.json` (committed to git). Used as a fallback if the live API fails. Run manually when you want to refresh the local archive.
```

- [ ] **Step 19.2: Update README.md**

Add a "YouTube playlists" section to `README.md` (placement: under whatever existing "Setup" / "Environment" section exists; if none, add after the install/dev instructions):

```
### YouTube playlists

The `/lists` page surfaces public playlists from the YouTube channel set via `NEXT_PUBLIC_YOUTUBE_CHANNEL_ID`.

**Setup:**

1. Create a Google Cloud project and enable "YouTube Data API v3"
   (https://console.cloud.google.com/apis/library/youtube.googleapis.com)
2. Create an API key (APIs & Services → Credentials)
3. Add to `.env.local`:
   \`\`\`
   YOUTUBE_API_KEY=AIza...
   NEXT_PUBLIC_YOUTUBE_CHANNEL_ID=UCGAiBWuPb3WfFlmmnw_wbRw
   \`\`\`
4. Add the same vars to your Amplify console environment.

**Snapshot fallback:**

`pnpm run snapshot:youtube` writes `data/playlists-snapshot.json`. The runtime falls back to this file if the YouTube API is unreachable. Re-run and commit when you want to refresh the local archive.
```

- [ ] **Step 19.3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: Document YOUTUBE_API_KEY env vars and snapshot script."
```

---

### Task 20: End-to-end manual verification

**Files:** none — verification only.

> **Per project CLAUDE.md, UI changes must be verified in a browser before being marked complete.**

- [ ] **Step 20.1: Confirm `.env.local` has both YouTube vars**

Run: `grep -E '^(YOUTUBE_API_KEY|NEXT_PUBLIC_YOUTUBE_CHANNEL_ID)=' .env.local`
Expected: both lines present with non-empty values.

- [ ] **Step 20.2: Run lint, type-check, and tests**

Run: `pnpm run lint && pnpm exec tsc --noEmit && pnpm test`
Expected: all green.

- [ ] **Step 20.3: Start dev server**

Run: `pnpm run dev`
Expected: server starts at http://localhost:3000.

- [ ] **Step 20.4: Home-page checklist**

Open http://localhost:3000 and verify:
- [ ] "Lists" appears in the navbar between Projects and Contact
- [ ] Clicking other nav anchors (Projects, Contact, etc.) still scrolls correctly on the home page
- [ ] A "My Playlists" section appears between Projects and the contact form
- [ ] 4 playlist cards render with thumbnails, titles, and video counts
- [ ] "View all playlists →" link is visible
- [ ] Clicking a preview card navigates to `/lists`

- [ ] **Step 20.5: `/lists` page checklist**

Navigate to http://localhost:3000/lists and verify:
- [ ] Page renders with Navbar, Footer, and "My Playlists" heading
- [ ] Search bar is visible
- [ ] All playlists render in a 3-column grid (md+) / 1-column (mobile)
- [ ] Typing in the search bar filters playlists by title/description after ~150ms
- [ ] Clearing the search restores all playlists
- [ ] Clicking a card expands a panel ABOVE the card's row
- [ ] The panel shows an embedded YouTube player on the left, video list on the right (or stacked on mobile)
- [ ] The page smooth-scrolls so the player is in view
- [ ] Clicking a video in the side list re-targets the same player (no second iframe spawned)
- [ ] Clicking a different card collapses the previous panel and opens a new one
- [ ] Clicking the same card again collapses the panel
- [ ] "Subscribe to channel" button opens YouTube subscribe URL in a new tab
- [ ] "Save playlist to library" button opens YouTube playlist URL in a new tab
- [ ] On mobile (DevTools responsive ≤ 640px), the grid collapses to single column and the player stacks above the video list

- [ ] **Step 20.6: Failure-mode checklist**

- [ ] Temporarily set `YOUTUBE_API_KEY=invalid` in `.env.local`, restart dev server, reload `/lists` — should fall back to snapshot data and still render
- [ ] Restore the real key

- [ ] **Step 20.7: Production build sanity check**

Run: `pnpm run build`
Expected: build completes with no errors. Check that `.next/server/app/lists/page.js` exists.

Run: `pnpm start`
Expected: production server starts and `/lists` works the same as in dev.

- [ ] **Step 20.8: Open a PR**

```bash
git push -u origin feature/youtube-playlists-design
gh pr create --base development --title "feat: YouTube playlists section + /lists page" --body "$(cat <<'EOF'
## Summary

- Adds `/lists` page surfacing every public YouTube playlist from the channel
- Adds a 4-card "My Playlists" preview to the home page between Projects and Contact
- Fetches via YouTube Data API v3 server-side with `revalidate: 3600` ISR
- Inline-expand player on `/lists` with side-by-side video list and Subscribe/Save CTAs
- Manual snapshot script (`pnpm run snapshot:youtube`) writes `data/playlists-snapshot.json` as a fallback when the live API fails

Spec: `docs/superpowers/specs/2026-04-28-youtube-playlists-design.md`
Plan: `docs/superpowers/plans/2026-04-28-youtube-playlists.md`

## Test plan

- [x] `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm test` all pass
- [x] Home page preview renders, links to `/lists`
- [x] `/lists` search, expand-above, video-list re-target, mobile layout, subscribe/save CTAs all verified
- [x] Snapshot fallback verified by setting an invalid API key
- [x] Production build (`pnpm run build && pnpm start`) succeeds and serves the page

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

This plan was written against the spec at `docs/superpowers/specs/2026-04-28-youtube-playlists-design.md`.

**Spec coverage:**
- ✅ Architecture (Tasks 3–5, 9, 14–18) — server fetch, client interactivity, API route, pages
- ✅ Data model (Task 2) — types match spec
- ✅ YouTube API surface (Tasks 3, 4, 7) — same endpoints, params, ISR caching
- ✅ Component inventory (Tasks 10–18) — every file in spec is created
- ✅ Player behavior (Tasks 13, 14) — single expand, single video, scroll-into-view
- ✅ Routing & navigation (Tasks 17, 18, 16) — Lists link, anchor `/` prefix, /lists route
- ✅ Visual layout (Tasks 11, 13, 14) — panel above row, dark theme, grid match
- ✅ Snapshot & fallback (Tasks 5, 7, 8) — script + lib wrapper + first-run capture
- ✅ Environment & setup (Tasks 6, 8, 19) — env file, human checkpoint, docs
- ✅ Failure modes (Tasks 16, 20.6) — error.tsx + manual fallback verification

**Type consistency check:**
- `Playlist` / `PlaylistVideo` shapes match across types file, lib, route, and components
- Function names: `fetchChannelPlaylists`, `fetchPlaylistItems`, `readSnapshotFallback`, `fetchChannelPlaylistsWithFallback` are stable across all tasks

**Out-of-scope items (deferred to follow-up brainstorm):**
- Cron-driven archival pipeline
- S3 upload of snapshots
- Transcript extraction
- OAuth-based YouTube features
