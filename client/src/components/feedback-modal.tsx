import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Send, CheckCircle, Loader2, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export function FeedbackModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-feedback-modal', handleOpen);
        return () => window.removeEventListener('open-feedback-modal', handleOpen);
    }, []);

    useEffect(() => {
        // Randomly show the modal once a week during the session
        const LAST_PROMPT_KEY = "last-feedback-prompt";
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        
        const lastPrompt = localStorage.getItem(LAST_PROMPT_KEY);
        const now = Date.now();
        
        if (!lastPrompt || (now - parseInt(lastPrompt)) > ONE_WEEK_MS) {
            // Random delay between 2 and 10 minutes into the session
            const randomDelay = Math.floor(Math.random() * (10 * 60 * 1000 - 2 * 60 * 1000 + 1)) + 2 * 60 * 1000;
            
            const timer = setTimeout(() => {
                setIsOpen(true);
                localStorage.setItem(LAST_PROMPT_KEY, now.toString());
            }, randomDelay);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const handleSubmit = async () => {
        if (!category || !subject.trim() || !message.trim()) {
            toast({
                title: "Missing fields",
                description: "Please fill in the category, subject, and message.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    subject: subject.trim(),
                    message: message.trim(),
                    email: email.trim() || undefined,
                    username: user?.username || undefined,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setIsSubmitted(true);
                toast({
                    title: "Feedback Submitted! 🎉",
                    description: "Thanks for helping us improve StreamVault!",
                });
            } else {
                throw new Error(data.message);
            }
        } catch (err: any) {
            toast({
                title: "Failed to submit",
                description: err.message || "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        // Reset after animation
        setTimeout(() => {
            setIsSubmitted(false);
            setCategory("");
            setSubject("");
            setMessage("");
            setEmail("");
        }, 300);
    };

    return (
        <>

            {/* Modal Backdrop */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-all duration-300 animate-in fade-in"
                    aria-hidden="true"
                    onClick={handleClose}
                />,
                document.body
            )}

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) handleClose();
            }} modal={false}>
                <DialogContent
                    className="w-[90%] sm:w-full sm:max-w-md bg-black border-red-900/40 text-white p-0 overflow-hidden shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)] z-[100] rounded-2xl"
                    onInteractOutside={(e) => {
                        e.preventDefault();
                    }}
                >
                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-red-900 to-black relative flex items-center justify-center">
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
                            <Crown className="w-40 h-40 text-red-500" />
                        </div>
                    </div>

                    {isSubmitted ? (
                        /* Success State */
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Thank You! 🎉</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Your feedback has been submitted. We read every suggestion and will work on implementing the best ideas ASAP!
                            </p>
                            <Button
                                onClick={handleClose}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 shadow-lg shadow-red-900/20 border-t border-red-500/20"
                            >
                                Close
                            </Button>
                        </div>
                    ) : (
                        /* Form State */
                        <>
                            <DialogHeader className="px-6 pt-6 text-center">
                                <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-600">
                                    Share Your Ideas
                                </DialogTitle>
                                <DialogDescription className="text-gray-400 text-base mt-2">
                                    Help us build a better StreamVault! Suggest features, improvements, or report anything — we'll implement the best ideas ASAP.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="px-6 py-4 space-y-3">
                                {/* Category */}
                                <div>
                                    <label className="text-xs text-gray-500 font-medium mb-1 block">Category *</label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-gray-300 focus:ring-red-500 h-9">
                                            <SelectValue placeholder="What's this about?" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 z-[110]">
                                            <SelectItem value="feature">🚀 Feature Request</SelectItem>
                                            <SelectItem value="improvement">✨ Improvement</SelectItem>
                                            <SelectItem value="bug">🐛 Bug Report</SelectItem>
                                            <SelectItem value="content">🎬 Content Suggestion</SelectItem>
                                            <SelectItem value="other">💬 Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="text-xs text-gray-500 font-medium mb-1 block">Subject *</label>
                                    <Input
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Brief title for your suggestion"
                                        className="bg-zinc-900 border-zinc-700 text-gray-300 focus-visible:ring-red-500 h-9"
                                        maxLength={100}
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="text-xs text-gray-500 font-medium mb-1 block">Your Feedback *</label>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Describe your idea, suggestion, or what needs improvement..."
                                        className="bg-zinc-900 border-zinc-700 text-gray-300 focus-visible:ring-red-500 min-h-[80px] resize-none"
                                        maxLength={1000}
                                    />
                                    <div className="text-right text-xs text-gray-600 mt-1">{message.length}/1000</div>
                                </div>

                                {/* Email (optional) */}
                                <div>
                                    <label className="text-xs text-gray-500 font-medium mb-1 block">Email <span className="text-gray-600">(optional — for follow-up)</span></label>
                                    <Input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        type="email"
                                        className="bg-zinc-900 border-zinc-700 text-gray-300 focus-visible:ring-red-500 h-9"
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-900/30 flex flex-col gap-3">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !category || !subject.trim() || !message.trim()}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg shadow-lg shadow-red-900/20 border-t border-red-500/20 gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit Feedback
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
