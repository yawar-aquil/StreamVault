import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Loader2, Zap, Globe, Cloud, Check } from "lucide-react";

type StreamMode = "direct" | "vps" | "vps-cached";

const MODES: Array<{
    value: StreamMode;
    label: string;
    tagline: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    pros: string[];
    cons: string[];
}> = [
        {
            value: "direct",
            label: "Direct (archive.org)",
            tagline: "Zero cost — highest buffering",
            description:
                "Videos load straight from archive.org. No VPS bandwidth used. Viewers in India see significant buffering because archive.org's US CDN is slow and throttled per connection.",
            icon: Globe,
            pros: ["$0 bandwidth cost", "Works for logged-out visitors"],
            cons: ["High buffering for Indian viewers", "Exposes archive.org URLs"],
        },
        {
            value: "vps",
            label: "VPS Proxy (fastest)",
            tagline: "Fastest — full VPS bandwidth cost",
            description:
                "Routes video through the Mumbai VPS. Your VPS has a fat pipe to archive.org so playback is smooth, but every byte every viewer watches counts as VPS egress. No Cloudflare caching. Only available to logged-in users.",
            icon: Zap,
            pros: ["Smoothest playback", "Masks archive.org URLs"],
            cons: [
                "Full AWS egress ~$0.09/GB",
                "Cost scales linearly with viewers",
            ],
        },
        {
            value: "vps-cached",
            label: "VPS + Cloudflare Cache",
            tagline: "Best balance — needs CF Page Rule",
            description:
                "Routes through VPS with Cache-Control headers so Cloudflare caches chunks at its edge. First viewer per chunk pays VPS egress; subsequent viewers are served from Cloudflare for free. Requires a Page Rule in the Cloudflare dashboard (see note below). Only available to logged-in users.",
            icon: Cloud,
            pros: [
                "Fast playback",
                "Bandwidth cost scales per-video, not per-viewer",
            ],
            cons: [
                "Needs CF Page Rule setup once",
                "First viewer still pays egress",
            ],
        },
    ];

