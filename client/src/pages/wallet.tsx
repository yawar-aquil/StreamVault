import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Zap, AlertCircle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth-context';
import StreamCoin from '@/components/stream-coin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Added
import { Input } from '@/components/ui/input'; // Added
import { Label } from '@/components/ui/label'; // Added
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CoinPackage {
    id: string;
    name: string;
    amount: number;
    cost: number;
    description: string;
}

const PACKAGES: CoinPackage[] = [
    { id: 'handful', name: 'Handful of Coins', amount: 500, cost: 4.99, description: 'Perfect for a starter theme.' },
    { id: 'sack', name: 'Sack of Coins', amount: 1200, cost: 9.99, description: 'Unlock a couple of premium items.' },
    { id: 'chest', name: 'Treasure Chest', amount: 2500, cost: 19.99, description: 'Best value for serious collectors.' },
    { id: 'vault', name: 'Vault of Coins', amount: 6500, cost: 49.99, description: 'Ultimate stash for everything!' },
];

interface Transaction {
    id: string;
    amount: number;
    type: 'purchase' | 'gift' | 'bonus';
    description: string;
    createdAt: string;
    metadata?: any;
}

export default function WalletPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('buy');

    // Custom Purchase State
    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [buyAmount, setBuyAmount] = useState<number>(0);
    const [purchaseEmail, setPurchaseEmail] = useState('');
    const [isEmailValid, setIsEmailValid] = useState(true);

    // Currency State
    const [currency, setCurrency] = useState('USD');
    const [rate, setRate] = useState(1);
    const [loadingCurrency, setLoadingCurrency] = useState(true);

    // Initial Base Prices (USD)
    const BASE_PACKAGES = [
        { id: 'handful', name: 'Handful of Coins', amount: 500, cost: 4.99, description: 'Perfect for a starter theme.' },
        { id: 'sack', name: 'Sack of Coins', amount: 1200, cost: 9.99, description: 'Unlock a couple of premium items.' },
        { id: 'chest', name: 'Treasure Chest', amount: 2500, cost: 19.99, description: 'Best value for serious collectors.' },
        { id: 'vault', name: 'Vault of Coins', amount: 6500, cost: 49.99, description: 'Ultimate stash for everything!' },
    ];

    // Detect Currency & Fetch Rate
    useEffect(() => {
        const fetchCurrency = async () => {
            try {
                // 1. Get User's Currency Code
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                const userCurrency = ipData.currency || 'USD';
                setCurrency(userCurrency);

                // 2. Get Exchange Rate (USD -> UserCurrency)
                if (userCurrency !== 'USD') {
                    const rateRes = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
                    const rateData = await rateRes.json();
                    if (rateData && rateData.rates && rateData.rates[userCurrency]) {
                        setRate(rateData.rates[userCurrency]);
                    }
                }
            } catch (error) {
                console.error("Failed to detect currency:", error);
                // Fallback to USD (defaults are already set)
            } finally {
                setLoadingCurrency(false);
            }
        };

        fetchCurrency();

        if (user?.email) {
            setPurchaseEmail(user.email);
        }
    }, [user]);

    // Format Price Helper - Always display USD
    const formatPrice = (usdAmount: number) => {
        if (isNaN(usdAmount) || usdAmount === undefined || usdAmount === null) {
            return '$0.00';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(usdAmount);
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPurchaseEmail(val);
        setIsEmailValid(val === '' || validateEmail(val));
    };

    // Redirect if not logged in
    useEffect(() => {
        if (!user) {
            // handled by protected route usually, but safe measure
        }
    }, [user]);

    const { data: transactions, isLoading: isLoadingHistory } = useQuery<Transaction[]>({
        queryKey: ['/api/wallet/transactions'],
        enabled: !!user
    });

    // Razorpay Integration
    const buyMutation = useMutation({
        mutationFn: async (data: { pkg: CoinPackage; email: string; customAmount?: number }) => {
            const amount = data.pkg.id === 'custom' ? (data.customAmount || 0) : data.pkg.amount;

            // 1. Create Order
            // Pass the detected currency so server can convert correctly
            const orderRes = await apiRequest('POST', '/api/payment/create-order', {
                packageId: data.pkg.id,
                amount: amount,
                currency: currency
            });
            const orderData = await orderRes.json();

            // Close the dialog immediately to prevent z-index/focus issues with Razorpay modal
            setShowPurchaseDialog(false);

            // 2. Open Razorpay Checkout
            return new Promise((resolve, reject) => {
                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "StreamVault",
                    description: `Purchase ${amount} StreamCoins`,
                    image: window.location.origin + "/streamvault-logo.png", // StreamVault logo
                    order_id: orderData.orderId,
                    handler: async function (response: any) {
                        try {
                            // 3. Verify Payment
                            const verifyRes = await apiRequest('POST', '/api/payment/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                packageId: orderData.packageDetails.packageId,
                                amount: orderData.packageDetails.amount,
                                cost: orderData.packageDetails.cost,
                                recipientEmail: data.email
                            });
                            resolve(await verifyRes.json());
                        } catch (err) {
                            reject(err);
                        }
                    },
                    prefill: {
                        email: data.email || user?.email,
                        contact: "" // Can let user fill
                    },
                    config: {
                        display: {
                            blocks: {
                                utib: { // Enable UPI block
                                    name: "Pay using UPI",
                                    instruments: [
                                        { method: "upi" }
                                    ]
                                },
                                other: {
                                    name: "Other Payment Methods",
                                    instruments: [
                                        { method: "card" },
                                        { method: "netbanking" },
                                        { method: "wallet" }
                                    ]
                                }
                            },
                            sequence: ["block.utib", "block.other"],
                            preferences: {
                                show_default_blocks: true
                            }
                        }
                    },
                    theme: {
                        color: "#EAB308" // Gold/Yellow
                    },
                    modal: {
                        ondismiss: function () {
                            reject(new Error("Payment cancelled"));
                        }
                    }
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.open();

                rzp.on('payment.failed', function (response: any) {
                    reject(new Error(response.error.description));
                });
            });
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
            setShowPurchaseDialog(false);
            setBuyAmount(0);
            toast({
                title: 'Payment Successful!',
                description: data.message,
            });
        },
        onError: (error: any) => {
            if (error.message === "Payment cancelled") {
                toast({
                    title: 'Cancelled',
                    description: 'Payment process was cancelled.',
                    variant: 'default',
                });
            } else {
                toast({
                    title: 'Purchase Failed',
                    description: error.message || 'Something went wrong.',
                    variant: 'destructive',
                });
            }
        }
    });

    const handleBuy = () => {
        if (!selectedPackage) return;
        buyMutation.mutate({
            pkg: selectedPackage,
            email: purchaseEmail,
            customAmount: buyAmount
        });
    };

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
                            My Wallet
                        </h1>
                        <p className="text-gray-400 mt-2">Manage your StreamCoins and transactions.</p>
                    </div>

                    <Card className="bg-zinc-900/50 border-yellow-500/20 md:w-auto w-full">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="bg-yellow-500/10 p-3 rounded-full">
                                <StreamCoin size="xl" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold">Current Balance</p>
                                <p className="text-3xl font-bold text-white">{user?.coins || 0} Coins</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="buy">Buy Coins</TabsTrigger>
                        <TabsTrigger value="history">Transaction History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy" className="mt-8 space-y-6">
                        <h2 className="text-2xl font-bold text-white">Top Up Your Wallet</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PACKAGES.map((pkg) => (
                                <Card key={pkg.id} className="bg-zinc-900/50 border-zinc-800 hover:border-yellow-500/50 transition-all duration-300 group relative overflow-hidden">
                                    {/* Background Glow */}
                                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <CardHeader className="text-center relative z-10 pb-2">
                                        <div className="mx-auto mb-4 bg-zinc-950 p-4 rounded-full border border-zinc-800 group-hover:border-yellow-500/50 shadow-lg shadow-black/50 w-20 h-20 flex items-center justify-center">
                                            <StreamCoin size={pkg.id === 'vault' ? 'xl' : pkg.id === 'chest' ? 'lg' : 'md'} />
                                        </div>
                                        <CardTitle className="text-xl font-bold text-white">{pkg.amount} Coins</CardTitle>
                                        <CardDescription className="text-yellow-500 font-semibold">{pkg.name}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-center relative z-10 space-y-4">
                                        <p className="text-gray-400 text-sm min-h-[40px]">{pkg.description}</p>
                                        <Button
                                            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                                            onClick={() => {
                                                setBuyAmount(pkg.amount);
                                                setSelectedPackage(pkg);
                                                setPurchaseEmail(user?.email || '');
                                                setShowPurchaseDialog(true);
                                            }}
                                        >
                                            Buy for {formatPrice(pkg.cost)}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Custom Amount Card */}
                            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-yellow-500/50 transition-all duration-300 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CardHeader className="text-center relative z-10 pb-2">
                                    <div className="mx-auto mb-4 bg-zinc-950 p-4 rounded-full border border-zinc-800 group-hover:border-yellow-500/50 shadow-lg shadow-black/50 w-20 h-20 flex items-center justify-center">
                                        <StreamCoin size="md" />
                                    </div>
                                    <CardTitle className="text-xl font-bold text-white">Custom Amount</CardTitle>
                                    <CardDescription className="text-yellow-500 font-semibold">Any Amount</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center relative z-10 space-y-4">
                                    <p className="text-gray-400 text-sm min-h-[40px]">Choose exactly how many coins you need.</p>
                                    <Button
                                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                                        onClick={() => {
                                            setBuyAmount(0); // Reset for input
                                            setSelectedPackage({ id: 'custom', name: 'Custom Amount', amount: 0, cost: 'Variable', description: 'Custom Top-Up' });
                                            setPurchaseEmail(user?.email || '');
                                            setShowPurchaseDialog(true);
                                        }}
                                    >
                                        Custom Top-Up
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Zap className="h-5 w-5 text-primary" />
                                    Confirm Purchase
                                </DialogTitle>
                                <DialogDescription>
                                    Add this exclusive item to your collection.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-6">
                                <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-2xl border border-white/5">
                                    <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center p-2 border border-white/10">
                                        <StreamCoin size="md" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold truncate">{selectedPackage?.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                                                Digital Item
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-xl font-bold flex items-center gap-2">
                                        {selectedPackage?.id === 'custom' ? (
                                            <span className="text-white text-lg font-bold">
                                                {(() => {
                                                    const amt = buyAmount || 0;
                                                    let customRateUSD = 0.00998;
                                                    if (amt >= 6500) customRateUSD = 49.99 / 6500;
                                                    else if (amt >= 2500) customRateUSD = 19.99 / 2500;
                                                    else if (amt >= 1200) customRateUSD = 9.99 / 1200;

                                                    const costUSD = amt * customRateUSD;
                                                    return formatPrice(costUSD);
                                                })()}
                                            </span>
                                        ) : (
                                            <span className="text-white text-lg font-bold">{formatPrice(Number(selectedPackage?.cost) || 0)}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Amount Logic */}
                                {selectedPackage?.id === 'custom' && (
                                    <div className="mt-4 space-y-2">
                                        <Label>Coin Amount</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="100"
                                                placeholder="e.g. 1000"
                                                value={buyAmount || ''}
                                                onChange={(e) => setBuyAmount(parseInt(e.target.value) || 0)}
                                                className="bg-muted/30 border-white/10 pr-12 focus-visible:ring-primary"
                                            />
                                            <div className="absolute right-3 top-2.5">
                                                <StreamCoin size="sm" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {(() => {
                                                const amt = buyAmount || 0;
                                                if (amt >= 6500) return "Vault Rate Applied (Best Value!)";
                                                if (amt >= 2500) return "Treasure Chest Rate Applied";
                                                if (amt >= 1200) return "Sack Rate Applied";
                                                return "Standard Rate (Buy 1200+ for discount)";
                                            })()}
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 space-y-2">
                                    <Label htmlFor="email">Receipt Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={purchaseEmail}
                                        onChange={handleEmailChange}
                                        className={`bg-muted/30 border-white/10 ${!isEmailValid ? '!border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                                    />
                                    <p className="text-xs text-muted-foreground">We'll send your receipt here.</p>
                                </div>

                                <div className="mt-6 flex items-start gap-3 p-3 text-xs text-muted-foreground bg-muted/20 rounded-lg">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>
                                        By confirming, you agree that this purchase is for a virtual item and is non-refundable
                                        once delivered.
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setShowPurchaseDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleBuy()}
                                    disabled={buyMutation.isPending || !purchaseEmail || !isEmailValid || (selectedPackage?.id === 'custom' && (buyAmount || 0) < 100)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                                >
                                    {buyMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Pay {selectedPackage?.id === 'custom' ?
                                                (() => {
                                                    const amt = buyAmount || 0;
                                                    let customRateUSD = 0.00998;
                                                    if (amt >= 6500) customRateUSD = 49.99 / 6500;
                                                    else if (amt >= 2500) customRateUSD = 19.99 / 2500;
                                                    else if (amt >= 1200) customRateUSD = 9.99 / 1200;
                                                    return formatPrice(amt * customRateUSD);
                                                })() : formatPrice(selectedPackage?.cost || 0)
                                            }
                                            <Check className="h-4 w-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <TabsContent value="history" className="mt-8">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Transaction History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingHistory ? (
                                    <div className="flex justify-center p-8">
                                        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                                    </div>
                                ) : transactions?.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        No transactions yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {transactions?.map((tx: any) => (
                                            <div key={tx.id} className="flex justify-between items-center bg-black/20 p-4 rounded-lg border border-zinc-800">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        <StreamCoin size="sm" className={tx.amount > 0 ? 'text-green-500' : 'text-red-500'} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{tx.description}</p>
                                                        <p className="text-xs text-gray-500">{format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                                                    </div>
                                                </div>
                                                <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
