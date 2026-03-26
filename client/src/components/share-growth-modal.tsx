import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Twitter, Facebook, Heart, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ShareGrowthModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const siteUrl = "https://streamvault.live";

    useEffect(() => {
        // Show once per session
        const hasSeenModal = sessionStorage.getItem("hasSeenShareModal");
        if (!hasSeenModal) {
            // Delay for 3 seconds so it's not immediately thrown in their face
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem("hasSeenShareModal", "true");
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(siteUrl);
        setCopied(true);
        toast({
            title: "Link Copied!",
            description: "Thanks for sharing StreamVault with your friends!",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOnTwitter = () => {
        const text = encodeURIComponent("I'm watching my favorite shows on StreamVault! Join me for an ad-free premium experience 🚀");
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(siteUrl)}`, '_blank');
    };

    const shareOnFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`, '_blank');
    };

    return (
        <>
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
                        e.preventDefault(); // Don't close on click outside, force conscious dismissal or X
                    }}
                >
                    {/* Header Image / Gradient - Matches GuestSignupModal exactly */}
                    <div className="h-32 bg-gradient-to-br from-red-900 to-black relative flex flex-col items-center justify-center border-b border-red-900/50">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                        
                        {/* Logo */}
                        <div className="relative z-10 flex flex-col items-center">
                            <img
                                src="/streamvault-logo.png"
                                alt="StreamVault"
                                className="w-auto h-12 drop-shadow-xl"
                            />
                        </div>

                        {/* Background Decorative Icon */}
                        <div className="absolute z-0 opacity-5 transform scale-150">
                            <Heart className="w-40 h-40 text-red-500" />
                        </div>
                    </div>

                    <DialogHeader className="px-6 pt-6 text-center">
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-600">
                            Help StreamVault Grow!
                        </DialogTitle>
                        <DialogDescription className="text-gray-400 text-base mt-2">
                            We're building the ultimate streaming experience. Share StreamVault with your friends and family to help our community expand!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-4">
                        <div className="flex gap-2">
                            <Input 
                                readOnly 
                                value={siteUrl} 
                                className="bg-zinc-900 border-zinc-700 text-gray-300 focus-visible:ring-red-500"
                            />
                            <Button 
                                onClick={handleCopy}
                                className="bg-red-600 hover:bg-red-700 text-white transition-all w-24 gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-900/30 flex flex-col gap-3">
                        <div className="text-sm text-center text-gray-500 mb-2 font-medium">Or share directly</div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={shareOnTwitter}
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:text-white group gap-2 text-gray-300 h-10"
                            >
                                <Twitter className="w-4 h-4 text-[#1DA1F2] group-hover:scale-110 transition-transform" />
                                X (Twitter)
                            </Button>
                            <Button 
                                onClick={shareOnFacebook}
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:text-white group gap-2 text-gray-300 h-10"
                            >
                                <Facebook className="w-4 h-4 text-[#4267B2] group-hover:scale-110 transition-transform" />
                                Facebook
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
