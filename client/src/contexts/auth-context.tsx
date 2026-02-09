import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface SocialLinks {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    discord?: string;
}

interface Favorites {
    shows?: string[];
    movies?: string[];
    anime?: string[];
}

interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    socialLinks?: SocialLinks | null;
    favorites?: Favorites | null;
    referredBy?: string | null;
    referralCount?: number;
    badges?: string; // JSON string
    equippedBadge?: {
        id: string;
        name: string;
        imageUrl: string;
        isSpecial?: boolean;
    } | null;
    coins?: number;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: { username?: string; bio?: string; socialLinks?: SocialLinks; favorites?: Favorites }) => Promise<void>;
    uploadAvatar: (file: File) => Promise<string>;
    refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    // Fetch current user
    const { data, isLoading, refetch } = useQuery<{ user: User } | null>({
        queryKey: ['/api/auth/me'],
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const user = data?.user || null;
    const isAuthenticated = !!user;

    // Sync user settings to localStorage when authenticated
    // This ensures components like Chatbot read the correct user preferences
    useEffect(() => {
        const syncSettings = async () => {
            if (isAuthenticated) {
                try {
                    const response = await apiRequest('GET', '/api/user/settings');
                    const serverSettings = await response.json();
                    localStorage.setItem('streamvault_settings', JSON.stringify(serverSettings));
                    // Dispatch event for components already mounted (like Chatbot)
                    window.dispatchEvent(new CustomEvent('settings-changed', {
                        detail: { key: 'chatbotEnabled', value: serverSettings.chatbotEnabled }
                    }));
                } catch (e) {
                    console.error('Failed to sync settings:', e);
                }
            }
        };
        syncSettings();
    }, [isAuthenticated]);

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await apiRequest('POST', '/api/auth/login', { email, password });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: async ({ email, username, password }: { email: string; username: string; password: string }) => {
            const response = await apiRequest('POST', '/api/auth/register', { email, username, password });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('POST', '/api/auth/logout', {});
            return response.json();
        },
        onSuccess: () => {
            queryClient.setQueryData(['/api/auth/me'], null);
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        },
    });

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data: { username?: string; bio?: string; socialLinks?: SocialLinks; favorites?: Favorites }) => {
            const response = await apiRequest('PUT', '/api/auth/profile', data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        },
    });

    // Upload avatar
    const uploadAvatar = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/auth/avatar', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload avatar');
        }

        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        return data.avatarUrl;
    };

    const login = async (email: string, password: string) => {
        const result = await loginMutation.mutateAsync({ email, password });
        if (result.error) {
            throw new Error(result.error);
        }
    };

    const register = async (email: string, username: string, password: string) => {
        const result = await registerMutation.mutateAsync({ email, username, password });
        if (result.error) {
            throw new Error(result.error);
        }
    };

    const logout = async () => {
        await logoutMutation.mutateAsync();
    };

    const updateProfile = async (data: { username?: string; bio?: string; socialLinks?: SocialLinks; favorites?: Favorites }) => {
        const result = await updateProfileMutation.mutateAsync(data);
        if (result.error) {
            throw new Error(result.error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                register,
                logout,
                updateProfile,
                uploadAvatar,
                refetchUser: refetch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
