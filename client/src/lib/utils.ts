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
