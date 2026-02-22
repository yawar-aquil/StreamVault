import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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
        <div className="relative flex min-h-screen w-full flex-row">
            {/* Left Side: Cinematic Branding (60%) */}
            <section className="relative hidden lg:flex w-[60%] flex-col justify-center p-16 overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD9Z6BPIG6YlN4gLyRWSFlCEnA-BrQ0beJ4y9UkmtX74nWBehOg1qywsi6wUMLdx0ddGH6w7cCWEzc23sWo85XEVpBMMQW3IKIGpPJXVIUVhI8qmqF35GWXDqCPPS-BD66V0bXx7O1l1LYbwHMxYt2WPe2qk1O5-a2Y18hmek4VQbJXnwb-ETPrdhuLADV7Ab4Ebd9BjQ-4Zr5xURTKcxCYY3dUs1eQZWrjEQG3XeQkhwFpKt84lFTy2u0WxbRI0HFe7Oh4PSc6yjg')`,
                    }}
                />
                {/* Cinematic Gradient Overlay */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background: `linear-gradient(to right, rgba(20,20,20,0) 0%, rgba(20,20,20,1) 100%), 
                                     linear-gradient(to bottom, rgba(20,20,20,0.4) 0%, rgba(20,20,20,0.8) 100%)`,
                    }}
                />
                {/* Floating Particles */}
                <div className="absolute inset-0 z-[15] overflow-hidden pointer-events-none">
                    <div className="absolute w-1 h-1 rounded-full bg-white opacity-30 top-[10%] left-[20%]" style={{ boxShadow: '0 0 10px white', filter: 'blur(1px)' }} />
                    <div className="absolute w-2 h-2 rounded-full bg-white opacity-30 top-[40%] left-[10%]" style={{ boxShadow: '0 0 15px white', filter: 'blur(1px)' }} />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-white opacity-30 top-[70%] left-[30%]" style={{ boxShadow: '0 0 12px white', filter: 'blur(1px)' }} />
                    <div className="absolute w-1 h-1 rounded-full bg-white opacity-30 top-[85%] left-[15%]" style={{ boxShadow: '0 0 8px white', filter: 'blur(1px)' }} />
                    <div className="absolute w-2 h-2 rounded-full bg-white opacity-30 top-[20%] left-[50%]" style={{ boxShadow: '0 0 15px white', filter: 'blur(1px)' }} />
                </div>
                {/* Content */}
                <div className="relative z-20 flex flex-col gap-6 max-w-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#e60a15] p-2 rounded-lg">
                            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-white">STREAMVAULT</span>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-5xl font-black leading-tight tracking-tight text-white lg:text-6xl">
                            Unlimited Shows, Movies & <span className="text-[#e60a15]">Anime</span> — Free
                        </h1>
                        <p className="text-xl text-slate-300 font-medium max-w-lg">
                            Experience the next generation of streaming. High-definition content, zero subscriptions, pure entertainment.
                        </p>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-4 pt-8">
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold text-white">4K</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest">Ultra HD</div>
                        </div>
                        <div className="w-px h-10 bg-white/20" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold text-white">50k+</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest">Titles</div>
                        </div>
                        <div className="w-px h-10 bg-white/20" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-2xl font-bold text-white">24/7</div>
                            <div className="text-xs text-slate-400 uppercase tracking-widest">Support</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Right Side: Auth Form (40%) */}
            <section className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:w-[40%] bg-[#141414]">
                {/* Mobile Logo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
                    <svg className="w-8 h-8 text-[#e60a15]" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    <span className="text-2xl font-black tracking-tighter text-white">STREAMVAULT</span>
                </div>

                {/* Glass Card */}
                <div
                    className="w-full max-w-md space-y-8 p-8 rounded-lg shadow-2xl"
                    style={{
                        background: 'rgba(39, 27, 28, 0.6)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {/* Header */}
                    <div className="text-left space-y-2">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
                        <p className="text-slate-400 font-normal">Enter your details to access your StreamVault account.</p>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-white/10" />
                        <span className="flex-shrink mx-4 text-xs font-medium text-slate-500 uppercase tracking-widest">Sign in with</span>
                        <div className="flex-grow border-t border-white/10" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 bg-white/5 border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#e60a15] focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <Link href="/forgot-password" className="text-xs font-medium text-[#e60a15] hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 pl-12 pr-12 bg-white/5 border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#e60a15] focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <CloudflareTurnstile
                            onVerify={handleTurnstileVerify}
                            onExpire={handleTurnstileExpire}
                            theme="auto"
                        />

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !turnstileToken}
                            className="w-full h-14 bg-[#e60a15] hover:bg-[#ff1a25] text-white font-bold rounded-lg shadow-lg shadow-[#e60a15]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="text-center pt-4">
                        <p className="text-sm text-slate-400">
                            New to StreamVault?{' '}
                            <Link href="/register" className="text-[#e60a15] font-bold hover:underline ml-1">
                                Join StreamVault
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 flex gap-6 text-xs text-slate-600 font-medium">
                    <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
                    <Link href="/help" className="hover:text-slate-400 transition-colors">Help Center</Link>
                </div>
            </section>
        </div>
    );
}
