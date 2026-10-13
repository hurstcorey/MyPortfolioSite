import 'server-only';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import type { BlogPost, BlogSnapshot } from './blog.types';

/** The Blogger site backing the "Writer" section. */
export const DEFAULT_BLOG_URL = 'https://blog.cohurst.co';

const EXCERPT_MAX_CHARS = 220;
/** Skip short lead-in paragraphs (e.g. a bold "SUMMARY" label) when picking a teaser. */
const MIN_PARAGRAPH_CHARS = 40;

export function getBlogUrl(): string {
  return (process.env.NEXT_PUBLIC_BLOG_URL || DEFAULT_BLOG_URL).replace(/\/+$/, '');
}

export function feedUrl(blogUrl = getBlogUrl()): string {
  return `${blogUrl}/feeds/posts/default?alt=json&max-results=1`;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, max = EXCERPT_MAX_CHARS): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function toExcerpt(html: string): string {
  const paragraphs = html
    .split(/<\/p>|<br\s*\/?>|<\/div>/i)
    .map(stripHtml)
    .filter(Boolean);
  const lead = paragraphs.find((p) => p.length >= MIN_PARAGRAPH_CHARS) ?? paragraphs[0] ?? '';
  return truncate(lead);
}

function firstImageUrl(html: string): string | null {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!match) return null;
  const src = match[1];
  return src.startsWith('//') ? `https:${src}` : src;
}

export function normalizeEntry(entry: any): BlogPost | null {
  const links: any[] = entry?.link ?? [];
  const url: string | undefined = links.find((l) => l.rel === 'alternate')?.href;
  const title: string = entry?.title?.$t ?? '';
  if (!url || !title) return null;
  const html: string = entry?.content?.$t ?? entry?.summary?.$t ?? '';
  return {
    title,
    url,
    publishedAt: entry?.published?.$t ?? '',
    excerpt: toExcerpt(html),
    thumbnailUrl: firstImageUrl(html),
  };
}

/** Resolves to null when the blog has no posts yet. */
export async function fetchLatestPost(blogUrl = getBlogUrl()): Promise<BlogPost | null> {
  const res = await fetch(feedUrl(blogUrl), { next: { revalidate: 3600 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Blog feed error: ${res.status} ${body}`);
  }
  const data = await res.json();
  const entry = data?.feed?.entry?.[0];
  return entry ? normalizeEntry(entry) : null;
}

export async function readSnapshotFallback(): Promise<BlogPost | null> {
  const snapshotPath = path.join(process.cwd(), 'data', 'blog-snapshot.json');
  const json = await fs.readFile(snapshotPath, 'utf-8');
  return (JSON.parse(json) as BlogSnapshot).post;
}

export async function fetchLatestPostWithFallback(
  blogUrl = getBlogUrl(),
): Promise<BlogPost | null> {
  try {
    return await fetchLatestPost(blogUrl);
  } catch (err) {
    console.warn('[blog] live fetch failed, falling back to snapshot:', err);
    try {
      return await readSnapshotFallback();
    } catch {
      return null;
    }
  }
}
