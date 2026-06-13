import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Users, Twitter, Instagram, Youtube, ExternalLink, Trophy, Star, icons, Eye, Heart, Tv, Film, Clapperboard } from 'lucide-react';
import { SiTiktok, SiDiscord } from 'react-icons/si';
import { Link } from 'wouter';
import { RoleBadge } from '@/components/role-badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@shared/schema';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { THEME_MAPPING, THEME_PREVIEWS } from '@/lib/theme-data';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { HeartRain } from './heart-rain';
import { GalaxyAnimation } from './galaxy-animation';
import { AnimeMotion } from './anime-motion';

interface SocialLinks {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    discord?: string;
}

interface FavoriteItem {
    id: string;
    title: string;
    posterUrl: string | null;
    slug?: string;
}

interface Favorites {
    shows?: FavoriteItem[];
    movies?: FavoriteItem[];
    anime?: FavoriteItem[];
}

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        username: string;
        avatarUrl?: string;
        authUserId?: string;
        isHost?: boolean;
        bio?: string;
        socialLinks?: SocialLinks | null;
        favorites?: Favorites | null;
        xp?: number;
        level?: number;
        badges?: Badge[];
    };
    isFriend?: boolean;
}

// Social link component
function SocialLinkIcon({ platform, value }: { platform: string; value: string }) {
    const getUrl = () => {
        switch (platform) {
            case 'twitter': return `https://twitter.com/${value}`;
            case 'instagram': return `https://instagram.com/${value}`;
            case 'youtube': return value.startsWith('http') ? value : `https://youtube.com/@${value}`;
            case 'tiktok': return `https://tiktok.com/@${value}`;
            case 'discord': return null; // Discord usernames aren't linkable
            default: return null;
        }
    };

    const getIcon = () => {
        switch (platform) {
            case 'twitter': return <Twitter className="h-4 w-4" />;
            case 'instagram': return <Instagram className="h-4 w-4" />;
            case 'youtube': return <Youtube className="h-4 w-4" />;
            case 'tiktok': return <SiTiktok className="h-4 w-4" />;
            case 'discord': return <SiDiscord className="h-4 w-4" />;
            default: return null;
        }
    };

    const getColor = () => {
        switch (platform) {
            case 'twitter': return 'bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20';
            case 'instagram': return 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-pink-500 hover:from-purple-500/20 hover:to-pink-500/20';
            case 'youtube': return 'bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000]/20';
            case 'tiktok': return 'bg-black/10 text-foreground hover:bg-black/20';
            case 'discord': return 'bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20';
            default: return 'bg-muted';
        }
    };

    const url = getUrl();

    if (url) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${getColor()}`}
                title={`${platform}: ${value}`}
            >
                {getIcon()}
            </a>
        );
    }

    return (
        <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${getColor()}`}
            title={`${platform}: ${value}`}
        >
            {getIcon()}
        </div>
    );
}

