
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Star, Users, MessageSquare, Download, Trophy, Palette, Crown, Target, PartyPopper, BarChart2, CodeXml } from "lucide-react";

export function GuestSignupModal() {
    const { user, isLoading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Only show for non-authenticated users
        if (!isLoading && !user) {
            const hasSeenModal = sessionStorage.getItem("hasSeenGuestModal");
            if (!hasSeenModal) {
                // Small delay to not be annoying immediately
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [user, isLoading]);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem("hasSeenGuestModal", "true");
    };

    if (user) return null;

    return (
        <>
            {/* Custom Backdrop for Translucent Blur while keeping background scrollable */}
            {/* Blocks clicks to underlying elements but visualizes blur */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300 animate-in fade-in"
                    aria-hidden="true"
                />,
                document.body
            )}

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
            }} modal={false}>
                <DialogContent
                    className="w-[90%] sm:w-full sm:max-w-md bg-black border-red-900/40 text-white p-0 overflow-hidden shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)] z-50 rounded-2xl"
                    onInteractOutside={(e) => {
                        // Prevent Radix from closing the modal on outside clicks
                        e.preventDefault();
                    }}
                >
                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-red-900 to-black relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

                        {/* Logo */}
                        <div className="relative z-10 flex flex-col items-center p-4">
                            <img
                                src="/streamvault-animated-logo-png.svg?v=2"
                                alt="StreamVault"
                                className="w-16 h-16 object-contain drop-shadow-2xl"
                            />
                        </div>

                        {/* Background Decorative Icon */}
                        <div className="absolute z-0 opacity-5 transform scale-150">
                            <Crown className="w-40 h-40 text-red-500" />
                        </div>
                    </div>

                    <DialogHeader className="px-6 pt-6 text-center">
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-600">
                            Unlock the Full Experience
                        </DialogTitle>
                        <DialogDescription className="text-gray-400 text-base mt-2">
                            You're missing out on premium features! Join StreamVault for free to access:
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <FeatureItem icon={Users} label="Friends System" />
                            <FeatureItem icon={MessageSquare} label="Direct Messages" />
                            <FeatureItem icon={PartyPopper} label="Watch Rooms" />
                            <FeatureItem icon={Download} label="Downloads" />
                            <FeatureItem icon={Trophy} label="Leaderboards" />
                            <FeatureItem icon={Star} label="Achievements" />
                            <FeatureItem icon={Palette} label="Premium Themes" />
                            <FeatureItem icon={BarChart2} label="Community Polls" />
                            <FeatureItem icon={Target} label="Daily Challenges" />
                            <FeatureItem icon={CodeXml} label="Developer API" />
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-900/30 flex flex-col gap-3">
                        <Link href="/register">
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg shadow-lg shadow-red-900/20 border-t border-red-500/20">
                                Create Free Account
                            </Button>
                        </Link>
                        <div className="text-center">
                            <span className="text-gray-500 text-xs">Already have an account? </span>
                            <Link href="/login" className="text-red-500 text-xs hover:underline">
                                Log in
                            </Link>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FeatureItem({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center gap-2 text-gray-300 group">
            <div className="p-1.5 rounded-md bg-zinc-900 text-red-500 group-hover:text-red-400 group-hover:bg-red-500/10 transition-colors">
                <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="group-hover:text-white transition-colors">{label}</span>
        </div>
    );
}
