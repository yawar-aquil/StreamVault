
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnimatedAdFreeIcon } from "@/components/animated-ad-free-icon";
import { Link } from "wouter";
import { Check } from "lucide-react";

interface AdFreeUpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdFreeUpgradeModal({ open, onOpenChange }: AdFreeUpgradeModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-yellow-500/20">
                <DialogHeader className="flex flex-col items-center text-center space-y-4 pt-4">
                    <div className="w-20 h-20 text-yellow-500 animate-in zoom-in duration-500">
                        <AnimatedAdFreeIcon className="w-full h-full" />
                    </div>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                        Go Ad-Free
                    </DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground pt-2">
                        Experience StreamVault exactly how it was meant to be seen.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-yellow-500" />
                        </div>
                        <span>No interruptions, just pure entertainment</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-yellow-500" />
                        </div>
                        <span>Support the platform directly</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-yellow-500" />
                        </div>
                        <span>Exclusive "Ad-Free" badge on your profile</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pb-2">
                    <Link href="/store?category=subscription">
                        <Button
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold h-11 shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02]"
                            onClick={() => onOpenChange(false)}
                        >
                            View Plans
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenChange(false)}
                    >
                        Maybe Later
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
