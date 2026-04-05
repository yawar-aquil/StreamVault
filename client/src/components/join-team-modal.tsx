import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code, Users, Rocket, ArrowRight, Crown } from "lucide-react";
import { useLocation } from "wouter";

export function JoinTeamModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [, setLocation] = useLocation();

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-join-team-modal', handleOpen);
        return () => window.removeEventListener('open-join-team-modal', handleOpen);
    }, []);

    useEffect(() => {
        // Randomly show the modal to invite contributors
        // Use a different key so it doesn't conflict with feedback modal
        const LAST_PROMPT_KEY = "last-join-team-prompt";
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        
        const lastPrompt = localStorage.getItem(LAST_PROMPT_KEY);
        const now = Date.now();
        
        if (!lastPrompt || (now - parseInt(lastPrompt)) > ONE_WEEK_MS) {
            // Random delay between 5 and 15 minutes into the session
            // Slightly longer than the feedback modal to prevent both popping up at the same time
            const randomDelay = Math.floor(Math.random() * (15 * 60 * 1000 - 5 * 60 * 1000 + 1)) + 5 * 60 * 1000;
            
            const timer = setTimeout(() => {
                setIsOpen(true);
                localStorage.setItem(LAST_PROMPT_KEY, now.toString());
            }, randomDelay);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleJoinTeam = () => {
        handleClose();
        setLocation("/join-team");
    };

    return (
        <>
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] transition-all duration-300 animate-in fade-in"
                    aria-hidden="true"
                    onClick={handleClose}
                />,
                document.body
            )}

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
            }} modal={false}>
                <DialogContent
                    className="w-[90%] sm:w-full sm:max-w-md bg-zinc-950 border-primary/20 text-white p-0 overflow-hidden shadow-[0_0_100px_-20px_rgba(220,38,38,0.3)] z-[100] rounded-2xl"
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    {/* Header Image */}
                    <div className="h-32 bg-zinc-950 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                        
                        {/* Streamvault Animated Logo */}
                        <div className="relative z-10 flex items-center justify-center -mt-4">
                            <img
                                src="/streamvault-animated-logo-png.svg?v=2"
                                alt="StreamVault"
                                className="w-24 h-24 drop-shadow-xl"
                            />
                        </div>
                        
                        {/* Background Decorative Icon */}
                        <div className="absolute z-0 opacity-5 transform scale-150">
                            <Crown className="w-40 h-40 text-red-500" />
                        </div>
                    </div>

                    <div className="px-6 py-6 pb-2 text-center relative z-10 -mt-6">
                        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-rose-400 mb-2">
                                    Help Build StreamVault!
                                </DialogTitle>
                                <DialogDescription className="text-gray-300 text-sm leading-relaxed space-y-4 pt-2">
                                    <p>
                                        StreamVault is a community-driven project, and we're looking for passionate people to join our team. 
                                    </p>
                                    <p>
                                        Whether you're a <strong className="text-white">developer</strong>, a <strong className="text-white">designer</strong>, a <strong className="text-white">content curator</strong>, or just a movie lover who wants to help moderate the community — you are most welcome!
                                    </p>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex items-center justify-center gap-4 py-6">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Code className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Devs</span>
                                </div>
                                <div className="w-8 h-px bg-white/10"></div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Mods</span>
                                </div>
                                <div className="w-8 h-px bg-white/10"></div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Rocket className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Growth</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-950 flex flex-col gap-3">
                        <Button
                            onClick={handleJoinTeam}
                            className="w-full relative group overflow-hidden rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-12 text-lg transition-all"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer_2s_infinite]" />
                            <span className="flex items-center gap-2 relative z-10">
                                View Open Positions
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Button>
                        <button 
                            onClick={handleClose}
                            className="text-sm text-gray-500 hover:text-white transition-colors py-2"
                        >
                            Maybe later
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
