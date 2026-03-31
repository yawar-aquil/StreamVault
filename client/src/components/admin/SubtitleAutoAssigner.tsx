import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Loader2, PlayCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SubtitleAutoAssigner() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [contentType, setContentType] = useState<'all' | 'movies' | 'shows' | 'anime'>('all');
  const [language, setLanguage] = useState<string>('en');
  const [jobState, setJobState] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Check if a scan is already running on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/subtitles/auto-assign/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.status === 'running') {
          setIsChecking(true);
          setJobState(data);
          startPolling();
        } else if (data.status === 'done' || data.status === 'error') {
          setJobState(data);
        }
      } catch {}
    })();
  }, []);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/subtitles/auto-assign/status', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        
        setJobState(data);

        if (data.status === 'done' || data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsChecking(false);
          
          if (data.status === 'done') {
             toast({ 
                title: "Auto-Assign Complete", 
                description: `Successfully assigned ${data.assignedCount} subtitles out of ${data.total} items checked.`, 
                variant: "default" 
             });
          } else {
             toast({ 
                title: "Auto-Assign Failed", 
                description: data.error || "An unknown error occurred during assignment.", 
                variant: "destructive" 
             });
          }
        }
      } catch {}
    }, 2000); // poll every 2 seconds
  };

  const handleStart = async () => {
    if (isChecking) return;
    setIsChecking(true);
    
    try {
      const res = await fetch('/api/admin/subtitles/auto-assign/start', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contentType, language })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start assignment");
      
      toast({ title: "Auto-Assign Started", description: "Background job has been initiated." });
      setJobState({ status: 'running', checked: 0, total: 0, assignedCount: 0, failedCount: 0 });
      startPolling();
    } catch (err: any) {
      toast({ title: "Start Failed", description: err.message, variant: "destructive" });
      setIsChecking(false);
    }
  };

  const calcProgress = () => {
      if (!jobState || jobState.total === 0) return 0;
      return Math.round((jobState.checked / jobState.total) * 100);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Bulk Subtitle Auto-Assigner</CardTitle>
        <CardDescription>
          Automatically search and download the best available subtitles for your library in the background. Note: This process sends requests sequentially with a 1-second delay to avoid rate limiting from subtitle providers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Target Content</Label>
            <Select 
              value={contentType} 
              onValueChange={(val: any) => setContentType(val)}
              disabled={isChecking}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire Library</SelectItem>
                <SelectItem value="movies">Movies Only</SelectItem>
                <SelectItem value="shows">Show Episodes Only</SelectItem>
                <SelectItem value="anime">Anime Episodes Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Language Code (e.g. 'en', 'es', 'fr')</Label>
            <Input 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isChecking}
              placeholder="en"
            />
          </div>
        </div>

        {jobState && (
          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <div className="flex justify-between items-center text-sm font-medium">
              <span>Status: <span className={
                  jobState.status === 'running' ? 'text-primary animate-pulse' : 
                  jobState.status === 'done' ? 'text-green-500' : 'text-red-500'
              }>{jobState.status.toUpperCase()}</span></span>
              <span>{calcProgress()}%</span>
            </div>
            
            <Progress value={calcProgress()} className="h-2" />
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-2">
               <div>Total Items: <span className="font-semibold text-foreground">{jobState.total || 0}</span></div>
               <div>Processed: <span className="font-semibold text-foreground">{jobState.checked || 0}</span></div>
               <div>Assigned: <span className="font-semibold text-green-500">{jobState.assignedCount || 0}</span></div>
               <div>Failed/Missing: <span className="font-semibold text-orange-500">{jobState.failedCount || 0}</span></div>
            </div>

            {jobState.status === 'done' && (
                <Alert className="mt-4 bg-green-500/10 text-green-600 border-none">
                   <Info className="h-4 w-4 shrink-0 mr-2 opacity-50 text-green-600" />
                   <AlertTitle>Job Completed successfully</AlertTitle>
                   <AlertDescription className="text-xs">
                     Finished checking {jobState.total} items. Downloaded {jobState.assignedCount} new subtitles. It's safe to run this again anytime.
                   </AlertDescription>
                </Alert>
            )}
             {jobState.error && (
                 <div className="p-3 bg-red-500/10 text-red-500 text-sm mt-3 rounded-md line-clamp-2">
                   {jobState.error}
                 </div>
             )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={handleStart} disabled={isChecking || !language} className="w-full sm:w-auto">
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning Subtitles...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Auto-Assigner
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
