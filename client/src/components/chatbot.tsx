import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Star, Clock, TrendingUp, Film, Tv, Shuffle, Play, Mic, MicOff, Volume2, Info, ExternalLink, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Show, Movie, Episode, Anime } from "@shared/schema";
import { Link, useLocation } from "wouter";

interface ContentLink {
  title: string;
  slug: string;
  type: 'show' | 'movie' | 'anime';
  rating?: string;
  year?: number;
  poster?: string;
  description?: string;
  cast?: string;
  seasons?: number;
  episodes?: number;
  trailerUrl?: string;
  duration?: string;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  suggestions?: string[];
  showLinks?: ContentLink[];
  quickActions?: Array<{ label: string; icon: string; action: string }>;
}

interface ConversationContext {
  lastGenre?: string;
  lastType?: 'show' | 'movie' | 'anime';
  lastRecommendedTitle?: string;
  lastResults?: ContentLink[];
  lastQuery?: string;
  searchHistory: string[];
  recommendedIds: string[];
}

interface UserPreferences {
  favoriteGenres: Record<string, number>;
  preferredType: 'show' | 'movie' | 'anime' | null;
  clickedContent: string[];
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const settings = localStorage.getItem('streamvault_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.chatbotEnabled !== false; // Default to true
      }
      return true;
    } catch { return true; }
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "👋 Hey! I'm **Vault AI**, your streaming assistant!\n\n🎤 **Voice**: Tap the mic to speak\n🎬 **Play**: Say \"Play Breaking Bad\"\n🎌 **Anime**: I know anime too!\n\nWhat are you in the mood for?",
      isBot: true,
      suggestions: [
        "🎲 Surprise me",
        "🔥 What's hot?",
        "🎌 Top anime",
        "📺 Continue watching",
      ],
      quickActions: [
        { label: "Random Pick", icon: "🎲", action: "surprise" },
        { label: "Trending", icon: "🔥", action: "trending" },
        { label: "Anime", icon: "🎌", action: "anime" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<ConversationContext>({
    searchHistory: [],
    recommendedIds: [],
    lastRecommendedTitle: undefined,
    lastResults: undefined,
    lastQuery: undefined,
  });
  const [isListening, setIsListening] = useState(false);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem('chatbot-preferences');
      return stored ? JSON.parse(stored) : { favoriteGenres: {}, preferredType: null, clickedContent: [] };
    } catch { return { favoriteGenres: {}, preferredType: null, clickedContent: [] }; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [location, navigate] = useLocation();

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent) => {
      if (e.detail.key === 'chatbotEnabled') {
        setIsEnabled(e.detail.value);
      }
    };

    window.addEventListener('settings-changed', handleSettingsChange as EventListener);
    return () => window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
  }, []);

  const { data: shows } = useQuery<Show[]>({
    queryKey: ["/api/shows"],
  });

  const { data: movies } = useQuery<Movie[]>({
    queryKey: ["/api/movies"],
  });

  const { data: episodes } = useQuery<Episode[]>({
    queryKey: ["/api/episodes"],
  });

  const { data: anime } = useQuery<Anime[]>({
    queryKey: ["/api/anime"],
  });

  // Get watch history from localStorage
  const getWatchHistory = (): Array<{ title: string; slug: string; type: string; lastWatched: number }> => {
    try {
      const stored = localStorage.getItem('continue-watching');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Object.values(parsed).sort((a: any, b: any) => b.lastWatched - a.lastWatched).slice(0, 5) as any;
    } catch { return []; }
  };

  // Build watch data for the AI brain: full history (oldest→newest) + recent watches.
  const getWatchData = (): { watchHistory: string[]; recentWatch: string[] } => {
    try {
      const stored = localStorage.getItem('continue-watching');
      if (!stored) return { watchHistory: [], recentWatch: [] };
      const items = Object.values(JSON.parse(stored)) as any[];
      const sorted = items
        .filter((h) => h && h.title)
        .sort((a, b) => (a.lastWatched || 0) - (b.lastWatched || 0)); // oldest first
      const fmt = (h: any) => `${h.title}${h.type ? ` (${h.type})` : ''}`;
      const watchHistory = sorted.slice(-30).map(fmt);
      const recentWatch = sorted.slice().reverse().slice(0, 5).map(fmt);
      return { watchHistory, recentWatch };
    } catch { return { watchHistory: [], recentWatch: [] }; }
  };

  // Commands that perform navigation / side-effects stay on the fast local engine.
  const isActionIntent = (msg: string): boolean => {
    const m = msg.toLowerCase().trim();
    if (/^(play|watch|start|resume)\s+/.test(m)) return true;
    if (m === 'play it' || m === 'watch it' || m === 'play this' || m === 'watch this') return true;
    if (
      context.lastResults && context.lastResults.length > 0 &&
      /^(the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+)(\s+one)?$/.test(m)
    ) return true;
    return false;
  };

  // Save user preferences
  const savePrefs = (prefs: UserPreferences) => {
    setUserPrefs(prefs);
    try { localStorage.setItem('chatbot-preferences', JSON.stringify(prefs)); } catch { }
  };

  // Track genre preference
  const trackGenre = (genre: string) => {
    const newPrefs = { ...userPrefs };
    newPrefs.favoriteGenres[genre] = (newPrefs.favoriteGenres[genre] || 0) + 1;
    savePrefs(newPrefs);
  };

  // Track content click
  const trackClick = (slug: string, type: 'show' | 'movie' | 'anime') => {
    const newPrefs = { ...userPrefs };
    if (!newPrefs.clickedContent.includes(slug)) {
      newPrefs.clickedContent = [...newPrefs.clickedContent.slice(-20), slug];
    }
    newPrefs.preferredType = type;
    savePrefs(newPrefs);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // If chatbot is disabled, don't render (must be after all hooks)
  if (!isEnabled) {
    return null;
  }

  // Fuzzy search with scoring
  const fuzzyMatch = (text: string, query: string): number => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerText === lowerQuery) return 100;
    if (lowerText.includes(lowerQuery)) return 80;
    if (lowerText.startsWith(lowerQuery)) return 90;

    // Check word matches
    const textWords = lowerText.split(/\s+/);
    const queryWords = lowerQuery.split(/\s+/);
    let matchScore = 0;

    for (const qWord of queryWords) {
      for (const tWord of textWords) {
        if (tWord.includes(qWord) || qWord.includes(tWord)) {
          matchScore += 20;
        }
      }
    }

    return matchScore;
  };

  const findShows = (query: string, limit = 5): Show[] => {
    if (!shows || !query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();

    const scored = shows.map(show => {
      const lowerTitle = show.title.toLowerCase();

      // Heavy boost for title matches
      let titleScore = 0;
      if (lowerTitle === lowerQuery) titleScore = 200; // Exact match
      else if (lowerTitle.includes(lowerQuery)) titleScore = 150; // Contains query
      else if (lowerQuery.includes(lowerTitle)) titleScore = 120; // Query contains title
      else titleScore = fuzzyMatch(show.title, query);

      // Lower weights for other fields
      const genreScore = fuzzyMatch(show.genres || '', query) * 0.3;
      const castScore = fuzzyMatch(show.cast || '', query) * 0.2;

      return {
        show,
        score: titleScore + genreScore + castScore
      };
    });

    return scored
      .filter(s => s.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.show);
  };

  const findMovies = (query: string, limit = 5): Movie[] => {
    if (!movies || !query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();

    const scored = movies.map(movie => {
      const lowerTitle = movie.title.toLowerCase();

      // Heavy boost for title matches
      let titleScore = 0;
      if (lowerTitle === lowerQuery) titleScore = 200;
      else if (lowerTitle.includes(lowerQuery)) titleScore = 150;
      else if (lowerQuery.includes(lowerTitle)) titleScore = 120;
      else titleScore = fuzzyMatch(movie.title, query);

      const genreScore = fuzzyMatch(movie.genres || '', query) * 0.3;
      const castScore = fuzzyMatch(movie.cast || '', query) * 0.2;

      return {
        movie,
        score: titleScore + genreScore + castScore
      };
    });

    return scored
      .filter(m => m.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(m => m.movie);
  };

  const findAnime = (query: string, limit = 5): Anime[] => {
    if (!anime || !query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();

    const scored = anime.map(item => {
      const lowerTitle = item.title.toLowerCase();

      // Heavy boost for title matches
      let titleScore = 0;
      if (lowerTitle === lowerQuery) titleScore = 200;
      else if (lowerTitle.includes(lowerQuery)) titleScore = 150;
      else if (lowerQuery.includes(lowerTitle)) titleScore = 120;
      else titleScore = fuzzyMatch(item.title, query);

      const genreScore = fuzzyMatch(item.genres || '', query) * 0.3;

      return {
        item,
        score: titleScore + genreScore
      };
    });

    return scored
      .filter(a => a.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(a => a.item);
  };

  // Get similar content based on genres (now includes anime)
  const getSimilarContent = (title: string): (Show | Movie | Anime)[] => {
    const allContent = [...(shows || []), ...(movies || []), ...(anime || [])];
    const source = allContent.find(c => c.title.toLowerCase().includes(title.toLowerCase()));

    if (!source) return [];

    const sourceGenres = source.genres?.toLowerCase().split(',').map(g => g.trim()) || [];

    return allContent
      .filter(c => c.id !== source.id)
      .map(c => {
        const cGenres = c.genres?.toLowerCase().split(',').map(g => g.trim()) || [];
        const matchCount = sourceGenres.filter(g => cGenres.includes(g)).length;
        return { content: c, matchCount };
      })
      .filter(c => c.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5)
      .map(c => c.content);
  };

  // Get random recommendation (now includes anime)
  const getRandomPick = (): (Show | Movie | Anime) | null => {
    const allContent = [...(shows || []), ...(movies || []), ...(anime || [])];
    const highRated = allContent.filter(c => parseFloat(c.imdbRating || '0') >= 7.5);
    if (highRated.length === 0) return null;
    return highRated[Math.floor(Math.random() * highRated.length)];
  };

  // Get top rated content (now includes anime)
  const getTopRated = (type?: 'show' | 'movie' | 'anime', limit = 5): (Show | Movie | Anime)[] => {
    let content: (Show | Movie | Anime)[] = [];

    if (type === 'movie') {
      content = [...(movies || [])];
    } else if (type === 'show') {
      content = [...(shows || [])];
    } else if (type === 'anime') {
      content = [...(anime || [])];
    } else {
      content = [...(shows || []), ...(movies || []), ...(anime || [])];
    }

    return content
      .sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'))
      .slice(0, limit);
  };

  // Get content by mood/vibe (now includes anime)
  const getByMood = (mood: string): (Show | Movie | Anime)[] => {
    const moodGenres: Record<string, string[]> = {
      'happy': ['comedy', 'animation', 'family', 'slice of life'],
      'sad': ['drama', 'romance'],
      'excited': ['action', 'thriller', 'adventure', 'shonen'],
      'scared': ['horror', 'mystery', 'thriller', 'psychological'],
      'romantic': ['romance', 'drama', 'shoujo'],
      'thoughtful': ['documentary', 'drama', 'mystery', 'seinen'],
      'relaxed': ['comedy', 'animation', 'family', 'iyashikei'],
      'adventurous': ['action', 'adventure', 'sci-fi', 'fantasy', 'isekai'],
    };

    const genres = moodGenres[mood.toLowerCase()] || [];
    const allContent = [...(shows || []), ...(movies || []), ...(anime || [])];

    return allContent
      .filter(c => {
        const cGenres = c.genres?.toLowerCase() || '';
        return genres.some(g => cGenres.includes(g));
      })
      .sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'))
      .slice(0, 5);
  };

  // Type guards
  const isMovie = (item: Show | Movie | Anime): item is Movie => {
    return 'googleDriveUrl' in item && !('episodes' in item);
  };

  const isAnime = (item: Show | Movie | Anime): item is Anime => {
    return 'episodes' in item && 'malId' in item;
  };

  // Format content for display with enhanced details
  const formatContent = (items: (Show | Movie | Anime)[]): ContentLink[] => {
    return items.map(item => {
      let type: 'show' | 'movie' | 'anime' = 'show';
      if (isAnime(item)) type = 'anime';
      else if (isMovie(item)) type = 'movie';

      return {
        title: item.title,
        slug: item.slug,
        type,
        rating: item.imdbRating || undefined,
        year: item.year,
        poster: item.posterUrl || undefined,
        description: item.description?.slice(0, 80) || undefined,
        cast: item.cast?.split(',').slice(0, 3).join(', ') || undefined,
        duration: isMovie(item) && item.duration ? `${item.duration}m` : undefined,
        trailerUrl: (item as any).trailerUrl || undefined,
      };
    });
  };

  // Parse markdown-like text to render bold
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const generateResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();

    // Update context with search history
    setContext(prev => ({
      ...prev,
      searchHistory: [...prev.searchHistory.slice(-5), userMessage],
    }));

    // ===== BROWSE GENRES =====
    if (
      lowerMessage.includes("browse genre") ||
      lowerMessage.includes("genres") ||
      lowerMessage === "browse"
    ) {
      return {
        id: Date.now().toString(),
        text: "🎭 Pick a genre to explore:",
        isBot: true,
        suggestions: ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Animation", "Anime"],
      };
    }

    // ===== ANIME SPECIFIC =====
    if (
      lowerMessage.includes("anime") ||
      lowerMessage.includes("shonen") ||
      lowerMessage.includes("isekai") ||
      lowerMessage.includes("manga")
    ) {
      const matchedAnime = findAnime(userMessage.replace(/anime|recommend|best|good|top/gi, '').trim(), 5);

      if (matchedAnime.length > 0) {
        const results = formatContent(matchedAnime);
        setContext(prev => ({ ...prev, lastResults: results, lastType: 'anime' }));
        return {
          id: Date.now().toString(),
          text: `🎌 Found ${matchedAnime.length} anime for you:`,
          isBot: true,
          showLinks: results,
          suggestions: ["More anime", "Top rated anime", "🎲 Surprise me"],
        };
      }

      // Show top anime if no specific match
      const topAnime = getTopRated('anime', 5);
      if (topAnime.length > 0) {
        trackGenre('anime');
        return {
          id: Date.now().toString(),
          text: "🎌 Here are some great anime to watch:",
          isBot: true,
          showLinks: formatContent(topAnime),
          suggestions: ["Action anime", "Romance anime", "Fantasy anime"],
        };
      }
    }

    // ===== STREAMING/PLAY COMMANDS =====
    const playMatch = lowerMessage.match(/(?:play|watch|start|resume|continue)\s+(.+)/i);
    if (playMatch) {
      const query = playMatch[1].replace(/the|movie|show|anime|episode/gi, '').trim();

      // Check for specific episode pattern
      const epMatch = query.match(/(.+?)\s*(?:s|season)?\s*(\d+)\s*(?:e|ep|episode)?\s*(\d+)/i);
      if (epMatch) {
        const showName = epMatch[1].trim();
        const season = parseInt(epMatch[2]);
        const ep = parseInt(epMatch[3]);
        const foundShow = shows?.find(s => s.title.toLowerCase().includes(showName.toLowerCase()));
        if (foundShow) {
          navigate(`/watch/${foundShow.slug}?season=${season}&episode=${ep}`);
          return {
            id: Date.now().toString(),
            text: `▶️ Starting ${foundShow.title} S${season}E${ep}...`,
            isBot: true,
            suggestions: ["Next episode", "🎲 Surprise me"],
          };
        }
      }

      // Find content to play
      const found = [...findShows(query, 1), ...findMovies(query, 1), ...findAnime(query, 1)][0];
      if (found) {
        const type = isAnime(found) ? 'anime' : isMovie(found) ? 'movie' : 'show';
        const url = type === 'movie' ? `/watch-movie/${found.slug}` : type === 'anime' ? `/watch-anime/${found.slug}` : `/watch/${found.slug}`;
        navigate(url);
        return {
          id: Date.now().toString(),
          text: `▶️ Starting "${found.title}"...`,
          isBot: true,
          suggestions: ["Similar content", "🎲 Surprise me"],
        };
      }
    }

    // ===== CONTINUE WATCHING =====
    if (
      lowerMessage.includes("continue") ||
      lowerMessage.includes("resume") ||
      lowerMessage.includes("what was i watching") ||
      lowerMessage.includes("watch history")
    ) {
      const history = getWatchHistory();
      if (history.length > 0) {
        const historyLinks: ContentLink[] = history.map(h => ({
          title: h.title,
          slug: h.slug,
          type: h.type as 'show' | 'movie' | 'anime',
        }));
        return {
          id: Date.now().toString(),
          text: "📺 Continue where you left off:",
          isBot: true,
          showLinks: historyLinks,
          suggestions: ["🎲 Surprise me", "Top rated", "Browse genres"],
        };
      }
      return {
        id: Date.now().toString(),
        text: "You haven't watched anything yet! Let me help you get started:",
        isBot: true,
        suggestions: ["🎲 Surprise me", "🔥 What's trending", "Top rated"],
      };
    }

    // ===== TELL ME ABOUT / DETAILS =====
    const aboutMatch = lowerMessage.match(/(?:tell me about|info about|details about|what is|what's|about)\s+(.+)/i);
    if (aboutMatch) {
      const query = aboutMatch[1].replace(/['"]/g, '').trim();
      const allContent = [...(shows || []), ...(movies || []), ...(anime || [])];
      const found = allContent.find(c => c.title.toLowerCase().includes(query.toLowerCase()));

      if (found) {
        const type = isAnime(found) ? 'anime' : isMovie(found) ? 'movie' : 'show';
        const typeEmoji = type === 'anime' ? '🎌' : type === 'movie' ? '🎬' : '📺';

        // Build detailed info
        let details = `${typeEmoji} **${found.title}** (${found.year})\n\n`;
        if (found.imdbRating) details += `⭐ **Rating:** ${found.imdbRating}/10\n`;
        if (found.genres) details += `🎭 **Genres:** ${found.genres}\n`;
        if (isMovie(found) && found.duration) details += `⏱️ **Duration:** ${found.duration} min\n`;
        if (!isMovie(found) && !isAnime(found) && (found as any).seasons) details += `📺 **Seasons:** ${(found as any).seasons}\n`;
        if (found.cast) details += `👥 **Cast:** ${found.cast.split(',').slice(0, 5).join(', ')}\n`;
        details += `\n📖 ${found.description?.slice(0, 200)}...`;

        setContext(prev => ({ ...prev, lastRecommendedTitle: found.title, lastResults: formatContent([found]) }));

        return {
          id: Date.now().toString(),
          text: details,
          isBot: true,
          showLinks: [{
            title: `▶️ Watch ${found.title}`,
            slug: found.slug,
            type,
            poster: found.posterUrl || undefined,
            rating: found.imdbRating || undefined,
          }],
          suggestions: ["Similar to this", `Play ${found.title}`, "🎲 Surprise me"],
        };
      }
    }

    // ===== MULTI-TURN: Play/Select from last results =====  
    if (context.lastResults && context.lastResults.length > 0) {
      const numMatch = lowerMessage.match(/(?:the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|\d+)(?:\s+one)?/i);
      if (numMatch || lowerMessage === "play it" || lowerMessage === "watch it") {
        let index = 0;
        if (numMatch) {
          const numWord = numMatch[1].toLowerCase();
          const numMap: Record<string, number> = { 'first': 0, '1st': 0, 'second': 1, '2nd': 1, 'third': 2, '3rd': 2, 'fourth': 3, '4th': 3, 'fifth': 4, '5th': 4 };
          index = numMap[numWord] !== undefined ? numMap[numWord] : (parseInt(numWord) - 1) || 0;
        }
        const selected = context.lastResults[index];
        if (selected) {
          const url = selected.type === 'movie' ? `/watch-movie/${selected.slug}` : selected.type === 'anime' ? `/watch-anime/${selected.slug}` : `/watch/${selected.slug}`;
          navigate(url);
          return {
            id: Date.now().toString(),
            text: `▶️ Playing "${selected.title}"...`,
            isBot: true,
            suggestions: ["Similar content", "🎲 Surprise me"],
          };
        }
      }
    }

    // ===== REFUND POLICY =====
    if (
      lowerMessage.includes("refund") ||
      lowerMessage.includes("return") ||
      lowerMessage.includes("money back") ||
      lowerMessage.includes("cancel purchase")
    ) {
      return {
        id: Date.now().toString(),
        text: "📜 **StreamVault Refund Policy**\n\n🚫 **All purchases are final.**\nSince our items are digital collectibles and instantly delivered, we do not offer refunds.\n\n⚠️ **Technical Issue?**\nIf you didn't receive your item, please contact [Support](/refund).",
        isBot: true,
        suggestions: ["Visit Store", "Contact Support", "Top rated"],
      };
    }

    // ===== HELP / PLAYBACK ISSUES (moved up for priority) =====
    if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("not working") ||
      lowerMessage.includes("error") ||
      lowerMessage.includes("problem") ||
      lowerMessage.includes("issue") ||
      lowerMessage.includes("video error") ||
      lowerMessage.includes("playback")
    ) {
      return {
        id: Date.now().toString(),
        text: "🔧 **Troubleshooting Tips:**\n\n1. Refresh the page\n2. Clear browser cache\n3. Try a different browser\n4. Check internet connection\n5. Disable ad blockers\n\nStill stuck? Try a different title!",
        isBot: true,
        suggestions: ["🎲 Surprise me", "🔥 What's trending", "Top rated"],
      };
    }

    // ===== SURPRISE ME / RANDOM =====
    if (
      lowerMessage.includes("surprise") ||
      lowerMessage.includes("random") ||
      lowerMessage.includes("🎲") ||
      lowerMessage.includes("anything") ||
      lowerMessage.includes("don't know") ||
      lowerMessage.includes("dont know") ||
      lowerMessage.includes("another one")
    ) {
      const pick = getRandomPick();
      if (pick) {
        const type = isMovie(pick) ? 'movie' : 'show';
        // Store the last recommended title for "Similar to this"
        setContext(prev => ({ ...prev, lastRecommendedTitle: pick.title }));
        return {
          id: Date.now().toString(),
          text: `Here's my pick for you!`,
          isBot: true,
          showLinks: [{ title: pick.title, slug: pick.slug, type, rating: pick.imdbRating || undefined, year: pick.year, poster: pick.posterUrl || undefined, description: pick.description?.slice(0, 100) || undefined }],
          suggestions: ["Another one!", "Similar to this", "Top rated instead"],
        };
      }
    }

    // ===== SIMILAR TO THIS (context-aware) =====
    if (lowerMessage === "similar to this" || lowerMessage === "similar content") {
      if (context.lastRecommendedTitle) {
        const similar = getSimilarContent(context.lastRecommendedTitle);
        if (similar.length > 0) {
          const firstTitle = similar[0]?.title;
          if (firstTitle) {
            setContext(prev => ({ ...prev, lastRecommendedTitle: firstTitle }));
          }
          return {
            id: Date.now().toString(),
            text: `🎯 Similar to "${context.lastRecommendedTitle}":`,
            isBot: true,
            showLinks: formatContent(similar),
            suggestions: ["🎲 Surprise me", "Top rated", "Browse genres"],
          };
        }
      }
      return {
        id: Date.now().toString(),
        text: "I don't have a previous recommendation to compare. Let me pick something for you!",
        isBot: true,
        suggestions: ["🎲 Surprise me", "🔥 What's trending", "Top rated"],
      };
    }

    // ===== SIMILAR TO / LIKE =====
    const similarMatch = lowerMessage.match(/(?:similar to|like|recommend.*like|something like)\s+(.+)/i);
    if (similarMatch) {
      const title = similarMatch[1].replace(/['"]/g, '').trim();
      if (title === "this") {
        // Handle "similar to this" case
        if (context.lastRecommendedTitle) {
          const similar = getSimilarContent(context.lastRecommendedTitle);
          if (similar.length > 0) {
            return {
              id: Date.now().toString(),
              text: `🎯 Similar to "${context.lastRecommendedTitle}":`,
              isBot: true,
              showLinks: formatContent(similar),
              suggestions: ["🎲 Surprise me", "Top rated", "Browse genres"],
            };
          }
        }
      }
      const similar = getSimilarContent(title);

      if (similar.length > 0) {
        setContext(prev => ({ ...prev, lastRecommendedTitle: title }));
        return {
          id: Date.now().toString(),
          text: `🎯 If you liked "${title}", you might enjoy these:`,
          isBot: true,
          showLinks: formatContent(similar),
          suggestions: ["🎲 Surprise me", "Top rated", "More recommendations"],
        };
      } else {
        return {
          id: Date.now().toString(),
          text: `I couldn't find "${title}" in our library. Try a different title or browse by genre!`,
          isBot: true,
          suggestions: ["Browse genres", "🔥 What's trending", "Top rated"],
        };
      }
    }

    // ===== MOOD-BASED =====
    const moods = ['happy', 'sad', 'excited', 'scared', 'romantic', 'thoughtful', 'relaxed', 'adventurous'];
    const foundMood = moods.find(m => lowerMessage.includes(m));
    if (foundMood || lowerMessage.includes("mood") || lowerMessage.includes("feel like")) {
      const mood = foundMood || 'excited';
      const moodContent = getByMood(mood);

      if (moodContent.length > 0) {
        const emoji = { happy: '😊', sad: '😢', excited: '🔥', scared: '😱', romantic: '💕', thoughtful: '🤔', relaxed: '😌', adventurous: '🗺️' }[mood] || '🎬';
        return {
          id: Date.now().toString(),
          text: `${emoji} Perfect picks for your ${mood} mood:`,
          isBot: true,
          showLinks: formatContent(moodContent),
          suggestions: ["Different mood", "🎲 Surprise me", "Top rated"],
        };
      }
    }

    // ===== TOP RATED =====
    if (
      lowerMessage.includes("top rated") ||
      lowerMessage.includes("best") ||
      lowerMessage.includes("highest rated") ||
      lowerMessage.includes("⭐")
    ) {
      const type = lowerMessage.includes("movie") ? 'movie' : lowerMessage.includes("show") ? 'show' : undefined;
      const topRated = getTopRated(type, 5);

      if (topRated.length > 0) {
        const label = type === 'movie' ? 'movies' : type === 'show' ? 'shows' : 'titles';
        return {
          id: Date.now().toString(),
          text: `⭐ Top rated ${label} in our library:`,
          isBot: true,
          showLinks: formatContent(topRated),
          suggestions: ["Top movies", "Top shows", "🎲 Surprise me"],
        };
      }
    }

    // ===== TRENDING / HOT =====
    if (
      lowerMessage.includes("trending") ||
      lowerMessage.includes("popular") ||
      lowerMessage.includes("hot") ||
      lowerMessage.includes("🔥")
    ) {
      const trendingShows = shows?.filter(s => s.trending).slice(0, 3) || [];
      const trendingMovies = movies?.filter(m => m.trending).slice(0, 2) || [];
      const combined = [...trendingShows, ...trendingMovies];

      if (combined.length > 0) {
        return {
          id: Date.now().toString(),
          text: "🔥 What's hot right now:",
          isBot: true,
          showLinks: formatContent(combined),
          suggestions: ["Top rated", "🎲 Surprise me", "Browse genres"],
        };
      }
    }

    // ===== SPECIFIC EPISODE =====
    const episodeMatch = userMessage.match(/(.+?)\s*(?:season|s)\s*(\d+)\s*(?:episode|ep|e)\s*(\d+)/i);
    if (episodeMatch) {
      const showName = episodeMatch[1].trim();
      const season = parseInt(episodeMatch[2]);
      const episode = parseInt(episodeMatch[3]);

      const foundShow = shows?.find(s =>
        s.title.toLowerCase().includes(showName.toLowerCase())
      );

      if (foundShow) {
        // Find the specific episode to get its thumbnail
        const foundEpisode = episodes?.find(ep =>
          ep.showId === foundShow.id &&
          ep.season === season &&
          ep.episodeNumber === episode
        );

        const episodeThumbnail = foundEpisode?.thumbnailUrl || foundShow.backdropUrl || foundShow.posterUrl;
        const episodeTitle = foundEpisode?.title || `Episode ${episode}`;
        const episodeDescription = foundEpisode?.description?.slice(0, 100) || '';

        return {
          id: Date.now().toString(),
          text: `🎬 Found it! Click to watch ${foundShow.title} S${season}E${episode}:`,
          isBot: true,
          showLinks: [{
            title: `▶️ ${foundShow.title} - ${episodeTitle}`,
            slug: `${foundShow.slug}?season=${season}&episode=${episode}`,
            type: 'show' as const,
            poster: episodeThumbnail,
            description: episodeDescription,
          }],
          suggestions: ["Next episode", "Show info", "Find another show"],
        };
      }
    }

    // ===== GENRE SEARCHES =====
    const genreKeywords: Record<string, string[]> = {
      'action': ['action', 'thriller', 'adventure'],
      'comedy': ['comedy', 'funny', 'laugh'],
      'drama': ['drama', 'emotional', 'serious'],
      'horror': ['horror', 'scary', 'creepy', 'spooky'],
      'romance': ['romance', 'romantic', 'love'],
      'scifi': ['sci-fi', 'science fiction', 'space', 'futuristic'],
      'fantasy': ['fantasy', 'magic', 'magical'],
      'crime': ['crime', 'detective', 'mystery', 'murder'],
      'documentary': ['documentary', 'doc', 'real'],
      'animation': ['animation', 'animated', 'cartoon', 'anime'],
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(k => lowerMessage.includes(k))) {
        const allContent = [...(shows || []), ...(movies || [])];
        const genreContent = allContent
          .filter(c => {
            const cGenres = c.genres?.toLowerCase() || '';
            return keywords.some(k => cGenres.includes(k));
          })
          .sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'))
          .slice(0, 5);

        if (genreContent.length > 0) {
          const emoji = { action: '💥', comedy: '😂', drama: '🎭', horror: '👻', romance: '💕', scifi: '🚀', fantasy: '✨', crime: '🔍', documentary: '📹', animation: '🎨' }[genre] || '🎬';
          return {
            id: Date.now().toString(),
            text: `${emoji} Best ${genre} content for you:`,
            isBot: true,
            showLinks: formatContent(genreContent),
            suggestions: ["More genres", "🎲 Surprise me", "Top rated"],
          };
        }
      }
    }

    // ===== MOVIES SPECIFICALLY =====
    if (lowerMessage.includes("movie") || lowerMessage.includes("film")) {
      const matchedMovies = findMovies(userMessage.replace(/movie|film/gi, '').trim(), 5);

      if (matchedMovies.length > 0) {
        return {
          id: Date.now().toString(),
          text: `🎬 Found ${matchedMovies.length} movie(s):`,
          isBot: true,
          showLinks: formatContent(matchedMovies),
          suggestions: ["Top rated movies", "🎲 Random movie", "Browse shows"],
        };
      }

      // Show top movies if no specific match
      const topMovies = getTopRated('movie', 5);
      return {
        id: Date.now().toString(),
        text: "🎬 Here are some great movies to watch:",
        isBot: true,
        showLinks: formatContent(topMovies),
        suggestions: ["Action movies", "Comedy movies", "Horror movies"],
      };
    }

    // ===== SHOWS SPECIFICALLY =====
    if (lowerMessage.includes("show") || lowerMessage.includes("series") || lowerMessage.includes("tv")) {
      const matchedShows = findShows(userMessage.replace(/show|series|tv/gi, '').trim(), 5);

      if (matchedShows.length > 0) {
        return {
          id: Date.now().toString(),
          text: `📺 Found ${matchedShows.length} show(s):`,
          isBot: true,
          showLinks: formatContent(matchedShows),
          suggestions: ["Top rated shows", "🎲 Random show", "Browse movies"],
        };
      }

      const topShows = getTopRated('show', 5);
      return {
        id: Date.now().toString(),
        text: "📺 Here are some great shows to binge:",
        isBot: true,
        showLinks: formatContent(topShows),
        suggestions: ["Action shows", "Drama shows", "Comedy shows"],
      };
    }

    // ===== GENERAL SEARCH =====
    const matchedShows = findShows(userMessage, 3);
    const matchedMovies = findMovies(userMessage, 3);

    if (matchedShows.length > 0 || matchedMovies.length > 0) {
      const combined = [...matchedShows, ...matchedMovies].slice(0, 5);
      return {
        id: Date.now().toString(),
        text: `🔍 Found ${combined.length} result(s):`,
        isBot: true,
        showLinks: formatContent(combined),
        suggestions: ["Similar content", "🎲 Surprise me", "Browse genres"],
      };
    }

    // ===== WATCHLIST =====
    if (lowerMessage.includes("watchlist") || lowerMessage.includes("save") || lowerMessage.includes("bookmark")) {
      return {
        id: Date.now().toString(),
        text: "📚 **Your Watchlist:**\n\n• Click the ❤️ button on any show/movie\n• Access from the header menu\n• Saved locally in your browser\n\nStart building your list!",
        isBot: true,
        suggestions: ["Browse shows", "Browse movies", "🔥 Trending"],
      };
    }

    // Determine context from current URL
    const getCurrentPageContent = (): (Show | Movie | Anime) | null => {
      // Helper to extract slug from path
      const getSlug = (pattern: RegExp) => {
        const match = (location as string).match(pattern);
        return match ? match[1] : null;
      };

      const showSlug = getSlug(/^\/show\/([^\/]+)/) || getSlug(/^\/watch\/([^\/]+)/);
      const movieSlug = getSlug(/^\/movie\/([^\/]+)/) || getSlug(/^\/watch-movie\/([^\/]+)/);
      const animeSlug = getSlug(/^\/anime\/([^\/]+)/) || getSlug(/^\/watch-anime\/([^\/]+)/);

      if (showSlug) return shows?.find(s => s.slug === showSlug) || null;
      if (movieSlug) return movies?.find(m => m.slug === movieSlug) || null;
      if (animeSlug) return anime?.find(a => a.slug === animeSlug) || null;

      return null;
    };

    const currentPageItem = getCurrentPageContent();

    // ===== CONTEXT: "THIS", "HERE", "CURRENT" =====
    if (currentPageItem && (
      lowerMessage.includes("this") ||
      lowerMessage.includes("it") ||
      lowerMessage.includes("here")
    )) {
      // "Play this" / "Watch this"
      if (lowerMessage.match(/(play|watch|start)/)) {
        const type = isAnime(currentPageItem) ? 'anime' : isMovie(currentPageItem) ? 'movie' : 'show';
        const url = type === 'movie' ? `/watch-movie/${currentPageItem.slug}` : type === 'anime' ? `/watch-anime/${currentPageItem.slug}` : `/watch/${currentPageItem.slug}`;

        if (!(location as string).includes('watch')) {
          navigate(url);
          return {
            id: Date.now().toString(),
            text: `▶️ Starting "${currentPageItem.title}"...`,
            isBot: true,
            suggestions: ["Similar content", "🎲 Surprise me"],
          };
        } else {
          return {
            id: Date.now().toString(),
            text: `You're already watching "${currentPageItem.title}"! Enjoy the show! 🍿`,
            isBot: true,
            suggestions: ["Similar content", "Show details"],
          };
        }
      }

      // "What is this" / "Tell me about this"
      if (lowerMessage.match(/(what|about|info|details|describe)/)) {
        let details = `📝 **${currentPageItem.title}**\n\n`;
        details += `${currentPageItem.description || "No description available."}\n\n`;
        if (currentPageItem.imdbRating) details += `⭐ **Rating:** ${currentPageItem.imdbRating}\n`;
        if (currentPageItem.year) details += `📅 **Year:** ${currentPageItem.year}`;

        return {
          id: Date.now().toString(),
          text: details,
          isBot: true,
          suggestions: ["Play this", "Who is in this?", "Similar to this"],
        };
      }

      // "Who is in this" / "Cast"
      if (lowerMessage.match(/(who|cast|actor|star)/)) {
        return {
          id: Date.now().toString(),
          text: `👥 **Cast of ${currentPageItem.title}:**\n\n${currentPageItem.cast || "Cast information not available."}`,
          isBot: true,
          suggestions: ["Play this", "Similar to this"],
        };
      }
    }

    // ===== CHIT-CHAT & PERSONALITY =====
    // Greetings
    if (lowerMessage.match(/^(hi|hello|hey|yo|sup|hola|greetings)/i)) {
      return {
        id: Date.now().toString(),
        text: "👋 Hey there! I'm Vault AI. How can I entertain you today?",
        isBot: true,
        suggestions: ["🎲 Surprise me", "🔥 What's hot", "⭐ Top rated", "Browse genres"],
      };
    }

    // Status
    if (lowerMessage.match(/(how are you|hows it going|whats up)/i)) {
      return {
        id: Date.now().toString(),
        text: "I'm functioning perfectly and ready to stream! 🚀 Thanks for asking. What are you in the mood for?",
        isBot: true,
        suggestions: ["Recommend something", "Tell me a joke", "New movies"],
      };
    }

    // Identity
    if (lowerMessage.match(/(who are you|what are you|your name)/i)) {
      return {
        id: Date.now().toString(),
        text: "I'm **Vault AI**, your personal streaming assistant built for StreamVault. I can help you find movies, shows, and anime, or just chat about what to watch next! 🤖",
        isBot: true,
        suggestions: ["What can you do?", "Best movies", "Best anime"],
      };
    }

    // Creator / Origin
    if (lowerMessage.match(/(who made you|who created you|developer)/i)) {
      return {
        id: Date.now().toString(),
        text: "I was created by the **StreamVault Engineering Team** to make your streaming experience smoother and more fun! 🛠️",
        isBot: true,
        suggestions: ["Cool!", "Show me features"],
      };
    }

    // Jokes
    if (lowerMessage.includes("joke")) {
      const jokes = [
        "Why did the movie file break up with the audio file? Because they weren't in sync! 🥁",
        "Why don't skeletons watch horror movies? They don't have the guts! 💀",
        "What looks like half a movie? The trailer! 🚛",
        "Why did the anime character go to school? To improve their 'character development'! 🎌"
      ];
      return {
        id: Date.now().toString(),
        text: jokes[Math.floor(Math.random() * jokes.length)],
        isBot: true,
        suggestions: ["Another one", "Good one", "Show me comedies"],
      };
    }

    // Appreciation
    if (lowerMessage.match(/(thanks|thank you|good bot|awesome|cool|nice)/i)) {
      return {
        id: Date.now().toString(),
        text: "You're welcome! Happy streaming! 🍿✨",
        isBot: true,
        suggestions: ["🔥 What's trending", "Evaluate my mood"],
      };
    }

    // Love/Flirty (Common bot edge case)
    if (lowerMessage.match(/(i love you|marry me|date me)/i)) {
      return {
        id: Date.now().toString(),
        text: "Aww, you're sweet! But I'm just a few lines of code... our love is forbidden! 💔🤖",
        isBot: true,
        suggestions: ["Show me romance movies", "Tell me a joke"],
      };
    }

    // ===== DEFAULT RESPONSE =====
    return {
      id: Date.now().toString(),
      text: "🤔 I'm not sure I understand. I can help you find content, or you can use context commands like **'Play this'** if you're on a show page.\n\nTry:\n• **\"Surprise me\"**\n• **\"Best action movies\"**\n• **\"Who is in this?\"** (on a movie page)",
      isBot: true,
      suggestions: ["🎲 Surprise me", "🔥 Trending", "⭐ Top rated", "Browse genres"],
    };
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isBot: false,
    };
    const priorMessages = messages;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Show typing indicator
    setIsTyping(true);

    // Navigation / side-effect commands stay on the instant local engine.
    if (isActionIntent(messageText)) {
      setTimeout(() => {
        const botResponse = generateResponse(messageText);
        setMessages((prev) => [...prev, botResponse]);
        setIsTyping(false);
      }, 400);
      return;
    }

    // Otherwise let the Gemini "brain" handle it (mood + history aware).
    try {
      const { watchHistory, recentWatch } = getWatchData();
      const convo = [...priorMessages, userMessage]
        .slice(-12)
        .map((m) => ({ text: m.text, isBot: m.isBot }));

      const res = await apiRequest("POST", "/api/ai/chat", {
        messages: convo,
        watchHistory,
        recentWatch,
      });
      const data = await res.json();

      const showLinks: ContentLink[] | undefined = Array.isArray(data.showLinks) && data.showLinks.length
        ? data.showLinks
        : undefined;

      if (showLinks) {
        setContext((prev) => ({ ...prev, lastResults: showLinks }));
      }

      const botResponse: Message = {
        id: Date.now().toString(),
        text: data.reply || "Hmm, I blanked for a sec — try asking again?",
        isBot: true,
        suggestions: Array.isArray(data.suggestions) && data.suggestions.length
          ? data.suggestions
          : ["🎲 Surprise me", "🔥 What's hot?", "Browse genres"],
        showLinks,
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch {
      // AI brain unavailable (down / quota). For plain chit-chat, don't dump random
      // search results — only fall back to the rule-based engine for content-y queries.
      const looksLikeContentQuery = /\b(watch|movie|show|anime|recommend|series|film|play|trending|top|genre|surprise|mood|similar)\b/i.test(messageText);
      if (looksLikeContentQuery) {
        const botResponse = generateResponse(messageText);
        setMessages((prev) => [...prev, botResponse]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          text: "I'm having a little trouble thinking right now 😅 — give me a moment and try again. Meanwhile, want a recommendation?",
          isBot: true,
          suggestions: ["🎲 Surprise me", "🔥 What's hot?", "Top rated"],
        }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  // Voice recognition using Web Speech API
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleSend("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[100]" style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
          size="icon"
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] h-[600px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300 relative"
      style={{ position: 'fixed', bottom: '24px', right: '24px' }}
    >
      {/* Animated glowing border effect - Siri-style */}
      <div className="absolute -inset-[3px] rounded-2xl chatbot-glow bg-gradient-to-r from-red-500 via-red-400 to-red-600" />
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
        <div
          className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
          style={{
            background: 'conic-gradient(from 0deg, #ef4444, #dc2626, #f87171, #dc2626, #ef4444)',
            animation: 'spin 3s linear infinite',
          }}
        />
      </div>
      {/* Main container */}
      <div className="relative bg-background rounded-2xl flex flex-col h-full overflow-hidden border border-red-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Vault AI</h3>
              <p className="text-xs opacity-90 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Online • Ready to help
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            data-testid="button-close-chatbot"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 chatbot-messages scroll-smooth">
          {messages.map((message, msgIdx) => (
            <div
              key={message.id}
              className={`flex ${message.isBot ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: msgIdx === messages.length - 1 ? '0ms' : '0ms' }}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm ${message.isBot
                  ? "bg-muted/80 backdrop-blur-sm text-foreground rounded-tl-sm"
                  : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
                  }`}
              >
                <p className="text-sm whitespace-pre-line leading-relaxed">{renderText(message.text)}</p>

                {/* Show/Movie links with poster thumbnails */}
                {message.showLinks && message.showLinks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.showLinks.map((item, idx) => {
                      // Handle different URL formats including anime
                      let href;
                      if (item.type === 'movie') {
                        href = `/movie/${item.slug}`;
                      } else if (item.type === 'anime') {
                        href = `/anime/${item.slug}`;
                      } else if (item.slug.includes('?season=')) {
                        href = `/watch/${item.slug}`;
                      } else {
                        href = `/show/${item.slug}`;
                      }

                      return (
                        <Link key={item.slug} href={href}>
                          <div
                            className="group bg-background/80 backdrop-blur-sm hover:bg-accent/80 rounded-xl border border-border/50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/30 overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="flex gap-3 p-2">
                              {/* Poster thumbnail */}
                              <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted shadow-sm">
                                {item.poster ? (
                                  <img
                                    src={item.poster}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                    {item.type === 'movie' ? (
                                      <Film className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                      <Tv className="w-5 h-5 text-muted-foreground" />
                                    )}
                                  </div>
                                )}
                                {/* Play overlay on hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>

                              {/* Content info */}
                              <div className="flex-1 min-w-0 py-0.5">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-sm text-foreground truncate leading-tight">
                                    {item.title}
                                  </h4>
                                  {item.rating && (
                                    <div className="flex items-center gap-0.5 shrink-0 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">{item.rating}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                    {item.type}
                                  </span>
                                  {item.year && (
                                    <span className="text-xs text-muted-foreground">{item.year}</span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                                    {item.description}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-full border border-border/50 transition-all duration-200 hover:scale-105 hover:shadow-sm animate-in fade-in slide-in-from-bottom-1"
                        style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-muted-foreground">Vault is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "🎤 Listening..." : "Ask me anything or try voice..."}
              className={`flex-1 rounded-full bg-muted/50 border-border/50 focus:border-primary/50 transition-colors ${isListening ? 'border-red-500 animate-pulse' : ''}`}
              data-testid="input-chatbot"
              disabled={isListening}
            />
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              className={`rounded-full h-10 w-10 shrink-0 transition-all ${isListening ? 'animate-pulse' : 'hover:scale-105'}`}
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-10 w-10 shrink-0 transition-transform hover:scale-105"
              data-testid="button-send-message"
              disabled={isListening}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
