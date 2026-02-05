import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
                // Refetch user to update emailVerified status
                if (isAuthenticated) {
                    refetchUser();
                } else {
                    navigate('/login');
                }
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
                    <CardDescription>
                        We've sent a verification code to {email}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="code">Verification Code</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="code"
                                    type="text"
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="pl-10 text-center tracking-widest text-lg"
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={isResending || !email}
                                className="text-sm text-primary hover:underline disabled:opacity-50"
                            >
                                {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
                            </button>
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Email'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
