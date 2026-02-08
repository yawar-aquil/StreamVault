import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export function ReferralWidget() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Fetch the actual unique referral code
    const { data: referralData } = useQuery<{ code: string }>({
        queryKey: ['/api/user/referral-code'],
    });

    const referralCode = referralData?.code || user?.username || 'streamvault';
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast({
            title: "Copied!",
            description: "Referral link copied to clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="bg-gradient-to-br from-primary/10 via-background to-purple-500/5 border-primary/20 overflow-hidden relative shadow-lg">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />

            <CardContent className="p-5 relative z-10">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2.5 bg-gradient-to-br from-primary to-purple-600 rounded-lg shadow-inner shadow-white/20 text-white">
                        <Gift className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-base leading-none mb-1">Invite Friends</h3>
                        <p className="text-xs text-muted-foreground font-medium mb-2">
                            Earn <span className="text-primary font-bold">200 XP</span> per referral!
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs bg-background/40 px-2 py-1 rounded-md border border-white/5">
                                <span className="text-muted-foreground">Referrals:</span>
                                <span className="text-primary font-bold">{user?.referralCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs bg-background/40 px-2 py-1 rounded-md border border-white/5">
                                <span className="text-muted-foreground">XP Earned:</span>
                                <span className="text-yellow-500 font-bold">{(user?.referralCount || 0) * 200}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-center bg-background/50 p-1 rounded-lg border border-border">
                    <div className="flex-1 px-2 py-1 text-xs text-muted-foreground truncate font-mono select-all">
                        {referralLink}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-primary/20 hover:text-primary" onClick={copyToClipboard}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
