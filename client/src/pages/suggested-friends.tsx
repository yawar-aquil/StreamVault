import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Loader2, Check, Users, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RoleBadge, getUserRole } from "@/components/role-badge";
import { SEO } from "@/components/seo";
import type { User } from "@shared/schema";

interface SuggestedFriend extends User {
    mutualFriends?: number;
}

export default function SuggestedFriendsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());

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
            return userId;
        },
        onSuccess: (userId) => {
            setSentTo((prev) => new Set(prev).add(userId));
            toast({ title: "Request Sent", description: "Friend request sent successfully." });
            queryClient.invalidateQueries({ queryKey: ["suggested-friends"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to send friend request",
                variant: "destructive",
            });
        },
    });

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <SEO title="Suggested Friends" description="Discover people you may know on StreamVault." />

            <div className="max-w-5xl mx-auto pt-16">
                <Link href="/community">
                    <button className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Community
                    </button>
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Suggested Friends</h1>
                </div>
                <p className="text-muted-foreground mb-8">People you may know, based on mutual friends.</p>

                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : !suggestedFriends || suggestedFriends.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No suggestions right now. Check back later!</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suggestedFriends.map((user) => {
                            const sent = sentTo.has(user.id);
                            return (
                                <Card key={user.id} className="p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                    <Link href={`/profile/${user.username}`}>
                                        <Avatar className="w-16 h-16 border border-border cursor-pointer transition-transform hover:scale-105">
                                            <AvatarImage src={user.avatarUrl || undefined} />
                                            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <Link href={`/profile/${user.username}`}>
                                        <span className="mt-3 text-sm font-semibold hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1">
                                            {user.username}
                                            <RoleBadge role={getUserRole(user as any)} />
                                        </span>
                                    </Link>
                                    <span className="text-[11px] text-muted-foreground mt-0.5">
                                        {user.mutualFriends && user.mutualFriends > 0
                                            ? `${user.mutualFriends} mutual friend${user.mutualFriends > 1 ? "s" : ""}`
                                            : `Level ${user.level}`}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant={sent ? "secondary" : "default"}
                                        className="mt-3 w-full"
                                        disabled={sent || requestMutation.isPending}
                                        onClick={() => requestMutation.mutate(user.id)}
                                    >
                                        {sent ? (
                                            <><Check className="w-4 h-4 mr-1" /> Sent</>
                                        ) : requestMutation.isPending && requestMutation.variables === user.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <><UserPlus className="w-4 h-4 mr-1" /> Add Friend</>
                                        )}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
