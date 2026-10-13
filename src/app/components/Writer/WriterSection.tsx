import React from "react";
import Image from "next/image";
import { fetchLatestPostWithFallback, getBlogUrl } from "@/lib/blog";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const WriterSection = async () => {
  const post = await fetchLatestPostWithFallback();
  if (!post) return null;

  const published = formatDate(post.publishedAt);

  return (
    <section id="writer" className="my-12">
      <h2 className="text-center text-4xl font-bold text-white mt-4 mb-2">
        Writer
      </h2>
      <p className="text-center text-[#ADB7BE] mb-8 md:mb-12">
        The latest from my blog.
      </p>

      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col md:flex-row max-w-3xl mx-auto rounded-xl overflow-hidden bg-[#181818] ring-1 ring-[#33353F] transition-all duration-300 hover:ring-primary-500 hover:bg-[#1f1f1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {post.thumbnailUrl && (
          <div className="relative w-full md:w-64 aspect-video md:aspect-auto md:min-h-[12rem] flex-none bg-black">
            <Image
              src={post.thumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 256px, 100vw"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-6 flex flex-col justify-center">
          {published && (
            <p className="text-primary-500 text-sm font-medium mb-2">{published}</p>
          )}
          <h3 className="text-white text-xl font-semibold group-hover:text-primary-500 transition-colors duration-300">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-[#ADB7BE] mt-3 line-clamp-4">{post.excerpt}</p>
          )}
          <span className="mt-4 text-primary-500 font-semibold">Read more →</span>
        </div>
      </a>

      <div className="text-center mt-8">
        <a
          href={getBlogUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary-500 hover:underline font-semibold"
        >
          Visit the blog →
        </a>
      </div>
    </section>
  );
};

export default WriterSection;
