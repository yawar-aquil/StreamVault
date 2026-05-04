
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Loader2, Mail, Lock, KeyRound, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { OTPInput } from '@/components/otp-input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { SEO } from '@/components/seo';

export default function ForgotPasswordPage() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Request Reset Code
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await apiRequest('POST', '/api/auth/forgot-password', { email });
            toast({
                title: 'Reset code sent',
                description: 'Check your email for the verification code.',
            });
            setStep('reset');
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to send reset code',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await apiRequest('POST', '/api/auth/reset-password', {
                email,
                code,
                newPassword
            });

            toast({
                title: 'Password updated!',
                description: 'You can now log in with your new password.',
            });

            navigate('/login');
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to reset password',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] p-4">
            <SEO
                title="Reset Password"
                description="Reset your StreamVault password and regain access to your account securely."
                canonical="https://streamvault.live/forgot-password"
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
                <div className="text-left space-y-2">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                    </h2>
                    <p className="text-slate-400 font-normal">
                        {step === 'email'
                            ? 'Enter your email to receive a reset code.'
                            : 'Enter the code from your email and a new password.'}
                    </p>
                </div>

                {step === 'email' ? (
                    <form onSubmit={handleRequestCode} className="space-y-5">
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
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#e60a15] hover:bg-[#ff1a25] text-white font-bold rounded-lg shadow-lg shadow-[#e60a15]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Send Reset Code</span>
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300 ml-1">Verification Code</label>
                            <OTPInput
                                length={6}
                                value={code}
                                onChange={setCode}
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-300 ml-1">New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 bg-white/5 border-white/10 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#e60a15] focus:border-transparent transition-all"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#e60a15] hover:bg-[#ff1a25] text-white font-bold rounded-lg shadow-lg shadow-[#e60a15]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Reset Password</span>
                                    <CheckCircle2 className="h-5 w-5" />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="w-full flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Change Email
                        </button>
                    </form>
                )}

                {/* Back to Login */}
                <div className="text-center pt-2">
                    <p className="text-sm text-slate-400">
                        Remember your password?{' '}
                        <Link href="/login" className="text-[#e60a15] font-bold hover:underline ml-1">
                            Sign In
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
