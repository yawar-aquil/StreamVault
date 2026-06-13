import { useState, createContext, useContext, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditBadgeDialog } from "@/components/edit-badge-dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, Edit, Plus, Search,
  Settings,
  ChevronRight,
  LogOut,
  Save,
  X,
  User as UserIcon,
  Vote,
  Target,
  Award,
  Gift,
  ShoppingBag, // Added ShoppingBag
  Mail,
  FileJson,
  Upload,
  Send,
  Megaphone,
  Bell,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye, // Added Eye icon
  MessageSquare, // Added MessageSquare icon
  Bot,
  ShieldAlert
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StreamCoin from "@/components/stream-coin";
import type { Show, Episode, Movie, BlogPost, Anime, AnimeEpisode, Review } from "@shared/schema";
import { getAuthHeaders, logout as authLogout } from "@/lib/auth";
import { SubtitleManager } from "@/components/admin/SubtitleManager";
import { AudioTracksInput } from "@/components/admin/audio-tracks-input";
import { GiftCoinsManager } from "@/components/admin/GiftCoinsManager";
import { StreamingModeManager } from "@/components/admin/StreamingModeManager";
import { SecuritySettings } from "@/components/admin/SecuritySettings";
import { ManageModerators } from "@/components/admin/ManageModerators";

export const AdminContext = createContext<{ userRole: "admin" | "moderator" }>({ userRole: "admin" });

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("shows");
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "moderator">("admin");
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken");

      try {
        const res = await fetch("/api/admin/verify", {
          headers: token ? { "x-admin-token": token } : {},
        });
        const data = await res.json();

        if (data.valid) {
          setIsAuthenticated(true);
          setUserRole(data.role || "admin");
        } else {
          localStorage.removeItem("adminToken");
          setLocation("/admin/login");
        }
      } catch (error) {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setLocation]);

  const handleLogout = async () => {
    await authLogout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    setLocation("/admin/login");
  };

  // Fetch all shows
  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows?limit=all"],
  });

  // Fetch all movies
  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies?limit=all"],
  });

  // Fetch all anime
  const { data: anime = [] } = useQuery<Anime[]>({
    queryKey: ["/api/anime?limit=all"],
  });

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your StreamVault content</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation('/admin/analytics')}>
              📈 Site Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation('/admin/widget')}>
              📊 Widget Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto pb-2 mb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="flex w-max h-auto gap-2 bg-muted/50 p-1">
              {userRole === 'admin' && <TabsTrigger value="users" className="gap-2">
                <UserIcon className="w-4 h-4" />
              Users
            </TabsTrigger>}
            {userRole === 'admin' && <TabsTrigger value="moderators" className="gap-2"><UserIcon className="w-4 h-4" />Moderators</TabsTrigger>}
            <TabsTrigger value="shows">Shows</TabsTrigger>
            <TabsTrigger value="movies">Movies</TabsTrigger>
            <TabsTrigger value="anime">Anime</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="push">Push</TabsTrigger>
            <TabsTrigger value="broadcast">📢 Broadcast</TabsTrigger>
            <TabsTrigger value="add-show">Add Show</TabsTrigger>
            <TabsTrigger value="add-episode">Add Episode</TabsTrigger>
            <TabsTrigger value="manage-episodes">Manage Episodes</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="polls" className="gap-2">
              <Vote className="w-4 h-4" />
              Polls
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              Challenges
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-2">
              <Award className="w-4 h-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="store" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Store
            </TabsTrigger>
            <TabsTrigger value="store-analytics" className="gap-2">
              <Activity className="w-4 h-4" />
              Store Analytics
            </TabsTrigger>
            <TabsTrigger value="pending-content" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Pending Content
            </TabsTrigger>
            <TabsTrigger value="url-health" className="gap-2">
              <Activity className="w-4 h-4" />
              URL Health
            </TabsTrigger>
            <TabsTrigger value="tmdb-bulk" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              TMDB Bulk Import
            </TabsTrigger>
            <TabsTrigger value="subtitles" className="gap-2">
              <Settings className="w-4 h-4" />
              Subtitles
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="gift-coins" className="gap-2">
              <Gift className="w-4 h-4" />
              Gift Coins
            </TabsTrigger>
            )}
            <TabsTrigger value="streaming" className="gap-2">
              <Activity className="w-4 h-4" />
              Streaming
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <ShieldAlert className="w-4 h-4" />
              Security
            </TabsTrigger>
            </TabsList>
          </div>
        {userRole === 'admin' && (
          <TabsContent value="moderators" className="mt-6">
            <ManageModerators />
          </TabsContent>
        )}

          {/* User Analytics Tab */}
          <TabsContent value="users">
            <UserAnalytics />
          </TabsContent>

          {/* Manage Shows Tab */}
          <TabsContent value="shows">
            <ManageShows shows={shows} />
          </TabsContent>

          {/* Manage Movies Tab */}
          <TabsContent value="movies">
            <ManageMovies movies={movies} />
          </TabsContent>

          {/* Manage Anime Tab */}
          <TabsContent value="anime">
            <ManageAnime anime={anime} />
          </TabsContent>

          {/* Blog Management Tab */}
          <TabsContent value="blog">
            <ManageBlog />
          </TabsContent>

          {/* Comments Moderation Tab */}
          <TabsContent value="comments">
            <CommentsModeration />
          </TabsContent>

          {/* Reviews Moderation Tab */}
          <TabsContent value="reviews">
            <ReviewsModeration />
          </TabsContent>

          {/* Content Requests Tab */}
          <TabsContent value="requests">
            <ContentRequests />
          </TabsContent>

          {/* Issue Reports Tab */}
          <TabsContent value="reports">
            <IssueReports />
          </TabsContent>

          {/* User Feedback Tab */}
          <TabsContent value="feedback">
            <FeedbackManager />
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          {/* Push Notifications Tab */}
          <TabsContent value="push">
            <PushNotificationManager shows={shows} movies={movies} />
          </TabsContent>

          {/* Broadcast In-App Notifications Tab */}
          <TabsContent value="broadcast">
            <BroadcastNotificationManager shows={shows} movies={movies} anime={anime} />
          </TabsContent>

          {/* Add Show Tab */}
          <TabsContent value="add-show">
            <AddShowForm />
          </TabsContent>

          {/* Add Episode Tab */}
          <TabsContent value="add-episode">
            <AddEpisodeForm shows={shows} anime={anime} />
          </TabsContent>

          {/* Manage Episodes Tab */}
          <TabsContent value="manage-episodes">
            <ManageEpisodesTab shows={shows} anime={anime} />
          </TabsContent>

          {/* Import Episodes Tab */}
          <TabsContent value="import">
            <ImportEpisodesForm />
          </TabsContent>

          {/* Polls Management Tab */}
          <TabsContent value="polls">
            <PollsManager />
          </TabsContent>

          {/* Challenges Management Tab */}
          <TabsContent value="challenges">
            <ChallengesManager />
          </TabsContent>

          {/* Badges Management Tab */}
          <TabsContent value="badges">
            <BadgesManager />
          </TabsContent>

          {/* Store Management Tab */}
          <TabsContent value="store">
            <StoreManager />
          </TabsContent>

          {/* Store Analytics Tab */}
          <TabsContent value="store-analytics">
            <StoreAnalytics />
          </TabsContent>

          {/* Pending Content Tab */}
          <TabsContent value="pending-content">
            <PendingContentTab />
          </TabsContent>

          {/* URL Health Tab */}
          <TabsContent value="url-health">
            <UrlHealthTab />
          </TabsContent>

          {/* TMDB Bulk Import Tab */}
          <TabsContent value="tmdb-bulk">
            <TmdbBulkImportTab />
          </TabsContent>

          {/* Subtitles Management Tab */}
          <TabsContent value="subtitles">
            <SubtitleManager shows={shows} movies={movies} anime={anime} />
          </TabsContent>

          {/* Streaming Mode Tab */}
          <TabsContent value="streaming">
            <StreamingModeManager />
          </TabsContent>

          {/* Gift Coins Tab */}
          <TabsContent value="gift-coins">
            <GiftCoinsManager />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// User Analytics Component
