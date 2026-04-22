import { useState, useEffect, useMemo, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
    Download,
    Film,
    Tv,
    Shield,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Zap,
    Lock,
    ExternalLink,
    Sparkles,
    Crown,
    Users,
    Instagram,
    Twitter,
    Send,
    Facebook,
    Loader2,
    RotateCcw,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    AdContainer,
    Banner300x250,
    Banner160x600,
    Banner728x90,
    Banner320x50,
    NativeBanner,
    SmartlinkButton,
} from "@/components/ad-manager";
import { HCaptcha, useHCaptchaVerify } from "@/components/hcaptcha";
import { useAuth } from "@/contexts/auth-context";
import { getSafeDownloadUrl, sanitizeFilename, redirectToAdDomainIfNeeded } from "@/lib/utils";
import type { Show, Episode, Movie, Anime, AnimeEpisode } from "@shared/schema";

type ContentType = "movie" | "show" | "anime";

const SMARTLINK_URL =
    "https://openairtowhardworking.com/r52n12yhee?key=c9e42e6265a0e4becf4bde3064060d5e";
const COUNTDOWN_SECONDS = 10;

// Minimum CUMULATIVE hidden time the user must spend on a social page before we
// credit the follow. Works via the Page Visibility API — we track how long
// the download tab was actually hidden (not just elapsed since click, because
// some browsers delay the tab switch by ~300-500ms which eats into budget).
const SOCIAL_MIN_DWELL_MS = 5_000;

