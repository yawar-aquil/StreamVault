import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useSocialSocket } from '@/hooks/use-social-socket';

interface Friend {
    id: string;
    friendId: string;
    username: string;
    avatarUrl: string | null;
    badges?: any[];
    lastActive?: string | null;
    createdAt: string;
}

interface FriendRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    status: 'pending';
    createdAt: string;
    fromUser: {
        username: string;
        avatarUrl: string | null;
        badges?: any[];
    };
}

interface FriendsContextType {
    friends: Friend[];
    friendRequests: FriendRequest[];
    isLoading: boolean;
    sendFriendRequest: (userId: string) => Promise<void>;
    acceptFriendRequest: (userId: string) => Promise<void>;
    declineFriendRequest: (userId: string) => Promise<void>;
    removeFriend: (userId: string) => Promise<void>;
    searchUsers: (query: string) => Promise<{ id: string; username: string; avatarUrl: string | null; badges?: any }[]>;
    refreshFriends: () => Promise<void>;
    updateFriendLastActive: (friendId: string, timestamp: string) => void;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export function FriendsProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const { toast } = useToast();
    const { notifyFriendRequest, notifyFriendAccepted, onFriendRequestReceived } = useSocialSocket();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFriends = useCallback(async () => {
        if (!isAuthenticated) {
            setFriends([]);
            setFriendRequests([]);
            setIsLoading(false);
            return;
        }

        try {
            const [friendsRes, requestsRes] = await Promise.all([
                fetch('/api/friends', { credentials: 'include' }),
                fetch('/api/friends/requests', { credentials: 'include' })
            ]);

            if (friendsRes.ok) {
                const data = await friendsRes.json();
                setFriends(data);
            }

            if (requestsRes.ok) {
                const data = await requestsRes.json();
                setFriendRequests(data);
            }
        } catch (error) {
            console.error('Failed to fetch friends:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // Auto-refresh when friend request is received via socket
    useEffect(() => {
        onFriendRequestReceived(() => {
            fetchFriends();
        });
    }, [onFriendRequestReceived, fetchFriends]);

    const sendFriendRequest = async (userId: string) => {
        try {
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ toUserId: userId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send friend request');
            }

            toast({
                title: 'Success',
                description: 'Friend request sent',
            });

            // Notify via socket
            notifyFriendRequest(userId);

            fetchFriends();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
            throw error;
        }
    };

    const acceptFriendRequest = async (requestId: string) => {
        try {
            const response = await fetch(`/api/friends/accept/${requestId}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to accept friend request');
            }

            const data = await response.json();

            toast({
                title: 'Success',
                description: 'Friend request accepted',
            });

            // Notify via socket - use fromUserId from the response if available
            if (data.fromUserId) {
                notifyFriendAccepted(data.fromUserId);
            }

            fetchFriends();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        }
    };

    const declineFriendRequest = async (requestId: string) => {
        try {
            const response = await fetch(`/api/friends/decline/${requestId}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to decline friend request');
            }

            toast({
                title: 'Success',
                description: 'Friend request declined',
            });

            fetchFriends();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        }
    };

    const removeFriend = async (userId: string) => {
        try {
            const response = await fetch(`/api/friends/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to remove friend');
            }

            toast({
                title: 'Success',
                description: 'Friend removed',
            });

            fetchFriends();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        }
    };

    const searchUsers = async (query: string) => {
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { credentials: 'include' });
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Failed to search users:', error);
            return [];
        }
    };

    const updateFriendLastActive = useCallback((friendId: string, timestamp: string) => {
        setFriends(prev => prev.map(f => {
            if (f.friendId === friendId || f.id === friendId) {
                return { ...f, lastActive: timestamp };
            }
            return f;
        }));
    }, []);

    return (
        <FriendsContext.Provider
            value={{
                friends,
                friendRequests,
                isLoading,
                sendFriendRequest,
                acceptFriendRequest,
                declineFriendRequest,
                removeFriend,
                searchUsers,
                refreshFriends: fetchFriends,
                updateFriendLastActive
            }}
        >
            {children}
        </FriendsContext.Provider>
    );
}

export function useFriends() {
    const context = useContext(FriendsContext);
    if (context === undefined) {
        throw new Error('useFriends must be used within a FriendsProvider');
    }
    return context;
}
