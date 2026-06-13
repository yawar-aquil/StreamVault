import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ShieldAlert, ShieldCheck } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";

export function ManageModerators() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

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
                            <RoleBadge role={mod.username.toLowerCase() === "admin" ? "admin" : "moderator"} />
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
                        <RoleBadge role={user.username.toLowerCase() === "admin" ? "admin" : (user as any).isModerator ? "moderator" : null} />
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
          <CardDescription>Recent actions performed by moderators</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moderator</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{log.username}</p>
                        <RoleBadge role={log.username.toLowerCase() === "admin" ? "admin" : (log as any).isModerator ? "moderator" : null} />
                      </div>
                      <p className="text-xs text-muted-foreground">{log.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate" title={log.details}>
                    {log.details || "-"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No recent moderator activity
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
