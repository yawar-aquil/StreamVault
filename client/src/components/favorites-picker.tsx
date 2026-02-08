import { useState, useEffect, useRef } from 'react';
import { Search, X, Film, Tv, Sparkles, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContentItem {
    id: string;
    title: string;
    posterUrl: string | null;
}

interface FavoritesPickerProps {
    favorites: {
        shows: string[];
        movies: string[];
        anime: string[];
    };
    onFavoritesChange: (favorites: { shows: string[]; movies: string[]; anime: string[] }) => void;
}

export function FavoritesPicker({ favorites, onFavoritesChange }: FavoritesPickerProps) {
    const [activeTab, setActiveTab] = useState('shows');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
    const [selectedContent, setSelectedContent] = useState<{
        shows: ContentItem[];
        movies: ContentItem[];
        anime: ContentItem[];
    }>({
        shows: [],
        movies: [],
        anime: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const lastLoadedKeyRef = useRef<string>('');

    // Fetch content details when favorites change from server (not from user selection)
    const favoritesKey = JSON.stringify([favorites.shows, favorites.movies, favorites.anime]);
    const totalFavorites = favorites.shows.length + favorites.movies.length + favorites.anime.length;
    const totalSelected = selectedContent.shows.length + selectedContent.movies.length + selectedContent.anime.length;

    useEffect(() => {
        // Skip if no favorites to load
        if (totalFavorites === 0) {
            return;
        }

        // Skip if we already loaded this exact data
        if (lastLoadedKeyRef.current === favoritesKey) {
            return;
        }

        // Skip if user has made local selections (more items selected than in prop)
        // This means user is adding items, don't overwrite
        if (totalSelected > totalFavorites) {
            return;
        }

        const fetchFavoriteDetails = async (showIds: string[], movieIds: string[], animeIds: string[]) => {
            const newSelected = { shows: [] as ContentItem[], movies: [] as ContentItem[], anime: [] as ContentItem[] };

            // Fetch shows
            for (const id of showIds) {
                try {
                    const res = await fetch(`/api/content/shows/${id}`);
                    if (res.ok) {
                        const show = await res.json();
                        newSelected.shows.push({ id: show.id, title: show.title, posterUrl: show.posterUrl });
                    }
                } catch (e) { }
            }

            // Fetch movies
            for (const id of movieIds) {
                try {
                    const res = await fetch(`/api/content/movies/${id}`);
                    if (res.ok) {
                        const movie = await res.json();
                        newSelected.movies.push({ id: movie.id, title: movie.title, posterUrl: movie.posterUrl });
                    }
                } catch (e) { }
            }

            // Fetch anime
            for (const id of animeIds) {
                try {
                    const res = await fetch(`/api/content/anime/${id}`);
                    if (res.ok) {
                        const anime = await res.json();
                        newSelected.anime.push({ id: anime.id, title: anime.title, posterUrl: anime.posterUrl });
                    }
                } catch (e) { }
            }

            setSelectedContent(newSelected);
            lastLoadedKeyRef.current = favoritesKey;
        };

        fetchFavoriteDetails(favorites.shows, favorites.movies, favorites.anime);
    }, [favoritesKey, totalFavorites, totalSelected]);

    // Search content
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const searchContent = async () => {
            setIsLoading(true);
            try {
                let endpoint = '';
                switch (activeTab) {
                    case 'shows': endpoint = '/api/shows'; break;
                    case 'movies': endpoint = '/api/movies'; break;
                    case 'anime': endpoint = '/api/anime'; break;
                }

                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    const filtered = data
                        .filter((item: any) =>
                            item.title.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((item: any) => ({
                            id: item.id,
                            title: item.title,
                            posterUrl: item.posterUrl,
                        }));
                    setSearchResults(filtered);
                }
            } catch (e) {
                console.error('Search failed:', e);
            } finally {
                setIsLoading(false);
            }
        };

        const debounce = setTimeout(searchContent, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, activeTab]);

    const addToFavorites = (item: ContentItem) => {
        const key = activeTab as 'shows' | 'movies' | 'anime';
        if (selectedContent[key].length >= 5) {
            return; // Max 5 per category
        }
        if (selectedContent[key].some(i => i.id === item.id)) {
            return; // Already added
        }

        const newSelected = {
            ...selectedContent,
            [key]: [...selectedContent[key], item],
        };
        setSelectedContent(newSelected);
        onFavoritesChange({
            shows: newSelected.shows.map(i => i.id),
            movies: newSelected.movies.map(i => i.id),
            anime: newSelected.anime.map(i => i.id),
        });
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeFromFavorites = (id: string, type: 'shows' | 'movies' | 'anime') => {
        const newSelected = {
            ...selectedContent,
            [type]: selectedContent[type].filter(i => i.id !== id),
        };
        setSelectedContent(newSelected);
        onFavoritesChange({
            shows: newSelected.shows.map(i => i.id),
            movies: newSelected.movies.map(i => i.id),
            anime: newSelected.anime.map(i => i.id),
        });
    };

    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'shows': return <Tv className="h-4 w-4" />;
            case 'movies': return <Film className="h-4 w-4" />;
            case 'anime': return <Sparkles className="h-4 w-4" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(''); setSearchResults([]); }}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="shows" className="flex items-center gap-1">
                        <Tv className="h-3 w-3" />
                        Shows
                    </TabsTrigger>
                    <TabsTrigger value="movies" className="flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        Movies
                    </TabsTrigger>
                    <TabsTrigger value="anime" className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Anime
                    </TabsTrigger>
                </TabsList>

                {['shows', 'movies', 'anime'].map((tab) => (
                    <TabsContent key={tab} value={tab} className="space-y-4">
                        {/* Selected favorites */}
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1">
                            {selectedContent[tab as 'shows' | 'movies' | 'anime'].map((item) => (
                                <div key={item.id} className="relative flex-shrink-0 group">
                                    <img
                                        src={item.posterUrl || '/placeholder-poster.jpg'}
                                        alt={item.title}
                                        className="w-16 h-24 object-cover rounded-lg border-2 border-red-500"
                                        title={item.title}
                                    />
                                    <button
                                        onClick={() => removeFromFavorites(item.id, tab as 'shows' | 'movies' | 'anime')}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {selectedContent[tab as 'shows' | 'movies' | 'anime'].length < 5 && (
                                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                                    <Plus className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {selectedContent[tab as 'shows' | 'movies' | 'anime'].length}/5 selected
                        </p>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${tab}...`}
                                className="pl-10"
                            />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="border rounded-lg max-h-48 overflow-y-auto">
                                {searchResults.map((item) => {
                                    const isSelected = selectedContent[tab as 'shows' | 'movies' | 'anime'].some(i => i.id === item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => addToFavorites(item)}
                                            disabled={isSelected || selectedContent[tab as 'shows' | 'movies' | 'anime'].length >= 5}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <img
                                                src={item.posterUrl || '/placeholder-poster.jpg'}
                                                alt={item.title}
                                                className="w-8 h-12 object-cover rounded"
                                            />
                                            <span className="text-sm truncate flex-1 text-left">{item.title}</span>
                                            {isSelected && (
                                                <span className="text-xs text-green-500">Added</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {isLoading && (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                Searching...
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