function UserAnalytics() {
  const { data: stats } = useQuery<{
    totalUsers: number;
    activeUsers: number;
    subscribers: string[];
  }>({
    queryKey: ["/api/admin/stats/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats/users", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auth Accounts</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered users on the platform
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users with recent activity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guest Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subscribers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Email-only subscribers
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guest Subscribers List</CardTitle>
          <CardDescription>
            List of emails subscribed to the newsletter (Guest Accounts)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4">
            {stats?.subscribers && stats.subscribers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.subscribers.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No guest subscribers found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// URL Health Tab Component
function UrlHealthTab() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [checkType, setCheckType] = useState<'all' | 'archive'>('archive');
  const [checkLimit, setCheckLimit] = useState<number>(0); // 0 = all
  const [progress, setProgress] = useState<{ checked: number; total: number }>({ checked: 0, total: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Check if a scan is already running on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/url-health/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'running') {
          setIsChecking(true);
          setProgress({ checked: data.checked, total: data.total });
          startPolling();
        } else if (data.status === 'done' && data.report) {
          setReport(data.report);
        }
      } catch {}
    })();
  }, []);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/url-health/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setProgress({ checked: data.checked, total: data.total });

        if (data.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setReport(data.report);
          setIsChecking(false);
          if (data.report.broken > 0) {
            toast({ title: "Health Check Complete", description: `Found ${data.report.broken} broken URLs out of ${data.report.totalChecked} checked.`, variant: "destructive" });
          } else {
            toast({ title: "Health Check Complete", description: `All ${data.report.totalChecked} URLs are accessible!` });
          }
        } else if (data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsChecking(false);
          toast({ title: "Error", description: data.error || "Health check failed", variant: "destructive" });
        }
      } catch {}
    }, 2000);
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    setReport(null);
    setProgress({ checked: 0, total: 0 });
    try {
      const res = await fetch('/api/admin/url-health/start', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveOnly: checkType === 'archive', limit: checkLimit || 0 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start health check");
      }

      toast({ title: "Health Check Started", description: "Scanning URLs in the background..." });
      startPolling();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsChecking(false);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Video URL Health Checker
          </CardTitle>
          <CardDescription>
            Scan your content library for broken video links (e.g. removed Archive.org videos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Check Type</Label>
              <Select value={checkType} onValueChange={(val: any) => setCheckType(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive">Archive.org Links Only (Recommended)</SelectItem>
                  <SelectItem value="all">All Video URLs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full md:w-40">
              <Label>Limit (0 = All)</Label>
              <Input
                type="number"
                min="0"
                value={checkLimit}
                onChange={(e) => setCheckLimit(parseInt(e.target.value) || 0)}
              />
            </div>

            <Button
              onClick={runHealthCheck}
              disabled={isChecking}
              className="w-full md:w-auto"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Health Check
                </>
              )}
            </Button>
          </div>

          {/* Live progress bar */}
          {isChecking && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Checking URLs...</span>
                <span>{progress.checked} / {progress.total} ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${isChecking ? 'bg-primary' : 'bg-green-500'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Checked</p>
                    <h3 className="text-2xl font-bold">{report.totalChecked}</h3>
                  </div>
                  <Activity className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valid Links</p>
                    <h3 className="text-2xl font-bold text-green-500">{report.valid}</h3>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Broken Links</p>
                    <h3 className="text-2xl font-bold text-red-500">{report.broken}</h3>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Report</CardTitle>
            </CardHeader>
            <CardContent>
              {report.brokenItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No broken links found! Great job.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-red-500">Broken Items ({report.brokenItems.length})</h4>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 font-medium">Type</th>
                          <th className="text-left p-3 font-medium">Content</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Error</th>
                          <th className="text-right p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.brokenItems.map((item: any, i: number) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="p-3 capitalize">{item.type.replace(/([A-Z])/g, ' $1').trim()}</td>
                            <td className="p-3">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.parentTitle}
                                {item.season && ` • S${item.season}E${item.episodeNumber}`}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="destructive">{item.checkResult.status || 'Error'}</Badge>
                            </td>
                            <td className="p-3 text-destructive truncate max-w-[200px]" title={item.checkResult.error}>
                              {item.checkResult.error || 'Unknown error'}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  View URL
                                </a>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Manage Shows Component
function ManageShows({ shows }: { shows: Show[] }) {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(shows.length / itemsPerPage);
  const currentShows = shows.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const deleteMutation = useMutation({
    mutationFn: async (showId: string) => {
      const res = await fetch(`/api/admin/shows/${showId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({
        title: "Success",
        description: "Show deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete show",
        variant: "destructive",
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/shows`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete all shows");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      setShowDeleteAllConfirm(false);
      toast({
        title: "Success",
        description: `Deleted ${data.deleted} shows and their episodes`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete all shows",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Show> }) => {
      const res = await fetch(`/api/admin/shows/${data.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) throw new Error("Failed to update show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      setIsEditDialogOpen(false);
      setEditingShow(null);
      toast({
        title: "Success",
        description: "Show updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update show",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (show: Show) => {
    setEditingShow(show);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (showId: string, showTitle: string) => {
    if (confirm(`Are you sure you want to delete "${showTitle}"? This will also delete all episodes.`)) {
      deleteMutation.mutate(showId);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Shows ({shows.length})</CardTitle>
              <CardDescription>Manage your shows library</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Show
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Show</DialogTitle>
                  <DialogDescription>
                    Add a new show to your collection
                  </DialogDescription>
                </DialogHeader>
                <AddShowForm onSuccess={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentShows.map((show) => (
              <div
                key={show.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-16 h-24 object-cover rounded"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{show.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {show.year} • {show.totalSeasons} Season(s) • {show.rating}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {show.genres?.split(',').slice(0, 3).map((genre) => (
                        <Badge key={genre.trim()} variant="secondary">
                          {genre.trim()}
                        </Badge>
                      ))}
                      {show.featured && <Badge variant="default">Featured</Badge>}
                      {show.trending && <Badge variant="outline">Trending</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(show)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {userRole === 'admin' && (
<Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(show.id, show.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
)}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
            <DialogDescription>
              Update show information
            </DialogDescription>
          </DialogHeader>
          {editingShow && (
            <EditShowForm
              show={editingShow}
              onSave={(updates) => updateMutation.mutate({ id: editingShow.id, updates })}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Show Form Component
function EditShowForm({ show, onSave, onCancel, isLoading }: {
  show: Show;
  onSave: (updates: Partial<Show>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: show.title,
    slug: show.slug,
    description: show.description,
    posterUrl: show.posterUrl,
    backdropUrl: show.backdropUrl,
    year: show.year,
    rating: show.rating,
    imdbRating: show.imdbRating || "",
    genres: show.genres || "",
    language: show.language,
    totalSeasons: show.totalSeasons,
    cast: show.cast || "",
    creators: show.creators || "",
    featured: show.featured || false,
    trending: show.trending || false,
    category: show.category || "action",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      // Keep as strings (comma-separated)
      genres: formData.genres,
      cast: formData.cast,
      creators: formData.creators,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">Slug (URL)</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="e.g., money-heist"
            required
          />
          <p className="text-xs text-muted-foreground">
            URL: /show/{formData.slug}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-year">Year</Label>
          <Input
            id="edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <select
            id="edit-category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="action">Action</option>
            <option value="drama">Drama</option>
            <option value="comedy">Comedy</option>
            <option value="horror">Horror</option>
            <option value="romance">Romance</option>
            <option value="thriller">Thriller</option>
            <option value="sci-fi">Sci-Fi</option>
            <option value="fantasy">Fantasy</option>
            <option value="documentary">Documentary</option>
            <option value="animation">Animation</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-posterUrl">Poster URL</Label>
          <Input
            id="edit-posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-backdropUrl">Backdrop URL</Label>
          <Input
            id="edit-backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-rating">Rating</Label>
          <select
            id="edit-rating"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          >
            <option value="TV-Y">TV-Y</option>
            <option value="TV-Y7">TV-Y7</option>
            <option value="TV-G">TV-G</option>
            <option value="TV-PG">TV-PG</option>
            <option value="TV-14">TV-14</option>
            <option value="TV-MA">TV-MA</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-imdbRating">IMDb Rating</Label>
          <Input
            id="edit-imdbRating"
            value={formData.imdbRating}
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-totalSeasons">Total Seasons</Label>
          <Input
            id="edit-totalSeasons"
            type="number"
            min="1"
            value={formData.totalSeasons}
            onChange={(e) => setFormData({ ...formData, totalSeasons: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-genres">Genres (comma-separated)</Label>
          <Input
            id="edit-genres"
            value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-language">Language</Label>
          <Input
            id="edit-language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-cast">Cast (comma-separated)</Label>
        <Input
          id="edit-cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Add Show Form Component
function AddShowForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    posterUrl: "",
    backdropUrl: "",
    year: new Date().getFullYear(),
    rating: "TV-MA",
    imdbRating: "",
    genres: "",
    language: "English",
    totalSeasons: 1,
    cast: "",
    creators: "",
    featured: false,
    trending: false,
    category: "action",
  });

  const addShowMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/shows", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add show");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shows"] });
      toast({
        title: "Success",
        description: "Show added successfully",
      });
      // Reset form
      setFormData({
        title: "",
        slug: "",
        description: "",
        posterUrl: "",
        backdropUrl: "",
        year: new Date().getFullYear(),
        rating: "TV-MA",
        imdbRating: "",
        genres: "",
        language: "English",
        totalSeasons: 1,
        cast: "",
        creators: "",
        featured: false,
        trending: false,
        category: "action",
      });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate slug from title if not provided
    const slug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-");

    const showData = {
      ...formData,
      slug,
      genres: formData.genres.split(",").map((g) => g.trim()),
      cast: formData.cast.split(",").map((c) => c.trim()),
      creators: formData.creators.split(",").map((c) => c.trim()),
    };

    addShowMutation.mutate(showData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Show</CardTitle>
        <CardDescription>Add a new show to your library</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (auto-generated if empty)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated-from-title"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posterUrl">Poster URL *</Label>
              <Input
                id="posterUrl"
                type="url"
                value={formData.posterUrl}
                onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backdropUrl">Backdrop URL *</Label>
              <Input
                id="backdropUrl"
                type="url"
                value={formData.backdropUrl}
                onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating *</Label>
              <select
                id="rating"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              >
                <option value="TV-Y">TV-Y</option>
                <option value="TV-Y7">TV-Y7</option>
                <option value="TV-G">TV-G</option>
                <option value="TV-PG">TV-PG</option>
                <option value="TV-14">TV-14</option>
                <option value="TV-MA">TV-MA</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imdbRating">IMDb Rating *</Label>
              <Input
                id="imdbRating"
                value={formData.imdbRating}
                onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
                placeholder="8.5"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genres">Genres (comma-separated) *</Label>
              <Input
                id="genres"
                value={formData.genres}
                onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
                placeholder="Action, Drama, Thriller"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalSeasons">Total Seasons *</Label>
              <Input
                id="totalSeasons"
                type="number"
                min="1"
                value={formData.totalSeasons}
                onChange={(e) => setFormData({ ...formData, totalSeasons: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="action">Action & Thriller</option>
                <option value="drama">Drama & Romance</option>
                <option value="comedy">Comedy</option>
                <option value="horror">Horror & Mystery</option>
              </select>
            </div>
            <div className="space-y-2 flex items-end gap-4 pb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Featured</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.trending}
                  onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Trending</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cast">Cast (comma-separated) *</Label>
              <Input
                id="cast"
                value={formData.cast}
                onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
                placeholder="Actor 1, Actor 2, Actor 3"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creators">Creators (comma-separated) *</Label>
              <Input
                id="creators"
                value={formData.creators}
                onChange={(e) => setFormData({ ...formData, creators: e.target.value })}
                placeholder="Creator 1, Creator 2"
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={addShowMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {addShowMutation.isPending ? "Adding..." : "Add Show"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Add Episode Form Component
function AddEpisodeForm({ shows, anime }: { shows: Show[], anime: Anime[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState<"show" | "anime">("show");
  const [formData, setFormData] = useState({
    showId: "",
    season: 1,
    episodeNumber: 1,
    title: "",
    description: "",
    thumbnailUrl: "",
    duration: 45,
    googleDriveUrl: "https://drive.google.com/file/d/1zcFHiGEOwgq2-j6hMqpsE0ov7qcIUqCd/preview",
    airDate: new Date().toISOString().split("T")[0],
  });

  const addEpisodeMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = contentType === "show" ? "/api/admin/episodes" : "/api/admin/anime-episodes";
      const payload = { ...data };
      
      // If anime, rename showId to animeId
      if (contentType === "anime") {
        payload.animeId = payload.showId;
        delete payload.showId;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to add ${contentType} episode`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [contentType === "show" ? "/api/episodes" : "/api/anime-episodes"] });
      toast({
        title: "Success!",
        description: "Episode added successfully",
      });
      // Reset form
      setFormData({
        ...formData,
        episodeNumber: formData.episodeNumber + 1,
        title: "",
        description: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEpisodeMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Episode</CardTitle>
        <CardDescription>Add episodes to existing shows or anime</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value as "show" | "anime");
                  setFormData({ ...formData, showId: "" });
                }}
                required
              >
                <option value="show">TV Show</option>
                <option value="anime">Anime</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="showId">Select {contentType === "show" ? "Show" : "Anime"} *</Label>
              <select
                id="showId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.showId}
                onChange={(e) => setFormData({ ...formData, showId: e.target.value })}
                required
              >
                <option value="">Choose a {contentType === "show" ? "show" : "anime"}...</option>
                {contentType === "show" 
                  ? shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)
                  : anime.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)
                }
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="season">Season *</Label>
              <Input
                id="season"
                type="number"
                min="1"
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episodeNumber">Episode Number *</Label>
              <Input
                id="episodeNumber"
                type="number"
                min="1"
                value={formData.episodeNumber}
                onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Episode Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Episode 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL *</Label>
            <Input
              id="thumbnailUrl"
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airDate">Air Date *</Label>
              <Input
                id="airDate"
                type="date"
                value={formData.airDate}
                onChange={(e) => setFormData({ ...formData, airDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleDriveUrl">Google Drive Video URL *</Label>
            <Input
              id="googleDriveUrl"
              type="url"
              value={formData.googleDriveUrl}
              onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
              placeholder="https://drive.google.com/file/d/FILE_ID/preview"
              required
            />
            <p className="text-xs text-muted-foreground">
              Get File ID from Google Drive share link and use format: https://drive.google.com/file/d/FILE_ID/preview
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrl">Archive.org / Alternative Video URL</Label>
            <Input
              id="videoUrl"
              type="url"
              value={formData.videoUrl || ""}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://archive.org/download/..."
            />
          </div>

          <div className="space-y-4 pt-2">
            <AudioTracksInput
              value={formData.audioTracks || ""}
              onChange={(v) => setFormData({ ...formData, audioTracks: v })}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={addEpisodeMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {addEpisodeMutation.isPending ? "Adding..." : "Add Episode"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Manage Episodes Tab Component
function ManageEpisodesTab({ shows, anime }: { shows: Show[], anime: Anime[] }) {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState<"show" | "anime">("show");
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [editingEpisode, setEditingEpisode] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch episodes for selected content
  const { data: episodes = [], isLoading: episodesLoading } = useQuery<any[]>({
    queryKey: [contentType === "show" ? "/api/episodes" : "/api/anime-episodes", selectedContentId],
    queryFn: async () => {
      if (!selectedContentId) return [];
      const endpoint = contentType === "show" ? `/api/episodes/${selectedContentId}` : `/api/anime-episodes/${selectedContentId}`;
      const res = await fetch(endpoint, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch episodes");
      return res.json();
    },
    enabled: !!selectedContentId,
  });

  // Get unique seasons from episodes
  const seasons = [...new Set(episodes.map(ep => ep.season))].sort((a, b) => a - b);

  // Filter episodes by selected season
  const filteredEpisodes = episodes
    .filter(ep => ep.season === selectedSeason)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  // Update episode mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const endpoint = contentType === "show" ? `/api/admin/episodes/${id}` : `/api/admin/anime-episodes/${id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update episode");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [contentType === "show" ? "/api/episodes" : "/api/anime-episodes", selectedContentId] });
      setIsEditDialogOpen(false);
      setEditingEpisode(null);
      toast({ title: "Success", description: "Episode updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update episode", variant: "destructive" });
    },
  });

  // Delete episode mutation
  const deleteMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const endpoint = contentType === "show" ? `/api/admin/episodes/${episodeId}` : `/api/admin/anime-episodes/${episodeId}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete episode");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [contentType === "show" ? "/api/episodes" : "/api/anime-episodes", selectedContentId] });
      toast({ title: "Success", description: "Episode deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete episode", variant: "destructive" });
    },
  });

  const handleEditClick = (episode: any) => {
    setEditingEpisode(episode);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (episode: any) => {
    if (confirm(`Delete S${episode.season}E${episode.episodeNumber}: "${episode.title}"?`)) {
      deleteMutation.mutate(episode.id);
    }
  };

  const selectedTitle = contentType === "show" 
    ? shows.find(s => s.id === selectedContentId)?.title 
    : anime.find(a => a.id === selectedContentId)?.title;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Episodes</CardTitle>
        <CardDescription>Edit or delete existing episodes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Type, Program & Season Selectors */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Content Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value as "show" | "anime");
                setSelectedContentId("");
                setSelectedSeason(1);
              }}
            >
              <option value="show">TV Show</option>
              <option value="anime">Anime</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Select {contentType === "show" ? "Show" : "Anime"}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedContentId}
              onChange={(e) => {
                setSelectedContentId(e.target.value);
                setSelectedSeason(1);
              }}
            >
              <option value="">Choose a {contentType === "show" ? "show" : "anime"}...</option>
              {contentType === "show" 
                ? shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)
                : anime.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)
              }
            </select>
          </div>

          {/* Season Selector */}
          <div className="space-y-2">
            <Label>Select Season</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
              disabled={!selectedContentId || seasons.length === 0}
            >
              {seasons.length === 0 ? (
                <option value="1">No seasons found</option>
              ) : (
                seasons.map((s) => (
                  <option key={s} value={s}>Season {s}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Episodes List */}
        {selectedContentId && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              {selectedTitle} - Season {selectedSeason}
            </h3>

            {episodesLoading ? (
              <p className="text-muted-foreground">Loading episodes...</p>
            ) : filteredEpisodes.length === 0 ? (
              <p className="text-muted-foreground">No episodes found for this season.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Duration</th>
                      <th className="text-left p-3 font-medium">Video URL</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEpisodes.map((episode) => (
                      <tr key={episode.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">E{episode.episodeNumber}</td>
                        <td className="p-3">{episode.title}</td>
                        <td className="p-3">{episode.duration} min</td>
                        <td className="p-3">
                          {episode.videoUrl ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              ✓ Set
                            </Badge>
                          ) : episode.googleDriveUrl ? (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                              GDrive
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500">
                              Missing
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(episode)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {userRole === 'admin' && (
<Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(episode)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Episode Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
            <DialogDescription>
              Update episode information
            </DialogDescription>
          </DialogHeader>
          {editingEpisode && (
            <EditEpisodeForm
              episode={editingEpisode}
              onSave={(updates) => updateMutation.mutate({ id: editingEpisode.id, updates })}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Edit Episode Form Component
function EditEpisodeForm({ episode, onSave, onCancel, isLoading }: {
  episode: Episode;
  onSave: (updates: Partial<Episode>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: episode.title,
    description: episode.description,
    thumbnailUrl: episode.thumbnailUrl,
    duration: episode.duration,
    googleDriveUrl: episode.googleDriveUrl,
    videoUrl: episode.videoUrl || "",
    audioTracks: episode.audioTracks || "",
    airDate: episode.airDate || "",
    season: episode.season,
    episodeNumber: episode.episodeNumber,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      videoUrl: formData.videoUrl || null,
      airDate: formData.airDate || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-season">Season</Label>
          <Input
            id="edit-season"
            type="number"
            min="1"
            value={formData.season}
            onChange={(e) => setFormData({ ...formData, season: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-episodeNumber">Episode Number</Label>
          <Input
            id="edit-episodeNumber"
            type="number"
            min="1"
            value={formData.episodeNumber}
            onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-title">Episode Title</Label>
        <Input
          id="edit-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-thumbnailUrl">Thumbnail URL</Label>
        <Input
          id="edit-thumbnailUrl"
          type="url"
          value={formData.thumbnailUrl}
          onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-duration">Duration (minutes)</Label>
          <Input
            id="edit-duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-airDate">Air Date</Label>
          <Input
            id="edit-airDate"
            type="date"
            value={formData.airDate}
            onChange={(e) => setFormData({ ...formData, airDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-googleDriveUrl">Google Drive Video URL</Label>
        <Input
          id="edit-googleDriveUrl"
          type="url"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
          placeholder="https://drive.google.com/file/d/FILE_ID/preview"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-videoUrl">Archive.org / Alternative Video URL</Label>
        <Input
          id="edit-videoUrl"
          type="url"
          value={formData.videoUrl}
          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
          placeholder="https://archive.org/download/..."
        />
        <p className="text-xs text-muted-foreground">
          Optional: Used as an alternative video source (e.g., Archive.org)
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <AudioTracksInput
          value={formData.audioTracks || ""}
          onChange={(v) => setFormData({ ...formData, audioTracks: v })}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Import Episodes Form Component
function ImportEpisodesForm() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState("love-puzzle.json");
  const [customPath, setCustomPath] = useState("");
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const baseFolder = "C:\\Users\\yawar\\Desktop\\StreamVault\\bulk-imports";

  // Available JSON files in the folder (slug-named files)
  const availableFiles = [
    "stranger-things.json",
    "adamas.json",
    "all-i-want-for-love-is-you.json",
    "aurora-teagarden-mysteries.json",
    "berlin.json",
    "big-mouth.json",
    "blanca.json",
    "chilling-adventures-of-sabrina.json",
    "creature.json",
    "descendants-of-the-sun.json",
    "dont-be-shy.json",
    "exploration-method-of-love.json",
    "fake-it-till-you-make-it.json",
    "feria-the-darkest-light.json",
    "fool-me-once.json",
    "furies.json",
    "gyeongseong-creature.json",
    "hear-me.json",
    "house-of-ninjas.json",
    "i-can-see-you-shine.json",
    "im-not-a-robot.json",
    "into-the-badlands.json",
    "inventing-anna.json",
    "juvenile-justice.json",
    "last-one-standing.json",
    "lawless-lawyer.json",
    "life.json",
    "love-puzzle.json",
    "lover-or-stranger.json",
    "lucifer.json",
    "lupin.json",
    "marry-my-husband.json",
    "midnight-at-the-pera-palace.json",
    "misty.json",
    "money-flower.json",
    "mr-queen.json",
    "my-dearest.json",
    "my-family.json",
    "my-lethal-man.json",
    "one-dollar-lawyer.json",
    "orange-is-the-new-black.json",
    "over-water.json",
    "penthouse.json",
    "pride-and-prejudice.json",
    "queen-of-mystery.json",
    "queenmaker.json",
    "sebastian-fitzeks-therapy.json",
    "sherlock-the-russian-chronicles.json",
    "sketch.json",
    "snowfall.json",
    "song-of-the-bandits.json",
    "stranger.json",
    "tempted.json",
    "the-deceived.json",
    "the-divorce-insurance.json",
    "the-ghost-detective.json",
    "the-helicopter-heist.json",
    "the-untamed.json",
    "the-witcher-blood-origin.json",
    "the-witcher.json",
    "tientsin-mystic.json",
    "victor-lessard.json",
    "vikings.json",
    "vincenzo.json",
    "wenderellas-diary.json",
  ];

  const getFilePath = () => {
    if (useCustomPath) {
      return customPath;
    }
    return `${baseFolder}\\${selectedFile}`;
  };

  const importMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await fetch("/api/admin/import-shows-episodes", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ filePath: path }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to import");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setImportResult(data.summary);
      const message = data.summary?.showTitle
        ? `Imported ${data.summary.episodesImported} episodes to "${data.summary.showTitle}"`
        : `Created ${data.summary?.showsCreated || 0} shows and imported ${data.summary?.episodesImported || 0} episodes`;
      toast({
        title: "Import Completed!",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);
    importMutation.mutate(getFilePath());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5" />
          Import Episodes from JSON
        </CardTitle>
        <CardDescription>
          Import shows and episodes from the extracted JSON file. Creates shows if they don't exist and adds all episodes automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleImport} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomPath"
                checked={useCustomPath}
                onChange={(e) => setUseCustomPath(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="useCustomPath" className="cursor-pointer">
                Use custom file path
              </Label>
            </div>

            {!useCustomPath ? (
              <div className="space-y-2">
                <Label htmlFor="fileSelect">Select JSON File *</Label>
                <select
                  id="fileSelect"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedFile}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  required
                >
                  {availableFiles.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Folder: {baseFolder}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="customPath">Custom File Path *</Label>
                <Input
                  id="customPath"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="C:\\Users\\yawar\\Desktop\\StreamVault\\bulk-imports\\love-puzzle.json"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full path to the JSON file
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={importMutation.isPending}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {importMutation.isPending ? "Importing..." : "Start Import"}
          </Button>
        </form>

        {importMutation.isPending && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Importing episodes... This may take a few moments.
            </p>
          </div>
        )}

        {importResult && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h3 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                ✅ Import Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {importResult.showTitle && (
                  <div className="col-span-2 mb-2">
                    <p className="text-muted-foreground">Show:</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {importResult.showTitle}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-muted-foreground">Shows Created:</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.showsCreated || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Shows Skipped:</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {importResult.showsSkipped || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Episodes Imported:</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.episodesImported || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Episodes Skipped:</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {importResult.episodesSkipped || 0}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Manage Movies Component
function ManageMovies({ movies }: { movies: Movie[] }) {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(movies.length / itemsPerPage);
  const currentMovies = movies.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const deleteMovieMutation = useMutation({
    mutationFn: async (movieId: string) => {
      const res = await fetch(`/api/admin/movies/${movieId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete movie",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Movies ({movies.length})</CardTitle>
            <CardDescription>Manage your movies library</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Movie</DialogTitle>
                <DialogDescription>
                  Add a new movie to your collection
                </DialogDescription>
              </DialogHeader>
              <AddMovieForm onSuccess={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {movies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No movies found. Add your first movie!
            </p>
          ) : (
            currentMovies.map((movie) => (
              <div
                key={movie.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-16 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{movie.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {movie.year} • {movie.duration}min • {movie.rating}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {movie.genres?.split(',').slice(0, 3).map((genre) => (
                      <Badge key={genre.trim()} variant="secondary">
                        {genre.trim()}
                      </Badge>
                    ))}
                    {movie.featured && <Badge variant="default">Featured</Badge>}
                    {movie.trending && <Badge variant="outline">Trending</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMovie(movie)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Movie</DialogTitle>
                        <DialogDescription>
                          Update movie information
                        </DialogDescription>
                      </DialogHeader>
                      {editingMovie && (
                        <EditMovieForm
                          movie={editingMovie}
                          onSave={() => setEditingMovie(null)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  {userRole === 'admin' && (
<Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${movie.title}"?`)) {
                        deleteMovieMutation.mutate(movie.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
)}
                </div>
              </div>
            ))
          )}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Manage Anime Component
function ManageAnime({ anime }: { anime: Anime[] }) {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(anime.length / itemsPerPage);
  const currentAnime = anime.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const deleteAnimeMutation = useMutation({
    mutationFn: async (animeId: string) => {
      const res = await fetch(`/api/admin/anime/${animeId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete anime");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anime"] });
      toast({
        title: "Success",
        description: "Anime deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete anime",
        variant: "destructive",
      });
    },
  });

  const updateAnimeMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Anime> }) => {
      const res = await fetch(`/api/admin/anime/${data.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) throw new Error("Failed to update anime");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anime"] });
      setIsEditDialogOpen(false);
      setEditingAnime(null);
      toast({
        title: "Success",
        description: "Anime updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update anime",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (a: Anime) => {
    setEditingAnime(a);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Anime ({anime.length})</CardTitle>
              <CardDescription>Manage your anime library</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Anime
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Anime</DialogTitle>
                  <DialogDescription>
                    Add a new anime to your collection
                  </DialogDescription>
                </DialogHeader>
                <AddAnimeForm onSuccess={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {anime.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No anime found. Use the add-anime.cjs script to add anime from TMDB.
              </p>
            ) : (
              currentAnime.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={a.posterUrl}
                      alt={a.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{a.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {a.year} • {a.totalSeasons} Season(s) • {a.status || 'Ongoing'}
                      </p>
                      {a.studio && (
                        <p className="text-xs text-muted-foreground">Studio: {a.studio}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {a.genres?.split(',').slice(0, 3).map((genre) => (
                          <Badge key={genre.trim()} variant="secondary">
                            {genre.trim()}
                          </Badge>
                        ))}
                        {a.featured && <Badge variant="default">Featured</Badge>}
                        {a.trending && <Badge variant="outline">Trending</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(a)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {userRole === 'admin' && (
<Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${a.title}" and all its episodes?`)) {
                          deleteAnimeMutation.mutate(a.id);
                        }
                      }}
                      disabled={deleteAnimeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
)}
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Anime</DialogTitle>
            <DialogDescription>Update anime information</DialogDescription>
          </DialogHeader>
          {editingAnime && (
            <EditAnimeForm
              anime={editingAnime}
              onSave={(updates) => updateAnimeMutation.mutate({ id: editingAnime.id, updates })}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateAnimeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Anime Form Component
function EditAnimeForm({ anime, onSave, onCancel, isLoading }: {
  anime: Anime;
  onSave: (updates: Partial<Anime>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: anime.title,
    slug: anime.slug,
    description: anime.description,
    posterUrl: anime.posterUrl,
    backdropUrl: anime.backdropUrl,
    year: anime.year,
    rating: anime.rating,
    imdbRating: anime.imdbRating || "",
    malRating: anime.malRating || "",
    genres: anime.genres || "",
    language: anime.language,
    totalSeasons: anime.totalSeasons,
    totalEpisodes: anime.totalEpisodes || 0,
    status: anime.status || "Ongoing",
    studio: anime.studio || "",
    cast: anime.cast || "",
    creators: anime.creators || "",
    featured: anime.featured || false,
    trending: anime.trending || false,
    category: anime.category || "action",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-title">Title</Label>
          <Input
            id="anime-edit-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-slug">Slug (URL)</Label>
          <Input
            id="anime-edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            required
          />
          <p className="text-xs text-muted-foreground">URL: /anime/{formData.slug}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anime-edit-description">Description</Label>
        <Textarea
          id="anime-edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-posterUrl">Poster URL</Label>
          <Input
            id="anime-edit-posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-backdropUrl">Backdrop URL</Label>
          <Input
            id="anime-edit-backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-year">Year</Label>
          <Input
            id="anime-edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-totalSeasons">Total Seasons</Label>
          <Input
            id="anime-edit-totalSeasons"
            type="number"
            min="1"
            value={formData.totalSeasons}
            onChange={(e) => setFormData({ ...formData, totalSeasons: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-totalEpisodes">Total Episodes</Label>
          <Input
            id="anime-edit-totalEpisodes"
            type="number"
            min="0"
            value={formData.totalEpisodes}
            onChange={(e) => setFormData({ ...formData, totalEpisodes: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-rating">Rating</Label>
          <select
            id="anime-edit-rating"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          >
            <option value="TV-Y">TV-Y</option>
            <option value="TV-Y7">TV-Y7</option>
            <option value="TV-G">TV-G</option>
            <option value="TV-PG">TV-PG</option>
            <option value="TV-14">TV-14</option>
            <option value="TV-MA">TV-MA</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-imdbRating">IMDb Rating</Label>
          <Input
            id="anime-edit-imdbRating"
            value={formData.imdbRating}
            placeholder="e.g. 8.5"
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-malRating">MAL Rating</Label>
          <Input
            id="anime-edit-malRating"
            value={formData.malRating}
            placeholder="e.g. 9.1"
            onChange={(e) => setFormData({ ...formData, malRating: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-status">Status</Label>
          <select
            id="anime-edit-status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Upcoming">Upcoming</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-category">Category</Label>
          <select
            id="anime-edit-category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="action">Action</option>
            <option value="drama">Drama</option>
            <option value="comedy">Comedy</option>
            <option value="romance">Romance</option>
            <option value="thriller">Thriller</option>
            <option value="sci-fi">Sci-Fi</option>
            <option value="fantasy">Fantasy</option>
            <option value="horror">Horror</option>
            <option value="shonen">Shonen</option>
            <option value="shojo">Shojo</option>
            <option value="seinen">Seinen</option>
            <option value="mecha">Mecha</option>
            <option value="slice-of-life">Slice of Life</option>
            <option value="sports">Sports</option>
            <option value="supernatural">Supernatural</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anime-edit-genres">Genres (comma-separated)</Label>
          <Input
            id="anime-edit-genres"
            value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anime-edit-language">Language</Label>
          <Input
            id="anime-edit-language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anime-edit-studio">Studio</Label>
        <Input
          id="anime-edit-studio"
          value={formData.studio}
          placeholder="e.g. MAPPA, Wit Studio"
          onChange={(e) => setFormData({ ...formData, studio: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="anime-edit-cast">Voice Actors (comma-separated)</Label>
        <Input
          id="anime-edit-cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="anime-edit-creators">Creators / Directors (comma-separated)</Label>
        <Input
          id="anime-edit-creators"
          value={formData.creators}
          onChange={(e) => setFormData({ ...formData, creators: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Add Movie Form Component
function AddMovieForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    posterUrl: "",
    backdropUrl: "",
    year: new Date().getFullYear(),
    rating: "PG-13",
    imdbRating: "",
    genres: "",
    language: "English",
    duration: 120,
    cast: "",
    directors: "",
    googleDriveUrl: "", // Original link
    audioTracks: "", // For multi-audio
    featured: false,
    trending: false,
    category: "action",
  });

  const createMovieMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/movies", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie added successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMovieMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="posterUrl">Poster URL *</Label>
          <Input
            id="posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="backdropUrl">Backdrop URL *</Label>
          <Input
            id="backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min) *</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating *</Label>
          <Input
            id="rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="imdbRating">IMDb Rating</Label>
          <Input
            id="imdbRating"
            value={formData.imdbRating}
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
            placeholder="8.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language *</Label>
          <Input
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="genres">Genres (comma-separated) *</Label>
        <Input
          id="genres"
          value={formData.genres}
          onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
          placeholder="Action, Thriller, Drama"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cast">Cast (comma-separated)</Label>
        <Input
          id="cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
          placeholder="Actor 1, Actor 2, Actor 3"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="directors">Directors (comma-separated)</Label>
        <Input
          id="directors"
          value={formData.directors}
          onChange={(e) => setFormData({ ...formData, directors: e.target.value })}
          placeholder="Director 1, Director 2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="googleDriveUrl">Google Drive URL *</Label>
        <Input
          id="googleDriveUrl"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
          placeholder="https://drive.google.com/file/d/..."
          required
        />
      </div>

      <div className="space-y-4 pt-2">
        <AudioTracksInput
          value={formData.audioTracks || ""}
          onChange={(v) => setFormData({ ...formData, audioTracks: v })}
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Add Movie
      </Button>
    </form>
  );
}

// Edit Movie Form Component
function EditMovieForm({
  movie,
  onSave,
}: {
  movie: Movie;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: movie.title,
    slug: movie.slug,
    description: movie.description,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    year: movie.year,
    rating: movie.rating,
    imdbRating: movie.imdbRating || "",
    genres: movie.genres || "",
    language: movie.language,
    duration: movie.duration,
    cast: movie.cast || "",
    directors: movie.directors || "",
    googleDriveUrl: movie.googleDriveUrl,
    audioTracks: movie.audioTracks,
    featured: movie.featured || false,
    trending: movie.trending || false,
    category: movie.category || "action",
  });

  const updateMovieMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/admin/movies/${movie.id}`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update movie");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
      toast({
        title: "Success",
        description: "Movie updated successfully",
      });
      onSave();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMovieMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-slug">Slug</Label>
          <Input
            id="edit-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-posterUrl">Poster URL</Label>
          <Input
            id="edit-posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-backdropUrl">Backdrop URL</Label>
          <Input
            id="edit-backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-year">Year</Label>
          <Input
            id="edit-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-duration">Duration (min)</Label>
          <Input
            id="edit-duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-rating">Rating</Label>
          <Input
            id="edit-rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-genres">Genres (comma-separated)</Label>
        <Input
          id="edit-genres"
          value={formData.genres}
          onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-googleDriveUrl">Google Drive URL</Label>
        <Input
          id="edit-googleDriveUrl"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
        />
      </div>

      <div className="space-y-4 pt-2">
        <AudioTracksInput
          value={formData.audioTracks || ""}
          onChange={(v) => setFormData({ ...formData, audioTracks: v })}
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Save Changes
      </Button>
    </form>
  );
}

// Content Requests Component
function ContentRequests() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/content-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/content-requests", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch content requests");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/content-requests/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-requests"] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading content requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Requests</CardTitle>
        <CardDescription>
          User requests for new shows and movies ({requests.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No content requests yet
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request: any) => (
              <Card key={request.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{request.title}</CardTitle>
                      <CardDescription>
                        {request.contentType} • {request.year || "Year not specified"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={
                        request.status === 'filled' ? 'default' :
                          request.status === 'rejected' ? 'destructive' : 'secondary'
                      } className={request.status === 'filled' ? 'bg-green-600 hover:bg-green-700' : ''}>
                        {request.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                      <Badge variant="outline">
                        {request.requestCount} request{request.requestCount > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.genre && (
                    <div>
                      <strong>Genre:</strong> {request.genre}
                    </div>
                  )}
                  {request.description && (
                    <div>
                      <strong>Description:</strong> {request.description}
                    </div>
                  )}
                  {request.reason && (
                    <div>
                      <strong>Reason:</strong> {request.reason}
                    </div>
                  )}
                  {request.email && (
                    <div>
                      <strong>Email:</strong> {request.email}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(request.createdAt).toLocaleString()}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-500 hover:text-green-600 borderColor-green-500 hover:bg-green-500/10"
                      onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'filled' })}
                      disabled={request.status === 'filled' || updateStatusMutation.isPending}
                    >
                      Mark as Filled
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-600 borderColor-red-500 hover:bg-red-500/10"
                      onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                      disabled={request.status === 'rejected' || updateStatusMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Issue Reports Component
function IssueReports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/issue-reports"],
    queryFn: async () => {
      const res = await fetch("/api/admin/issue-reports", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch issue reports");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/issue-reports/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/issue-reports"] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading issue reports...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Reports</CardTitle>
        <CardDescription>
          User-reported issues and bugs ({reports.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No issue reports yet
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <Card key={report.id} className="border-l-4 border-l-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{report.title}</CardTitle>
                      <CardDescription>
                        {report.issueType.replace(/_/g, " ")}
                      </CardDescription>
                    </div>
                    <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className={report.status === 'resolved' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}>
                      {report.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Description:</strong> {report.description}
                  </div>
                  {report.url && (
                    <div>
                      <strong>Page URL:</strong>{" "}
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {report.url}
                      </a>
                    </div>
                  )}
                  {report.email && (
                    <div>
                      <strong>Email:</strong> {report.email}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(report.createdAt).toLocaleString()}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                    {report.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-500 hover:text-green-600 borderColor-green-500 hover:bg-green-500/10"
                        onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'resolved' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Reviews Moderation Component
function ReviewsModeration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<(Review & { username: string; avatarUrl: string | null; contentTitle: string })[]>({
    queryKey: ["/api/admin/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({
        title: "Success",
        description: "Review deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (reviewId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete the review by "${userName}"?`)) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews Moderation</CardTitle>
        <CardDescription>
          Manage user reviews ({reviews.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviews yet
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="border-l-4 border-l-primary">
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                        {review.avatarUrl ? (
                          <img src={review.avatarUrl} alt={review.username} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium text-sm">{review.username}</div>
                          {(review as any).badges && (review as any).badges.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {(review as any).badges
                                .filter((b: any) => b.category !== 'skin' && !b.name?.includes('Skin') && b.category !== 'theme')
                                .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                                .map((badge: any) => (
                                  <img
                                    key={badge.id}
                                    src={badge.imageUrl}
                                    alt={badge.name}
                                    title={badge.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(review.id, review.username)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-3 pt-0">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {review.contentType.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-semibold text-primary">
                        {review.contentTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={i < review.rating ? "fill-current" : "text-muted/30"}>
                          ★
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm border-l-2 border-muted pl-3 py-1 bg-muted/20 rounded-r-md">
                    {review.reviewText || <em className="text-muted-foreground">No text content</em>}
                  </div>

                  {review.spoilerWarning && (
                    <Badge variant="destructive" className="mt-2 text-[10px] h-5">
                      Spoiler Alert
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Comments Moderation Component
function CommentsModeration() {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery<Show[]>({
    queryKey: ["/api/shows?limit=all"],
  });

  const { data: movies = [] } = useQuery<Movie[]>({
    queryKey: ["/api/movies?limit=all"],
  });

  const { data: animeList = [] } = useQuery<Anime[]>({
    queryKey: ["/api/anime?limit=all"],
  });

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/comments"],
    queryFn: async () => {
      const res = await fetch("/api/admin/comments", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  // Fetch all episodes for matching
  const { data: allEpisodes = [] } = useQuery<Episode[]>({
    queryKey: ["/api/all-episodes"],
    queryFn: async () => {
      const res = await fetch("/api/all-episodes", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch episodes");
      return res.json();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (commentId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete the comment by "${userName}"?`)) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments Moderation</CardTitle>
        <CardDescription>
          Manage user comments ({comments.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => {
              let contentInfo = null;

              if (comment.episodeId) {
                const episode = allEpisodes.find((e: Episode) => e.id === comment.episodeId);
                if (episode) {
                  const show = shows.find((s: Show) => s.id === episode.showId);
                  const anime = !show ? animeList.find((a: Anime) => a.id === episode.showId) : null;
                  
                  if (show) {
                    contentInfo = {
                      type: 'Episode',
                      title: show.title,
                      subtitle: `S${episode.season}E${episode.episodeNumber}: ${episode.title}`,
                      link: `/watch/${show.slug}?season=${episode.season}&episode=${episode.episodeNumber}`
                    };
                  } else if (anime) {
                    contentInfo = {
                      type: 'Anime Episode',
                      title: anime.title,
                      subtitle: `E${episode.episodeNumber}: ${episode.title}`,
                      link: `/watch-anime/${anime.slug}?episode=${episode.episodeNumber}`
                    };
                  } else {
                    contentInfo = {
                      type: 'Episode',
                      title: 'Unknown Show',
                      subtitle: `S${episode.season}E${episode.episodeNumber}: ${episode.title}`,
                      link: '#'
                    };
                  }
                } // This closes if (episode) {
              } else if (comment.movieId) {
                const movie = movies.find((m: Movie) => m.id === comment.movieId);
                if (movie) {
                  contentInfo = {
                    type: 'Movie',
                    title: movie.title,
                    subtitle: `${movie.year}`,
                    link: `/watch-movie/${movie.slug}`
                  };
                }
              }

              return (
                <Card key={comment.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{comment.userName}</CardTitle>
                          {comment.badges && comment.badges.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {comment.badges
                                .filter((b: any) => b.category !== 'skin' && !b.name?.includes('Skin') && b.category !== 'theme')
                                .sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime())
                                .map((badge: any) => (
                                  <img
                                    key={badge.id}
                                    src={badge.imageUrl}
                                    alt={badge.name}
                                    title={badge.name}
                                    className="w-4 h-4 object-contain"
                                  />
                                ))}
                            </div>
                          )}
                          <Badge variant="outline">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        {contentInfo ? (
                          <CardDescription>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{contentInfo.type}</Badge>
                                <span className="font-semibold">{contentInfo.title}</span>
                              </div>
                              <div className="text-sm">{contentInfo.subtitle}</div>
                              <a
                                href={contentInfo.link}
                                className="text-xs text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View {contentInfo.type} →
                              </a>
                            </div>
                          </CardDescription>
                        ) : (
                          <CardDescription>General Comment</CardDescription>
                        )}
                      </div>
                      {userRole === 'admin' && (
<Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(comment.id, comment.userName)}
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteCommentMutation.isPending ? "Deleting..." : "Delete"}
                      </Button>
)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                    <div className="text-xs text-muted-foreground mt-3">
                      Posted: {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Manage Blog Component
function ManageBlog() {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    contentType: "movie",
    contentId: "",
    featuredImage: "",
    excerpt: "",
    content: "",
    plotSummary: "",
    review: "",
    boxOffice: "",
    trivia: "",
    behindTheScenes: "",
    awards: "",
    author: "StreamVault",
    published: false,
    featured: false,
  });

  const { data: blogPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Blog post created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      setEditingPost(null);
      resetForm();
      toast({ title: "Success", description: "Blog post updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete blog post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      toast({ title: "Success", description: "Blog post deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      contentType: "movie",
      contentId: "",
      featuredImage: "",
      excerpt: "",
      content: "",
      plotSummary: "",
      review: "",
      boxOffice: "",
      trivia: "",
      behindTheScenes: "",
      awards: "",
      author: "StreamVault",
      published: false,
      featured: false,
    });
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      contentType: post.contentType,
      contentId: post.contentId || "",
      featuredImage: post.featuredImage,
      excerpt: post.excerpt,
      content: post.content,
      plotSummary: post.plotSummary || "",
      review: post.review || "",
      boxOffice: post.boxOffice || "",
      trivia: post.trivia || "",
      behindTheScenes: post.behindTheScenes || "",
      awards: post.awards || "",
      author: post.author || "StreamVault",
      published: post.published || false,
      featured: post.featured || false,
    });
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDeletePost = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading blog posts...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blog Management</CardTitle>
            <CardDescription>Create and manage blog posts ({blogPosts.length} total)</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen || !!editingPost} onOpenChange={(open) => {
            if (!open) { setIsCreateDialogOpen(false); setEditingPost(null); resetForm(); }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> New Blog Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                <DialogDescription>{editingPost ? "Update the blog post details" : "Fill in the details"}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Blog post title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} placeholder="url-friendly-slug" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type *</Label>
                    <select className="w-full p-2 border rounded-md bg-background" value={formData.contentType} onChange={(e) => setFormData((prev) => ({ ...prev, contentType: e.target.value }))}>
                      <option value="movie">Movie</option>
                      <option value="show">TV Show</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Input value={formData.author} onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))} placeholder="Author name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Featured Image URL *</Label>
                  <Input value={formData.featuredImage} onChange={(e) => setFormData((prev) => ({ ...prev, featuredImage: e.target.value }))} placeholder="https://example.com/image.jpg" />
                </div>
                <div className="space-y-2">
                  <Label>Excerpt *</Label>
                  <Textarea value={formData.excerpt} onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short description..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Main Content *</Label>
                  <Textarea value={formData.content} onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))} placeholder="Full article content..." rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>Plot Summary</Label>
                  <Textarea value={formData.plotSummary} onChange={(e) => setFormData((prev) => ({ ...prev, plotSummary: e.target.value }))} placeholder="Detailed plot..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Review</Label>
                  <Textarea value={formData.review} onChange={(e) => setFormData((prev) => ({ ...prev, review: e.target.value }))} placeholder="Your review..." rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Box Office (JSON)</Label>
                    <Textarea value={formData.boxOffice} onChange={(e) => setFormData((prev) => ({ ...prev, boxOffice: e.target.value }))} placeholder='{"budget": "$100M"}' rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Awards</Label>
                    <Textarea value={formData.awards} onChange={(e) => setFormData((prev) => ({ ...prev, awards: e.target.value }))} placeholder="Oscar, Golden Globe..." rows={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trivia (JSON array)</Label>
                  <Textarea value={formData.trivia} onChange={(e) => setFormData((prev) => ({ ...prev, trivia: e.target.value }))} placeholder='["Fact 1", "Fact 2"]' rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Behind The Scenes</Label>
                  <Textarea value={formData.behindTheScenes} onChange={(e) => setFormData((prev) => ({ ...prev, behindTheScenes: e.target.value }))} placeholder="Production details..." rows={3} />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.published} onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))} className="w-4 h-4" />
                    <span>Published</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))} className="w-4 h-4" />
                    <span>Featured</span>
                  </label>
                </div>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> {editingPost ? "Update" : "Create"} Blog Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {blogPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No blog posts yet. Create your first one!</div>
        ) : (
          <div className="space-y-4">
            {blogPosts.map((post) => (
              <Card key={post.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                        <Badge variant={post.published ? "default" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge>
                        {post.featured && <Badge variant="outline">Featured</Badge>}
                        <Badge variant="outline">{post.contentType}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{post.excerpt}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(post)}><Edit className="w-4 h-4 mr-2" />Edit</Button>
                      {userRole === 'admin' && (
<Button variant="destructive" size="sm" onClick={() => handleDeletePost(post.id, post.title)} disabled={deleteMutation.isPending}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Slug: /blog/{post.slug}</span>
                    <span>Author: {post.author}</span>
                    <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Newsletter Manager Component
function NewsletterManager() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const { data: subscriberData, isLoading } = useQuery<{
    count: number;
    subscribers: Array<{ email: string; subscribedAt: string; source: string }>;
  }>({
    queryKey: ["/api/admin/newsletter/subscribers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch subscribers");
      return res.json();
    },
  });

  const handleSendNewsletter = async () => {
    if (!confirm("Are you sure you want to send the newsletter to all subscribers?")) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult(data);
        toast({
          title: "Newsletter Sent!",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send newsletter",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send newsletter",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Newsletter Management
          </CardTitle>
          <CardDescription>Manage subscribers and send newsletters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{subscriberData?.count || 0}</p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-green-500">{sendResult?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Success</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-red-500">{sendResult?.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Failed</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              onClick={handleSendNewsletter}
              disabled={isSending || !subscriberData?.count}
              className="bg-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Weekly Newsletter"}
            </Button>
          </div>

          {sendResult && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
              <h4 className="font-semibold text-green-500 mb-2">Last Newsletter Sent</h4>
              <p className="text-sm">
                📧 Sent to {sendResult.sent} subscribers |
                📺 {sendResult.newShows} new shows |
                🎬 {sendResult.newMovies} new movies
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers ({subscriberData?.count || 0})</CardTitle>
          <CardDescription>All newsletter subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading subscribers...</p>
          ) : subscriberData?.subscribers?.length === 0 ? (
            <p className="text-muted-foreground">No subscribers yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {subscriberData?.subscribers?.map((sub, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{sub.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Subscribed: {new Date(sub.subscribedAt).toLocaleDateString()} • Source: {sub.source}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/admin/newsletter/send-one", {
                          method: "POST",
                          headers: getAuthHeaders(),
                          body: JSON.stringify({ email: sub.email }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          toast({
                            title: "Sent!",
                            description: `Newsletter sent to ${sub.email}`,
                          });
                        } else {
                          toast({
                            title: "Failed",
                            description: data.error || "Failed to send",
                            variant: "destructive",
                          });
                        }
                      } catch (err) {
                        toast({
                          title: "Error",
                          description: "Failed to send newsletter",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Push Notification Manager Component
function PushNotificationManager({ shows, movies }: { shows: Show[]; movies: Movie[] }) {
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [notificationType, setNotificationType] = useState<'custom' | 'show' | 'movie' | 'episode'>('custom');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const { toast } = useToast();

  // Get episodes for selected show
  const selectedShow = shows.find(s => Number(s.id) === selectedShowId);

  // Fetch subscriber count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/admin/push/subscribers', {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setSubscriberCount(data.count || 0);
      } catch (e) {
        console.error('Failed to fetch push subscriber count');
      }
    };
    fetchCount();
  }, []);

  const handleSendNotification = async () => {
    if (subscriberCount === 0) {
      toast({
        title: "No Subscribers",
        description: "There are no push notification subscribers yet.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {};

      if (notificationType === 'custom') {
        if (!customTitle || !customBody) {
          toast({
            title: "Missing Fields",
            description: "Please fill in title and body for custom notification.",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        payload.title = customTitle;
        payload.body = customBody;
        payload.url = customUrl || 'https://streamvault.live';
      } else {
        if (!selectedContentId) {
          toast({
            title: "Select Content",
            description: `Please select a ${notificationType} to notify about.`,
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
        payload.type = notificationType;
        payload.contentId = selectedContentId;
      }

      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({ sent: data.sent, failed: data.failed });
        toast({
          title: "Push Sent! 🔔",
          description: `Sent to ${data.sent} subscribers`,
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send push notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send push notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔔 Push Notifications
          </CardTitle>
          <CardDescription>Send push notifications to browser subscribers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{subscriberCount}</p>
              <p className="text-sm text-muted-foreground">Push Subscribers</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-green-500">{sendResult?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Success</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-red-500">{sendResult?.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Last Send Failed</p>
            </div>
          </div>

          {/* Notification Type Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Notification Type</label>
              <select
                value={notificationType}
                onChange={(e) => {
                  setNotificationType(e.target.value as any);
                  setSelectedContentId(null);
                  setSelectedShowId(null);
                }}
                className="w-full p-2 bg-background border rounded-lg"
              >
                <option value="custom">Custom Message</option>
                <option value="show">New Show Added</option>
                <option value="movie">New Movie Added</option>
                <option value="episode">New Episode Added</option>
              </select>
            </div>

            {notificationType === 'custom' ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="🎬 New on StreamVault!"
                    className="w-full p-2 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Body</label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    placeholder="Check out our latest content..."
                    className="w-full p-2 bg-background border rounded-lg h-20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">URL (optional)</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://streamvault.live"
                    className="w-full p-2 bg-background border rounded-lg"
                  />
                </div>
              </>
            ) : notificationType === 'show' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Select Show</label>
                <select
                  value={selectedContentId !== null ? String(selectedContentId) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedContentId(val ? Number(val) : null);
                  }}
                  className="w-full p-2 bg-background border rounded-lg"
                >
                  <option value="">-- Select a show --</option>
                  {shows.map((show) => (
                    <option key={show.id} value={String(show.id)}>
                      {show.title} ({show.year})
                    </option>
                  ))}
                </select>
              </div>
            ) : notificationType === 'movie' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Select Movie</label>
                <select
                  value={selectedContentId !== null ? String(selectedContentId) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedContentId(val ? Number(val) : null);
                  }}
                  className="w-full p-2 bg-background border rounded-lg"
                >
                  <option value="">-- Select a movie --</option>
                  {movies.map((movie) => (
                    <option key={movie.id} value={String(movie.id)}>
                      {movie.title} ({movie.year})
                    </option>
                  ))}
                </select>
              </div>
            ) : notificationType === 'episode' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Select Show</label>
                  <select
                    value={selectedShowId !== null ? String(selectedShowId) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedShowId(val ? Number(val) : null);
                      setSelectedContentId(null);
                    }}
                    className="w-full p-2 bg-background border rounded-lg"
                  >
                    <option value="">-- Select a show --</option>
                    {shows.map((show) => (
                      <option key={show.id} value={String(show.id)}>
                        {show.title} ({show.year})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedShow && (selectedShow as any).episodes && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Episode</label>
                    <select
                      value={selectedContentId || ''}
                      onChange={(e) => setSelectedContentId(Number(e.target.value))}
                      className="w-full p-2 bg-background border rounded-lg"
                    >
                      <option value="">-- Select an episode --</option>
                      {((selectedShow as any).episodes || []).map((ep: any) => (
                        <option key={ep.id} value={ep.id}>
                          S{ep.seasonNumber}E{ep.episodeNumber} - {ep.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : null}

            <Button
              onClick={handleSendNotification}
              disabled={isSending || subscriberCount === 0}
              className="w-full bg-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : `Send Push to ${subscriberCount} Subscribers`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Broadcast In-App Notification Manager Component
function BroadcastNotificationManager({ shows, movies, anime }: { shows: Show[]; movies: Movie[]; anime: Anime[] }) {
  const { toast } = useToast();
  const [notificationType, setNotificationType] = useState<'new_content' | 'new_episode' | 'custom'>('new_content');
  const [contentType, setContentType] = useState<'show' | 'movie' | 'anime'>('show');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customLink, setCustomLink] = useState(''); // Added customLink state
  const [isSending, setIsSending] = useState(false);

  const getContentList = () => {
    switch (contentType) {
      case 'show': return shows;
      case 'movie': return movies;
      case 'anime': return anime;
      default: return [];
    }
  };

  const getSelectedContent = () => {
    const list = getContentList();
    return list.find((item: any) => item.id === selectedContentId);
  };

  const handleBroadcast = async () => {
    if (notificationType !== 'custom' && !selectedContentId) {
      toast({
        title: 'Error',
        description: 'Please select content to notify about',
        variant: 'destructive',
      });
      return;
    }

    if (notificationType === 'custom' && (!customTitle.trim() || !customMessage.trim())) {
      toast({
        title: 'Error',
        description: 'Please enter both title and message for custom notification',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const selectedContent = getSelectedContent();

      const payload = {
        type: notificationType,
        contentType: notificationType !== 'custom' ? contentType : undefined,
        contentId: selectedContentId || undefined,
        contentTitle: selectedContent?.title || undefined,
        contentPoster: (selectedContent as any)?.posterUrl || undefined,
        customTitle: notificationType === 'custom' ? customTitle : undefined,
        customMessage: notificationType === 'custom' ? customMessage : undefined,
        customLink: customLink || undefined, // Send customLink
      };

      const response = await fetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '🎉 Broadcast Sent!',
          description: `Notification sent to ${data.sentCount} users`,
        });
        // Reset form
        setSelectedContentId('');
        setSelectedContentId('');
        setCustomTitle('');
        setCustomMessage('');
        setCustomLink(''); // Reset customLink
      } else {
        throw new Error(data.error || 'Failed to broadcast');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send broadcast',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Broadcast In-App Notifications
          </CardTitle>
          <CardDescription>
            Send notifications to all authenticated users about new content, episodes, or custom announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Type */}
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value as any)}
            >
              <option value="new_content">🆕 New Content Added</option>
              <option value="new_episode">📺 New Episode Released</option>
              <option value="custom">✍️ Custom Announcement</option>
            </select>
          </div>

          {notificationType !== 'custom' && (
            <>
              {/* Content Type */}
              <div className="space-y-2">
                <Label>Content Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={contentType}
                  onChange={(e) => {
                    setContentType(e.target.value as any);
                    setSelectedContentId('');
                  }}
                >
                  <option value="show">📺 TV Show</option>
                  <option value="movie">🎬 Movie</option>
                  <option value="anime">🎌 Anime</option>
                </select>
              </div>

              {/* Content Selection */}
              <div className="space-y-2">
                <Label>Select Content</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedContentId}
                  onChange={(e) => setSelectedContentId(e.target.value)}
                >
                  <option value="">-- Select {contentType} --</option>
                  {getContentList().map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.year})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {selectedContentId && getSelectedContent() && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Notification Preview</Label>
                  <div className="flex items-center gap-4">
                    <img
                      src={(getSelectedContent() as any).posterUrl}
                      alt=""
                      className="w-16 h-24 object-cover rounded"
                    />
                    <div>
                      <p className="font-semibold">
                        {notificationType === 'new_content' ? '🆕 New Content Added!' : '📺 New Episode Available!'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(getSelectedContent() as any).title} is now available on StreamVault!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {notificationType === 'custom' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="customTitle">Notification Title</Label>
                <Input
                  id="customTitle"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g., 🎉 Special Announcement!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customMessage">Notification Message</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your announcement message..."
                  rows={3}
                />
              </div>

              {/* Preview */}
              {customTitle && customMessage && (
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Notification Preview</Label>
                  <div>
                    <p className="font-semibold">{customTitle}</p>
                    <p className="text-sm text-muted-foreground">{customMessage}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="customLink">Destination Link (Optional)</Label>
            <Input
              id="customLink"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
              placeholder={notificationType === 'custom'
                ? "e.g., /show/stranger-things or https://example.com"
                : "Override default link (e.g., /special-promo)"}
            />
            <p className="text-xs text-muted-foreground">
              Internal paths like <code>/show/slug</code> or external URLs. Leave empty to {notificationType === 'custom' ? 'take no action' : 'use default content page'}.
            </p>
          </div>

          <Button
            onClick={handleBroadcast}
            disabled={isSending}
            className="w-full"
            size="lg"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isSending ? 'Broadcasting...' : 'Broadcast to All Users'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Polls Manager Component
function PollsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [featured, setFeatured] = useState(false);
  const [endDate, setEndDate] = useState('');

  const [resultsPoll, setResultsPoll] = useState<any>(null);

  const { data: polls, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/polls"],
    queryFn: async () => {
      const res = await fetch("/api/admin/polls", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch polls");
      return res.json();
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create poll");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polls"] });
      toast({ title: "Success!", description: "Poll created successfully" });
      setQuestion('');
      setOptions(['', '']);
      setFeatured(false);
      setEndDate('');
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create poll", variant: "destructive" });
    },
  });

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({ title: "Error", description: "At least 2 options required", variant: "destructive" });
      return;
    }
    createPollMutation.mutate({
      question,
      options: validOptions,
      featured,
      endDate: endDate || undefined,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Create New Poll
          </CardTitle>
          <CardDescription>Create a community poll for users to vote on</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poll-question">Question</Label>
              <Textarea
                id="poll-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What genre should we add more of?"
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Options (2-6)</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  {options.length > 2 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeOption(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-4 h-4 mr-2" /> Add Option
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="poll-end">End Date (Optional)</Label>
              <Input
                id="poll-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Featured Poll (highlighted on page)</span>
            </label>

            <Button type="submit" disabled={createPollMutation.isPending} className="w-full">
              {createPollMutation.isPending ? "Creating..." : "Create Poll"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Polls ({polls?.length || 0})</CardTitle>
          <CardDescription>View and manage community polls</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading polls...</p>
          ) : polls && polls.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {polls.map((poll: any) => (
                <div key={poll.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{poll.question}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{poll.options?.length || 0} options</span>
                        <span>•</span>
                        <span>{poll.totalVotes || 0} total vote{poll.totalVotes !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className={poll.featured ? "text-primary font-medium" : ""}>{poll.featured ? '⭐ Featured' : 'Regular'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setResultsPoll(poll)}>
                        View Results
                      </Button>
                      <Badge variant={poll.active ? "default" : "secondary"}>
                        {poll.active ? "Active" : "Ended"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No polls created yet</p>
          )}

          {/* Results Dialog */}
          <Dialog open={!!resultsPoll} onOpenChange={(open) => !open && setResultsPoll(null)}>
            {resultsPoll && (
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Poll Results</DialogTitle>
                  <DialogDescription>{resultsPoll.question}</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {/* Option Counts */}
                  <div>
                    <h3 className="font-semibold mb-3">Vote Distribution</h3>
                    <div className="space-y-2">
                      {resultsPoll.options.map((option: string, index: number) => {
                        const result = resultsPoll.results?.find((r: any) => r.optionIndex === index);
                        const count = result?.count || 0;
                        const percentage = resultsPoll.totalVotes > 0 ? Math.round((count / resultsPoll.totalVotes) * 100) : 0;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{option}</span>
                              <span className="text-muted-foreground">{count} {count === 1 ? 'vote' : 'votes'} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Voters List */}
                  <div>
                    <h3 className="font-semibold mb-3">Voters ({resultsPoll.voters?.length || 0})</h3>
                    {resultsPoll.voters && resultsPoll.voters.length > 0 ? (
                      <div className="space-y-2">
                        {resultsPoll.voters.map((voter: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-card border border-white/5">
                            <div className="flex items-center gap-2">
                              {/* Assume UserAvatar is available, else just a generic avatar or no avatar */}
                              {voter.avatarUrl ? (
                                <img src={voter.avatarUrl} alt={voter.username} className="w-6 h-6 rounded-full" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                                  {voter.username.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-medium">{voter.username}</span>
                            </div>
                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                              {resultsPoll.options[voter.optionIndex]}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No votes yet.</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            )}
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

// Challenges Manager Component
function ChallengesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState<'daily' | 'weekly'>('daily');
  const [targetType, setTargetType] = useState('watch_count');
  const [targetValue, setTargetValue] = useState(5);
  const [xpReward, setXpReward] = useState(100);
  const [badgeReward, setBadgeReward] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: challenges, isLoading } = useQuery<any[]>({
    queryKey: ["/api/challenges"],
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create challenge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({ title: "Success!", description: "Challenge created successfully" });
      setTitle('');
      setDescription('');
      setTargetValue(5);
      setXpReward(100);
      setBadgeReward('');
      setEndDate('');
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create challenge", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createChallengeMutation.mutate({
      title,
      description,
      type: challengeType,
      targetType,
      targetValue,
      xpReward,
      badgeReward: badgeReward || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create New Challenge
          </CardTitle>
          <CardDescription>Create daily or weekly challenges for users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="challenge-title">Title</Label>
              <Input
                id="challenge-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekend Binge Master"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenge-desc">Description</Label>
              <Textarea
                id="challenge-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Watch 5 movies this weekend to complete the challenge!"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Challenge Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={challengeType}
                  onChange={(e) => setChallengeType(e.target.value as any)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Target Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  <option value="watch_count">Watch Any Content</option>
                  <option value="watch_movie">Watch Movies</option>
                  <option value="watch_show">Watch Shows</option>
                  <option value="watch_anime">Watch Anime</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target-value">Target Count</Label>
                <Input
                  id="target-value"
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(parseInt(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xp-reward">XP Reward</Label>
                <Input
                  id="xp-reward"
                  type="number"
                  min="10"
                  value={xpReward}
                  onChange={(e) => setXpReward(parseInt(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-reward">Badge Reward (Optional)</Label>
              <Input
                id="badge-reward"
                value={badgeReward}
                onChange={(e) => setBadgeReward(e.target.value)}
                placeholder="e.g., binge_master, weekend_warrior"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenge-end">End Date</Label>
              <Input
                id="challenge-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={createChallengeMutation.isPending} className="w-full">
              {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Challenges ({challenges?.length || 0})</CardTitle>
          <CardDescription>View and manage user challenges</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading challenges...</p>
          ) : challenges && challenges.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {challenges.map((challenge: any) => (
                <div key={challenge.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{challenge.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {challenge.type} • {challenge.targetValue}x {challenge.targetType} • {challenge.xpReward} XP
                      </p>
                    </div>
                    <Badge variant={challenge.active ? "default" : "secondary"}>
                      {challenge.active ? "Active" : "Ended"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No challenges created yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BadgesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('general');

  // Store fields
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [giftable, setGiftable] = useState(true);
  const [limited, setLimited] = useState(false);
  const [isSpecial, setIsSpecial] = useState(false);
  const [displayPriority, setDisplayPriority] = useState(0);

  const { data: badges, isLoading } = useQuery<any[]>({
    queryKey: ["/api/badges"],
    queryFn: async () => {
      const res = await fetch("/api/badges", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
          category,
          active: true,
          price: parseInt(price as any),
          stock: stock === "" ? null : parseInt(stock),
          isForSale,
          giftable,
          limited,
          isSpecial,
          displayPriority: parseInt(displayPriority as any)
        }),
      });
      if (!res.ok) throw new Error("Failed to create badge");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Success", description: "Badge created successfully" });
      setName('');
      setDescription('');
      setImageUrl('');
      setPrice(0);
      setStock('');
      setIsForSale(false);
      setGiftable(true);
      setLimited(false);
      setIsSpecial(false);
      setDisplayPriority(0);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create badge", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !imageUrl) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Badge</CardTitle>
          <CardDescription>Create new badges for users to collect & purchase</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge-name">Name</Label>
                  <Input
                    id="badge-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Movie Buff"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge-image">Image URL</Label>
                  <Input
                    id="badge-image"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/badge.png"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-desc">Description</Label>
                <Textarea
                  id="badge-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Watch 50 movies to earn this badge"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Store Settings</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="flex-1 cursor-pointer" htmlFor="is-for-sale">List for Sale</Label>
                    <Switch id="is-for-sale" checked={isForSale} onCheckedChange={setIsForSale} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex-1 cursor-pointer" htmlFor="limited">Limited Edition</Label>
                    <Switch id="limited" checked={limited} onCheckedChange={setLimited} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex-1 cursor-pointer" htmlFor="is-special">Special (VIP/Effect)</Label>
                    <Switch id="is-special" checked={isSpecial} onCheckedChange={setIsSpecial} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex-1 cursor-pointer" htmlFor="giftable">Giftable</Label>
                    <Switch id="giftable" checked={giftable} onCheckedChange={setGiftable} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Price (cents)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">${(Number(price) / 100).toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Stock (Empty = Unlimited)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Priority</Label>
                    <Input
                      type="number"
                      value={displayPriority}
                      onChange={(e) => setDisplayPriority(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Badge"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award Badge</CardTitle>
          <CardDescription>Manually award a badge to a user</CardDescription>
        </CardHeader>
        <CardContent>
          <AwardBadgeForm badges={badges || []} />
          <ManageUserBadges />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Badges ({badges?.length || 0})</CardTitle>
            <CardDescription>Manage existing badges</CardDescription>
          </div>
          <SyncAchievementsButton />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading badges...</p>
          ) : badges && badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge: any) => (
                <BadgeItem key={badge.id} badge={badge} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No badges created yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SyncAchievementsButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/badges/sync", {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({
        title: "Sync Complete",
        description: data.message || `Synced ${data.created} new achievements`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync achievements", variant: "destructive" });
    }
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => syncMutation.mutate()}
      disabled={syncMutation.isPending}
    >
      <Save className="w-4 h-4 mr-2" />
      {syncMutation.isPending ? "Syncing..." : "Sync System Achievements"}
    </Button>
  );
}

function BadgeItem({ badge }: { badge: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/badges/${badge.id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete badge");
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Badge deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return (
    <>
      <div className="p-4 border rounded-lg flex flex-col items-center text-center space-y-2 hover:bg-muted/50 transition relative group">
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
            <Edit className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Badge?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{badge.name}"? This cannot be undone and may affect users who have earned this badge.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <img src={badge.imageUrl} alt={badge.name} className="w-16 h-16 object-contain" />
        <div>
          <p className="font-medium">{badge.name}</p>
          <p className="text-xs text-muted-foreground max-w-[200px] truncate">{badge.description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          <Badge variant="outline">{badge.category}</Badge>
          {badge.isForSale && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-0">
              ${(badge.price / 100).toFixed(2)}
            </Badge>
          )}
          {badge.limited && (
            <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-0">
              {badge.stock != null ? `${badge.stock} left` : 'Limited'}
            </Badge>
          )}
        </div>
      </div>

      <EditBadgeDialog
        badge={badge}
        open={isEditing}
        onOpenChange={setIsEditing}
      />
    </>
  );
}

function AwardBadgeForm({ badges }: { badges: any[] }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (username.trim()) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/admin/users/search?query=${encodeURIComponent(username)}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const users = await res.json();
            // Filter out already selected users
            const filtered = users.filter((u: any) => !selectedUsers.find(sel => sel.id === u.id));
            setSearchResults(filtered);
            setShowResults(true);
          }
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, selectedUsers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const awardMutation = useMutation({
    mutationFn: async () => {
      if (selectedUsers.length === 0) throw new Error("Please select at least one user");

      const awardRes = await fetch("/api/admin/badges/award", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u.id),
          badgeId,
        }),
      });
      if (!awardRes.ok) {
        const err = await awardRes.json();
        throw new Error(err.error || "Failed to award badge");
      }
      return awardRes.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Badge awarded to ${data.awardedCount} users` });
      setUsername('');
      setBadgeId('');
      setSelectedUsers([]);
      setSearchResults([]);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0 || !badgeId) {
      toast({ title: "Error", description: "Please select users and a badge", variant: "destructive" });
      return;
    }
    awardMutation.mutate();
  };

  const handleSelectUser = (user: any) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUsername(""); // Clear search to allow adding more
    setShowResults(false);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="space-y-2 flex-1 relative" ref={searchRef}>
          <Label htmlFor="award-username">Search Users</Label>
          <div className="relative">
            <Input
              id="award-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Type to search users..."
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.username}</p>
                    {user.badges && user.badges.length > 0 && (
                      <div className="flex items-center gap-0.5 ml-1">
                        {user.badges.filter((b: any) => b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'theme').sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                          <img
                            key={badge.id}
                            src={badge.imageUrl}
                            alt={badge.name}
                            title={badge.name}
                            className="w-3 h-3 object-contain"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 flex-1">
          <Label htmlFor="award-badge">Select Badge</Label>
          <Select value={badgeId} onValueChange={setBadgeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Badge" />
            </SelectTrigger>
            <SelectContent>
              {badges.map((badge) => (
                <SelectItem key={badge.id} value={badge.id}>
                  {badge.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={awardMutation.isPending || selectedUsers.length === 0}>
          {awardMutation.isPending ? "Awarding..." : "Award Badge"}
        </Button>
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md border min-h-[60px]">
          {selectedUsers.map(user => (
            <div key={user.id} className="flex items-center gap-2 bg-background border px-2 py-1 rounded-full text-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="h-5 w-5 rounded-full overflow-hidden bg-secondary">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-3 w-3 text-muted-foreground m-1" />
                )}
              </div>
              <span className="font-medium">{user.username}</span>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

function ManageUserBadges() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (username.trim()) {
        if (searchedUser && username === searchedUser.username) return; // Don't search if verified and unchanged

        setIsSearching(true);
        try {
          const res = await fetch(`/api/admin/users/search?query=${encodeURIComponent(username)}`, { headers: getAuthHeaders() });
          if (res.ok) {
            const users = await res.json();
            setSearchResults(users);
            setShowResults(true);
          }
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, searchedUser]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const revokeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      const res = await fetch("/api/admin/badges/revoke", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userId: searchedUser.id, badgeId }),
      });
      if (!res.ok) throw new Error("Failed to revoke badge");
    },
    onSuccess: (_, badgeId) => {
      toast({ title: "Badge revoked successfully" });
      setUserBadges(prev => prev.filter(b => b.badgeId !== badgeId));
    },
    onError: () => {
      toast({ title: "Error revoking badge", variant: "destructive" });
    }
  });

  const handleSelectUser = (user: any) => {
    setSearchedUser(user);
    setUsername(user.username);
    setShowResults(false);
    // Fetch badges immediately
    fetch(`/api/users/${user.id}/badges`).then(r => r.json()).then(setUserBadges);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Manage User Badges</CardTitle>
        <CardDescription>Search for a user to view and revoke their badges</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6 relative" ref={searchRef}>
          <div className="relative flex-1">
            <Input
              placeholder="Search user to manage badges..."
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (searchedUser && e.target.value !== searchedUser.username) {
                  setSearchedUser(null);
                  setUserBadges([]);
                }
              }}
            />
            {isSearching && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Live Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-popover border border-border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.username}</p>
                    {user.badges && user.badges.length > 0 && (
                      <div className="flex items-center gap-0.5 ml-1">
                        {user.badges.filter((b: any) => b.category !== 'skin' && !b.name.includes('Skin') && b.category !== 'theme').sort((a: any, b: any) => new Date(a.equippedAt || 0).getTime() - new Date(b.equippedAt || 0).getTime()).map((badge: any) => (
                          <img
                            key={badge.id}
                            src={badge.imageUrl}
                            alt={badge.name}
                            title={badge.name}
                            className="w-3 h-3 object-contain"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {searchedUser && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
              <UserIcon className="w-4 h-4" />
              <span className="font-semibold">{searchedUser.username}</span>
              <span className="text-muted-foreground text-sm">({userBadges.length} badges)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userBadges.length > 0 ? userBadges.map((ub: any) => (
                <div key={ub.id} className="p-3 border rounded flex flex-col items-center text-center relative group hover:border-destructive/50 transition-colors">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => {
                      if (confirm(`Revoke badge "${ub.badge.name}" from ${searchedUser.username}?`)) {
                        revokeMutation.mutate(ub.badgeId);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <img src={ub.badge.imageUrl} className="w-12 h-12 object-contain mb-2" />
                  <div className="text-sm font-medium">{ub.badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Earned: {new Date(ub.earnedAt).toLocaleDateString()}</div>
                </div>
              )) : (
                <p className="col-span-4 text-center text-muted-foreground py-4">No badges found for this user.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { THEME_MAPPING, THEME_PREVIEWS } from "@/lib/theme-data";

function StoreManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState('badge'); // badge, theme
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState(500);
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('general');
  const [selectedTheme, setSelectedTheme] = useState('');

  const { data: products, isLoading } = useQuery<any[]>({
    queryKey: ["/api/store/products"],
    queryFn: async () => {
      const res = await fetch("/api/store/products", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: productType === 'theme' ? selectedTheme : name, // Use theme key/name
          description,
          imageUrl,
          category: productType === 'theme' ? 'theme' : category, // Force category 'theme'
          active: true,
          price: parseInt(price as any),
          stock: stock === "" ? null : parseInt(stock),
          isForSale: true,
          giftable: true,
          limited: stock !== "",
          isSpecial: false,
          displayPriority: 10
        }),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Success", description: "Product created successfully" });
      setName('');
      setDescription('');
      setImageUrl('');
      setPrice(500);
      setStock('');
      setSelectedTheme('');
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/store/admin/badges/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Success", description: "Product updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setPrice(500);
    setStock('');
    setSelectedTheme('');
    setProductType('badge');
  };

  const handleEdit = (product: Badge) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description);
    setImageUrl(product.imageUrl);
    setPrice(product.price);
    setStock(product.stock?.toString() || '');
    setCategory(product.category);

    if (product.category === 'theme') {
      setProductType('theme');
      setSelectedTheme(product.name);
    } else {
      setProductType('badge');
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productType === 'badge' && !name) {
      toast({ title: "Error", description: "Name required", variant: "destructive" });
      return;
    }
    // ... rest of validation ...

    if (editingId) {
      updateMutation.mutate({
        name: productType === 'theme' ? selectedTheme : name,
        description,
        imageUrl,
        category: productType === 'theme' ? 'theme' : category,
        price: parseInt(price as any),
        stock: stock === "" ? null : parseInt(stock),
      });
    } else {
      createMutation.mutate();
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
  };

  // ... (keep rest) ...

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Product' : 'Add Store Product'}</CardTitle>
          <CardDescription>
            {editingId ? 'Update existing product details' : 'Add new items to the store'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection (Disable if editing maybe? No, let them change) */}
            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
              <Label>Product Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={productType === 'badge' ? 'default' : 'outline'}
                  onClick={() => setProductType('badge')}
                  className="w-1/3"
                >
                  Badge / Item
                </Button>
                <Button
                  type="button"
                  variant={productType === 'theme' ? 'default' : 'outline'}
                  onClick={() => setProductType('theme')}
                  className="w-1/3"
                >
                  Theme
                </Button>
              </div>
            </div>

            {productType === 'theme' ? (
              <div className="space-y-2">
                <Label>Select Theme</Label>
                <Select value={selectedTheme} onValueChange={handleThemeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(THEME_MAPPING).map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select a theme from the system themes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gold Badge" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Image / Screenshot URL</Label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={productType === 'theme' ? "https://... (Theme Preview Screenshot)" : "https://... (Badge Icon)"} />
              {imageUrl && (
                <div className="mt-2 w-32 h-32 rounded-md border overflow-hidden">
                  <img src={imageUrl} className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Product description..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (Coins)</Label>
                <Input type="number" value={price} onChange={e => setPrice(parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Stock (Optional)</Label>
                <Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="Unlimited" />
              </div>
              {productType === 'badge' && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="bundle">Bundle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                {editingId ? (updateMutation.isPending ? "Updating..." : "Update Product") : (createMutation.isPending ? "Creating..." : `Add ${productType === 'theme' ? 'Theme' : 'Badge'} to Store`)}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Products</CardTitle>
          <CardDescription>Items currently listed for sale</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products?.map((product) => {
                const isTheme = product.category === 'theme' || product.name.includes("Theme");
                const isSkin = product.category === 'skin' || product.name.includes("Skin");
                // Use preview for themes if available, otherwise fallback to imageUrl
                // Themes are stored as keys in THEME_PREVIEWS (e.g. 'ocean', 'midnight')
                // We might need to map name to key if not stored directly
                // But typically for themes, we want to show the preview.

                let bgImage = product.imageUrl;
                // If it's a theme, try to find a better preview if the imageUrl is just an icon
                // Actually, the StoreManager create logic sets imageUrl to the preview URL for themes? checking...
                // Yes: placeholder={productType === 'theme' ? "https://... (Theme Preview Screenshot)"
                // So product.imageUrl should be correct for themes.

                return (
                  <div
                    key={product.id}
                    className={`
                      relative group bg-card hover:border-primary/50 transition-colors border rounded-lg overflow-hidden flex flex-col
                      ${isTheme ? 'col-span-2 aspect-video' : ''}
                      ${isSkin ? 'row-span-2 aspect-[2/3]' : ''}
                      ${!isTheme && !isSkin ? 'aspect-square p-4 items-center text-center' : ''}
                    `}
                  >
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(product)}>
                        Edit
                      </Button>
                    </div>

                    {/* Rendering Logic based on Type */}
                    {(isTheme || isSkin) ? (
                      <>
                        <div className="absolute inset-0">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                          <div className="font-bold text-white truncate shadow-black drop-shadow-md">{product.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold text-yellow-500 shadow-black drop-shadow-md">{product.price} Coins</span>
                            <span className="text-xs text-white/80 capitalize bg-black/50 px-2 py-0.5 rounded shadow-black drop-shadow-md">{product.category}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 mb-2 flex items-center justify-center flex-grow">
                          <img src={product.imageUrl} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="w-full mt-auto">
                          <div className="font-medium truncate w-full">{product.name}</div>
                          <div className="text-sm text-yellow-500 font-bold">{product.price} Coins</div>
                          <div className="text-xs text-muted-foreground capitalize">{product.category}</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Store Analytics Component
function StoreAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/store/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/store/admin/stats", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch store stats");
      return res.json();
    }
  });

  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  if (isLoading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  // Helper to format amount nicely (handle negative values display)
  const formatAmount = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return (
      <span className={isNegative ? "text-red-400" : "text-green-400"}>
        {isNegative ? "-" : "+"}{absAmount}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="text-2xl font-bold flex items-center gap-2">
              <StreamCoin className="w-6 h-6" />
              {stats?.totalRevenue || 0}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total coins spent in store</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.itemsSold || 0}</div>
            <p className="text-xs text-muted-foreground">Total items purchased</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Item</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats?.topSellingItems?.[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{stats?.topSellingItems?.[0]?.count || 0} sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeItemsCount || 0}</div>
            <p className="text-xs text-muted-foreground">Products available for sale</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Most popular items in the store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topSellingItems?.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-muted-foreground w-6">#{i + 1}</div>
                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center p-1">
                      <ShoppingBag className="h-5 w-5 opacity-50" />
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.count} sales</div>
                    </div>
                  </div>
                  <div className="font-bold flex items-center gap-1">
                    {item.revenue} <StreamCoin className="w-3 h-3" />
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No sales data yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Purchases</CardTitle>
              <CardDescription>Latest store transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsTransactionsOpen(true)}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentPurchases?.map((tx: any, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors" onClick={() => setSelectedTransaction(tx)}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {tx.description || (tx.item_id ? `Purchased Item` : 'Transaction')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold flex items-center justify-end gap-1">
                      {formatAmount(tx.amount)} <StreamCoin className="w-3 h-3" />
                    </div>
                    <div className="text-xs text-muted-foreground">User ID: ...{tx.userId ? tx.userId.slice(-4) : 'N/A'}</div>
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No recent purchases.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Transactions Dialog */}
      <Dialog open={isTransactionsOpen} onOpenChange={setIsTransactionsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Store Transactions</DialogTitle>
            <DialogDescription>
              Complete history of all store purchases and gifts
            </DialogDescription>
          </DialogHeader>

          <AllTransactionsTable />

        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono text-xs text-muted-foreground">{selectedTransaction.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p>{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <div className="flex items-center gap-1 font-bold text-lg">
                    {formatAmount(selectedTransaction.amount)}
                    <StreamCoin className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="capitalize">{selectedTransaction.type}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="font-mono text-sm">{selectedTransaction.userId}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="bg-muted p-2 rounded-md">{selectedTransaction.description}</p>
                </div>
                {selectedTransaction.metadata && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Metadata</Label>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                      {JSON.stringify(JSON.parse(selectedTransaction.metadata || '{}'), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Sub-component for the table to keep things clean and potentially use query pagination later
function AllTransactionsTable() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/store/admin/stats"], // Re-using for now, ideally a separate paginated endpoint
  });

  // We can't easily get ALL transactions from the stats endpoint as it might be limited.
  // Ideally we should create a new endpoint /api/admin/transactions. 
  // BUT, for now, let's stick to what we have or accept we might strictly need that new endpoint.
  // The user asked for "expanded all transaction tab". 
  // The current stats endpoint gives `recentPurchases` (sliced to 10).
  // I need to fetch all transactions.

  // Let's create a quick new query for all transactions since stats is limited.
  const { data: allTransactions = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/wallet/transactions/all"], // This endpoint might not exist yet for admin all?
    // Checking store.ts... "getAllCoinTransactions" exists in storage but exposed?
    // storage.ts has `getAllCoinTransactions`.
    // store.ts: `router.get('/admin/stats'` calls `getAllCoinTransactions` but filters and slices.
    // Wait, the USER expects to see ALL.
    // I should probably add a quick endpoint or modify stats to return more if requested?
    // Modifying stats is risky. 
    // Actually, `get /api/wallet/transactions` is for USER.
    // Let's assume we can add a quick endpoint to `store.ts` OR just filter client side if the stats endpoint returned everything? 
    // The stats endpoint currently does: `recentPurchases = ... slice(0, 10)`.

    // Fix: I will fetch from `/api/store/admin/stats` but wait... that endpoint explicitly slices. 
    // I should add a NEW endpoint `/api/admin/store/transactions` in `store.ts` for the full list.
    // OR, I can just update the `AllTransactionsTable` to handle this limitation gracefully or mock it for now
    // No, the user wants it functional. 
    // I will add the endpoint in the previous step? No, step is over.
    // I will use client-side logic to fetch a new endpoint I'll CREATE in the NEXT step? 
    // Actually, I can add the endpoint code right now to `store.ts` via another tool call if needed or just accept I need to do it.
    // Let's modify `store.ts` first? No I am editing `admin.tsx`.

    // Strategy: I will write `admin.tsx` assuming `/api/admin/store/transactions` exists. 
    // AND I will use `run_command` or similar to add that endpoint to `store.ts` in the NEXT turn?
    // OR I can use `multi_replace` to edit both files in ONE turn. YES.
    // I will edit `store.ts` to add the endpoint.

    queryFn: async () => {
      const res = await fetch("/api/store/admin/transactions", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    }
  });

  if (isLoadingAll) return <div>Loading transactions...</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allTransactions.map((tx: any) => (
          <TableRow key={tx.id}>
            <TableCell>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}</TableCell>
            <TableCell className="capitalize">{tx.type}</TableCell>
            <TableCell>{tx.description}</TableCell>
            <TableCell title={tx.userId}>...{tx.userId?.slice(-4) || 'N/A'}</TableCell>
            <TableCell className={`text-right font-bold ${tx.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {tx.amount > 0 ? '+' : ''}{tx.amount}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Pending Content Tab Component
function PendingContentTab() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'show' | 'anime'; tmdbEpisodes: number | null; localEpisodes: number } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{
    shows: {
      id: string;
      title: string;
      posterUrl: string;
      localEpisodes: number;
      tmdbEpisodes: number | null;
      status: string;
      missing: string;
    }[];
    anime: {
      id: string;
      title: string;
      posterUrl: string;
      localEpisodes: number;
      tmdbEpisodes: number | null;
      status: string;
      missing: string;
    }[];
  }>({
    queryKey: ["/api/admin/pending-content"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pending-content", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch pending content");
      return res.json();
    },
  });

  // Fetch detail data when a modal is opened
  const { data: detailData, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/admin/pending-content", selectedItem?.type, selectedItem?.id],
    queryFn: async () => {
      if (!selectedItem) return null;
      const res = await fetch(`/api/admin/pending-content/${selectedItem.type}/${selectedItem.id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch details");
      return res.json();
    },
    enabled: !!selectedItem,
  });

  const handleManageEpisodes = (type: 'show' | 'anime', id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "ID Copied",
      description: `Copied ${type} ID to clipboard. Go to 'Manage Episodes' to add content.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">Scanning library and fetching TMDB data... This may take a moment.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
        <h3 className="text-lg font-semibold text-destructive">Failed to load pending content</h3>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const hasPendingShows = data?.shows && data.shows.length > 0;
  const hasPendingAnime = data?.anime && data.anime.length > 0;

  const renderContentCard = (item: any, type: 'show' | 'anime') => (
    <div
      key={item.id}
      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group"
      onClick={() => setSelectedItem({ id: item.id, type, tmdbEpisodes: item.tmdbEpisodes, localEpisodes: item.localEpisodes })}
    >
      <img src={item.posterUrl} alt={item.title} className="w-16 h-24 object-cover rounded shadow group-hover:shadow-lg transition-shadow" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{item.title}</h4>
            <div className="flex gap-2 mt-1 mb-2">
              <Badge variant="outline" className="text-xs">
                Local: {item.localEpisodes} eps
              </Badge>
              {item.tmdbEpisodes !== null && (
                <Badge variant="secondary" className="text-xs">
                  TMDB: {item.tmdbEpisodes} eps
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{item.status}</Badge>
            <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="bg-destructive/10 text-destructive p-2 rounded text-sm mb-3">
          <strong>Missing:</strong> {item.missing}
        </div>

        {/* Progress bar */}
        {item.tmdbEpisodes !== null && item.tmdbEpisodes > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Completion</span>
              <span>{Math.round((item.localEpisodes / item.tmdbEpisodes) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-gradient-to-r from-orange-500 to-red-500"
                style={{ width: `${Math.min(100, Math.round((item.localEpisodes / item.tmdbEpisodes) * 100))}%` }}
              />
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); handleManageEpisodes(type, item.id); }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Copy ID & Manage
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Pending Content (Incomplete Episodes)
          </CardTitle>
          <CardDescription>
            Content that has fewer episodes uploaded than listed on TMDB. Click any item for detailed per-season analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="shows" className="w-full">
            <TabsList>
              <TabsTrigger value="shows">TV Shows ({data?.shows.length || 0})</TabsTrigger>
              <TabsTrigger value="anime">Anime ({data?.anime.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="shows" className="mt-4">
              {!hasPendingShows ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>All TV Shows are up to date! Great job.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {data?.shows.map((show) => renderContentCard(show, 'show'))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="anime" className="mt-4">
              {!hasPendingAnime ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>All Anime are up to date! Great job.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {data?.anime.map((anime) => renderContentCard(anime, 'anime'))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Analysis Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p className="text-muted-foreground">Fetching detailed analysis from TMDB...</p>
            </div>
          ) : detailData ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{detailData.title}</DialogTitle>
                <DialogDescription>
                  Detailed per-season episode analysis
                </DialogDescription>
              </DialogHeader>

              {/* Content Header */}
              <div className="flex gap-4 mt-2">
                <img
                  src={detailData.posterUrl}
                  alt={detailData.title}
                  className="w-24 h-36 object-cover rounded-lg shadow-lg"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {detailData.year && <Badge variant="outline">{detailData.year}</Badge>}
                    {detailData.rating && <Badge variant="outline">{detailData.rating}</Badge>}
                    {detailData.imdbRating && <Badge variant="secondary">⭐ {detailData.imdbRating}</Badge>}
                    {detailData.tmdbStatus && (
                      <Badge variant={detailData.tmdbStatus === 'Ended' || detailData.tmdbStatus === 'Canceled' ? 'destructive' : 'default'}>
                        {detailData.tmdbStatus}
                      </Badge>
                    )}
                  </div>
                  {detailData.genres && (
                    <p className="text-sm text-muted-foreground">{detailData.genres}</p>
                  )}

                  {/* Overall Stats — use list data as fallback when TMDB API fails */}
                  {(() => {
                    const tmdbEps = detailData.totalTmdbEpisodes ?? selectedItem?.tmdbEpisodes ?? null;
                    const localEps = detailData.totalLocalEpisodes ?? selectedItem?.localEpisodes ?? 0;
                    const completion = tmdbEps ? Math.round((localEps / tmdbEps) * 100) : (detailData.overallCompletion ?? null);
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{localEps}</p>
                            <p className="text-[11px] text-muted-foreground">Local Episodes</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{tmdbEps ?? '—'}</p>
                            <p className="text-[11px] text-muted-foreground">TMDB Episodes</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className={`text-2xl font-bold ${completion === 100 ? 'text-green-500' :
                              completion && completion >= 50 ? 'text-orange-500' : 'text-red-500'
                              }`}>
                              {completion !== null ? `${completion}%` : '—'}
                            </p>
                            <p className="text-[11px] text-muted-foreground">Completion</p>
                          </div>
                        </div>

                        {/* Overall progress bar */}
                        {completion !== null && (
                          <div className="mt-2">
                            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${completion === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  completion >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    'bg-gradient-to-r from-orange-500 to-red-500'
                                  }`}
                                style={{ width: `${Math.min(100, completion)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Per-Season Analysis */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Season-by-Season Breakdown</h4>
                {detailData.seasonAnalysis.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No season data available.</p>
                ) : (
                  detailData.seasonAnalysis.map((season: any) => (
                    <div
                      key={season.season}
                      className={`border rounded-lg p-4 ${season.status === 'complete' ? 'border-green-500/30 bg-green-500/5' :
                        season.status === 'empty' ? 'border-red-500/30 bg-red-500/5' :
                          season.status === 'incomplete' ? 'border-orange-500/30 bg-orange-500/5' :
                            'border-muted'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h5 className="font-semibold">Season {season.season}</h5>
                          {season.airDate && (
                            <span className="text-xs text-muted-foreground">({season.airDate})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {season.localEpisodeCount}/{season.tmdbEpisodeCount ?? '?'}
                          </span>
                          <Badge
                            variant={season.status === 'complete' ? 'default' : 'destructive'}
                            className={
                              season.status === 'complete' ? 'bg-green-600 hover:bg-green-700' :
                                season.status === 'empty' ? '' :
                                  'bg-orange-600 hover:bg-orange-700'
                            }
                          >
                            {season.status === 'complete' ? '✓ Complete' :
                              season.status === 'empty' ? '✗ Empty' :
                                season.status === 'incomplete' ? `${season.completionPercent}%` :
                                  'Unknown'}
                          </Badge>
                        </div>
                      </div>

                      {/* Season progress bar */}
                      {season.tmdbEpisodeCount && (
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${season.status === 'complete' ? 'bg-green-500' :
                              season.status === 'empty' ? 'bg-red-500' :
                                'bg-orange-500'
                              }`}
                            style={{ width: `${Math.min(100, season.completionPercent || 0)}%` }}
                          />
                        </div>
                      )}

                      {/* Missing episodes */}
                      {season.missingEpisodes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-destructive mb-1.5">
                            Missing episodes ({season.missingEpisodes.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {season.missingEpisodes.map((ep: number) => (
                              <span
                                key={ep}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-destructive/15 text-destructive border border-destructive/20"
                              >
                                E{ep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Available episodes (compact) */}
                      {season.localEpisodes.length > 0 && season.status !== 'complete' && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-green-600 mb-1.5">
                            Available ({season.localEpisodes.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {season.localEpisodes.slice(0, 20).map((ep: number) => (
                              <span
                                key={ep}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-green-500/15 text-green-600 border border-green-500/20"
                              >
                                E{ep}
                              </span>
                            ))}
                            {season.localEpisodes.length > 20 && (
                              <span className="text-xs text-muted-foreground">+{season.localEpisodes.length - 20} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t">
                <Button
                  onClick={() => { if (selectedItem) handleManageEpisodes(selectedItem.type, selectedItem.id); }}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Copy ID & Manage Episodes
                </Button>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive opacity-50" />
              <p className="text-destructive">Failed to load content details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Feedback Tab Component
function FeedbackManager() {
  const { userRole } = useContext(AdminContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Success", description: "Feedback updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update feedback", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete feedback");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Success", description: "Feedback deleted successfully" });
    },
  });

  if (isLoading) return <div>Loading feedback...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Feedback</CardTitle>
        <CardDescription>Manage user feedback and suggestions</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>User / Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No feedback found.
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell className="font-medium">{item.subject}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{item.username || "Anonymous"}</span>
                      {item.email && <span className="text-xs text-muted-foreground">{item.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === "resolved" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View / Resolve</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{item.subject}</DialogTitle>
                          <DialogDescription>
                            From {item.username || "Anonymous"} {item.email ? `(${item.email})` : ""} on {new Date(item.createdAt).toLocaleString()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label className="font-semibold text-muted-foreground">Message</Label>
                            <div className="p-4 bg-muted/50 rounded-md border text-sm whitespace-pre-wrap">
                              {item.message}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`adminNote-${item.id}`}>Admin Note (will be sent in email if user provided one)</Label>
                            <Textarea 
                              id={`adminNote-${item.id}`}
                              placeholder="Your response..."
                              defaultValue={item.adminNote || ""}
                              onChange={(e) => {
                                item._draftNote = e.target.value;
                              }}
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex gap-2 sm:justify-between">
                          <div className="flex gap-2">
                            {item.status !== "resolved" && (
                              <Button 
                                onClick={() => updateMutation.mutate({ 
                                  id: item.id, 
                                  updates: { status: "resolved", adminNote: item._draftNote || item.adminNote }
                                })}
                                disabled={updateMutation.isPending}
                              >
                                Mark Resolved & Send Email
                              </Button>
                            )}
                          </div>
                          <DialogTrigger asChild>
                            <Button variant="outline">Close</Button>
                          </DialogTrigger>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {userRole === 'admin' && (
<Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this feedback?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


// TMDB Bulk Import Tab Component
export function TmdbBulkImportTab() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [type, setType] = useState('movie');
  const [pages, setPages] = useState<number>(50);
  const [placeholderUrl, setPlaceholderUrl] = useState('https://drive.google.com/file/d/PLACEHOLDER/preview');
  const [progress, setProgress] = useState<{ checked: number; total: number; currentItem: string; isRunning: boolean }>({ checked: 0, total: 0, currentItem: '', isRunning: false });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/tmdb-bulk/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.isRunning) {
          setIsChecking(true);
          setProgress({ checked: data.checked, total: data.total, currentItem: data.currentItem, isRunning: true });
          startPolling();
        }
      } catch {}
    })();
  }, []);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/tmdb-bulk/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setProgress({ checked: data.checked, total: data.total, currentItem: data.currentItem || '', isRunning: data.isRunning });

        if (!data.isRunning && data.checked > 0) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsChecking(false);
          toast({ title: "Import Complete", description: "The background bulk import task has finished." });
        }
      } catch {}
    }, 2000);
  };

  const runBulkImport = async () => {
    setIsChecking(true);
    setProgress({ checked: 0, total: 0, currentItem: 'Starting...', isRunning: true });
    try {
      const res = await fetch('/api/admin/tmdb-bulk/start', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, pages, placeholderUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start bulk import");
      }

      toast({ title: "Bulk Import Started", description: "Fetching content in the background..." });
      startPolling();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsChecking(false);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.checked / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            TMDB Bulk Import
          </CardTitle>
          <CardDescription>
            Import popular content from TMDB in the background automatically. Skips existing titles and fetches full metadata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="space-y-2 flex-1 max-w-[200px]">
              <Label>Content Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movies</SelectItem>
                  <SelectItem value="show">TV Shows</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full max-w-[150px]">
              <Label>Pages to Fetch</Label>
              <Input
                type="number"
                min="1"
                max="500"
                value={pages}
                onChange={(e: any) => setPages(parseInt(e.target.value) || 50)}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label>Placeholder URL</Label>
              <Input
                value={placeholderUrl}
                onChange={(e: any) => setPlaceholderUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <Button
              onClick={runBulkImport}
              disabled={isChecking}
              className="w-full md:w-auto"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>
          </div>

          {(isChecking || progress.checked > 0) && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span className="font-medium text-foreground truncate max-w-[70%]">
                  {isChecking ? `Processing: ${progress.currentItem}` : progress.currentItem === 'Completed' ? 'Import Finished' : 'Import Stopped'}
                </span>
                <span>{progress.checked} / {progress.total} checked ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={"h-3 rounded-full transition-all duration-500 ease-out " + (isChecking ? 'bg-primary' : 'bg-green-500')}
                  style={{ width: progressPercent + '%' }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function AddAnimeForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    posterUrl: "",
    backdropUrl: "",
    year: new Date().getFullYear(),
    rating: "PG-13",
    imdbRating: "",
    genres: "",
    language: "English",
    duration: 120,
    cast: "",
    directors: "",
    googleDriveUrl: "", // Original link
    audioTracks: "", // For multi-audio
    featured: false,
    trending: false,
    category: "action",
  });

  const createAnimeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/anime", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create anime");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anime"] });
      toast({
        title: "Success",
        description: "Anime added successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add anime",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnimeMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="posterUrl">Poster URL *</Label>
          <Input
            id="posterUrl"
            value={formData.posterUrl}
            onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="backdropUrl">Backdrop URL *</Label>
          <Input
            id="backdropUrl"
            value={formData.backdropUrl}
            onChange={(e) => setFormData({ ...formData, backdropUrl: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (min) *</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating *</Label>
          <Input
            id="rating"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="imdbRating">IMDb Rating</Label>
          <Input
            id="imdbRating"
            value={formData.imdbRating}
            onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
            placeholder="8.5"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language *</Label>
          <Input
            id="language"
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="genres">Genres (comma-separated) *</Label>
        <Input
          id="genres"
          value={formData.genres}
          onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
          placeholder="Action, Thriller, Drama"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cast">Cast (comma-separated)</Label>
        <Input
          id="cast"
          value={formData.cast}
          onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
          placeholder="Actor 1, Actor 2, Actor 3"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="directors">Directors (comma-separated)</Label>
        <Input
          id="directors"
          value={formData.directors}
          onChange={(e) => setFormData({ ...formData, directors: e.target.value })}
          placeholder="Director 1, Director 2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="googleDriveUrl">Google Drive URL *</Label>
        <Input
          id="googleDriveUrl"
          value={formData.googleDriveUrl}
          onChange={(e) => setFormData({ ...formData, googleDriveUrl: e.target.value })}
          placeholder="https://drive.google.com/file/d/..."
          required
        />
      </div>

      <div className="space-y-4 pt-2">
        <AudioTracksInput
          value={formData.audioTracks || ""}
          onChange={(v) => setFormData({ ...formData, audioTracks: v })}
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          />
          <span className="text-sm">Featured</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.trending}
            onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
          />
          <span className="text-sm">Trending</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        <Save className="w-4 h-4 mr-2" />
        Add Anime
      </Button>
    </form>
  );
}

// Edit Anime Form Component

