import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Twitter, Facebook, Sparkles, Heart, Rocket } from "lucide-react";
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
                    className="w-[90%] sm:w-full sm:max-w-md bg-black/80 backdrop-blur-2xl border-[#6961ff]/40 text-white p-0 overflow-hidden shadow-[0_0_80px_-20px_rgba(105,97,255,0.4)] z-50 rounded-3xl"
                    onInteractOutside={(e) => {
                        e.preventDefault(); // Don't close on click outside, force conscious dismissal or X
                    }}
                >
                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-[#6961ff]/80 to-purple-900/40 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                        
                        {/* Animated Glow in Header */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#6961ff]/50 rounded-full blur-3xl animate-pulse" />

                        {/* Centered Icon */}
                        <div className="relative z-10 w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-6 transition-transform">
                            <Rocket className="w-8 h-8 text-white" />
                        </div>

                        {/* Decorative background icons */}
                        <div className="absolute z-0 opacity-10 transform -rotate-12 left-4 top-4">
                            <Sparkles className="w-16 h-16 text-white" />
                        </div>
                        <div className="absolute z-0 opacity-10 transform rotate-12 right-4 bottom-4">
                            <Heart className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    <DialogHeader className="px-6 pt-6 text-center space-y-3">
                        <DialogTitle className="text-2xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-white to-[#a5b4fc]">
                            Help StreamVault Grow! 🚀
                        </DialogTitle>
                        <DialogDescription className="text-gray-300 font-inter text-base">
                            We're building the ultimate streaming experience. Share StreamVault with your friends and family to help our community expand!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        <div className="flex gap-2">
                            <Input 
                                readOnly 
                                value={siteUrl} 
                                className="bg-white/5 border-white/10 text-white/80 focus-visible:ring-[#6961ff]"
                            />
                            <Button 
                                onClick={handleCopy}
                                className="bg-[#6961ff] hover:bg-[#5851ff] text-white transition-all w-24 gap-2"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-white/5 border-t border-white/10 flex flex-col gap-3 pb-8">
                        <div className="text-sm text-center text-white/50 mb-2 font-medium">Or share directly</div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                onClick={shareOnTwitter}
                                variant="outline" 
                                className="bg-black/40 border-white/10 hover:bg-white/10 hover:text-white group gap-2"
                            >
                                <Twitter className="w-4 h-4 text-[#1DA1F2] group-hover:scale-110 transition-transform" />
                                X (Twitter)
                            </Button>
                            <Button 
                                onClick={shareOnFacebook}
                                variant="outline" 
                                className="bg-black/40 border-white/10 hover:bg-white/10 hover:text-white group gap-2"
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
