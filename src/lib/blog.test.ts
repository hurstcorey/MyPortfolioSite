import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  feedUrl,
  fetchLatestPost,
  fetchLatestPostWithFallback,
  normalizeEntry,
  stripHtml,
  toExcerpt,
  truncate,
} from './blog';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const POST_URL = 'https://blog.cohurst.co/2024/02/penn-engineers-have-developed-new-chip.html';

const ENTRY = {
  published: { $t: '2024-02-22T09:35:00.002-05:00' },
  title: { type: 'text', $t: 'Summary of "New chip"' },
  content: {
    $t: '<p><b>&nbsp;SUMMARY</b></p><p>Penn Engineers have developed a new chip that uses light &amp; math to train AI.</p>',
  },
  link: [
    { rel: 'replies', href: 'https://blog.cohurst.co/feeds/1/comments/default' },
    { rel: 'alternate', href: POST_URL },
  ],
};

const FEED = { feed: { entry: [ENTRY] } };

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('stripHtml', () => {
  it('removes tags, decodes common entities and collapses whitespace', () => {
    expect(stripHtml('<p>A&nbsp;&amp;&nbsp;B <b>bold</b></p>\n<p>C</p>')).toBe('A & B bold C');
  });
});

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('short', 20)).toBe('short');
  });

  it('cuts at a word boundary and adds an ellipsis', () => {
    expect(truncate('one two three four five six', 20)).toBe('one two three four…');
  });
});

describe('toExcerpt', () => {
  it('skips a short lead-in label and uses the first real paragraph', () => {
    expect(toExcerpt(ENTRY.content.$t)).toBe(
      'Penn Engineers have developed a new chip that uses light & math to train AI.',
    );
  });

  it('returns an empty string for empty content', () => {
    expect(toExcerpt('')).toBe('');
  });
});

describe('normalizeEntry', () => {
  it('maps a Blogger entry to a BlogPost', () => {
    expect(normalizeEntry(ENTRY)).toEqual({
      title: 'Summary of "New chip"',
      url: POST_URL,
      publishedAt: '2024-02-22T09:35:00.002-05:00',
      excerpt: 'Penn Engineers have developed a new chip that uses light & math to train AI.',
      thumbnailUrl: null,
    });
  });

  it('uses the first image and upgrades protocol-relative URLs', () => {
    const post = normalizeEntry({
      ...ENTRY,
      content: { $t: '<div><img src="//blogger.googleusercontent.com/img/a.jpg"></div><p>Body text long enough to be the teaser paragraph.</p>' },
    });
    expect(post?.thumbnailUrl).toBe('https://blogger.googleusercontent.com/img/a.jpg');
  });

  it('returns null when the entry has no public link or title', () => {
    expect(normalizeEntry({ ...ENTRY, link: [] })).toBeNull();
    expect(normalizeEntry({ ...ENTRY, title: { $t: '' } })).toBeNull();
  });
});

describe('fetchLatestPost', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the Blogger JSON feed and returns the latest post', async () => {
    const fetchMock = mockFetchOk(FEED);
    vi.stubGlobal('fetch', fetchMock);
    const post = await fetchLatestPost('https://blog.cohurst.co');
    expect(fetchMock.mock.calls[0][0]).toBe(feedUrl('https://blog.cohurst.co'));
    expect(post?.url).toBe(POST_URL);
  });

  it('returns null when the blog has no posts', async () => {
    vi.stubGlobal('fetch', mockFetchOk({ feed: {} }));
    expect(await fetchLatestPost()).toBeNull();
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }),
    );
    await expect(fetchLatestPost()).rejects.toThrow('Blog feed error: 500');
  });
});

describe('fetchLatestPostWithFallback', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to the snapshot when the live fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const post = { title: 'Snap', url: POST_URL, publishedAt: '', excerpt: '', thumbnailUrl: null };
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ snapshotAt: 'x', blogUrl: 'x', post }) as never,
    );
    expect(await fetchLatestPostWithFallback()).toEqual(post);
  });

  it('resolves to null when both the live fetch and snapshot fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    expect(await fetchLatestPostWithFallback()).toBeNull();
  });
});
