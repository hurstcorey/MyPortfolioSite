import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(REPO_ROOT, 'data', 'blog-snapshot.json');

const BLOG_URL = (process.env.NEXT_PUBLIC_BLOG_URL || 'https://blog.cohurst.co').replace(/\/+$/, '');
const EXCERPT_MAX_CHARS = 220;
const MIN_PARAGRAPH_CHARS = 40;

// Keep stripHtml/truncate/toExcerpt/firstImageUrl in sync with src/lib/blog.ts.
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = EXCERPT_MAX_CHARS) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

function toExcerpt(html) {
  const paragraphs = html
    .split(/<\/p>|<br\s*\/?>|<\/div>/i)
    .map(stripHtml)
    .filter(Boolean);
  const lead = paragraphs.find((p) => p.length >= MIN_PARAGRAPH_CHARS) ?? paragraphs[0] ?? '';
  return truncate(lead);
}

function firstImageUrl(html) {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!match) return null;
  return match[1].startsWith('//') ? `https:${match[1]}` : match[1];
}

async function main() {
  console.log(`Fetching latest post from ${BLOG_URL}…`);
  const res = await fetch(`${BLOG_URL}/feeds/posts/default?alt=json&max-results=1`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body}`);
  }
  const data = await res.json();
  const entry = data?.feed?.entry?.[0];

  let post = null;
  const url = entry?.link?.find((l) => l.rel === 'alternate')?.href;
  const title = entry?.title?.$t ?? '';
  if (url && title) {
    const html = entry.content?.$t ?? entry.summary?.$t ?? '';
    post = {
      title,
      url,
      publishedAt: entry.published?.$t ?? '',
      excerpt: toExcerpt(html),
      thumbnailUrl: firstImageUrl(html),
    };
  }

  const snapshot = { snapshotAt: new Date().toISOString(), blogUrl: BLOG_URL, post };

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

  console.log(post ? `\n✓ Snapshotted "${post.title}".` : '\n✓ Blog has no posts; wrote an empty snapshot.');
  console.log(`  Wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
