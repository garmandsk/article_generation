import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://article-generation-omega.vercel.app";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'yearly', // Seberapa sering halaman ini berubah?
      priority: 1.0,             // Prioritas tertinggi (1.0) untuk beranda utama
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,             // Prioritas sedikit lebih rendah untuk halaman login
    },
  ];
}