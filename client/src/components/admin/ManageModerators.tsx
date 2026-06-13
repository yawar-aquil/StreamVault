import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ShieldAlert, ShieldCheck } from "lucide-react";
import { RoleBadge, getUserRole } from "@/components/role-badge";

const CATEGORY_STYLES: Record<string, string> = {
  content: "bg-blue-500/15 text-blue-400",
  user: "bg-purple-500/15 text-purple-400",
  moderation: "bg-orange-500/15 text-orange-400",
  store: "bg-emerald-500/15 text-emerald-400",
  settings: "bg-cyan-500/15 text-cyan-400",
  security: "bg-red-500/15 text-red-400",
  other: "bg-muted text-muted-foreground",
};

export function ManageModerators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logCategory, setLogCategory] = useState<string>("all");

  const { data: moderators = [] } = useQuery({
    queryKey: ["/api/admin/moderators"],
    queryFn: async () => {
      const res = await fetch("/api/admin/moderators", {
        headers: { "x-admin-token": localStorage.getItem("adminToken") || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch moderators");
      return res.json();
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["/api/admin/moderator-logs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/moderator-logs", {
        headers: { "x-admin-token": localStorage.getItem("adminToken") || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    }
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/admin/users/search", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { "x-admin-token": localStorage.getItem("adminToken") || "" }
      });
      if (!res.ok) throw new Error("Failed to search users");
      return res.json();
    }
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/moderators/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("adminToken") || "",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to promote user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderators"] });
      toast({ title: "User promoted to Moderator" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/moderators/demote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("adminToken") || "",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to demote user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderators"] });
      toast({ title: "User demoted from Moderator" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Derived: available categories + filtered/searched logs
  const logCategories = Array.from(new Set((logs as any[]).map((l) => l.category).filter(Boolean)));
  const filteredLogs = (logs as any[]).filter((log) => {
    if (logCategory !== "all" && (log.category || "other") !== logCategory) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        (log.username || "").toLowerCase().includes(q) ||
        (log.action || "").toLowerCase().includes(q) ||
        (log.details || "").toLowerCase().includes(q) ||
        (log.path || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Current Moderators
            </CardTitle>
            <CardDescription>Manage users with moderator access</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moderators.map((mod: any) => (
                  <TableRow key={mod.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {mod.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{mod.username}</p>
                            <RoleBadge role={getUserRole(mod)} />
                          </div>
                          <p className="text-xs text-muted-foreground">{mod.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => demoteMutation.mutate(mod.id)}
                        disabled={demoteMutation.isPending}
                      >
                        Demote
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {moderators.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                      No moderators found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Promote User
            </CardTitle>
            <CardDescription>Search for a user to promote to moderator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults
                .filter((u: any) => !u.isModerator)
                .slice(0, 5)
                .map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.username}</p>
                        <RoleBadge role={getUserRole(user)} />
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => promoteMutation.mutate(user.id)}
                      disabled={promoteMutation.isPending}
                    >
                      Promote
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Moderator Activity Logs
          </CardTitle>
          <CardDescription>Full audit trail of moderator &amp; admin actions</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Search by user, action, details..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={logCategory === "all" ? "default" : "outline"}
                onClick={() => setLogCategory("all")}
              >
                All
              </Button>
              {logCategories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={logCategory === cat ? "default" : "outline"}
                  onClick={() => setLogCategory(cat)}
                  className="capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Moderator</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{log.username}</p>
                          <RoleBadge role={getUserRole(log)} />
                        </div>
                        <p className="text-xs text-muted-foreground">{log.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{log.action}</TableCell>
                    <TableCell>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[log.category || "other"] || CATEGORY_STYLES.other}`}>
                        {log.category || "other"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate" title={`${log.details || ""}${log.path ? ` (${log.method || ""} ${log.path})` : ""}`}>
                      {log.details || (log.path ? <span className="font-mono text-xs">{log.method} {log.path}</span> : "-")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">{log.ipAddress || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {logs.length === 0 ? "No recent moderator activity" : "No logs match your filters"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
