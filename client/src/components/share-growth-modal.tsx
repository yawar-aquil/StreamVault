import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Twitter, Facebook, Heart, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Use a simple custom icon for Reddit since lucide-react doesn't have it natively
const RedditIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zm-4.47 5.235c-1.393 0-2.52.92-2.52 2.055 0 1.135 1.127 2.055 2.52 2.055 1.393 0 2.52-.92 2.52-2.055 0-1.135-1.127-2.055-2.52-2.055zm.022 5.035c-1.12 0-2.028-.888-2.028-1.983 0-1.095.908-1.982 2.028-1.982 1.12 0 2.028.887 2.028 1.982 0 1.095-.908 1.983-2.028 1.983z" />
    </svg>
);

export function ShareGrowthModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    // Support for native Web Share API (mobile/safari)
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    const siteUrl = "https://streamvault.live";
    const shareMessage = "I'm watching my favorite shows on StreamVault! Join me for an ad-free premium experience 🚀";
    const encodedMessage = encodeURIComponent(shareMessage);
    const encodedUrl = encodeURIComponent(siteUrl);

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

    const shareNative = async () => {
        if (canNativeShare) {
            try {
                await navigator.share({
                    title: 'StreamVault',
                    text: shareMessage,
                    url: siteUrl,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        }
    };

    const shareExternal = (url: string) => {
        window.open(url, '_blank', 'width=600,height=600');
    };

    return (
        <>
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-all duration-300 animate-in fade-in"
                    aria-hidden="true"
                />,
                document.body
            )}

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
            }} modal={false}>
                <DialogContent
                    className="w-[90%] sm:w-full sm:max-w-md bg-black border-red-900/40 text-white p-0 overflow-hidden shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)] z-40 rounded-2xl"
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
                                className="bg-red-600 hover:bg-red-700 text-white transition-all w-24 gap-2 border border-red-500/50 shadow-lg shadow-red-900/20"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-900/30 flex flex-col gap-3">
                        <div className="text-sm text-center text-gray-500 mb-2 font-medium">Or share directly on</div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <Button 
                                asChild
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-[#25D366] hover:text-[#25D366] group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                            >
                                <a href={`https://api.whatsapp.com/send?text=${encodedMessage}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    WhatsApp
                                </a>
                            </Button>

                            <Button 
                                asChild
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-[#0088cc] hover:text-[#0088cc] group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                            >
                                <a href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`} target="_blank" rel="noopener noreferrer">
                                    <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Telegram
                                </a>
                            </Button>

                            <Button 
                                asChild
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-[#1DA1F2] hover:text-[#1DA1F2] group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                            >
                                <a href={`https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
                                    <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    X (Twitter)
                                </a>
                            </Button>

                            <Button 
                                asChild
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-[#4267B2] hover:text-[#4267B2] group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                            >
                                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
                                    <Facebook className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Facebook
                                </a>
                            </Button>
                            
                            <Button 
                                asChild
                                variant="outline" 
                                className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-[#FF4500] hover:text-[#FF4500] group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                            >
                                <a href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedMessage}`} target="_blank" rel="noopener noreferrer">
                                    <RedditIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Reddit
                                </a>
                            </Button>

                            {/* Only show "More Options" natively if supported by browser (mobile default share sheet brings up Instagram natively) */}
                            {canNativeShare && (
                                <Button 
                                    onClick={shareNative}
                                    variant="outline" 
                                    className="bg-black border-zinc-800 hover:bg-zinc-900 hover:border-white hover:text-white group gap-2 text-gray-300 h-10 transition-colors w-full cursor-pointer"
                                    type="button"
                                >
                                    <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    More Options
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
