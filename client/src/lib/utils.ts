import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGoogleDriveDownloadUrl(url: string | null | undefined): string {
  if (!url) return '';

  // If it's not a Google Drive URL, return as is
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
    return url;
  }

  // Extract ID
  let id = '';
  const match = url.match(/\/d\/([^/]+)/);
  if (match) {
    id = match[1];
  } else {
    const matchId = url.match(/id=([^&]+)/);
    if (matchId) id = matchId[1];
  }

  if (id) {
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }

  return url;
}

export function isIndianDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.in') || window.location.hostname === 'localhost';
}

/**
 * Single source of truth for "is this hostname our ad-rendering domain?".
 * Must match the check inside `ad-manager.tsx` so redirects stay in sync.
 */
export function isAdDomainHostname(hostname: string): boolean {
  return hostname.includes('streamvault.in') || hostname === 'localhost' || hostname === '127.0.0.1';
}

export function isOnAdDomain(): boolean {
  if (typeof window === 'undefined') return true;
  return isAdDomainHostname(window.location.hostname);
}

/**
 * If the user is on a non-ad domain (e.g. streamvault.live), redirect them
 * to the ad domain (streamvault.in) preserving path + query string, so ads
 * render and monetization gates can earn revenue.
 *
 * Returns `true` if a redirect was triggered; caller should early-return.
 */
export function redirectToAdDomainIfNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  if (isOnAdDomain()) return false;

  // Map the current host to its .in equivalent. Supports:
  //   streamvault.live              -> streamvault.in
  //   www.streamvault.live          -> www.streamvault.in
  //   sub.streamvault.live          -> sub.streamvault.in
  const currentHost = window.location.hostname;
  const targetHost = currentHost.replace(/\.live$/, '.in');
  if (targetHost === currentHost) return false; // unknown host, bail

  const { pathname, search, hash } = window.location;
  const targetUrl = `https://${targetHost}${pathname}${search}${hash}`;

  // Use replace so the back button returns to the previous page, not .live
  window.location.replace(targetUrl);
  return true;
}

/**
 * Builds a URL to the in-app download gateway page, which shows ads + monetization
 * before revealing the actual download link. This replaces direct archive.org redirects.
 */
export function buildDownloadGatewayUrl(
  type: 'movie' | 'show' | 'anime',
  id: string,
  episodeId?: string
): string {
  const params = new URLSearchParams();
  if (episodeId) params.set('ep', episodeId);
  const qs = params.toString();
  return `/download/${type}/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`;
}

/**
 * Wraps an external URL (archive.org / drive.google.com) in a server-side redirect
 * from our own domain so the download starts from streamvault.* briefly before
 * following through. Also triggers download headers.
 */
export function getSafeDownloadUrl(
  url: string | null | undefined,
  filename?: string
): string {
  if (!url) return '';

  // First transform google drive view URLs into direct-download URLs
  const directUrl = getGoogleDriveDownloadUrl(url);

  // base64url-encode (URL-safe, no padding)
  const b64 = btoa(unescape(encodeURIComponent(directUrl)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const params = new URLSearchParams({ u: b64 });
  if (filename) params.set('name', filename);
  return `/api/dl?${params.toString()}`;
}

/**
 * Sanitises a title/name for use as a downloaded filename.
 */
export function sanitizeFilename(name: string, ext: string = 'mp4'): string {
  const clean = (name || 'download').replace(/[^\w.\-() ]/g, '_').trim().slice(0, 120);
  return `${clean}.${ext}`;
}
