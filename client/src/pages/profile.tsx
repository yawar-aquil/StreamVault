import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { Progress } from '@/components/ui/progress';
import { StreakDisplay } from '@/components/streak-display';
import { Loader2, Camera, User, Save, LogOut, FileVideo, Eye, Twitter, Instagram, Youtube, Heart, Trophy, Medal, Star, BarChart2, Target, X, Settings, icons, Crown, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SiTiktok, SiDiscord } from 'react-icons/si';
import { FavoritesPicker } from '@/components/favorites-picker';
import { THEME_MAPPING, THEME_PREVIEWS } from '@/lib/theme-data';
import { cn } from '@/lib/utils';
import { HeartRain } from '@/components/heart-rain';
import { GalaxyAnimation } from '@/components/galaxy-animation';
import { AnimeMotion } from '@/components/anime-motion';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
    const [, navigate] = useLocation();
    const { user, isLoading: authLoading, isAuthenticated, updateProfile, uploadAvatar, logout } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [showFullAvatar, setShowFullAvatar] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // Social links state
    const [socialLinks, setSocialLinks] = useState({
        twitter: user?.socialLinks?.twitter || '',
        instagram: user?.socialLinks?.instagram || '',
        youtube: user?.socialLinks?.youtube || '',
        tiktok: user?.socialLinks?.tiktok || '',
        discord: user?.socialLinks?.discord || '',
    });

    // Favorites state
    const [favorites, setFavorites] = useState({
        shows: user?.favorites?.shows || [],
        movies: user?.favorites?.movies || [],
        anime: user?.favorites?.anime || [],
    });

    // Equip Badge Mutation
    const equipMutation = useMutation({
        mutationFn: async ({ badgeId, badgeName, equipped }: { badgeId: string; badgeName: string; equipped: boolean }) => {
            const res = await fetch('/api/user/equip-badge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ badgeId, equipped }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update badge');
            }
            return { equipped, badgeName };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/badges`] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/profile`] });
            queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/public-profile`] });
            toast({
                title: data.equipped ? 'Badge Equipped' : 'Badge Unequipped',
                description: `Successfully ${data.equipped ? 'equipped' : 'unequipped'} "${data.badgeName}"`,
            });
        },
        onError: (err: Error) => {
            toast({
                title: 'Error',
                description: err.message,
                variant: 'destructive',
            });
        }
    });

    // Sync state when user data loads
    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setBio(user.bio || '');
            setSocialLinks({
                twitter: user.socialLinks?.twitter || '',
                instagram: user.socialLinks?.instagram || '',
                youtube: user.socialLinks?.youtube || '',
                tiktok: user.socialLinks?.tiktok || '',
                discord: user.socialLinks?.discord || '',
            });
            setFavorites({
                shows: user.favorites?.shows || [],
                movies: user.favorites?.movies || [],
                anime: user.favorites?.anime || [],
            });
        }
    }, [user]);

    // Redirect if not logged in
    if (!authLoading && !isAuthenticated) {
        navigate('/login');
        return null;
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        try {
            await uploadAvatar(file);
            toast({
                title: 'Avatar updated!',
                description: 'Your profile picture has been updated.',
            });
        } catch (err: any) {
            // Check for specific error message about Animated Pack
            if (err.message && (err.message.includes('Animated Avatar Pack') || err.message.includes('Animated avatars require'))) {
                setShowPremiumModal(true);
            } else {
                toast({
                    title: 'Upload failed',
                    description: err.message || 'Failed to upload avatar',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsUploadingAvatar(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsUpdating(true);
        try {
            // Filter out empty social links
            const filteredSocialLinks = Object.fromEntries(
                Object.entries(socialLinks).filter(([_, v]) => v.trim() !== '')
            );
            await updateProfile({
                username,
                bio,
                socialLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined,
                favorites: (favorites.shows.length || favorites.movies.length || favorites.anime.length)
                    ? favorites
                    : undefined,
            });
            toast({
                title: 'Profile updated!',
                description: 'Your profile has been saved.',
            });
        } catch (err: any) {
            toast({
                title: 'Update failed',
                description: err.message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
        toast({
            title: 'Logged out',
            description: 'You have been logged out.',
        });
    };



    const handleEquipToggle = (badgeId: string, badgeName: string, currentStatus: boolean) => {
        equipMutation.mutate({ badgeId, badgeName, equipped: !currentStatus });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Calculate Skin Class
    const equippedSkin = user?.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges).find((b: any) => (b.category === 'theme' || b.category === 'skin') && b.equipped) : null;
    const skinClass = equippedSkin && THEME_MAPPING[equippedSkin.name] ? `skin-${THEME_MAPPING[equippedSkin.name]}` : '';

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 pt-24 pb-20">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Hero Profile Card */}
                <Card className={cn("border-primary/20 bg-card/60 backdrop-blur-sm overflow-hidden relative transition-colors duration-500", skinClass)}>
                    {skinClass === 'skin-valentines' && <HeartRain />}
                    {skinClass === 'skin-galaxy' && <GalaxyAnimation />}
                    {skinClass === 'skin-anime' && <AnimeMotion />}
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/5" />

                    <CardContent className="pt-8 relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0 mx-auto md:mx-0">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl cursor-pointer ring-2 ring-primary/20" onClick={() => user?.avatarUrl && setShowFullAvatar(true)}>
                                        <AvatarImage src={user?.avatarUrl || undefined} className={user?.avatarUrl?.endsWith('.gif') ? '' : 'object-cover'} />
                                        <AvatarFallback className="text-4xl bg-primary/10">
                                            {user?.username ? getInitials(user.username) : <User className="h-12 w-12" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    {user?.avatarUrl && (
                                        <div
                                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-transparent"
                                            onClick={() => setShowFullAvatar(true)}
                                        >
                                            <Eye className="h-8 w-8 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 right-0">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 rounded-full shadow-md hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={handleAvatarClick}
                                            disabled={isUploadingAvatar}
                                        >
                                            {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* User Stats & Info - Main Content */}
                            <div className="flex-1 w-full space-y-6">
                                <div className="text-center md:text-left space-y-1">
                                    <div className="flex flex-col md:flex-row items-center gap-3 justify-center md:justify-start">
                                        <h2 className="text-3xl font-bold tracking-tight">{user?.username}</h2>

                                        {/* Equipped Badges Display */}
                                        <div className="flex items-center gap-1.5">
                                            {user?.badges && (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges)
                                                .filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'feature' && b.category !== 'skin' && !b.name.includes('Skin'))
                                                .map((badge: any) => (
                                                    <div key={badge.id} className="relative group/tooltip" title={badge.name}>
                                                        <img
                                                            src={badge.imageUrl}
                                                            alt={badge.name}
                                                            className="w-6 h-6 object-contain drop-shadow-md hover:scale-110 transition-transform"
                                                        />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">{user?.email}</p>
                                    {bio && <p className="text-sm italic pt-2 max-w-lg mx-auto md:mx-0 text-muted-foreground/80">{bio}</p>}
                                </div>

                                {/* XP Bar */}
                                <div className="space-y-2 max-w-md mx-auto md:mx-0">
                                    <div className="flex justify-between items-end px-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] tracking-wider font-bold px-2 py-0.5">
                                                Level {(user as any)?.level || 1}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground font-medium">Master Viewer</span>
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {((user as any)?.xp || 0) % 1000} <span className="text-primary/60">/</span> 1000 XP
                                        </span>
                                    </div>
                                    <Progress value={(((user as any)?.xp || 0) % 1000) / 10} className="h-2.5 bg-secondary" />
                                </div>

                                {/* Streak Display - PLACED HERE AS REQUESTED */}
                                <div className="py-2">
                                    <StreakDisplay />
                                </div>

                                {/* Badges Section - Integrated */}
                                {/* Badges Section - Integrated */}
                                {(() => {
                                    const badges = user?.badges ? (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges) : [];
                                    const themes = badges.filter((b: any) => b.category === 'theme');
                                    const skins = badges.filter((b: any) => b.category === 'skin' || b.name.includes('Skin'));
                                    const regularBadges = badges.filter((b: any) => b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature');
                                    const equippedCount = badges.filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'feature' && b.category !== 'skin' && !b.name.includes('Skin')).length;

                                    if (badges.length === 0) return null;

                                    return (
                                        <div className="space-y-6 pt-2">
                                            {/* Premium Items (Themes) */}
                                            {themes.length > 0 && (
                                                <div className="space-y-3">
                                                    <Label className="uppercase text-xs tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                                        <Crown className="w-3 h-3 text-purple-500" /> Premium Items
                                                    </Label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4 pt-1 px-1">
                                                        {themes.map((theme: any) => {
                                                            const themeId = THEME_MAPPING[theme.name];
                                                            const previewUrl = theme.imageUrl || THEME_PREVIEWS[themeId];

                                                            return (
                                                                <div key={theme.id} className="relative group w-full rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-xl transition-all hover:scale-105 hover:border-primary/50" title={theme.description}>
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
                                                    <Label className="uppercase text-xs tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                                        <Crown className="w-3 h-3 text-pink-500" /> Skins
                                                    </Label>
                                                    <div className="flex gap-3 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent md:flex-wrap">
                                                        {skins.map((skin: any) => {
                                                            const isMaxEquipped = !skin.equipped && equippedCount >= 3;
                                                            return (
                                                                <div key={skin.id} className="group relative flex flex-col items-center justify-center p-2 bg-gradient-to-b from-muted/50 to-muted/20 border border-white/5 hover:border-primary/20 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg min-w-[90px] w-[90px] h-[140px]" title={skin.description}>
                                                                    <img
                                                                        src={skin.imageUrl}
                                                                        alt={skin.name}
                                                                        className="w-full h-24 object-cover rounded-md mb-2 drop-shadow-sm transition-transform group-hover:scale-110"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                    <span className="text-[10px] text-center font-medium leading-tight w-full px-1 text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 h-8">
                                                                        {skin.name}
                                                                    </span>
                                                                    {/* Equip Button */}
                                                                    <Button
                                                                        variant={skin.equipped ? "secondary" : "ghost"}
                                                                        size="sm"
                                                                        disabled={isMaxEquipped}
                                                                        className={`mt-1 h-6 text-[10px] px-2 w-full relative overflow-hidden ${skin.equipped
                                                                            ? 'bg-primary/20 text-primary hover:bg-destructive/20 hover:text-destructive'
                                                                            : 'hover:bg-white/10'}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEquipToggle(skin.badgeId || skin.id, skin.name, skin.equipped);
                                                                        }}
                                                                    >
                                                                        {skin.equipped ? 'Unequip' : 'Equip'}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Regular Badges */}
                                            {regularBadges.length > 0 && (
                                                <div className="space-y-3">
                                                    <Label className="uppercase text-xs tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                                                        <Trophy className="w-3 h-3" /> Badges Collection <span className="text-[10px] font-normal opacity-70">({equippedCount}/3 Equipped)</span>
                                                    </Label>
                                                    <div className="flex gap-3 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent md:flex-wrap">
                                                        {regularBadges.map((badge: any) => {
                                                            const iconName = badge.icon || 'Star';
                                                            const PascalName = iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                                            const IconComponent = (icons as any)[PascalName] || (icons as any)[iconName] || Star;
                                                            const isMaxEquipped = !badge.equipped && equippedCount >= 3;

                                                            return (
                                                                <div key={badge.id} className="group relative flex flex-col items-center justify-center p-3 bg-gradient-to-b from-muted/50 to-muted/20 border border-white/5 hover:border-primary/20 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg min-w-[100px] w-[110px] h-[140px]" title={badge.description}>
                                                                    {badge.imageUrl ? (
                                                                        <img
                                                                            src={badge.imageUrl}
                                                                            alt={badge.name}
                                                                            className="w-10 h-10 object-contain mb-2 drop-shadow-sm transition-transform group-hover:scale-110"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                            }}
                                                                        />
                                                                    ) : null}

                                                                    <div className={`w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-2 group-hover:bg-yellow-500/20 transition-colors ${badge.imageUrl ? 'hidden' : ''}`}>
                                                                        <IconComponent className="w-5 h-5" />
                                                                    </div>

                                                                    <span className="text-[10px] text-center font-medium leading-tight w-full px-1 text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 h-8">
                                                                        {badge.name}
                                                                    </span>

                                                                    {/* Equip Button */}
                                                                    <Button
                                                                        variant={badge.equipped ? "secondary" : "ghost"}
                                                                        size="sm"
                                                                        disabled={isMaxEquipped}
                                                                        className={`mt-2 h-6 text-[10px] px-2 w-full relative overflow-hidden ${badge.equipped
                                                                            ? 'bg-primary/20 text-primary hover:bg-destructive/20 hover:text-destructive'
                                                                            : 'hover:bg-white/10'}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEquipToggle(badge.badgeId || badge.id, badge.name, badge.equipped);
                                                                        }}
                                                                    >
                                                                        {badge.equipped ? 'Unequip' : 'Equip'}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>



                {/* Profile Settings Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Profile Settings
                        </CardTitle>
                        <CardDescription>Update your personal information and preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />

                        {/* Basic Info */}
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Your username"
                                    minLength={3}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell the community about yourself..."
                                    rows={3}
                                    maxLength={500}
                                    className="resize-none"
                                />
                                <div className="flex justify-end">
                                    <span className="text-[10px] text-muted-foreground">{bio.length}/500</span>
                                </div>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="space-y-4">
                            <Label className="text-base">Social Connections</Label>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#1DA1F2]/10 flex items-center justify-center flex-shrink-0">
                                        <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                                    </div>
                                    <Input
                                        value={socialLinks.twitter}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                                        placeholder="Twitter/X username"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                                        <Instagram className="h-5 w-5 text-pink-500" />
                                    </div>
                                    <Input
                                        value={socialLinks.instagram}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                                        placeholder="Instagram username"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-600/10 flex items-center justify-center flex-shrink-0">
                                        <Youtube className="h-5 w-5 text-red-600" />
                                    </div>
                                    <Input
                                        value={socialLinks.youtube}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                                        placeholder="YouTube channel"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <SiTiktok className="h-5 w-5" />
                                    </div>
                                    <Input
                                        value={socialLinks.tiktok}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, tiktok: e.target.value }))}
                                        placeholder="TikTok username"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
                                        <SiDiscord className="h-5 w-5 text-[#5865F2]" />
                                    </div>
                                    <Input
                                        value={socialLinks.discord}
                                        onChange={(e) => setSocialLinks(prev => ({ ...prev, discord: e.target.value }))}
                                        placeholder="Discord username"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Favorites */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-base flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                                    Favorite Content
                                </Label>
                            </div>
                            <FavoritesPicker
                                favorites={favorites}
                                onFavoritesChange={setFavorites}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-4 border-t">
                            <Button onClick={handleSave} disabled={isUpdating} className="w-full md:w-auto md:self-end min-w-[150px]">
                                {isUpdating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Profile
                                    </>
                                )}
                            </Button>

                            <div className="mt-8 pt-8 border-t border-destructive/10">
                                <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
                                <Button
                                    variant="destructive"
                                    onClick={handleLogout}
                                    className="w-full md:w-auto hover:bg-destructive/90 border-destructive/30"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Full Avatar Preview */}
            {
                showFullAvatar && user?.avatarUrl && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowFullAvatar(false)}
                    >
                        <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl scale-100 hover:scale-[1.02] transition-transform duration-300"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                            variant="ghost"
                            className="absolute top-4 right-4 text-white hover:bg-white/20"
                            onClick={() => setShowFullAvatar(false)}
                        >
                            <X className="h-6 w-6" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                )
            }

            {/* Premium Upgrade Modal */}
            <AlertDialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
                <AlertDialogContent className="bg-gradient-to-br from-background to-background/95 border-primary/20">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-xl">
                            <Crown className="w-6 h-6 text-purple-500" />
                            Premium Feature Locked
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 pt-2">
                            <p>
                                Animated avatars (GIFs) are a premium feature reserved for StreamVault supporters.
                            </p>
                            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex items-start gap-4">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Rocket className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-foreground">Animated Avatar Pack</p>
                                    <p className="text-xs text-muted-foreground">Get indefinite access to upload GIFs and stand out in the community!</p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>Maybe Later</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setShowPremiumModal(false);
                            navigate('/store?category=feature'); // Navigate to store
                        }} className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white border-0">
                            Go to Store
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
