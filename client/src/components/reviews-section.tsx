import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ThumbsUp, AlertTriangle, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Review {
    id: string;
    userId: string;
    contentType: string;
    contentId: string;
    rating: number;
    reviewText: string | null;
    spoilerWarning: boolean;
    helpfulCount: number;
    createdAt: string;
    username: string;
    avatarUrl: string | null;
    authorBadges?: any[];
}

interface ReviewsData {
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
}

interface ReviewsSectionProps {
    contentType: 'movie' | 'show' | 'anime';
    contentId: string;
}

function StarRating({ rating, onRatingChange, readonly = false }: {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
}) {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
                    onMouseEnter={() => !readonly && setHoverRating(star)}
                    onMouseLeave={() => !readonly && setHoverRating(0)}
                    onClick={() => !readonly && onRatingChange?.(star)}
                    disabled={readonly}
                >
                    <Star
                        className={`w-6 h-6 transition-colors ${star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                            }`}
                    />
                </button>
            ))}
        </div>
    );
}

export function ReviewsSection({ contentType, contentId }: ReviewsSectionProps) {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [newRating, setNewRating] = useState(0);
    const [newReviewText, setNewReviewText] = useState('');
    const [spoilerWarning, setSpoilerWarning] = useState(false);
    const [showSpoilers, setShowSpoilers] = useState<Record<string, boolean>>({});

    const { data, isLoading } = useQuery<ReviewsData>({
        queryKey: [`/api/reviews/${contentType}/${contentId}`],
    });

    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            return apiRequest('POST', '/api/reviews', {
                contentType,
                contentId,
                rating: newRating,
                reviewText: newReviewText || null,
                spoilerWarning,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/reviews/${contentType}/${contentId}`] });
            setNewRating(0);
            setNewReviewText('');
            setSpoilerWarning(false);
            toast({ title: 'Review submitted!' });
        },
        onError: () => {
            toast({ title: 'Failed to submit review', variant: 'destructive' });
        },
    });

    const helpfulMutation = useMutation({
        mutationFn: async (reviewId: string) => {
            return apiRequest('POST', `/api/reviews/${reviewId}/helpful`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/reviews/${contentType}/${contentId}`] });
        },
    });

    const deleteReviewMutation = useMutation({
        mutationFn: async (reviewId: string) => {
            return apiRequest('DELETE', `/api/reviews/${reviewId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/reviews/${contentType}/${contentId}`] });
            toast({ title: 'Review deleted' });
        },
    });

    return (
        <div className="space-y-6">
            {/* Header with average rating */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold">User Reviews</h3>
                    {data && data.totalReviews > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                        key={star}
                                        className={`w-4 h-4 ${star <= Math.round(data.averageRating)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-muted-foreground'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-yellow-400 font-semibold">{data.averageRating.toFixed(1)}</span>
                            <span className="text-muted-foreground text-sm">({data.totalReviews} reviews)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Submit review form */}
            {isAuthenticated && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-card/50 border border-white/10 space-y-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">Your Rating:</span>
                        <StarRating rating={newRating} onRatingChange={setNewRating} />
                    </div>

                    <Textarea
                        placeholder="Write your review (optional)..."
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        className="min-h-[100px] bg-background/50"
                    />

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                                checked={spoilerWarning}
                                onCheckedChange={(checked) => setSpoilerWarning(checked as boolean)}
                            />
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            Contains spoilers
                        </label>

                        <Button
                            onClick={() => submitReviewMutation.mutate()}
                            disabled={newRating === 0 || submitReviewMutation.isPending}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Submit Review
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Reviews list */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-muted/20 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : data?.reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No reviews yet. Be the first to review!</p>
                </div>
            ) : (
                <AnimatePresence>
                    <div className="space-y-4">
                        {data?.reviews.map((review, index) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 rounded-xl bg-card/30 border border-white/5 space-y-3"
                            >
                                {/* Review header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={review.avatarUrl || undefined} />
                                            <AvatarFallback>{review.username[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{review.username}</p>
                                                {/* User Badges */}
                                                {review.authorBadges && review.authorBadges.length > 0 && (
                                                    <div className="flex gap-[2px]">
                                                        {review.authorBadges
                                                            .filter((b: any) => !b.name.includes('Skin') && !b.name.includes('Theme'))
                                                            .map((badge: any, i: number) => (
                                                                <div key={i} className="relative group/badge z-10" style={{ zIndex: 10 - i }}>
                                                                    <img
                                                                        src={badge.imageUrl}
                                                                        alt={badge.name}
                                                                        className="w-5 h-5 object-contain drop-shadow-sm"
                                                                        title={badge.name}
                                                                    />
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StarRating rating={review.rating} readonly />
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {user?.id === review.userId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteReviewMutation.mutate(review.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>

                                {/* Review content */}
                                {review.reviewText && (
                                    <div>
                                        {review.spoilerWarning && !showSpoilers[review.id] ? (
                                            <div
                                                className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 cursor-pointer"
                                                onClick={() => setShowSpoilers(prev => ({ ...prev, [review.id]: true }))}
                                            >
                                                <div className="flex items-center gap-2 text-yellow-500">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Contains spoilers - Click to reveal</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {review.reviewText}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Helpful button */}
                                <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => helpfulMutation.mutate(review.id)}
                                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                        disabled={!isAuthenticated}
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        Helpful ({review.helpfulCount})
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}
        </div>
    );
}
