import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Download, Trash2, Info, CheckCircle, Languages } from "lucide-react";
import type { Show, Movie, Anime, BlogPost } from "@shared/schema";
import { getAuthHeaders } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

interface SubtitleManagerProps {
  shows: Show[];
  movies: Movie[];
  anime: Anime[];
}

export function SubtitleManager({ shows, movies, anime }: SubtitleManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contentType, setContentType] = useState<"movie" | "show" | "anime">("movie");
  const [selectedId, setSelectedId] = useState<string>("");
  const [season, setSeason] = useState<string>("");
  const [episode, setEpisode] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [customImdbId, setCustomImdbId] = useState<string>("");

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch blog posts to extract IMDB IDs automatically
  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  // Fetch episodes when a show or anime is selected
  const { data: getEpisodes = [] } = useQuery<any[]>({
    queryKey: [`/api/${contentType === 'show' ? 'shows' : 'anime'}/${selectedId}/episodes`],
    enabled: (contentType === "show" || contentType === "anime") && !!selectedId,
  });

  // Auto-detect IMDB ID when content changes
  useEffect(() => {
    if (!selectedId) {
      setCustomImdbId("");
      return;
    }

    const post = blogPosts.find(p => p.contentId === selectedId);
    if (post && post.externalLinks) {
      try {
        const links = typeof post.externalLinks === 'string' ? JSON.parse(post.externalLinks) : post.externalLinks;
        if (links?.imdb) {
          const match = links.imdb.match(/tt\d+/);
          if (match) {
            setCustomImdbId(match[0]);
            return;
          }
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
    setCustomImdbId("");
  }, [selectedId, blogPosts]);

  // Reset season/episode when changing selected show
  useEffect(() => {
    setSeason("");
    setEpisode("");
    setSearchResults([]);
    setHasSearched(false);
  }, [selectedId, contentType]);


  // Current saved subtitles query
  const { data: savedSubtitles = [], refetch: refetchSaved } = useQuery({
    queryKey: ["/api/subtitles/saved", customImdbId, season, episode],
    queryFn: async () => {
      if (!customImdbId) return { subtitles: [] };
      const url = new URL(window.location.origin + "/api/subtitles/saved");
      url.searchParams.append("imdbId", customImdbId);
      if (season) url.searchParams.append("season", season);
      if (episode) url.searchParams.append("episode", episode);
      
      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch saved subtitles");
      return res.json();
    },
    enabled: !!customImdbId,
  });

  const handleSearch = async () => {
    if (!customImdbId) {
      toast({ title: "IMDB ID required", description: "Please enter an IMDB ID or select content that has one.", variant: "destructive" });
      return;
    }
    if ((contentType === "show" || contentType === "anime") && (!season || !episode)) {
      toast({ title: "Season and Episode required", description: "Please specify the season and episode number.", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const url = new URL(window.location.origin + "/api/admin/subtitles/search");
      url.searchParams.append("imdbId", customImdbId);
      url.searchParams.append("language", language);
      if (season) url.searchParams.append("season", season);
      if (episode) url.searchParams.append("episode", episode);

      const res = await fetch(url.toString(), { headers: getAuthHeaders() });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Search failed");
      
      setSearchResults(data.subtitles || []);
      if (data.subtitles?.length === 0) {
        toast({ title: "No subtitles found", description: "Try another language or check the IMDB ID." });
      }
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, lang }: { file: File, lang: string }) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Content = e.target?.result as string;
            const res = await fetch("/api/admin/subtitles/upload", {
              method: "POST",
              headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imdbId: customImdbId,
                season: season ? parseInt(season) : undefined,
                episode: episode ? parseInt(episode) : undefined,
                language: lang,
                fileName: file.name,
                fileContent: base64Content
              })
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to upload subtitle");
            }
            resolve(await res.json());
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Subtitle uploaded and assigned to content!" });
      setUploadFile(null);
      refetchSaved();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to upload subtitle", variant: "destructive" });
    }
  });

  const handleUpload = () => {
    if (!customImdbId || !uploadFile) return;
    if ((contentType === "show" || contentType === "anime") && (!season || !episode)) return;
    uploadMutation.mutate({ file: uploadFile, lang: language });
  };

  const saveMutation = useMutation({
    mutationFn: async (subtitleUrl: string) => {
      const res = await fetch("/api/admin/subtitles/save", {
        method: "POST",
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imdbId: customImdbId,
          season: season ? parseInt(season) : undefined,
          episode: episode ? parseInt(episode) : undefined,
          language,
          subtitleUrl
        })
      });
      if (!res.ok) throw new Error("Failed to save subtitle");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Subtitle saved and assigned to content!" });
      refetchSaved();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save subtitle", variant: "destructive" });
    }
  });

  const getOptions = () => {
    if (contentType === 'movie') return movies;
    if (contentType === 'show') return shows;
    return anime;
  };

  const options = getOptions();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            Subtitle Manager
          </CardTitle>
          <CardDescription>
            Download and assign persistent subtitle files to movies, shows, and anime.
            There can only be one subtitle per language per content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={(val: any) => { setContentType(val); setSelectedId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="show">TV Show</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Select {contentType === 'movie' ? 'Movie' : contentType === 'show' ? 'Show' : 'Anime'}</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose content..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>IMDB ID (Required)</Label>
              <Input 
                value={customImdbId} 
                onChange={(e) => setCustomImdbId(e.target.value)} 
                placeholder="e.g. tt1234567" 
                className={!customImdbId && selectedId ? "border-red-500" : ""}
              />
              {!customImdbId && selectedId && (
                <p className="text-xs text-red-500">Could not auto-detect IMDB ID. Please enter manually.</p>
              )}
            </div>

            {(contentType === "show" || contentType === "anime") && (
              <>
                <div className="space-y-2">
                  <Label>Season</Label>
                  <Input type="number" min="1" value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 1" />
                </div>
                <div className="space-y-2">
                  <Label>Episode</Label>
                  <Input type="number" min="1" value={episode} onChange={(e) => setEpisode(e.target.value)} placeholder="e.g. 1" />
                </div>
                {/* Visual helper to show episodes available for selected content */}
                <div className="space-y-2 text-xs text-muted-foreground lg:col-span-2">
                  {getEpisodes.length > 0 ? (
                    <p>Found {getEpisodes.length} episodes for this series.</p>
                  ) : selectedId && (
                    <p>No episodes found for this series yet.</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 border-t border-border/50 pt-6">
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="search">Search Providers</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <p className="text-sm text-muted-foreground flex-1">
                    Search external APIs (OpenSubtitles, SubDL) for matching subtitles automatically.
                  </p>
                  <Button 
                      onClick={handleSearch} 
                      className="w-full md:w-auto shrink-0"
                      disabled={isSearching || !customImdbId || ((contentType === "show" || contentType === "anime") && (!season || !episode))}
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Search Providers
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <p className="text-sm text-muted-foreground flex-1">
                    Manually upload a <code>.srt</code> or <code>.vtt</code> file from your computer. Excellent for reliability!
                  </p>
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <Input 
                        type="file" 
                        accept=".srt,.vtt,.txt" 
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="flex-1 max-w-[250px] cursor-pointer"
                    />
                    <Button 
                        onClick={handleUpload} 
                        className="whitespace-nowrap"
                        disabled={uploadMutation.isPending || !uploadFile || !customImdbId || ((contentType === "show" || contentType === "anime") && (!season || !episode))}
                    >
                      {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Upload"}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Current Saved Subtitles for this target */}
      {selectedId && customImdbId && (contentType === 'movie' || (season && episode)) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-4">
            <CardTitle className="text-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Assigned Subtitles for this Content
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 pb-4">
            {savedSubtitles?.subtitles?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedSubtitles.subtitles.map((sub: any, i: number) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1 flex items-center gap-1">
                    {sub.language.toUpperCase()}
                    <span title={sub.url}>
                      <Info className="w-3 h-3 ml-1 opacity-50 text-muted-foreground" />
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subtitles assigned yet. Use search below to assign one.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              Select the best subtitle file to download and link to this content permanently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 && !isSearching ? (
              <div className="text-center p-8 border rounded text-muted-foreground bg-muted/20">
                No results found.
              </div>
            ) : (
             <div className="space-y-2">
                {searchResults.map((sub, i) => (
                  <div key={sub.id || i} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        Format: {sub.format.toUpperCase()} | Provider: {sub.provider}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 truncate max-w-[300px] md:max-w-[500px]" title={sub.url}>
                        {subUrlToFilename(sub.url)}
                      </span>
                      {sub.hearingImpaired && (
                        <Badge variant="outline" className="mt-1 w-fit text-xs border-orange-500/50 text-orange-500">
                          Hearing Impaired (HI)
                        </Badge>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => saveMutation.mutate(sub.url)}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Save to Server
                    </Button>
                  </div>
                ))}
            </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper to make display URL look nicer
function subUrlToFilename(url: string) {
  try {
    const parts = url.split('/');
    return parts[parts.length - 1];
  } catch(e) {
    return url;
  }
}