export function StreamingModeManager() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [pending, setPending] = useState<StreamMode | null>(null);

    const { data, isLoading } = useQuery<{ mode: StreamMode }>({
        queryKey: ["/api/admin/stream-mode"],
        queryFn: async () => {
            const res = await fetch("/api/admin/stream-mode", {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed to load stream mode");
            return res.json();
        },
    });

    const mutation = useMutation({
        mutationFn: async (mode: StreamMode) => {
            const res = await fetch("/api/admin/stream-mode", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ mode }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Failed" }));
                throw new Error(err.error || "Failed to update stream mode");
            }
            return res.json() as Promise<{ mode: StreamMode }>;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["/api/admin/stream-mode"] });
            qc.invalidateQueries({ queryKey: ["/api/config/stream-mode"] });
            toast({
                title: "Stream mode updated",
                description: `Now using "${data.mode}" for all viewers.`,
            });
            setPending(null);
        },
        onError: (err: Error) => {
            toast({
                title: "Update failed",
                description: err.message,
                variant: "destructive",
            });
            setPending(null);
        },
    });

    const current = data?.mode;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Streaming Mode</CardTitle>
                    <CardDescription>
                        Controls how video playback is delivered to viewers. Changes take
                        effect instantly for all users. Proxied modes (VPS / VPS+CF) are
                        only served to logged-in users; anonymous visitors always get
                        direct archive.org.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading current mode...
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-3">
                            {MODES.map((m) => {
                                const Icon = m.icon;
                                const active = current === m.value;
                                const busy = pending === m.value && mutation.isPending;
                                return (
                                    <div
                                        key={m.value}
                                        className={`relative border rounded-lg p-4 transition-colors ${active
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/40"
                                            }`}
                                    >
                                        {active && (
                                            <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-primary font-medium">
                                                <Check className="h-3 w-3" />
                                                Active
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className="h-5 w-5 text-primary" />
                                            <h3 className="font-semibold">{m.label}</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                            {m.tagline}
                                        </p>
                                        <p className="text-sm mb-3 leading-relaxed">
                                            {m.description}
                                        </p>
                                        <div className="space-y-1 mb-3 text-xs">
                                            {m.pros.map((p) => (
                                                <div
                                                    key={p}
                                                    className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400"
                                                >
                                                    <span>+</span>
                                                    <span>{p}</span>
                                                </div>
                                            ))}
                                            {m.cons.map((c) => (
                                                <div
                                                    key={c}
                                                    className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400"
                                                >
                                                    <span>−</span>
                                                    <span>{c}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={active ? "secondary" : "default"}
                                            disabled={active || busy}
                                            onClick={() => {
                                                setPending(m.value);
                                                mutation.mutate(m.value);
                                            }}
                                            className="w-full"
                                        >
                                            {busy ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : active ? (
                                                "Currently active"
                                            ) : (
                                                "Switch to this mode"
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <CacheDiagnostic />
        </div>
    );
}

interface DiagnoseResult {
    mode: string;
    domain: string;
    cfInPath: boolean;
    cacheHeaderOk: boolean;
    cached: boolean;
    verdict: string;
    first: {
        status: number;
        cfCacheStatus: string | null;
        cfRay: string | null;
        cacheControl: string | null;
        server: string | null;
    };
    second: {
        status: number;
        cfCacheStatus: string | null;
        cfRay: string | null;
        cacheControl: string | null;
        server: string | null;
    };
}

function CacheDiagnostic() {
    const { toast } = useToast();
    const [results, setResults] = useState<Record<string, DiagnoseResult | string>>({});
    const [running, setRunning] = useState<string | null>(null);

    const runFor = async (domain: string) => {
        setRunning(domain);
        try {
            const res = await fetch(
                `/api/admin/stream-mode/diagnose?domain=${encodeURIComponent(domain)}`,
                { headers: getAuthHeaders() }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Diagnostic failed");
            setResults((r) => ({ ...r, [domain]: json }));
        } catch (err: any) {
            setResults((r) => ({ ...r, [domain]: err.message }));
            toast({
                title: "Diagnostic error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setRunning(null);
        }
    };

    const domains = ["streamvault.live", "streamvault.in"];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Cloudflare Cache Diagnostic</CardTitle>
                <CardDescription>
                    Tests whether Cloudflare is caching <code>/api/stream*</code>{" "}
                    responses. Run this after flipping to "VPS + CF" mode and setting up
                    the Page Rule. No DevTools needed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {domains.map((d) => {
                    const result = results[d];
                    const isString = typeof result === "string";
                    const r = !isString ? (result as DiagnoseResult) : null;
                    return (
                        <div key={d} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <code className="text-sm font-medium">{d}</code>
                                <Button
                                    size="sm"
                                    disabled={running === d}
                                    onClick={() => runFor(d)}
                                >
                                    {running === d ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        "Test caching"
                                    )}
                                </Button>
                            </div>
                            {isString && (
                                <p className="text-sm text-destructive">
                                    Error: {result as string}
                                </p>
                            )}
                            {r && (
                                <div className="space-y-1 text-sm">
                                    <p
                                        className={
                                            r.cached
                                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                                : "text-amber-600 dark:text-amber-400"
                                        }
                                    >
                                        {r.verdict}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2 text-muted-foreground">
                                        <span>1st cf-cache-status:</span>
                                        <span>{r.first.cfCacheStatus || "—"}</span>
                                        <span>2nd cf-cache-status:</span>
                                        <span>{r.second.cfCacheStatus || "—"}</span>
                                        <span>cf-ray:</span>
                                        <span className="truncate">
                                            {r.first.cfRay || "—"}
                                        </span>
                                        <span>cache-control:</span>
                                        <span className="truncate">
                                            {r.first.cacheControl || "—"}
                                        </span>
                                        <span>status:</span>
                                        <span>
                                            {r.first.status} / {r.second.status}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <details className="text-sm text-muted-foreground">
                    <summary className="cursor-pointer">
                        Cloudflare Page Rule setup (if not done yet)
                    </summary>
                    <div className="mt-2 space-y-2 pl-2">
                        <ol className="list-decimal list-inside space-y-1">
                            <li>CF dashboard → your domain → <b>Rules → Page Rules</b></li>
                            <li>
                                URL pattern:{" "}
                                <code className="bg-muted px-1 rounded">
                                    yourdomain.com/api/stream*
                                </code>
                            </li>
                            <li>Setting: <b>Cache Level → Cache Everything</b></li>
                            <li>Setting: <b>Edge Cache TTL → a month</b></li>
                            <li>Save &amp; Deploy. Repeat for each domain.</li>
                        </ol>
                    </div>
                </details>
            </CardContent>
        </Card>
    );
}
