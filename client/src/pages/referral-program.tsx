import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, Trophy, Star, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StreamCoin from "@/components/stream-coin";

export default function ReferralProgram() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [referralCode, setReferralCode] = useState<string>("");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if ((user as any).referralCode) {
                setReferralCode((user as any).referralCode);
            } else {
                fetchReferralCode();
            }
        }
    }, [user]);

    const fetchReferralCode = async () => {
        try {
            setIsLoading(true);
            const res = await apiRequest("POST", "/api/store/referral/code");
            const data = await res.json();
            setReferralCode(data.code);
        } catch (error) {
            console.error("Failed to fetch referral code", error);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        const link = `${window.location.origin}/register?ref=${referralCode}`;
        navigator.clipboard.writeText(link);
        toast({
            title: "Copied!",
            description: "Referral link copied to clipboard.",
        });
    };

    const referralCount = (user as any)?.referralCount || 0;

    // Calculate next milestone
    const nextMilestone = Math.ceil((referralCount + 1) / 5) * 5;
    const progressToNext = ((referralCount % 5) / 5) * 100;

    // Calculate potential rewards for next milestone
    const nextTier = nextMilestone / 5;
    const nextXP = nextTier * 500;
    const nextCoins = 100 + ((nextTier - 1) * 50);

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    Invite Friends, Earn Rewards
                </h1>
                <p className="text-lg text-muted-foreground">
                    Share StreamVault with your friends and unlock exclusive rewards. Earn XP and <StreamCoin className="inline mx-1" size="sm" /> for every referral, plus massive bonuses for hitting milestones!
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <Button size="lg" className="gap-2" onClick={() => document.getElementById("referral-link-input")?.focus()}>
                        <Gift className="w-4 h-4" />
                        Start Inviting
                    </Button>
                    <a href="#stats">
                        <Button variant="outline" size="lg">
                            View Progress
                        </Button>
                    </a>
                </div>
            </div>

            {/* Key Stats Grid */}
            <div id="stats" className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Total Referrals
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{referralCount}</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Friends joined via your link
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-yellow-500" />
                            Next Milestone
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                            <span>{nextMilestone} Referrals</span>
                            <span className="text-primary">{progressToNext}%</span>
                        </div>
                        <Progress value={progressToNext} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            {5 - (referralCount % 5)} more to unlock {nextXP} XP & {nextCoins} <StreamCoin className="inline ml-1" size="sm" />
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Copy className="w-5 h-5 text-blue-500" />
                            Your Link
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Input
                                id="referral-link-input"
                                readOnly
                                value={referralCode ? `${window.location.origin}/register?ref=${referralCode}` : "Loading..."}
                                className="font-mono text-xs"
                            />
                            <Button size="icon" variant="secondary" onClick={copyToClipboard} disabled={!referralCode}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Share this link to claim rewards
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="rewards" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="rewards">Rewards</TabsTrigger>
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                </TabsList>

                {/* Rewards Content */}
                <TabsContent value="rewards" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                Rewards Structure
                            </CardTitle>
                            <CardDescription>
                                Earn <span className="font-bold text-foreground">200 XP</span> for every single referral, PLUS these milestone bonuses:
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {Array.from({ length: 6 }, (_, i) => {
                                    // Calculate which "page" of tiers we're on (every 30 referrals = 6 milestones)
                                    // We stick to the current page until the user strictly exceeds the last milestone of the page
                                    const itemsPerPage = 6;
                                    const refsPerPage = itemsPerPage * 5;
                                    const currentPage = Math.floor((referralCount > 0 ? referralCount : 0) / refsPerPage);

                                    // Special case: if we are exactly at a multiple of 30 (e.g. 30), we might want to stay on the previous page 
                                    // or move to the next. Let's move to next only when we have > 30 to show "working towards 35"
                                    // Actually, standard behavior: 0-29 -> page 0. 30-59 -> page 1.
                                    // But wait, milestone 30 is on page 0? 5,10,15,20,25,30.
                                    // So 0-29 should show page 0? No, even 30 should show page 0 if we want to see "Claimed".
                                    // Let's use: if you have 30, you see 5..30 (all claimed).
                                    // If you have 31, you see 35..60.
                                    const effectivePage = Math.floor((referralCount > 0 ? referralCount - 1 : 0) / refsPerPage);

                                    const tier = (effectivePage * itemsPerPage) + i + 1;

                                    const limit = tier * 5;
                                    const bonusXP = tier * 500;
                                    const bonusCoins = 100 + ((tier - 1) * 50);
                                    const isUnlocked = referralCount >= limit;
                                    const isNext = !isUnlocked && referralCount >= (limit - 5);

                                    return (
                                        <div
                                            key={tier}
                                            className={`relative p-4 rounded-lg border flex items-center justify-between ${isUnlocked
                                                ? "bg-primary/10 border-primary/20"
                                                : isNext
                                                    ? "bg-card border-primary/50 ring-1 ring-primary/20"
                                                    : "bg-muted/50 border-transparent opacity-60"
                                                } transition-all`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isUnlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                    {isUnlocked ? <Trophy className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold">
                                                        {limit} Referrals
                                                    </h3>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-xs">+{bonusXP} XP</Badge>
                                                        <Badge variant="outline" className="text-xs flex items-center gap-1">+{bonusCoins} <StreamCoin size="sm" /></Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            {isUnlocked && (
                                                <Badge className="bg-green-600 hover:bg-green-600">Claimed</Badge>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-dashed border-border text-center">
                                <p className="text-muted-foreground font-medium flex items-center justify-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500" />
                                    <span>Unlimited Progression: The milestone cycle repeats every 5 referrals!</span>
                                    <Star className="w-4 h-4 text-yellow-500" />
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FAQ Content */}
                <TabsContent value="faq" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Frequently Asked Questions</CardTitle>
                            <CardDescription>Everything you need to know about the referral program</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>How do I earn rewards?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        Share your unique referral link with friends. When they sign up using your link, you automatically receive 200 XP. Additionally, for every 5 referrals, you unlock special milestone bonuses containing huge XP and <StreamCoin className="inline mx-1" size="sm" /> rewards.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Is there a limit to how many friends I can invite?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        No! There is no limit. The more friends you invite, the more rewards you earn. The milestone series continues indefinitely.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>Where can I spend my coins?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        <StreamCoin className="inline mr-1" size="sm" /> can be used in the Store to purchase exclusive badges, profile themes, and gifting items. XP helps you level up and unlock new features.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-4">
                                    <AccordionTrigger>Does my friend get anything?</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        Yes! New users who sign up with a referral code receive a 50 XP Welcome Bonus to kickstart their journey on StreamVault.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
