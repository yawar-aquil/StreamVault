import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ShieldAlert } from "lucide-react";
import { RoleBadge, getUserRole } from "@/components/role-badge";

export function ManageAdmins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: admins = [] } = useQuery({
    queryKey: ["/api/admin/admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/admins", {
        headers: { "x-admin-token": localStorage.getItem("adminToken") || "" }
      });
      if (!res.ok) throw new Error("Failed to fetch admins");
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
      const res = await fetch("/api/admin/admins/promote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("adminToken") || "",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to promote user to admin");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "User promoted to Admin" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/admins/demote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("adminToken") || "",
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to demote admin");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "User removed from Admins" });
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
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Current Admins
            </CardTitle>
            <CardDescription>Manage users with full administrator access</CardDescription>
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
                {admins.map((admin: any) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                          {admin.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium">{admin.username}</p>
                            <RoleBadge role={getUserRole(admin)} />
                          </div>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => demoteMutation.mutate(admin.id)}
                        disabled={demoteMutation.isPending || admins.length <= 1}
                        title={admins.length <= 1 ? "Cannot remove the last admin" : undefined}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                      No admins found
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
            <CardDescription>Search for a user to grant administrator access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults
                .filter((u: any) => !u.isAdmin)
                .slice(0, 5)
                .map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <div>
                      <div className="flex items-center gap-1">
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
                      Make Admin
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
