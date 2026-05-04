import { useCallback, useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme, SkinTonePickerLocation } from 'emoji-picker-react';
import { Loader2, Search, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TenorGif {
    id: string;
    title?: string;
    content_description?: string;
    media_formats?: {
        gif?: { url: string };
        tinygif?: { url: string };
        nanogif?: { url: string };
    };
}

interface EmojiGifPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onGifSelect: (gifUrl: string) => void;
    className?: string;
    panelClassName?: string;
}

const TENOR_GIF_URL_REGEX = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/i;
const TENOR_GIF_URL_REGEX_GLOBAL = /(https:\/\/media\.tenor\.com\/[^\s]+\.gif)/g;

export function extractTenorGifUrl(value: string): string | null {
    return value.match(TENOR_GIF_URL_REGEX)?.[1] || null;
}

export function stripTenorGifUrl(value: string): string {
    return value.replace(TENOR_GIF_URL_REGEX_GLOBAL, '').replace(/\s{2,}/g, ' ').trim();
}

export function mergeTextWithExistingTenorGif(nextText: string, currentValue: string): string {
    const gifUrl = extractTenorGifUrl(currentValue);
    const cleanText = nextText.trim();

    if (!gifUrl) {
        return nextText;
    }

    return [cleanText, gifUrl].filter(Boolean).join(' ').trim();
}

export function appendEmojiPreservingTenorGif(value: string, emoji: string): string {
    const gifUrl = extractTenorGifUrl(value);
    const nextText = `${stripTenorGifUrl(value)}${emoji}`.trim();

    return [nextText, gifUrl].filter(Boolean).join(' ').trim();
}

export function appendTenorGif(value: string, gifUrl: string): string {
    return [stripTenorGifUrl(value), gifUrl].filter(Boolean).join(' ').trim();
}

export function EmojiGifPicker({ onEmojiSelect, onGifSelect, className = '', panelClassName = '' }: EmojiGifPickerProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [gifSearch, setGifSearch] = useState('');
    const [gifs, setGifs] = useState<TenorGif[]>([]);
    const [isSearchingGifs, setIsSearchingGifs] = useState(false);
    const [isLoadingMoreGifs, setIsLoadingMoreGifs] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const gifPickerRef = useRef<HTMLDivElement>(null);
    const gifNextPosRef = useRef<string | null>(null);

    const searchGifs = useCallback(async (query: string, loadMore = false) => {
        if (!query.trim()) {
            setGifs([]);
            gifNextPosRef.current = null;
            return;
        }

        if (loadMore) {
            setIsLoadingMoreGifs(true);
        } else {
            setIsSearchingGifs(true);
        }

        try {
            const endpoint = query === 'trending' ? 'featured' : 'search';
            let url = `https://tenor.googleapis.com/v2/${endpoint}?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&client_key=streamvault&limit=30&media_filter=gif,tinygif`;

            if (loadMore && gifNextPosRef.current) {
                url += `&pos=${gifNextPosRef.current}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (loadMore) {
                setGifs((prev) => [...prev, ...(data.results || [])]);
            } else {
                setGifs(data.results || []);
            }

            gifNextPosRef.current = data.next || null;
        } catch (error) {
            console.error('GIF search error:', error);
            if (!loadMore) {
                setGifs([]);
            }
        } finally {
            setIsSearchingGifs(false);
            setIsLoadingMoreGifs(false);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
                setShowGifPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!showGifPicker) {
            return;
        }

        const timer = window.setTimeout(() => {
            if (gifSearch) {
                searchGifs(gifSearch);
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [gifSearch, showGifPicker, searchGifs]);

    useEffect(() => {
        if (showGifPicker && !gifSearch) {
            searchGifs('trending');
        }
    }, [showGifPicker, gifSearch, searchGifs]);

    const loadMoreGifs = useCallback(() => {
        if (isLoadingMoreGifs || !gifNextPosRef.current) {
            return;
        }

        searchGifs(gifSearch || 'trending', true);
    }, [gifSearch, isLoadingMoreGifs, searchGifs]);

    return (
        <div className={`flex items-center gap-1 relative ${className}`}>
            <div className="relative" ref={emojiPickerRef}>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full ${showEmojiPicker ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    onClick={() => {
                        setShowEmojiPicker((prev) => !prev);
                        setShowGifPicker(false);
                    }}
                >
                    <Smile className="h-4 w-4" />
                </Button>

                {showEmojiPicker && (
                    <div className={`absolute bottom-full left-0 mb-3 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-xl ${panelClassName}`}>
                        <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(emojiData) => {
                                onEmojiSelect(emojiData.emoji);
                            }}
                            width="100%"
                            height={320}
                            lazyLoadEmojis
                            searchPlaceholder="Search emoji"
                            skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
                            previewConfig={{ showPreview: false } as any}
                        />
                    </div>
                )}
            </div>

            <div className="relative" ref={gifPickerRef}>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full ${showGifPicker ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    onClick={() => {
                        setShowGifPicker((prev) => !prev);
                        setShowEmojiPicker(false);
                    }}
                >
                    <span className="text-[10px] font-bold">GIF</span>
                </Button>

                {showGifPicker && (
                    <div className={`absolute bottom-full left-0 mb-3 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-xl ${panelClassName}`}>
                        <div className="p-3 h-[300px] flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search GIFs..."
                                    value={gifSearch}
                                    onChange={(e) => setGifSearch(e.target.value)}
                                    className="pl-8 h-8 text-sm bg-muted/50 border-border/50"
                                    autoFocus
                                />
                            </div>
                            <div
                                className="flex-1 overflow-y-auto pr-1"
                                onScroll={(e) => {
                                    const el = e.currentTarget;
                                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
                                        loadMoreGifs();
                                    }
                                }}
                            >
                                {isSearchingGifs ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : gifs.length > 0 ? (
                                    <>
                                        <div style={{ columns: 2, columnGap: '8px' }}>
                                            {gifs.map((gif) => (
                                                <div key={gif.id} className="relative group overflow-hidden rounded-lg bg-muted mb-2" style={{ breakInside: 'avoid' }}>
                                                    <img
                                                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.nanogif?.url}
                                                        alt={gif.content_description || gif.title || 'GIF'}
                                                        className="w-full h-auto object-contain cursor-pointer transition-transform group-hover:scale-105 rounded-lg"
                                                        onClick={() => {
                                                            const gifUrl = gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url;
                                                            if (gifUrl) {
                                                                onGifSelect(gifUrl);
                                                            }
                                                            setShowGifPicker(false);
                                                            setGifSearch('');
                                                        }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        {isLoadingMoreGifs && (
                                            <div className="flex items-center justify-center py-3">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        {gifSearch ? 'No GIFs found' : 'Search for GIFs'}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
                                <span className="text-[10px] text-muted-foreground">Powered by Tenor</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => {
                                        setShowGifPicker(false);
                                        setGifSearch('');
                                    }}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
