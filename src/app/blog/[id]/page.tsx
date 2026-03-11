import type { Metadata } from "next";
import { mockBlogs } from "@/data/mock";
import { BlogDetailPage } from "@/components/blogs/BlogDetailPage";

export function generateStaticParams() {
  return mockBlogs.map((blog) => ({
    id: blog.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blog = mockBlogs.find((b) => b.id === id);

  if (!blog) {
    return {
      title: "Blog Not Found",
      description: "The requested blog post could not be found.",
    };
  }

  const title = `${blog.title} | Tales on 2 Wheels Blog`;
  const description =
    blog.excerpt.length > 160
      ? blog.excerpt.slice(0, 157) + "..."
      : blog.excerpt;
  const url = `https://taleson2wheels.com/blog/${blog.id}`;

  return {
    title,
    description,
    keywords: [
      ...blog.tags.map((t) => `${t} motorcycle`),
      "motorcycle blog India",
      "riding story",
      "Tales on 2 Wheels blog",
      "T2W blog",
      "motorcycle travel India",
    ],
    openGraph: {
      type: "article",
      title: blog.title,
      description,
      url,
      publishedTime: blog.publishDate,
      authors: [blog.author],
      tags: blog.tags,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${blog.title} - Tales on 2 Wheels`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      images: ["/og-image.jpg"],
    },
    alternates: {
      canonical: url,
    },
  };
}

function BlogArticleSchema({ blogId }: { blogId: string }) {
  const blog = mockBlogs.find((b) => b.id === blogId);
  if (!blog) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt,
    articleBody: blog.content,
    datePublished: blog.publishDate,
    dateModified: blog.publishDate,
    author: {
      "@type": "Person",
      name: blog.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Tales on 2 Wheels",
      url: "https://taleson2wheels.com",
      logo: {
        "@type": "ImageObject",
        url: "https://taleson2wheels.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://taleson2wheels.com/blog/${blog.id}`,
    },
    image: "https://taleson2wheels.com/og-image.jpg",
    keywords: blog.tags.join(", "),
    wordCount: blog.content.split(/\s+/).length,
    timeRequired: `PT${blog.readTime}M`,
    inLanguage: "en-IN",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <BlogArticleSchema blogId={id} />
      <BlogDetailPage blogId={id} />
    </>
  );
}
