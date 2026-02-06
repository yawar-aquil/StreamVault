import { useQuery } from "@tanstack/react-query";
import { useFriends } from "@/contexts/friends-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus, Check, Users, Newspaper } from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

function SuggestedFriends() {
    const { sendFriendRequest } = useFriends();
    const { data: suggestions = [] } = useQuery<any[]>({
        queryKey: ['/api/users/suggested'],
    });

    if (suggestions.length === 0) {
        return <p className="text-sm text-muted-foreground mt-4">No new suggestions right now.</p>;
    }

    return (
        <div className="space-y-4 mt-4">
            {suggestions.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">{user.username}</p>
                            <p className="text-[10px] text-muted-foreground">Suggested for you</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => sendFriendRequest(user.id)}
                    >
                        <UserPlus className="w-4 h-4" />
                    </Button>
                </div>
            ))}
        </div>
    );
}

export default function SocialPage() {
    return (
        <div className="min-h-screen bg-background pb-12 pt-24">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Feed Area */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50">
                                    Community
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    See what your friends are watching and doing.
                                </p>
                            </div>
                        </div>

                        <Tabs defaultValue="feed" className="w-full">
                            <TabsList className="bg-card/50 backdrop-blur-sm border border-white/5">
                                <TabsTrigger value="feed" className="gap-2">
                                    <Newspaper className="w-4 h-4" /> Activity Feed
                                </TabsTrigger>
                                <TabsTrigger value="friends" className="gap-2">
                                    <Users className="w-4 h-4" /> Friends
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="feed" className="mt-6">
                                <ActivityFeed />
                            </TabsContent>

                            <TabsContent value="friends" className="mt-6">
                                <Card className="p-8 text-center border-dashed">
                                    <p className="text-muted-foreground mb-4">View and manage your friends list.</p>
                                    <Link href="/friends">
                                        <a className="inline-flex items-center justify-center h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium text-sm transition-colors">
                                            Go to Friends Page
                                        </a>
                                    </Link>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar (Optional widgets) */}
                    <div className="hidden md:block w-80 space-y-6">
                        <Card className="p-4 bg-card/50 backdrop-blur-sm border-white/5">
                            <h3 className="font-semibold mb-2">Suggested Friends</h3>
                            <p className="text-sm text-muted-foreground">Find more people to follow!</p>
                            <SuggestedFriends />
                        </Card>

                        <Card className="p-4 bg-primary/5 border-primary/10">
                            <h3 className="font-semibold text-primary mb-2">Invite Friends</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                                Share your referral code to earn coins and badges.
                            </p>
                            <Link href="/referral-program">
                                <a className="text-xs text-primary underline hover:text-primary/80">View Referral Program</a>
                            </Link>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
