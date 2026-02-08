import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
    MessageSquare,
    UserPlus,
    Play,
    ShoppingBag,
    Star,
    BookOpen,
    Tv,
    Film,
    Clapperboard,
    Gift
} from "lucide-react";
import { Link } from "wouter";
import type { Activity, User } from "@shared/schema";
import { motion } from "framer-motion";

interface FeedItemProps {
    activity: Activity & { user?: User & { equippedBadges?: any[] } };
}

export function FeedItem({ activity }: FeedItemProps) {
    const { user, type, metadata, createdAt } = activity;

    if (!user) return null;

    const getIcon = () => {
        switch (type) {
            case 'watch_start':
                if (activity.entityType === 'movie') return <Film className="w-4 h-4 text-blue-400" />;
                if (activity.entityType === 'show') return <Tv className="w-4 h-4 text-purple-400" />;
                if (activity.entityType === 'anime') return <Clapperboard className="w-4 h-4 text-pink-400" />;
                return <Play className="w-4 h-4 text-green-400" />;
            case 'friend_connect':
                return <UserPlus className="w-4 h-4 text-indigo-400" />;
            case 'purchase':
                return <ShoppingBag className="w-4 h-4 text-yellow-400" />;
            case 'review_post':
                return <Star className="w-4 h-4 text-orange-400" />;
            case 'comment_post':
                return <MessageSquare className="w-4 h-4 text-cyan-400" />;
            case 'blog_read':
                return <BookOpen className="w-4 h-4 text-emerald-400" />;
            case 'item_gift':
                return <Gift className="w-4 h-4 text-pink-500" />;
            default:
                return <div className="w-4 h-4 bg-gray-500 rounded-full" />;
        }
    };

    const getMessage = () => {
        // Parse metadata safely
        let meta: any = {};
        try {
            if (typeof metadata === 'string') {
                meta = JSON.parse(metadata);
            } else {
                meta = metadata || {};
            }
        } catch (e) {
            meta = {};
        }

        switch (type) {
            case 'watch_start':
                return (
                    <span>
                        started watching <span className="text-primary font-medium">{meta.title || 'something'}</span>
                        {meta.episode && <span className="text-muted-foreground"> - {meta.episode}</span>}
                    </span>
                );
            case 'friend_connect':
                return (
                    <span>
                        became friends with <span className="text-primary font-medium">{meta.friendUsername || 'someone'}</span>
                    </span>
                );
            case 'purchase':
                return (
                    <span>
                        purchased <span className="text-yellow-400 font-medium">{meta.badgeName || 'Item'}</span>
                        {meta.price && <span className="text-muted-foreground ml-1">for {meta.price} coins</span>}
                    </span>
                );
            case 'item_gift':
                return (
                    <span>
                        gifted <span className="text-pink-400 font-medium">{meta.badgeName || 'an item'}</span> to <span className="text-primary font-medium">{meta.giftTo || 'someone'}</span>
                    </span>
                );
            case 'review_post':
                return (
                    <span>
                        reviewed <span className="text-primary font-medium">{meta.contentId ? `Content #${meta.contentId}` : 'something'}</span>
                        {meta.rating && <span className="text-orange-400 ml-2">★ {meta.rating}/10</span>}
                    </span>
                );
            case 'comment_post':
                return (
                    <span>
                        commented on <span className="text-primary font-medium">{meta.blogTitle || 'a post'}</span>
                    </span>
                );
            case 'blog_read':
                return (
                    <span>
                        read <span className="text-primary font-medium">{meta.title || 'a blog post'}</span>
                    </span>
                );
            default:
                return <span>performed an action</span>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="group overflow-hidden bg-card/50 hover:bg-card/80 border-white/5 transition-all duration-300 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20">
                <div className="p-4 flex items-start gap-4">
                    <Link href={`/profile/${user.username}`}>
                        <div className="relative cursor-pointer">
                            <Avatar className="w-12 h-12 border-2 border-background shadow-lg group-hover:scale-105 transition-transform">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {/* Activity Icon Badge */}
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1.5 border border-white/10 shadow-sm">
                                {getIcon()}
                            </div>
                        </div>
                    </Link>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 mb-1">
                            <Link href={`/profile/${user.username}`}>
                                <span className="font-bold text-base hover:text-primary cursor-pointer transition-colors">
                                    {user.username}
                                </span>
                            </Link>
                            {user.equippedBadges && user.equippedBadges.length > 0 && (
                                <div className="flex items-center gap-1">
                                    {user.equippedBadges.map((badge: any) => (
                                        <div key={badge.id} title={badge.name} className="flex-shrink-0">
                                            {badge.imageUrl ? (
                                                <img src={badge.imageUrl} alt={badge.name} className="w-5 h-5 object-contain drop-shadow-sm" />
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/50 text-primary">
                                                    {badge.name}
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                            </span>
                        </div>

                        <div className="text-sm text-foreground/90 leading-relaxed">
                            {getMessage()}
                        </div>

                        {/* Watch Activity Poster Card */}
                        {type === 'watch_start' && (() => {
                            let meta: any = {};
                            try { meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata || {}; } catch (e) { }

                            if (meta.posterUrl) {
                                return (
                                    <Link href={meta.link || '#'}>
                                        <div className="mt-3 flex items-start gap-3 p-2 rounded-md bg-black/40 hover:bg-black/60 border border-white/5 transition-colors cursor-pointer group/poster">
                                            <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                                                <img src={meta.posterUrl} alt={meta.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex flex-col justify-center h-16 min-w-0">
                                                <span className="text-sm font-semibold text-white group-hover/poster:text-primary transition-colors truncate block max-w-[200px]">
                                                    {meta.title}
                                                </span>
                                                {meta.episode && (
                                                    <span className="text-xs text-muted-foreground truncate block">
                                                        {meta.episode}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Play className="w-3 h-3 text-primary fill-primary" />
                                                    <span className="text-[10px] text-primary font-medium uppercase tracking-wider">
                                                        Watching Now
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
                {/* Optional: Add a subtle bottom highlight for certain high-value activities */}
                {(type === 'purchase' || type === 'review_post') && (
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </Card>
        </motion.div>
    );
}
