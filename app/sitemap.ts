import type { MetadataRoute } from 'next';
import { siteUrl, visiblePublicRoutes } from '@/lib/site-config';

// Solo le pagine pubbliche delle funzioni attive (lib/features.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return visiblePublicRoutes().map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl()}${path === '/' ? '' : path}`,
    changeFrequency,
    priority
  }));
}
