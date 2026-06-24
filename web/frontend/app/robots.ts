import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/signup'],
      disallow: ['/dashboard/', '/storage/', '/article/'],
    },
    sitemap: 'https://article-generation-omega.vercel.app/sitemap.xml',
  }
}