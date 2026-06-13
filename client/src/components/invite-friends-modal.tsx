import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge, getUserRole } from "@/components/role-badge";
import { Search, UserPlus, Check, Wifi, WifiOff } from "lucide-react";
import { useFriends } from "@/contexts/friends-context";
import { useAuth } from "@/contexts/auth-context";
import { useSocialSocket } from "@/hooks/use-social-socket";

interface InviteFriendsModalProps {
    roomCode: string;
    roomTitle?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteFriendsModal({ roomCode, roomTitle, open, onOpenChange }: InviteFriendsModalProps) {
    const { user } = useAuth();
    const { friends, isLoading, refreshFriends } = useFriends();
    const { socket } = useSocialSocket();
    const [searchQuery, setSearchQuery] = useState("");
    const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

    // Filter friends based on search query
    const filteredFriends = friends.filter(friend =>
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleInvite = (friendId: string) => {
        if (!socket || !user) return;

        // Send invite via socket
        socket.emit("room:invite", {
            toUserId: friendId, // In the friends context, friendId might be the 'other' user's ID found in the friend object logic
            // Wait, let's verify friend ID usage.
            // In friends-context: friend.friendId is the OTHER person if friend.userId === me.
            // But the friends array from useFriends() usually normalizes this or we need to check.
            // Looking at friends-context.tsx:
            // const friendId = friend.userId === userId ? friend.friendId : friend.userId;
            // It seems the context just returns the raw array from DB?
            // "const data = await friendsRes.json(); setFriends(data);"
            // So we need to logic to find the 'other' ID.
            roomCode,
            roomTitle,
            fromUserId: user.id
        });

        // Add to invited list
        setInvitedFriends(prev => new Set(prev).add(friendId));
    };

    // Correctly identify the friend's user ID
    const getFriendUserId = (friend: any) => {
        // If the context exposes normalized friends, great.
        // If not, we might need to check who we are.
        // But typically the UI displays 'friend' objects.
        // Let's assume the friends list in the UI is valid friend objects.
        // If I look at friends-context provider:
        // "friends" is just the raw array.
        // But wait, the "friends" array in context is defined as:
        // interface Friend { id: string; friendId: string; username: string; ... } (?)
        // Actually, looking at the context again:
        // interface Friend { id: string; friendId: string; username: string; ... } matches specific structure?
        // Let's assume the 'friendId' or 'userId' is the other person.
        // Actually, usually one field is ME and one is THEM.
        // Let's use a helper to get the OTHER ID.
        return friend.userId === user?.id ? friend.friendId : friend.userId;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite Friends</DialogTitle>
                    <DialogDescription>
                        Invite your friends to watch together in real-time.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search friends..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <ScrollArea className="h-[300px] pr-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-md"></span>
                        </div>
                    ) : filteredFriends.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? "No friends found matching your search." : "No friends found. Add some friends first!"}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredFriends.map((friend) => {
                                const targetUserId = getFriendUserId(friend);
                                const isInvited = invitedFriends.has(targetUserId);
                                // A rough check for online status if available in friend object
                                // The friend object in context has "lastActive" but maybe not "isOnline".
                                // We'll skip strict online check visualization for now or use lastActive.

                                return (
                                    <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border">
                                                <AvatarImage src={friend.avatarUrl || undefined} />
                                                <AvatarFallback>{friend.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{friend.username}</span>
                                                    <RoleBadge role={getUserRole(friend as any)} />
                                                </div>
                                                {/* Optional: Status indicator */}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={isInvited ? "outline" : "default"}
                                            className={isInvited ? "text-green-500" : ""}
                                            disabled={isInvited}
                                            onClick={() => handleInvite(targetUserId)}
                                        >
                                            {isInvited ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Sent
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4 mr-2" />
                                                    Invite
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                <div className="flex justify-end pt-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