// Social accounts — user must follow all to unlock the download
const SOCIAL_ACCOUNTS = [
    { id: "twitter", label: "X (Twitter)", url: "https://twitter.streamvault.in", icon: Twitter, color: "bg-black" },
    { id: "instagram", label: "Instagram", url: "https://instagram.streamvault.in", icon: Instagram, color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" },
    { id: "telegram", label: "Telegram", url: "https://telegram.streamvault.in", icon: Send, color: "bg-blue-500" },
    { id: "facebook", label: "Facebook", url: "https://facebook.streamvault.in", icon: Facebook, color: "bg-blue-600" },
    {
        id: "whatsapp",
        label: "WhatsApp",
        url: "https://whatsapp.streamvault.in",
        icon: () => (
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M20.52 3.48A11.77 11.77 0 0 0 12 0 11.94 11.94 0 0 0 .24 11.76 11.74 11.74 0 0 0 2.4 18.6L0 24l5.64-2.4A12.06 12.06 0 0 0 12 24h.01A11.93 11.93 0 0 0 24 12a11.8 11.8 0 0 0-3.48-8.52ZM12 21.8h-.01a9.76 9.76 0 0 1-4.98-1.37l-.36-.21-3.35 1.43L4 18.5l-.24-.38A9.77 9.77 0 0 1 2.2 12 9.8 9.8 0 0 1 12 2.2 9.72 9.72 0 0 1 21.8 12 9.78 9.78 0 0 1 12 21.8Z" />
            </svg>
        ),
        color: "bg-green-500",
    },
] as const;

type Stage = "captcha" | "social" | "initial" | "countdown" | "ready";

export default function DownloadGateway() {
    // -------------------------------------------------------------
    // Cross-domain redirect — must happen FIRST before anything else.
    // If user is on a non-ad domain (.live), send them to the ad
    // domain (.in) so ads and gating earn revenue.
    // -------------------------------------------------------------
    const [redirecting, setRedirecting] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        // Check synchronously; redirect inside useEffect to avoid SSR issues
        const { hostname } = window.location;
        return !(hostname.includes("streamvault.in") || hostname === "localhost" || hostname === "127.0.0.1");
    });

    useEffect(() => {
        if (redirectToAdDomainIfNeeded()) {
            setRedirecting(true);
        }
    }, []);

    const [, params] = useRoute("/download/:type/:slug");
    const type = (params?.type as ContentType) || "movie";
    const slug = params?.slug;

    const searchParams = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
    );
    const seasonParam = parseInt(searchParams.get("season") || "1");
    const episodeParam = parseInt(searchParams.get("episode") || "1");

    // -------------------------------------------------------------
    // Auth → premium detection
    // -------------------------------------------------------------
    const { user } = useAuth();
    const isPremium = !!(user?.adFreeUntil && new Date(user.adFreeUntil) > new Date());

    // -------------------------------------------------------------
    // Fetch content depending on type
    // -------------------------------------------------------------
    const { data: movie } = useQuery<Movie>({
        queryKey: [`/api/movies/${slug}`],
        enabled: type === "movie" && !!slug && !redirecting,
    });

    const { data: show } = useQuery<Show>({
        queryKey: ["/api/shows", slug],
        enabled: type === "show" && !!slug && !redirecting,
    });

    const { data: anime } = useQuery<Anime>({
        queryKey: ["/api/anime", slug],
        enabled: type === "anime" && !!slug && !redirecting,
    });

    const { data: showEpisodes } = useQuery<Episode[]>({
        queryKey: ["/api/episodes", show?.id],
        enabled: type === "show" && !!show?.id,
    });

    const { data: animeEpisodes } = useQuery<AnimeEpisode[]>({
        queryKey: ["/api/anime-episodes", anime?.id],
        enabled: type === "anime" && !!anime?.id,
    });

    // -------------------------------------------------------------
    // Resolve the item to be downloaded
    // -------------------------------------------------------------
    const showEp = showEpisodes?.find(
        (e) => e.season === seasonParam && e.episodeNumber === episodeParam
    );
    const animeEp = animeEpisodes?.find(
        (e) => e.season === seasonParam && e.episodeNumber === episodeParam
    );

    const content = type === "movie" ? movie : type === "show" ? show : anime;
    const episodeData = type === "show" ? showEp : type === "anime" ? animeEp : null;

    const title = content?.title || "Loading...";
    const poster = content?.posterUrl;
    const year = content?.year;
    const rating = content?.imdbRating;
    const sourceUrl =
        type === "movie"
            ? movie?.googleDriveUrl
            : episodeData?.videoUrl || episodeData?.googleDriveUrl;

    const episodeLabel =
        type === "movie"
            ? ""
            : `S${seasonParam} E${episodeParam}${episodeData?.title ? ` – ${episodeData.title}` : ""}`;

    const filename = sanitizeFilename(
        type === "movie"
            ? `${content?.title || "movie"}-${year || ""}`.trim()
            : `${content?.title || type}-S${seasonParam}E${episodeParam}`
    );

    // -------------------------------------------------------------
    // Multi-step monetization gate
    // -------------------------------------------------------------
    const [stage, setStage] = useState<Stage>("captcha");
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [captchaVerifying, setCaptchaVerifying] = useState(false);
    const [captchaError, setCaptchaError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const { verifyToken } = useHCaptchaVerify();

    // Per-social verification status
    type SocialStatus = "idle" | "pending" | "verified" | "failed";
    const [socialStatus, setSocialStatus] = useState<Record<string, SocialStatus>>(
        () => Object.fromEntries(SOCIAL_ACCOUNTS.map((s) => [s.id, "idle"])) as Record<string, SocialStatus>
    );
    // The social the user clicked most recently — tracked via ref because the
    // visibilitychange event handler is registered once and needs the latest value.
    const pendingSocialRef = useRef<{ id: string; clickedAt: number } | null>(null);
    const [pendingSocialId, setPendingSocialId] = useState<string | null>(null);
    // Countdown tick interval ref
    const countdownIntervalRef = useRef<number | null>(null);
    // Remaining seconds shown on the pending button (null = no countdown active)
    const [pendingCountdown, setPendingCountdown] = useState<number | null>(null);

    // -------------------------------------------------------------
    // Captcha handling
    // -------------------------------------------------------------
    const handleCaptchaVerify = async (token: string) => {
        setCaptchaToken(token);
        setCaptchaVerifying(true);
        setCaptchaError(null);
        try {
            const ok = await verifyToken(token);
            if (ok) {
                setStage("social");
            } else {
                setCaptchaError("Verification failed. Please try again.");
                setCaptchaToken(null);
            }
        } catch {
            setCaptchaError("Verification failed. Please try again.");
            setCaptchaToken(null);
        } finally {
            setCaptchaVerifying(false);
        }
    };

    // -------------------------------------------------------------
    // Social follow handling — return-tab verification
    // -------------------------------------------------------------
    const verifiedSocialCount = useMemo(
        () => Object.values(socialStatus).filter((s) => s === "verified").length,
        [socialStatus]
    );
    const allSocialsVerified = verifiedSocialCount >= SOCIAL_ACCOUNTS.length;

    // Clean up any in-flight intervals on unmount
    useEffect(() => () => {
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    }, []);

    const handleSocialClick = (id: string, url: string) => {
        const status = socialStatus[id];
        if (status === "verified" || status === "pending") return;

        // Block clicking another social while one is already counting down
        if (pendingSocialRef.current) return;

        const clickedAt = Date.now();
        pendingSocialRef.current = { id, clickedAt };
        setPendingSocialId(id);
        setSocialStatus((prev) => ({ ...prev, [id]: "pending" }));
        setPendingCountdown(Math.ceil(SOCIAL_MIN_DWELL_MS / 1000));

        // Open in a new tab. We deliberately DON'T use popup-mode window features
        // because Instagram/Facebook/WhatsApp all detect popup contexts and
        // auto-close the window, which would cause false failures. A normal
        // new tab works reliably across every platform.
        try {
            window.open(url, "_blank", "noopener,noreferrer");
        } catch {
            // If blocked entirely, still let the countdown run — user can manually visit the URL
        }

        // Tick every 250ms — update the visible countdown, and auto-verify
        // when the minimum dwell time has elapsed.
        if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = window.setInterval(() => {
            const pending = pendingSocialRef.current;
            if (!pending || pending.id !== id) {
                // Pending got cleared elsewhere — stop ticking
                if (countdownIntervalRef.current) {
                    window.clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
                return;
            }

            const elapsed = Date.now() - pending.clickedAt;
            const remainingMs = SOCIAL_MIN_DWELL_MS - elapsed;

            if (remainingMs <= 0) {
                // Dwell time reached — auto-verify
                window.clearInterval(countdownIntervalRef.current!);
                countdownIntervalRef.current = null;

                setSocialStatus((prev) => ({ ...prev, [id]: "verified" }));
                pendingSocialRef.current = null;
                setPendingSocialId(null);
                setPendingCountdown(null);
            } else {
                setPendingCountdown(Math.ceil(remainingMs / 1000));
            }
        }, 250);
    };

    const handleSocialContinue = () => {
        if (!allSocialsVerified) return;
        setStage("initial");
    };

    // -------------------------------------------------------------
    // Countdown
    // -------------------------------------------------------------
    useEffect(() => {
        if (stage !== "countdown") return;
        if (countdown <= 0) {
            setStage("ready");
            return;
        }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [stage, countdown]);

    const handleGenerateLink = () => {
        // Open Smartlink in a new tab (revenue)
        window.open(SMARTLINK_URL, "_blank", "noopener,noreferrer");
        setStage("countdown");
        setCountdown(COUNTDOWN_SECONDS);
    };

    // -------------------------------------------------------------
    // Actual download trigger (used by both premium fast-track and free flow)
    // -------------------------------------------------------------
    const startDownload = (withSmartlink: boolean) => {
        if (!sourceUrl) return;
        if (withSmartlink) {
            // Extra popunder for revenue (free users only)
            window.open(SMARTLINK_URL, "_blank", "noopener,noreferrer");
        }
        const safeUrl = getSafeDownloadUrl(sourceUrl, filename);
        const a = document.createElement("a");
        a.href = safeUrl;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDownload = () => startDownload(true);
    const handlePremiumDownload = () => startDownload(false);

    // -------------------------------------------------------------
    // Back link + progress + icon
    // -------------------------------------------------------------
    const backUrl = useMemo(() => {
        if (type === "movie") return `/movie/${slug}`;
        if (type === "show") return `/show/${slug}`;
        return `/anime/${slug}`;
    }, [type, slug]);

    // Progress across the free flow (captcha → social → initial → countdown → ready)
    const progressValue = useMemo(() => {
        switch (stage) {
            case "captcha": return 0;
            case "social": return 25;
            case "initial": return 50;
            case "countdown":
                return 50 + Math.round(((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 40);
            case "ready": return 100;
            default: return 0;
        }
    }, [stage, countdown]);

    const TypeIcon = type === "movie" ? Film : Tv;

    // -------------------------------------------------------------
    // Early return while redirecting cross-domain
    // -------------------------------------------------------------
    if (redirecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Redirecting to download portal…</p>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // Render
    // -------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-black">
            <Helmet>
                <title>{`Download ${title}${episodeLabel ? " " + episodeLabel : ""} | StreamVault`}</title>
                <meta name="description" content={`Free HD download for ${title}. High-speed direct link available.`} />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            {/* Hero backdrop */}
            {content?.backdropUrl && (
                <div className="absolute inset-x-0 top-0 h-[400px] overflow-hidden opacity-20 pointer-events-none">
                    <img
                        src={content.backdropUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
                </div>
            )}

            <div className="relative container mx-auto px-4 py-6 max-w-6xl">
                {/* Back Button */}
                <Link href={backUrl}>
                    <Button variant="ghost" className="mb-4 gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                </Link>

                {/* Top Banner Ad */}
                <AdContainer type="banner" className="mb-6" />

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header card */}
                        <Card className="p-6 overflow-hidden">
                            <div className="flex gap-4 sm:gap-6">
                                {poster && (
                                    <img
                                        src={poster}
                                        alt={title}
                                        className="w-24 h-36 sm:w-32 sm:h-48 rounded-lg object-cover flex-shrink-0 shadow-lg"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TypeIcon className="w-4 h-4 text-primary" />
                                        <span className="text-xs uppercase tracking-wide text-primary font-semibold">
                                            {type === "movie" ? "Movie" : type === "show" ? "TV Series" : "Anime"}
                                        </span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 line-clamp-2">
                                        {title}
                                    </h1>
                                    {episodeLabel && (
                                        <p className="text-muted-foreground mb-3 text-sm sm:text-base">
                                            {episodeLabel}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {year && <Badge variant="secondary">{year}</Badge>}
                                        {rating && <Badge variant="secondary">⭐ {rating}</Badge>}
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                                            HD Quality
                                        </Badge>
                                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                            MP4
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* ---------------------------------------------- */}
                        {/* PREMIUM FAST-TRACK (only for subscribed users) */}
                        {/* ---------------------------------------------- */}
                        {isPremium && sourceUrl && (
                            <Card className="p-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 border-amber-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="relative flex items-center gap-4 flex-wrap">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                        <Crown className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg">Premium Fast Download</h3>
                                            <Badge className="bg-amber-500 text-white border-none">PRO</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Skip captchas, ads & countdowns. Download instantly.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={handlePremiumDownload}
                                        className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold gap-2 shadow-lg"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Download Now
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Premium upsell for free users */}
                        {!isPremium && (
                            <Card className="p-4 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-500/20">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Crown className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <p className="text-sm flex-1 min-w-0">
                                        <span className="font-semibold">Skip all steps</span>
                                        <span className="text-muted-foreground"> — </span>
                                        <span className="text-muted-foreground">
                                            Premium members download instantly with no ads, no captchas, no waiting.
                                        </span>
                                    </p>
                                    <Link href="/store">
                                        <Button size="sm" variant="outline" className="gap-1 border-amber-500/40">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Go Premium
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        )}

                        {/* ---------------------------------------------- */}
                        {/* FREE FLOW — only shown if not using premium     */}
                        {/* ---------------------------------------------- */}
                        <Card className="p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Download className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Free Download</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Complete a few quick steps to unlock your download.
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <Progress value={progressValue} className="mb-6" />

                            {/* STEP 1 — hCaptcha */}
                            <GateStep
                                number={1}
                                title="Verify You're Human"
                                description="Complete the quick security check below."
                                state={
                                    stage === "captcha"
                                        ? "active"
                                        : "done"
                                }
                            >
                                {stage === "captcha" && (
                                    <div>
                                        <HCaptcha
                                            onVerify={handleCaptchaVerify}
                                            onExpire={() => setCaptchaToken(null)}
                                            onError={() => setCaptchaError("Security check failed. Please retry.")}
                                        />
                                        {captchaVerifying && (
                                            <p className="text-center text-sm text-muted-foreground mt-3">
                                                Verifying…
                                            </p>
                                        )}
                                        {captchaError && (
                                            <p className="text-center text-sm text-destructive mt-3">
                                                {captchaError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </GateStep>

                            {/* STEP 2 — Social follow gate (timed verification) */}
                            <GateStep
                                number={2}
                                title="Follow Us On Social Media"
                                description={`Verified ${verifiedSocialCount}/${SOCIAL_ACCOUNTS.length}. Click each button, follow the page in the new tab, then wait for auto-verify.`}
                                state={
                                    stage === "social"
                                        ? "active"
                                        : stage === "captcha"
                                            ? "locked"
                                            : "done"
                                }
                                icon={<Users className="w-4 h-4" />}
                            >
                                {stage === "social" && (
                                    <div className="space-y-3">
                                        {/* Live status message while a follow is pending */}
                                        {pendingSocialId && (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                                                <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
                                                <span>
                                                    <strong className="text-amber-500">
                                                        Verifying in {pendingCountdown ?? SOCIAL_MIN_DWELL_MS / 1000}s…
                                                    </strong>{" "}
                                                    <span className="text-muted-foreground">
                                                        Visit the page in the new tab and follow us. This button will auto-verify shortly.
                                                    </span>
                                                </span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {SOCIAL_ACCOUNTS.map((s) => {
                                                const status = socialStatus[s.id] || "idle";
                                                const Icon = s.icon;
                                                const isBlocked = !!pendingSocialId && status !== "pending";
                                                const baseColor = status === "verified"
                                                    ? "bg-green-600"
                                                    : status === "failed"
                                                        ? "bg-red-600"
                                                        : status === "pending"
                                                            ? "bg-amber-500 animate-pulse"
                                                            : s.color;

                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleSocialClick(s.id, s.url)}
                                                        disabled={status === "verified" || status === "pending" || isBlocked}
                                                        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-white font-medium text-sm transition-all ${baseColor} ${status === "idle" && !isBlocked ? "hover:scale-[1.02] active:scale-95" : ""
                                                            } ${isBlocked ? "opacity-40 cursor-not-allowed" : ""
                                                            } ${status === "verified" ? "ring-2 ring-green-400" : ""
                                                            } ${status === "failed" ? "ring-2 ring-red-400" : ""
                                                            }`}
                                                    >
                                                        {status === "pending" ? (
                                                            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                                        ) : status === "verified" ? (
                                                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                                        ) : status === "failed" ? (
                                                            <XCircle className="w-4 h-4 flex-shrink-0" />
                                                        ) : (
                                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                                        )}
                                                        <span className="flex-1 text-left truncate">
                                                            {status === "verified"
                                                                ? "Verified"
                                                                : status === "failed"
                                                                    ? "Retry"
                                                                    : status === "pending"
                                                                        ? `Wait ${pendingCountdown ?? ""}s…`
                                                                        : s.label}
                                                        </span>
                                                        {status === "failed" && (
                                                            <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation of how verification works */}
                                        <p className="text-xs text-muted-foreground">
                                            <Lock className="w-3 h-3 inline mr-1" />
                                            Each button auto-verifies {SOCIAL_MIN_DWELL_MS / 1000} seconds after you click it. Please use the time to follow us in the new tab.
                                        </p>

                                        <Button
                                            size="lg"
                                            onClick={handleSocialContinue}
                                            disabled={!allSocialsVerified}
                                            className="w-full gap-2"
                                        >
                                            {allSocialsVerified ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Continue
                                                </>
                                            ) : (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    Verify all {SOCIAL_ACCOUNTS.length} accounts to continue
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </GateStep>

                            {/* STEP 3 — Generate download link */}
                            <GateStep
                                number={3}
                                title="Generate Secure Download Link"
                                description="Click below to start generating your link."
                                state={
                                    stage === "initial"
                                        ? "active"
                                        : ["captcha", "social"].includes(stage)
                                            ? "locked"
                                            : "done"
                                }
                            >
                                {stage === "initial" && (
                                    <Button
                                        size="lg"
                                        onClick={handleGenerateLink}
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Generate Download Link
                                    </Button>
                                )}
                            </GateStep>

                            {/* STEP 4 — Countdown + Download */}
                            <GateStep
                                number={4}
                                title={
                                    stage === "countdown"
                                        ? `Please wait ${countdown}s…`
                                        : "Start Download"
                                }
                                description={
                                    stage === "countdown"
                                        ? "Preparing your file. Please don't close this page."
                                        : "Your download will begin immediately from our servers."
                                }
                                state={
                                    stage === "countdown"
                                        ? "active-amber"
                                        : stage === "ready"
                                            ? "active"
                                            : "locked"
                                }
                                icon={stage === "countdown" ? <Clock className="w-4 h-4 animate-pulse" /> : undefined}
                            >
                                {stage === "countdown" && (
                                    <div className="flex items-center justify-center py-3">
                                        <div className="text-4xl font-bold text-amber-500 tabular-nums">
                                            {countdown}
                                        </div>
                                    </div>
                                )}
                                {stage === "ready" && sourceUrl && (
                                    <Button
                                        size="lg"
                                        onClick={handleDownload}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold gap-2 animate-pulse"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download Now
                                    </Button>
                                )}
                            </GateStep>

                            {!sourceUrl && content && (
                                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <span>No download source available for this title yet.</span>
                                </div>
                            )}
                        </Card>

                        {/* Middle Native Ad */}
                        <AdContainer type="native" />

                        {/* Safety / Trust section */}
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-5 h-5 text-green-500" />
                                <h2 className="font-bold">Safe &amp; Secure Download</h2>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">
                                        <strong className="text-foreground">Virus-free</strong> — scanned and verified
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">
                                        <strong className="text-foreground">Direct link</strong> — no torrent required
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">
                                        <strong className="text-foreground">HD quality</strong> — up to 1080p
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">
                                        <strong className="text-foreground">Free forever</strong> — no signup needed
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* In-content Rectangle Ad (between safety and related) */}
                        <div className="flex justify-center">
                            <Banner300x250 />
                        </div>

                        {/* Related content */}
                        {type === "show" && showEpisodes && showEpisodes.length > 1 && (
                            <EpisodeGrid
                                title="Other Episodes"
                                currentId={episodeData?.id}
                                episodes={showEpisodes}
                                buildHref={(e) => `/download/show/${slug}?season=${e.season}&episode=${e.episodeNumber}`}
                            />
                        )}

                        {type === "anime" && animeEpisodes && animeEpisodes.length > 1 && (
                            <EpisodeGrid
                                title="Other Episodes"
                                currentId={episodeData?.id}
                                episodes={animeEpisodes}
                                buildHref={(e) => `/download/anime/${slug}?season=${e.season}&episode=${e.episodeNumber}`}
                            />
                        )}

                        {/* Native ad between episodes and bottom CTA */}
                        <NativeBanner />

                        {/* Bottom Banner Ad */}
                        <AdContainer type="banner" className="mb-4" />

                        {/* Watch instead CTA */}
                        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-5 h-5 text-primary" />
                                    <div>
                                        <h3 className="font-bold">Prefer to stream instead?</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Watch online in HD without downloading.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={
                                        type === "movie"
                                            ? `/watch-movie/${slug}`
                                            : type === "show"
                                                ? `/watch/${slug}?season=${seasonParam}&episode=${episodeParam}`
                                                : `/watch-anime/${slug}?season=${seasonParam}&episode=${episodeParam}`
                                    }
                                >
                                    <Button variant="default" className="gap-2">
                                        Watch Online
                                    </Button>
                                </Link>
                            </div>
                        </Card>

                        {/* Final native ad below the watch-online CTA */}
                        <NativeBanner />

                        {/* Mobile-only rectangle ad (sidebar is hidden on small screens) */}
                        <div className="flex justify-center lg:hidden">
                            <Banner300x250 />
                        </div>
                    </div>

                    {/* Sidebar — dense ad stack to fill vertical space */}
                    <aside className="space-y-4">
                        {/* Top rectangle ad */}
                        <div className="flex justify-center">
                            <Banner300x250 />
                        </div>

                        {/* File Details */}
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3 text-sm">File Details</h3>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Format</dt>
                                    <dd className="font-medium">MP4</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Quality</dt>
                                    <dd className="font-medium">HD 1080p</dd>
                                </div>
                                {episodeData?.duration && (
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Duration</dt>
                                        <dd className="font-medium">{episodeData.duration} min</dd>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Language</dt>
                                    <dd className="font-medium">
                                        {(content as any)?.language || "English"}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Subtitles</dt>
                                    <dd className="font-medium text-green-500">Available</dd>
                                </div>
                            </dl>
                        </Card>

                        {/* Second rectangle ad */}
                        <div className="flex justify-center">
                            <Banner300x250 />
                        </div>

                        {/* Smartlink upsell card */}
                        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
                            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4 text-red-500" />
                                Special Offer
                            </h3>
                            <p className="text-xs text-muted-foreground mb-3">
                                Unlock exclusive partner offers while you download.
                            </p>
                            <SmartlinkButton className="w-full" text="View Offer" />
                        </Card>

                        {/* Skyscraper — fills long sidebar on desktop */}
                        <div className="hidden lg:flex justify-center">
                            <Banner160x600 />
                        </div>

                        {/* Third rectangle ad */}
                        <div className="flex justify-center">
                            <Banner300x250 />
                        </div>

                        {/* Sticky bottom slot — stays visible as user scrolls */}
                        <div className="sticky bottom-4 hidden lg:block">
                            <div className="flex justify-center">
                                <Banner300x250 />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// Step component used for each gate
// -------------------------------------------------------------
type StepState = "active" | "active-amber" | "done" | "locked";

function GateStep({
    number,
    title,
    description,
    state,
    icon,
    children,
}: {
    number: number;
    title: string;
    description: string;
    state: StepState;
    icon?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const containerClasses =
        state === "active"
            ? "bg-primary/5 border-primary/30"
            : state === "active-amber"
                ? "bg-muted/20 border-amber-500/30"
                : state === "done"
                    ? "bg-muted/20 border-green-500/30"
                    : "bg-muted/10 border-muted opacity-60";

    const circleClasses =
        state === "active"
            ? "bg-primary text-primary-foreground"
            : state === "active-amber"
                ? "bg-amber-500 text-white"
                : state === "done"
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground";

    return (
        <div className={`rounded-lg border p-4 mb-4 transition-colors ${containerClasses}`}>
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${circleClasses}`}>
                    {state === "done" ? <CheckCircle2 className="w-4 h-4" /> : icon || number}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

// -------------------------------------------------------------
// Episode grid (shows / anime)
// -------------------------------------------------------------
function EpisodeGrid<T extends { id: string; title: string; season: number; episodeNumber: number; thumbnailUrl: string }>({
    title,
    currentId,
    episodes,
    buildHref,
}: {
    title: string;
    currentId?: string;
    episodes: T[];
    buildHref: (e: T) => string;
}) {
    return (
        <Card className="p-6">
            <h2 className="font-bold mb-4">{title}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
                {episodes
                    .filter((e) => e.id !== currentId)
                    .slice(0, 6)
                    .map((e) => (
                        <Link key={e.id} href={buildHref(e)}>
                            <div className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                <img
                                    src={e.thumbnailUrl}
                                    alt={e.title}
                                    className="w-24 h-14 rounded object-cover flex-shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="text-xs text-muted-foreground">
                                        S{e.season} E{e.episodeNumber}
                                    </div>
                                    <div className="text-sm font-medium line-clamp-2">
                                        {e.title}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
            </div>
        </Card>
    );
}
