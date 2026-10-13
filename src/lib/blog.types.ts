export interface BlogPost {
  title: string;
  /** Public post page on the blog. */
  url: string;
  publishedAt: string;
  /** Plain-text teaser taken from the start of the post. */
  excerpt: string;
  /** First image in the post, when it has one. */
  thumbnailUrl: string | null;
}

export interface BlogSnapshot {
  snapshotAt: string;
  blogUrl: string;
  post: BlogPost | null;
}
