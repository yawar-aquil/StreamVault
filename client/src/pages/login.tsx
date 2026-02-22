import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { Loader2, Mail, Lock, Eye, EyeOff, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CloudflareTurnstile } from '@/components/cloudflare-turnstile';

export default function LoginPage() {
    const [, navigate] = useLocation();
    const { login, isAuthenticated } = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken('');
    }, []);

    // Get redirect URL from query params
    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect');

    // Redirect if already logged in
    if (isAuthenticated) {
        navigate(redirectUrl ? decodeURIComponent(redirectUrl) : '/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!turnstileToken) {
            setError('Please complete the human verification challenge.');
            return;
        }

        setIsLoading(true);

        try {
            await login(email, password);
            toast({
                title: 'Welcome back!',
                description: 'You have successfully logged in.',
            });
            navigate(redirectUrl ? decodeURIComponent(redirectUrl) : '/');
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Panel — Cinematic Branding */}
            <div className="relative hidden lg:flex lg:w-[58%] items-center justify-center overflow-hidden bg-[#0a0a0a]">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] via-[#0a0a0a] to-[#0a0a1a]" />

                {/* Decorative blur orbs */}
                <div className="absolute top-[15%] left-[20%] w-72 h-72 bg-red-600/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[60%] left-[50%] w-48 h-48 bg-red-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />

                {/* Content */}
                <div className="relative z-10 max-w-md px-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="p-2.5 bg-red-600 rounded-xl">
                            <Play className="w-7 h-7 text-white fill-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">StreamVault</h1>
                    </div>
                    <p className="text-lg text-gray-300 leading-relaxed mb-4">
                        Unlimited Shows, Movies & Anime
                    </p>
                    <p className="text-sm text-gray-500">
                        Join millions of viewers streaming their favorite content.
                    </p>

                    {/* Decorative line */}
                    <div className="mt-10 flex items-center gap-3 justify-center">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-500/50" />
                    </div>
                </div>
            </div>

            {/* Right Panel — Auth Form */}
            <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8 lg:p-12">
                <div className="w-full max-w-[420px]">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="p-2 bg-red-600 rounded-lg">
                            <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold">StreamVault</span>
                    </div>

                    {/* Glass card */}
                    <div className="rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-xl p-8 shadow-2xl shadow-black/20">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold">Welcome back</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                Sign in to continue to StreamVault
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-11 rounded-xl bg-background/50 border-white/10 focus:border-red-500/50 transition-colors"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-11 rounded-xl bg-background/50 border-white/10 focus:border-red-500/50 transition-colors"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Link href="/forgot-password" className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors">
                                    Forgot password?
                                </Link>
                            </div>

                            <CloudflareTurnstile
                                onVerify={handleTurnstileVerify}
                                onExpire={handleTurnstileExpire}
                                theme="auto"
                                className="mt-2"
                            />

                            <Button
                                type="submit"
                                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-base shadow-lg shadow-red-600/20 transition-all hover:shadow-red-600/30"
                                disabled={isLoading || !turnstileToken}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/[0.06]" />
                            </div>
                        </div>

                        <p className="text-sm text-center text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/register" className="text-red-400 hover:text-red-300 font-medium hover:underline transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
