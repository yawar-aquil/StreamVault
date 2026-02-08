import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import {
    BarChart3,
    Users,
    Eye,
    Clock,
    Globe,
    Smartphone,
    Monitor,
    Tablet,
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    Play,
    Film,
    Tv,
    Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface SiteAnalytics {
    overview: {
        pageViews: { today: number; week: number; month: number; total: number };
        visitors: { today: number; week: number; total: number };
        activeUsers: number;
        totalWatchTimeHours: number;
    };
    dailyViews: { date: string; views: number; visitors: number }[];
    hourlyActivity: { hour: number; views: number }[];
    popularPages: { path: string; views: number }[];
    trafficSources: { source: string; visits: number }[];
    devices: { mobile: number; desktop: number; tablet: number };
    browsers: Record<string, number>;
    topShows: { id: string; title: string; watches: number; duration: number }[];
    topMovies: { id: string; title: string; watches: number; duration: number }[];
    recentPageViews: { timestamp: string; path: string; referrer: string }[];
    badgeStats?: {
        totalBadges: number;
        totalAwarded: number;
        popularBadges: { name: string; count: number }[];
    };
}

export default function SiteAnalytics() {
    const [, setLocation] = useLocation();
    const [analytics, setAnalytics] = useState<SiteAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setLocation('/admin');
                return;
            }

            const res = await fetch('/api/analytics/site', {
                headers: { 'x-admin-token': token }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    setLocation('/admin');
                    return;
                }
                throw new Error('Failed to fetch analytics');
            }

            const data = await res.json();
            setAnalytics(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const maxDailyViews = analytics?.dailyViews
        ? Math.max(...analytics.dailyViews.map(d => d.views), 1)
        : 1;

    const maxHourlyViews = analytics?.hourlyActivity
        ? Math.max(...analytics.hourlyActivity.map(h => h.views), 1)
        : 1;

    const totalDevices = analytics
        ? analytics.devices.mobile + analytics.devices.desktop + analytics.devices.tablet
        : 1;

    return (
        <>
            <Helmet>
                <title>Site Analytics | StreamVault Admin</title>
            </Helmet>

            <div className="min-h-screen bg-background p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation('/admin')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Site Analytics</h1>
                                <p className="text-muted-foreground">Track visitor activity and content engagement</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {analytics && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {analytics.overview.activeUsers} active now
                                </div>
                            )}
                            <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {analytics && (
                        <>
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Page Views</span>
                                        <Eye className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.overview.pageViews.today.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Week: {analytics.overview.pageViews.week.toLocaleString()} | Total: {analytics.overview.pageViews.total.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Unique Visitors</span>
                                        <Users className="w-5 h-5 text-green-500" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.overview.visitors.today.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Week: {analytics.overview.visitors.week.toLocaleString()} | Total: {analytics.overview.visitors.total.toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Active Now</span>
                                        <TrendingUp className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.overview.activeUsers}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Users in last 5 minutes
                                    </p>
                                </div>

                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Watch Time</span>
                                        <Clock className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.overview.totalWatchTimeHours}h</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total streaming hours
                                    </p>
                                </div>

                                {analytics.badgeStats && (
                                    <div className="bg-card p-6 rounded-xl border">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-muted-foreground text-sm">Badges Awarded</span>
                                            <Award className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <p className="text-3xl font-bold">{analytics.badgeStats.totalAwarded.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Across {analytics.badgeStats.totalBadges} badge types
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Daily Views Chart */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 className="w-5 h-5 text-blue-500" />
                                        <h2 className="font-semibold">Daily Traffic (Last 7 Days)</h2>
                                    </div>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.dailyViews}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en', { weekday: 'short' })}
                                                    stroke="#666"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                                />
                                                <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Page Views" />
                                                <Bar dataKey="visitors" fill="#10b981" radius={[4, 4, 0, 0]} name="Unique Visitors" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Hourly Activity */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-5 h-5 text-purple-500" />
                                        <h2 className="font-semibold">Hourly Activity (24h)</h2>
                                    </div>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analytics.hourlyActivity}>
                                                <defs>
                                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                                <XAxis
                                                    dataKey="hour"
                                                    tickFormatter={(h) => `${h}:00`}
                                                    stroke="#666"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                                />
                                                <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorViews)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Content Stats Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Top Shows */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Tv className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold">Most Watched Shows</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {analytics.topShows.slice(0, 5).map((show, i) => (
                                            <div key={show.id} className="flex items-center gap-3">
                                                <span className="text-muted-foreground w-4">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{show.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {show.watches} plays • {formatDuration(show.duration)}
                                                    </p>
                                                </div>
                                                <Play className="w-4 h-4 text-primary" />
                                            </div>
                                        ))}
                                        {analytics.topShows.length === 0 && (
                                            <p className="text-muted-foreground text-sm">No watch data yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Top Movies */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Film className="w-5 h-5 text-yellow-500" />
                                        <h2 className="font-semibold">Most Watched Movies</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {analytics.topMovies.slice(0, 5).map((movie, i) => (
                                            <div key={movie.id} className="flex items-center gap-3">
                                                <span className="text-muted-foreground w-4">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{movie.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {movie.watches} plays • {formatDuration(movie.duration)}
                                                    </p>
                                                </div>
                                                <Play className="w-4 h-4 text-yellow-500" />
                                            </div>
                                        ))}
                                        {analytics.topMovies.length === 0 && (
                                            <p className="text-muted-foreground text-sm">No watch data yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Traffic & Device Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Traffic Sources */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Globe className="w-5 h-5 text-green-500" />
                                        <h2 className="font-semibold">Traffic Sources</h2>
                                    </div>
                                    <div className="space-y-2">
                                        {analytics.trafficSources.slice(0, 5).map(source => (
                                            <div key={source.source} className="flex items-center justify-between text-sm">
                                                <span className="truncate">{source.source}</span>
                                                <span className="font-medium">{source.visits}</span>
                                            </div>
                                        ))}
                                        {analytics.trafficSources.length === 0 && (
                                            <p className="text-muted-foreground text-sm">No traffic data yet</p>
                                        )}
                                    </div>
                                </div>

                                {/* Devices */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Smartphone className="w-5 h-5 text-blue-500" />
                                        <h2 className="font-semibold">Devices</h2>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Monitor className="w-4 h-4" />
                                            <div className="flex-1">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Desktop</span>
                                                    <span>{Math.round(analytics.devices.desktop / totalDevices * 100)}%</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${analytics.devices.desktop / totalDevices * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-4 h-4" />
                                            <div className="flex-1">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Mobile</span>
                                                    <span>{Math.round(analytics.devices.mobile / totalDevices * 100)}%</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${analytics.devices.mobile / totalDevices * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Tablet className="w-4 h-4" />
                                            <div className="flex-1">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>Tablet</span>
                                                    <span>{Math.round(analytics.devices.tablet / totalDevices * 100)}%</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ width: `${analytics.devices.tablet / totalDevices * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Popular Pages */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 className="w-5 h-5 text-orange-500" />
                                        <h2 className="font-semibold">Popular Pages</h2>
                                    </div>
                                    <div className="space-y-2">
                                        {analytics.popularPages.slice(0, 5).map(page => (
                                            <div key={page.path} className="flex items-center justify-between text-sm">
                                                <span className="truncate max-w-[180px]">{page.path}</span>
                                                <span className="font-medium">{page.views}</span>
                                            </div>
                                        ))}
                                        {analytics.popularPages.length === 0 && (
                                            <p className="text-muted-foreground text-sm">No page data yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-card p-6 rounded-xl border">
                                <h2 className="font-semibold mb-4">Recent Page Views</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-3">Time</th>
                                                <th className="text-left py-2 px-3">Page</th>
                                                <th className="text-left py-2 px-3">Referrer</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.recentPageViews.map((view, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                                                        {new Date(view.timestamp).toLocaleTimeString()}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {view.path}
                                                    </td>
                                                    <td className="py-2 px-3 text-muted-foreground truncate max-w-xs">
                                                        {view.referrer || 'Direct'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {analytics.recentPageViews.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                                        No page views recorded yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {loading && !analytics && (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
