import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';
import { Loader2, Mail, Lock, User, Eye, EyeOff, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CloudflareTurnstile } from '@/components/cloudflare-turnstile';

export default function RegisterPage() {
    const [, navigate] = useLocation();
    const { register, isAuthenticated, user } = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    // Redirect if already logged in and verified
    if (isAuthenticated && user?.emailVerified) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!turnstileToken) {
            setError('Please complete the human verification challenge.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return;
        }

        setIsLoading(true);

        try {
            await register(email, username, password);
            toast({
                title: 'Account created!',
                description: 'Welcome to StreamVault. You can now join watch parties!',
            });
            toast({
                title: 'Account created!',
                description: 'Please verify your email address.',
            });
            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (err: any) {
            setError(err.message || 'Failed to register');
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
                        Create your account and start streaming today.
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
                            <h2 className="text-2xl font-bold">Join StreamVault</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                Create your account to start streaming
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
                                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="cooluser123"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="pl-10 h-11 rounded-xl bg-background/50 border-white/10 focus:border-red-500/50 transition-colors"
                                        required
                                        minLength={3}
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
                                        minLength={6}
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

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10 h-11 rounded-xl bg-background/50 border-white/10 focus:border-red-500/50 transition-colors"
                                        required
                                    />
                                </div>
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
                                        Creating account...
                                    </>
                                ) : (
                                    'Create Account'
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
                            Already have an account?{' '}
                            <Link href="/login" className="text-red-400 hover:text-red-300 font-medium hover:underline transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
