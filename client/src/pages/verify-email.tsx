import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Loader2, Mail, ArrowRight } from 'lucide-react';
import { OTPInput } from '@/components/otp-input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo';

export default function VerifyEmailPage() {
    const [, navigate] = useLocation();
    const search = useSearch();
    const { user, isAuthenticated, refetchUser } = useAuth();
    const { toast } = useToast();

    // extract email from query string
    const params = new URLSearchParams(search);
    const emailParam = params.get('email');

    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState(emailParam || '');

    // Pre-fill email from authenticated user if available
    useEffect(() => {
        if (user && user.email && !email) {
            setEmail(user.email);
        }
    }, [user, email]);

    // If verified, redirect to home
    useEffect(() => {
        if (user?.emailVerified) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await apiRequest('POST', '/api/auth/verify-email', { email, code });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: 'Email Verified!',
                    description: 'You can now access all features.',
                });
                // Refetch user to update emailVerified status, then navigate
                if (isAuthenticated) {
                    await refetchUser();
                }
                // Navigate to home after successful verification
                navigate('/');
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify email');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        try {
            const res = await apiRequest('POST', '/api/auth/resend-verification', { email });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: 'Code Sent',
                    description: 'Please check your email inbox (and spam folder).',
                });
            } else {
                toast({
                    variant: "destructive",
                    title: 'Failed to send code',
                    description: data.error,
                });
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: 'Error',
                description: 'Could not send verification code',
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] p-4">
            <SEO
                title="Verify Email"
                description="Verify your StreamVault email address to activate your account and access all platform features."
                canonical="https://streamvault.live/verify-email"
                robots="noindex,follow"
            />
            {/* Logo */}
            <div className="flex items-center gap-2 mb-10">
                <div className="bg-[#e60a15] p-2 rounded-lg">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <span className="text-2xl font-black tracking-tighter text-white">STREAMVAULT</span>
            </div>

            {/* Glass Card */}
            <div
                className="w-full max-w-md space-y-6 p-8 rounded-lg shadow-2xl"
                style={{
                    background: 'rgba(39, 27, 28, 0.6)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-[#e60a15]/10 rounded-full flex items-center justify-center border border-[#e60a15]/20">
                        <Mail className="h-8 w-8 text-[#e60a15]" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Verify your email</h2>
                    <p className="text-slate-400 font-normal">
                        We've sent a verification code to <span className="text-white font-medium">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300 ml-1">Verification Code</label>
                        <OTPInput
                            length={6}
                            value={code}
                            onChange={setCode}
                            autoFocus
                        />
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={isResending || !email}
                            className="text-sm text-slate-500 hover:text-[#e60a15] transition-colors disabled:opacity-50"
                        >
                            {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || code.length !== 6}
                        className="w-full h-14 bg-[#e60a15] hover:bg-[#ff1a25] text-white font-bold rounded-lg shadow-lg shadow-[#e60a15]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <span>Verify Email</span>
                                <ArrowRight className="h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="text-center pt-2">
                    <p className="text-sm text-slate-400">
                        Wrong email?{' '}
                        <Link href="/register" className="text-[#e60a15] font-bold hover:underline ml-1">
                            Go back
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
        </div>
    );
}
