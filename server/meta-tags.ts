import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MetaTagsData {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}

export function generateMetaTags(data: MetaTagsData): string {
  return `
    <!-- Primary Meta Tags -->
    <meta name="title" content="${escapeHtml(data.title)}">
    <meta name="description" content="${escapeHtml(data.description)}">
    <title>${escapeHtml(data.title)}</title>
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${data.type || 'website'}">
    <meta property="og:url" content="${escapeHtml(data.url)}">
    <meta property="og:title" content="${escapeHtml(data.title)}">
    <meta property="og:description" content="${escapeHtml(data.description)}">
    <meta property="og:image" content="${escapeHtml(data.image)}">
    <meta property="og:site_name" content="StreamVault">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(data.title)}">
    <meta name="twitter:description" content="${escapeHtml(data.description)}">
    <meta name="twitter:image" content="${escapeHtml(data.image)}">
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function injectMetaTags(html: string, metaTags: string): string {
  // Remove default meta tags
  html = html.replace(/<meta name="title"[^>]*>/g, '');
  html = html.replace(/<meta name="description"[^>]*>/g, '');
  html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
  html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
  html = html.replace(/<title>.*?<\/title>/g, '');
  
  // Inject new meta tags in head
  html = html.replace('</head>', `${metaTags}\n  </head>`);
  
  return html;
}

export async function handleShowMetaTags(req: Request, res: Response, storage: any) {
  const { slug } = req.params;
  const shows = await storage.getShows();
  const show = shows.find((s: any) => s.slug === slug);
  
  if (!show) {
    return null;
  }
  
  const metaData: MetaTagsData = {
    title: `${show.title} - Watch Free on StreamVault`,
    description: show.description || `Watch ${show.title} online free in HD. ${show.totalSeasons} seasons available.`,
    image: show.posterUrl || show.backdropUrl,
    url: `${process.env.BASE_URL || 'https://streamvault.live'}/show/${slug}`,
    type: 'video.tv_show'
  };
  
  return generateMetaTags(metaData);
}

export async function handleEpisodeMetaTags(req: Request, res: Response, storage: any) {
  const { slug } = req.params;
  const season = req.query.season as string;
  const episode = req.query.episode as string;
  
  const shows = await storage.getShows();
  const show = shows.find((s: any) => s.slug === slug);
  
  if (!show) {
    return null;
  }
  
  const episodes = await storage.getEpisodes();
  const episodeData = episodes.find((e: any) => 
    e.showId === show.id && 
    e.season === parseInt(season) && 
    e.episodeNumber === parseInt(episode)
  );
  
  if (!episodeData) {
    return null;
  }
  
  const metaData: MetaTagsData = {
    title: `${show.title} S${season}E${episode}: ${episodeData.title} - StreamVault`,
    description: episodeData.description || `Watch ${show.title} Season ${season} Episode ${episode} online free in HD.`,
    image: episodeData.thumbnailUrl || show.backdropUrl,
    url: `${process.env.BASE_URL || 'https://streamvault.live'}/watch/${slug}?season=${season}&episode=${episode}`,
    type: 'video.episode'
  };
  
  return generateMetaTags(metaData);
}

export async function handleMovieMetaTags(req: Request, res: Response, storage: any) {
  const { slug } = req.params;
  const movies = await storage.getMovies();
  const movie = movies.find((m: any) => m.slug === slug);
  
  if (!movie) {
    return null;
  }
  
  const metaData: MetaTagsData = {
    title: `${movie.title} (${movie.year}) - Watch Free on StreamVault`,
    description: movie.description || `Watch ${movie.title} online free in HD. ${movie.duration} minutes.`,
    image: movie.posterUrl || movie.backdropUrl,
    url: `${process.env.BASE_URL || 'https://streamvault.live'}/movie/${slug}`,
    type: 'video.movie'
  };
  
  return generateMetaTags(metaData);
}

export async function handleMovieWatchMetaTags(req: Request, res: Response, storage: any) {
  const { slug } = req.params;
  const movies = await storage.getMovies();
  const movie = movies.find((m: any) => m.slug === slug);
  
  if (!movie) {
    return null;
  }
  
  const metaData: MetaTagsData = {
    title: `Watch ${movie.title} (${movie.year}) - StreamVault`,
    description: movie.description || `Watch ${movie.title} online free in HD.`,
    image: movie.backdropUrl || movie.posterUrl,
    url: `${process.env.BASE_URL || 'https://streamvault.live'}/watch-movie/${slug}`,
    type: 'video.movie'
  };
  
  return generateMetaTags(metaData);
}
