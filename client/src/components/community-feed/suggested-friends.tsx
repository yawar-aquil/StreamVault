import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RoleBadge } from '@/components/role-badge';

interface SuggestedFriend extends User {
    mutualFriends?: number; // Optional if we calculate it on backend later
}

export function SuggestedFriends() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: suggestedFriends, isLoading } = useQuery<SuggestedFriend[]>({
        queryKey: ["suggested-friends"],
        queryFn: async () => {
            const res = await fetch("/api/friends/suggested");
            if (!res.ok) throw new Error("Failed to fetch suggested friends");
            return res.json();
        },
    });

    const requestMutation = useMutation({
        mutationFn: async (userId: string) => {
            await apiRequest("POST", "/api/friends/request", { toUserId: userId });
        },
        onSuccess: () => {
            toast({
                title: "Request Sent",
                description: "Friend request sent successfully.",
            });
            // We might want to remove the user from the list or mark as sent
            queryClient.invalidateQueries({ queryKey: ["suggested-friends"] });
            // For now, we'll likely refetch and the backend might filter them out if pending? 
            // The backend `getSuggestedFriends` filters out *existing* friends. 
            // It might not filter pending requests unless we updated it. 
            // Ideally we should purely refetch.
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to send friend request",
                variant: "destructive",
            });
        },
    });

    if (isLoading) {
        return (
            <Card className="border-border bg-card shadow-sm h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
        );
    }

    if (!suggestedFriends || suggestedFriends.length === 0) {
        return (
            <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary" />
                        Suggested Friends
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">No new suggestions right now.</p>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/leaderboard">Browse Community</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Suggested Friends
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {suggestedFriends.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${user.username}`}>
                                <Avatar className="w-9 h-9 border border-border cursor-pointer transition-transform hover:scale-105">
                                    <AvatarImage src={user.avatarUrl || undefined} />
                                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div className="flex flex-col">
                                <Link href={`/profile/${user.username}`}>
                                    <span className="text-sm font-semibold group-hover:text-primary transition-colors cursor-pointer">
                                        {user.username}
                                    </span>
                                </Link>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    Level {user.level}
                                </span>
                            </div>
                        </div>
                        <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={() => requestMutation.mutate(user.id)}
                            disabled={requestMutation.isPending}
                        >
                            {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        </Button>
                    </div>
                ))}

                <Button variant="outline" className="w-full text-xs mt-2 border-dashed border-border hover:bg-muted/50" asChild>
                    <Link href="/leaderboard">Find more people</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
