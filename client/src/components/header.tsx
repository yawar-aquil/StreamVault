import { Link, useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Search, Moon, Sun, Play, Menu, X, Bookmark, Users, User, LogOut, PartyPopper, UserPlus, Download, Settings, Store, Wallet, Package, Trophy, Medal, BarChart2, Target, Gift, BookOpen, Code, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "./theme-provider";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Show, Movie, Anime } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { RoleBadge, getUserRole } from "@/components/role-badge";
import { useAds } from "@/components/ad-manager";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { cn, isIndianDomain } from "@/lib/utils";
import { AnimatedAdFreeIcon } from '@/components/animated-ad-free-icon';
import StreamCoin from '@/components/stream-coin';
import { AdFreeUpgradeModal } from '@/components/ad-free-upgrade-modal';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const { adEnabled, toggleAds } = useAds();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchData } = useQuery({
    queryKey: ["/api/search/advanced", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { items: [] };
      const res = await fetch(`/api/search/advanced?q=${encodeURIComponent(debouncedQuery)}&limit=8`);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      return { ...data, items: data.items.map((item: any) => ({ ...item, type: item.mediaType })) };
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const searchResults = searchData?.items || [];

  const navigation = [
    { name: t('nav.home'), path: "/" },
    { name: t('nav.shows'), path: "/series" },
    { name: t('nav.movies'), path: "/movies" },
    { name: t('nav.anime'), path: "/anime" },
    { name: t('home.trending'), path: "/trending" },
  ];

  const categories = [
    { name: "Action & Thriller", path: "/category/action" },
    { name: "Drama & Romance", path: "/category/drama" },
    { name: "Comedy", path: "/category/comedy" },
    { name: "Horror & Mystery", path: "/category/horror" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      setShowResults(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(value.trim().length > 0);
  };

  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll to add floating effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock background scroll while the mobile menu overlay is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  // Feature shortcuts shown as a grid in the mobile menu
  const mobileFeatures = [
    { name: "Store", path: "/store", icon: Store, color: "text-purple-500" },
    { name: "Rooms", path: "/watch-rooms", icon: PartyPopper, color: "text-pink-500" },
    { name: "Watchlist", path: "/watchlist", icon: Bookmark, color: "text-blue-500" },
    { name: "Leaderboard", path: "/leaderboard", icon: Medal, color: "text-yellow-400" },
    { name: "Achievements", path: "/achievements", icon: Trophy, color: "text-purple-400" },
    { name: "Community", path: "/community", icon: Users, color: "text-green-500" },
    { name: "Polls", path: "/polls", icon: BarChart2, color: "text-blue-400" },
    { name: "Challenges", path: "/challenges", icon: Target, color: "text-red-400" },
    { name: "Referrals", path: "/referral-program", icon: Gift, color: "text-emerald-500" },
    { name: "Blog", path: "/blog", icon: BookOpen, color: "text-orange-400" },
    { name: "API Docs", path: "/api-docs", icon: Code, color: "text-cyan-400" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 sm:h-20 flex flex-col justify-center pointer-events-none">
      <div className={cn(
        "pointer-events-auto mx-auto flex items-center justify-between gap-4 transition-all duration-300 ease-out",
        isScrolled 
          ? "h-20 w-[99%] max-w-[1700px] bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 rounded-[2rem] px-10 translate-y-4" 
          : "h-16 sm:h-20 w-full max-w-[1600px] bg-background/95 backdrop-blur-md border-b border-border/40 rounded-none px-4 lg:px-8 translate-y-0"
      )}>
        {/* Logo */}
        <Link href="/">
          <div
            className="flex items-center gap-2 text-xl font-bold tracking-tight hover-elevate active-elevate-2 rounded-md px-3 py-2 cursor-pointer"
            data-testid="link-home-logo"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="hidden sm:inline font-black tracking-tight">
              {"StreamVault".split("").map((char, i) => (
                <span key={i} className={i % 2 === 0 ? "text-red-500" : "text-white"}>{char}</span>
              ))}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 cursor-pointer ${location === item.path
                  ? "text-foreground"
                  : "text-muted-foreground"
                  }`}
                data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.name}
              </div>
            </Link>
          ))}

          {/* Categories Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-3"
                data-testid="button-categories-dropdown"
              >
                {t('footer.categories')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {categories.map((category) => (
                <DropdownMenuItem key={category.path} asChild>
                  <Link href={category.path}>
                    <div
                      className="w-full cursor-pointer"
                      data-testid={`link-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {category.name}
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>



        {/* Right Section */}
        <div className="flex items-center gap-2">

          {/* Custom Grid Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex"
                data-testid="button-grid-menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-foreground transition-colors"
                >
                  <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] sm:w-[340px] p-4 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl">
              <div className="flex items-center justify-center mb-4 px-1">
                <h2 className="text-lg font-bold">Menu</h2>

              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Store */}
                <Link href="/store">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Store className="h-6 w-6 mb-2 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Store</span>
                  </div>
                </Link>

                {/* Rooms */}
                <Link href="/watch-rooms">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <PartyPopper className="h-6 w-6 mb-2 text-pink-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Rooms</span>
                  </div>
                </Link>

                {/* Watchlist */}
                <Link href="/watchlist">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Bookmark className="h-6 w-6 mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Watchlist</span>
                  </div>
                </Link>

                {/* Achievements */}
                <Link href="/achievements">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Trophy className="h-6 w-6 mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Achievements</span>
                  </div>
                </Link>

                {/* Leaderboard */}
                <Link href="/leaderboard">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Medal className="h-6 w-6 mb-2 text-yellow-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Leaderboard</span>
                  </div>
                </Link>

                {/* Polls */}
                <Link href="/polls">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <BarChart2 className="h-6 w-6 mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Polls</span>
                  </div>
                </Link>

                {/* Challenges */}
                <Link href="/challenges">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Target className="h-6 w-6 mb-2 text-red-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Challenges</span>
                  </div>
                </Link>

                {/* Referrals */}
                <Link href="/referral-program">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Gift className="h-6 w-6 mb-2 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Referrals</span>
                  </div>
                </Link>

                {/* Blog */}
                <Link href="/blog">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <BookOpen className="h-6 w-6 mb-2 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Blog</span>
                  </div>
                </Link>

                {/* API Docs */}
                <Link href="/api-docs">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Code className="h-6 w-6 mb-2 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">API Docs</span>
                  </div>
                </Link>

                {/* Community */}
                <Link href="/community">
                  <div className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer">
                    <Users className="h-6 w-6 mb-2 text-green-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Community</span>
                  </div>
                </Link>

                {/* Theme Toggle */}
                <div
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-6 w-6 mb-2 text-yellow-500 group-hover:rotate-90 transition-transform" />
                  ) : (
                    <Moon className="h-6 w-6 mb-2 text-indigo-500 group-hover:-rotate-12 transition-transform" />
                  )}
                  <span className="font-medium text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>

              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          {searchOpen ? (
            <div ref={searchRef} className="hidden sm:block relative">
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200"
              >
                <Input
                  type="search"
                  placeholder={t('nav.search')}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-64"
                  autoFocus
                  data-testid="input-search"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearchOpen(false);
                    setShowResults(false);
                    setSearchQuery("");
                  }}
                  data-testid="button-close-search"
                >
                  <X className="h-5 w-5" />
                </Button>
              </form>

              {/* Live Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-96 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  {searchResults.map((item: any) => (
                    <Link key={item.id} href={item.type === 'anime' ? `/anime/${item.slug}` : item.type === 'show' ? `/show/${item.slug}` : `/movie/${item.slug}`}>
                      <div
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                        }}
                      >
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.year} • {item.type === 'anime' ? 'Anime' : item.type === 'show' ? 'TV Series' : 'Movie'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchQuery.trim() && (
                    <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}>
                      <div
                        className="p-3 text-center text-sm text-primary hover:bg-accent cursor-pointer border-t border-border"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                        }}
                      >
                        View all results for "{searchQuery}"
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex"
              data-testid="button-open-search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}


          {/* Auth: Notifications Bell and User Avatar */}
          {isAuthenticated && (
            <NotificationsDropdown />
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer outline-none">


                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
                      <AvatarFallback className="bg-primary/10 text-xs">
                        {user?.username?.slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium flex items-center gap-2">
                  {user?.username}
                  {user?.username && <RoleBadge role={getUserRole(user as any)} />}
                  {user?.badges && (typeof user.badges === 'string' ? JSON.parse(user.badges) : user.badges)
                    .filter((b: any) => b.equipped && b.category !== 'theme' && b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'feature')
                    .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                    .map((badge: any) => (
                      <img
                        key={badge.id}
                        src={badge.imageUrl}
                        alt={badge.name}
                        title={badge.name}
                        className="w-4 h-4 object-contain"
                      />
                    ))
                  }
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-yellow-500 font-medium focus:text-yellow-400 focus:bg-yellow-500/10 cursor-default">
                  <StreamCoin size="sm" className="mr-2" />
                  <span>{user?.coins || 0} Coins</span>
                </DropdownMenuItem>
                <Link href="/wallet">
                  <DropdownMenuItem className="cursor-pointer">
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>{t('My Wallet')}</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/inventory">
                  <DropdownMenuItem className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Products</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  {t('nav.profile')}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/friends')}>
                  <Users className="mr-2 h-4 w-4" />
                  {t('profile.friends')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/downloads')}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('actions.download')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Ad Toggle */}
                {/* Ad Toggle - Only on .in domain */}
                {isIndianDomain() && (
                  <div className="px-2 py-1.5 flex items-center justify-between text-sm outline-none">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 text-yellow-500">
                        <AnimatedAdFreeIcon className="w-full h-full" />
                      </div>
                      <span>Ad-Free</span>
                    </div>
                    <Switch
                      checked={!adEnabled}
                      onCheckedChange={(checked) => {
                        if (checked && (!user?.adFreeUntil || new Date(user.adFreeUntil) < new Date())) {
                          // Trying to turn ad-free ON but not subscribed - show upgrade modal
                          setShowUpgradeModal(true);
                          return;
                        }
                        toggleAds();
                      }}
                      className="ml-2 scale-75"
                    />
                  </div>
                )}
                {isIndianDomain() && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="hidden sm:flex gap-2">
                <UserPlus className="h-4 w-4" />
                Join
              </Button>
            </Link>
          )}

          {isIndianDomain() && <AdFreeUpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            data-testid="button-mobile-menu-toggle"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu — full-screen overlay so it can never be cut off by the floating header */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] pointer-events-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel */}
          <div
            className="absolute inset-0 flex flex-col bg-background animate-in slide-in-from-top-4 duration-200"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Sticky top bar: brand + always-visible close button */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-lg font-black tracking-tight">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
                  <Play className="w-4 h-4 text-primary-foreground fill-current" />
                </div>
                <span>
                  {"StreamVault".split("").map((char, i) => (
                    <span key={i} className={i % 2 === 0 ? "text-red-500" : "text-foreground"}>{char}</span>
                  ))}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                data-testid="button-mobile-menu-close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
            >
              {/* Search */}
              <div className="relative">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    placeholder={t('nav.search')}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 h-11 rounded-xl"
                    data-testid="input-mobile-search"
                  />
                </form>

                {/* Live results */}
                {showResults && searchResults.length > 0 && (
                  <div className="mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    {searchResults.map((item: any) => (
                      <Link key={item.id} href={item.type === 'anime' ? `/anime/${item.slug}` : item.type === 'show' ? `/show/${item.slug}` : `/movie/${item.slug}`}>
                        <div
                          className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery("");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <img src={item.posterUrl} alt={item.title} className="w-10 h-14 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {item.year} • {item.type === 'anime' ? 'Anime' : item.type === 'show' ? 'TV Series' : 'Movie'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {searchQuery.trim() && (
                      <Link href={`/search?q=${encodeURIComponent(searchQuery)}`}>
                        <div
                          className="p-3 text-center text-sm text-primary hover:bg-accent cursor-pointer border-t border-border"
                          onClick={() => {
                            setShowResults(false);
                            setSearchQuery("");
                            setMobileMenuOpen(false);
                          }}
                        >
                          View all results for "{searchQuery}"
                        </div>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Guest CTA — lets guests actually sign in/up from mobile */}
              {!isAuthenticated && (
                <Link href="/login">
                  <Button
                    className="w-full gap-2 h-11 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="button-mobile-join"
                  >
                    <UserPlus className="h-4 w-4" />
                    Sign in / Join
                  </Button>
                </Link>
              )}

              {/* Primary navigation */}
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${location === item.path
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:bg-accent/60"
                        }`}
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`link-mobile-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.name}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Feature grid */}
              <div>
                <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Explore
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {mobileFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Link key={feature.path} href={feature.path}>
                        <div
                          className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer text-center"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className={`h-5 w-5 ${feature.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-[11px] font-medium leading-tight">{feature.name}</span>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Theme toggle */}
                  <div
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-accent/30 hover:bg-accent border border-white/5 hover:border-primary/20 transition-all cursor-pointer text-center"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5 text-yellow-500 group-hover:rotate-90 transition-transform" />
                    ) : (
                      <Moon className="h-5 w-5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
                    )}
                    <span className="text-[11px] font-medium leading-tight">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="border-t border-border pt-3">
                <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('footer.categories')}
                </p>
                {categories.map((category) => (
                  <Link key={category.path} href={category.path}>
                    <div
                      className="block px-3 py-2 text-sm text-muted-foreground rounded-lg hover:bg-accent/60 cursor-pointer transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`link-mobile-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {category.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