export function UserProfileModal({ isOpen, onClose, user, isFriend }: UserProfileModalProps) {
    const [showFullAvatar, setShowFullAvatar] = useState(false);

    const hasSocialLinks = user.socialLinks && Object.values(user.socialLinks).some(v => v);
    const hasFavorites = user.favorites && (
        (user.favorites.shows?.length || 0) > 0 ||
        (user.favorites.movies?.length || 0) > 0 ||
        (user.favorites.anime?.length || 0) > 0
    );

    const badges = user.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges) : [];
    // Prioritize SKINS over THEMES ensuring animated skins take precedence
    const themes = badges.filter((b: any) => b.category === 'theme');
    const skins = badges.filter((b: any) => b.category === 'skin' || b.name.includes('Skin'));

    // Find equipped item - check skins first, then themes
    const equippedSkin = skins.find((b: any) => b.equipped) || themes.find((b: any) => b.equipped);
    const skinClass = equippedSkin && THEME_MAPPING[equippedSkin.name] ? `skin-${THEME_MAPPING[equippedSkin.name]}` : '';

    return (
        <>
            {/* Profile Modal */}
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-lg p-0 bg-transparent border-none shadow-none overflow-visible">
                    <div className={cn(
                        "w-full bg-background/95 backdrop-blur-xl border border-white/10 transition-colors duration-500 overflow-visible rounded-lg relative",
                        skinClass
                    )}>
                        {skinClass === 'skin-valentines' && <HeartRain />}
                        {skinClass === 'skin-galaxy' && <GalaxyAnimation />}
                        {skinClass === 'skin-anime' && <AnimeMotion />}
                        <div className="max-h-[85vh] overflow-y-auto scrollbar-hide relative z-10">
                            <DialogHeader className="sr-only">
                                <DialogTitle>User Profile: {user.username}</DialogTitle>
                                <DialogDescription>View profile details, badges, and favorites for {user.username}</DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col items-center gap-4 py-4">
                                {/* Clickable Avatar */}
                                <button
                                    onClick={() => user.avatarUrl && setShowFullAvatar(true)}
                                    className="relative group cursor-pointer"
                                    disabled={!user.avatarUrl}
                                >
                                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-4 ring-primary/20 transition-all group-hover:ring-primary/40">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-3xl font-bold text-muted-foreground">
                                                {user.username.slice(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    {user.avatarUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-medium">View</span>
                                        </div>
                                    )}
                                </button>

                                {/* Username */}
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                                        {user.username}
                                        <RoleBadge role={(user.username.toLowerCase() === 'admin' || (user as any).isAdmin) ? 'admin' : (user as any).isModerator ? "moderator" : null} />
                                    </h3>
                                    {/* Equipped Badges */}
                                    {user.badges && (
                                        <div className="flex items-center justify-center gap-1 mt-1">
                                            {user.badges
                                                .filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature')
                                                .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                                                .map((badge: any) => (
                                                    <div key={badge.id} title={badge.name}>
                                                        <img
                                                            src={badge.imageUrl}
                                                            alt={badge.name}
                                                            className="w-5 h-5 object-contain"
                                                        />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                    {isFriend && (
                                        <p className="text-sm text-green-500 flex items-center justify-center gap-1 mt-1">
                                            <Users className="h-3 w-3" />
                                            Friend
                                        </p>
                                    )}
                                </div>

                                {/* Level & XP */}
                                <div className="w-full px-8">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="font-bold text-primary">Level {user.level || 1}</span>
                                        <span className="text-muted-foreground text-xs">{(user.xp || 0) % 1000} / 1000 XP</span>
                                    </div>
                                    <Progress value={((user.xp || 0) % 1000) / 10} className="h-2" />
                                </div>

                                {/* Bio */}
                                {user.bio ? (
                                    <div className="w-full px-4">
                                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Bio</h4>
                                        <p className="text-sm bg-muted/50 rounded-lg px-3 py-2">
                                            {user.bio}
                                        </p>
                                    </div>
                                ) : null}


                                {/* Social Links - ONLY FOR FRIENDS */}
                                {hasSocialLinks && isFriend && (
                                    <div className="w-full px-4">
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Connect</h4>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {user.socialLinks?.twitter && (
                                                <SocialLinkIcon platform="twitter" value={user.socialLinks.twitter} />
                                            )}
                                            {user.socialLinks?.instagram && (
                                                <SocialLinkIcon platform="instagram" value={user.socialLinks.instagram} />
                                            )}
                                            {user.socialLinks?.youtube && (
                                                <SocialLinkIcon platform="youtube" value={user.socialLinks.youtube} />
                                            )}
                                            {user.socialLinks?.tiktok && (
                                                <SocialLinkIcon platform="tiktok" value={user.socialLinks.tiktok} />
                                            )}
                                            {user.socialLinks?.discord && (
                                                <SocialLinkIcon platform="discord" value={user.socialLinks.discord} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Favorites */}
                                {hasFavorites && (
                                    <div className="w-full px-4 space-y-3">
                                        <h4 className="text-sm font-bold text-red-500 flex items-center gap-1.5">
                                            <Heart className="w-4 h-4 fill-red-500" />
                                            Favorites
                                        </h4>

                                        {/* Favorite Shows */}
                                        {user.favorites?.shows && user.favorites.shows.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                                    <Tv className="w-3 h-3" />
                                                    TV Shows
                                                </p>
                                                <div className="grid grid-cols-5 gap-2 pb-2 pt-1 px-1">
                                                    {user.favorites.shows.slice(0, 5).map((item) => {
                                                        const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                        return (
                                                            <Link key={item.id} href={`/show/${slug}`} className="block hover:scale-105 transition-transform">
                                                                <img
                                                                    src={item.posterUrl || '/placeholder-poster.jpg'}
                                                                    alt={item.title}
                                                                    className="w-full aspect-[2/3] object-cover rounded-lg border-2 border-red-500"
                                                                    title={item.title}
                                                                />
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Favorite Movies */}
                                        {user.favorites?.movies && user.favorites.movies.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                                    <Film className="w-3 h-3" />
                                                    Movies
                                                </p>
                                                <div className="grid grid-cols-5 gap-2 pb-2 pt-1 px-1">
                                                    {user.favorites.movies.slice(0, 5).map((item) => {
                                                        const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                        return (
                                                            <Link key={item.id} href={`/movie/${slug}`} className="block hover:scale-105 transition-transform">
                                                                <img
                                                                    src={item.posterUrl || '/placeholder-poster.jpg'}
                                                                    alt={item.title}
                                                                    className="w-full aspect-[2/3] object-cover rounded-lg border-2 border-red-500"
                                                                    title={item.title}
                                                                />
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Favorite Anime */}
                                        {user.favorites?.anime && user.favorites.anime.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                                    <Clapperboard className="w-3 h-3" />
                                                    Anime
                                                </p>
                                                <div className="grid grid-cols-5 gap-2 pb-2 pt-1 px-1">
                                                    {user.favorites.anime.slice(0, 5).map((item) => {
                                                        const slug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                                        return (
                                                            <Link key={item.id} href={`/anime/${slug}`} className="block hover:scale-105 transition-transform">
                                                                <img
                                                                    src={item.posterUrl || '/placeholder-poster.jpg'}
                                                                    alt={item.title}
                                                                    className="w-full aspect-[2/3] object-cover rounded-lg border-2 border-red-500"
                                                                    title={item.title}
                                                                />
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                )}

                                {/* Badges & Themes Logic */}
                                {(() => {
                                    const badges = user.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges) : [];
                                    if (badges.length === 0) return null;

                                    const themes = badges.filter((b: any) => b.category === 'theme');
                                    const skins = badges.filter((b: any) => b.category === 'skin' || b.name.includes('Skin'));
                                    const regularBadges = badges.filter((b: any) => b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin'));

                                    return (
                                        <div className="w-full px-4 space-y-4">
                                            {/* Premium Items (Themes) */}
                                            {themes.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <Crown className="w-3 h-3 text-purple-500" />
                                                        Themes
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {themes.map((theme: any) => {
                                                            const themeId = THEME_MAPPING[theme.name];
                                                            const previewUrl = theme.imageUrl || THEME_PREVIEWS[themeId];

                                                            return (
                                                                <div key={theme.id} className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-xl transition-all hover:scale-105 hover:border-primary/50" title={theme.description}>
                                                                    <div className="aspect-video w-full overflow-hidden">
                                                                        <img
                                                                            src={previewUrl}
                                                                            alt={theme.name}
                                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                                                    </div>
                                                                    <div className="p-2 text-center absolute bottom-0 left-0 right-0">
                                                                        <h4 className="text-[10px] font-bold text-white drop-shadow-md truncate">{theme.name}</h4>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Skins */}
                                            {skins.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                        <Crown className="w-3 h-3 text-pink-500" />
                                                        Skins
                                                    </h4>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {skins.map((skin: any) => (
                                                            <div key={skin.id} className="group relative flex flex-col items-center justify-center p-1 bg-gradient-to-b from-muted/50 to-muted/20 border border-white/5 hover:border-primary/20 rounded-lg transition-all hover:-translate-y-1 hover:shadow-lg" title={skin.description}>
                                                                <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-1">
                                                                    <img
                                                                        src={skin.imageUrl}
                                                                        alt={skin.name}
                                                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                                    />
                                                                </div>
                                                                <span className="text-[9px] text-center font-medium w-full truncate px-1">{skin.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Regular Badges */}
                                            {regularBadges.length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                                        Badges
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {regularBadges.map((badge: any) => {
                                                            // Dynamic icon logic
                                                            const iconName = badge.icon || 'Star';
                                                            const PascalName = iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                                            const IconComponent = (icons as any)[PascalName] || (icons as any)[iconName] || Star;

                                                            return (
                                                                <TooltipProvider key={badge.id}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex flex-col items-center p-2 bg-muted/30 rounded-lg group relative cursor-help hover:bg-muted/50 transition-colors">
                                                                                {badge.imageUrl ? (
                                                                                    <img
                                                                                        src={badge.imageUrl}
                                                                                        alt={badge.name}
                                                                                        className="w-8 h-8 object-contain mb-1 drop-shadow-sm group-hover:scale-110 transition-transform"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-1">
                                                                                        <IconComponent className="w-4 h-4" />
                                                                                    </div>
                                                                                )}
                                                                                <span className="text-[10px] text-center font-medium w-full leading-tight line-clamp-2">{badge.name}</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-black/90 text-white border-white/10 text-xs max-w-[200px] whitespace-normal break-words z-[60]">
                                                                            <p>{badge.description}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* No content message */}
                                {!user.bio && !hasSocialLinks && !hasFavorites && (
                                    <p className="text-sm text-muted-foreground italic">No profile info available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Full Avatar Preview - Click anywhere to close */}
            {
                showFullAvatar && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
                        onClick={() => setShowFullAvatar(false)}
                    >
                        {user.avatarUrl && (
                            <img
                                src={user.avatarUrl}
                                alt={user.username}
                                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                )
            }
        </>
    );
}

// Standalone Avatar Preview component for use in profile page
export function AvatarPreview({ avatarUrl, username, className }: { avatarUrl?: string | null; username: string; className?: string }) {
    const [showFullAvatar, setShowFullAvatar] = useState(false);

    return (
        <>
            <button
                onClick={() => avatarUrl && setShowFullAvatar(true)}
                className="relative group cursor-pointer"
                disabled={!avatarUrl}
            >
                <div className={cn(
                    "w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-4 ring-primary/20 transition-all group-hover:ring-primary/40",
                    className
                )}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-3xl font-bold text-muted-foreground">
                            {username.slice(0, 2).toUpperCase()}
                        </span>
                    )}
                </div>
                {avatarUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-5 h-5 text-white" />
                    </div>
                )}
            </button>

            {/* Full Avatar Preview - Click anywhere to close (rendered via Portal) */}
            {showFullAvatar && createPortal(
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
                    onClick={() => setShowFullAvatar(false)}
                >
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt={username}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>,
                document.body
            )}
        </>
    );
}
