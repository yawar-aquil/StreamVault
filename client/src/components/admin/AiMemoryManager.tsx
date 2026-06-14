import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Loader2, RefreshCw, Search } from "lucide-react";

interface MemoryListItem {
  userId: string;
  username: string;
  avatarUrl: string | null;
  size: number;
  updatedAt: string;
}

const authHeaders = () => ({ "x-admin-token": localStorage.getItem("adminToken") || "" });

export function AiMemoryManager() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: memories = [], isLoading, refetch, isFetching } = useQuery<MemoryListItem[]>({
    queryKey: ["/api/admin/ai-memory"],
    queryFn: async () => {
      const res = await fetch("/api/admin/ai-memory", { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AI memory");
      return res.json();
    },
  });

  const { data: detail, isLoading: detailLoading } = useQuery<{ content: string; username: string | null }>({
    queryKey: ["/api/admin/ai-memory", selected],
    enabled: !!selected,
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-memory/${selected}`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch memory");
      return res.json();
    },
  });

  const filtered = memories.filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> Vault AI Memory
            </CardTitle>
            <CardDescription>
              What the AI assistant has learned about each user — interests, tastes & chat style.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : memories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No AI memory profiles yet. They're created automatically as logged-in users chat with Vault AI.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* User list */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
                {filtered.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => setSelected(m.userId)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      selected === m.userId ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/60"
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={m.avatarUrl || undefined} />
                      <AvatarFallback>{m.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.username}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Updated {new Date(m.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Memory detail */}
            <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[200px]">
              {!selected ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Select a user to view what Vault AI remembers about them.
                </p>
              ) : detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
                  {detail?.content || "(empty)"}
                </pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
