import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageSquare, Share2, Award, Tv, Film, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Activity = {
    id: string;
    type: string;
    userId: string;
    contentId?: string;
    metadata: any;
    createdAt: string;
    user: {
        username: string;
        avatarUrl: string | null;
    } | null;
    commentsCount: number;
    likesCount: number;
    likedByMe: boolean;
};

import { useSocialSocket } from "@/hooks/use-social-socket";
import { useEffect } from "react";

export function ActivityFeed() {
    const { data: activities, isLoading } = useQuery<Activity[]>({
        queryKey: ["/api/activities/feed"],
    });
    const queryClient = useQueryClient();
    const { onNewActivity } = useSocialSocket();
    const [newPostText, setNewPostText] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        onNewActivity((newActivity) => {
            queryClient.setQueryData<Activity[]>(["/api/activities/feed"], (old) => {
                if (!old) return [newActivity];
                if (old.find(a => a.id === newActivity.id)) return old;
                return [newActivity, ...old];
            });
        });
    }, [onNewActivity, queryClient]);

    const createPostMutation = useMutation({
        mutationFn: async (text: string) => {
            await apiRequest("POST", "/api/activities", { content: text });
        },
        onSuccess: () => {
            setNewPostText("");
            toast({ title: "Posted!" });
        },
    });

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Loading activities...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Create Post */}
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-white/10">
                <div className="flex gap-4">
                    <Input
                        placeholder="Share what's on your mind..."
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        className="flex-1 bg-background/50 border-white/10"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && newPostText.trim()) {
                                createPostMutation.mutate(newPostText);
                            }
                        }}
                    />
                    <Button
                        onClick={() => newPostText.trim() && createPostMutation.mutate(newPostText)}
                        disabled={createPostMutation.isPending || !newPostText.trim()}
                    >
                        Post
                    </Button>
                </div>
            </Card>

            <div className="space-y-4">
                {activities && activities.length > 0 ? (
                    activities.map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))
                ) : (
                    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                        <p>No recent activity.</p>
                        <p className="text-sm mt-1">Watch shows or add friends to see updates here!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActivityItem({ activity }: { activity: Activity }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");

    const likeMutation = useMutation({
        mutationFn: async () => {
            await apiRequest("POST", `/api/activities/${activity.id}/like`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/activities/feed"] });
        },
    });

    const commentMutation = useMutation({
        mutationFn: async (text: string) => {
            await apiRequest("POST", `/api/activities/${activity.id}/comment`, { content: text });
        },
        onSuccess: () => {
            setCommentText("");
            queryClient.invalidateQueries({ queryKey: ["/api/activities/feed"] });
            queryClient.invalidateQueries({ queryKey: [`/api/activities/${activity.id}/comments`] });
            toast({ title: "Comment added" });
        },
    });

    const getActivityIcon = () => {
        switch (activity.type) {
            case "watch": return <Tv className="w-4 h-4 text-primary" />;
            case "rate": return <Heart className="w-4 h-4 text-red-500" />;
            case "level_up": return <Award className="w-4 h-4 text-yellow-500" />;
            case "friend_add": return <UserPlus className="w-4 h-4 text-green-500" />;
            default: return <Film className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getActivityText = () => {
        const meta = activity.metadata || {};
        switch (activity.type) {
            case "watch":
                return (
                    <span>
                        watched <Link href={meta.link || "#"} className="font-medium hover:underline text-primary">{meta.title}</Link>
                    </span>
                );
            case "rate":
                return (
                    <span>
                        rated <Link href={meta.link || "#"} className="font-medium hover:underline text-primary">{meta.title}</Link> {meta.rating}/5
                    </span>
                );
            case "level_up":
                return <span>reached Level {meta.level}!</span>;
            case "friend_add":
                return (
                    <span>
                        became friends with <span className="font-medium text-foreground">{meta.friendUsername}</span>
                    </span>
                );
            default:
                return <span>performed an action</span>;
        }
    };

    return (
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-white/10 hover:border-primary/20 transition-all">
            <div className="flex gap-3">
                <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={activity.user?.avatarUrl || undefined} />
                    <AvatarFallback>{activity.user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{activity.user?.username}</span>
                            {getActivityIcon()}
                            <span className="text-muted-foreground">{getActivityText()}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                    </div>

                    {/* Activity Content (e.g. Poster or embedded info) */}
                    {activity.metadata?.posterUrl && (
                        <div className="mt-2 w-16 h-24 rounded overflow-hidden border border-white/10">
                            <img src={activity.metadata.posterUrl} alt="Poster" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-2 gap-1.5 ${activity.likedByMe ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => likeMutation.mutate()}
                            disabled={likeMutation.isPending}
                        >
                            <Heart className={`w-4 h-4 ${activity.likedByMe ? "fill-current" : ""}`} />
                            <span className="text-xs">{activity.likesCount || 0}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowComments(!showComments)}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs">{activity.commentsCount || 0}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground ml-auto">
                            <Share2 className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Comment Section */}
                    {showComments && (
                        <div className="pt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <CommentsList activityId={activity.id} />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Write a comment..."
                                    className="h-8 text-sm"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && commentText.trim()) {
                                            commentMutation.mutate(commentText);
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="h-8"
                                    onClick={() => commentText.trim() && commentMutation.mutate(commentText)}
                                    disabled={commentMutation.isPending}
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

function CommentsList({ activityId }: { activityId: string }) {
    const { data: comments, isLoading } = useQuery<any[]>({
        queryKey: [`/api/activities/${activityId}/comments`],
    });

    if (isLoading) return <div className="text-xs text-muted-foreground">Loading comments...</div>;
    if (!comments?.length) return <div className="text-xs text-muted-foreground">No comments yet.</div>;

    return (
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2 text-sm">
                    <span className="font-semibold text-xs whitespace-nowrap pt-0.5">{comment.username || "User"}</span>
                    <p className="text-muted-foreground text-xs leading-relaxed break-words">{comment.content}</p>
                </div>
            ))}
        </div>
    );
}
