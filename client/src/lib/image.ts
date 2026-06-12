/**
 * Replaces TMDB image URLs with optimized sizes.
 * If the URL is not from TMDB, it returns the original URL.
 * 
 * @param url The original image URL (e.g. from TMDB /original)
 * @param size The desired size, e.g. 'w300', 'w500', 'w780', 'w1280'
 * @returns Optimized URL
 */
export function getOptimizedTmdbUrl(url: string | undefined | null, size: 'w300' | 'w500' | 'w780' | 'w1280' = 'w500'): string {
  if (!url) return '';
  
  if (url.includes('image.tmdb.org')) {
    // Matches /t/p/original/ or /t/p/w500/ etc.
    return url.replace(/\/t\/p\/(original|w[0-9]+)\//, `/t/p/${size}/`);
  }
  
  return url;
}
