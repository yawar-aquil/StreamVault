import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Settings as SettingsIcon, X, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface IWindow extends Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
}

export function VaultAssistant() {
    const { user } = useAuth();
    const [isListening, setIsListening] = useState(false); // Active command listening
    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
    const [transcript, setTranscript] = useState("");
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Settings (safe defaults)
    // Settings (safe defaults - DISABLED BY DEFAULT)
    const getSettings = () => {
        try {
            return user?.vaultSettings ? JSON.parse(user.vaultSettings) : {
                enabled: false, // OFF by default as requested
                inputMode: "voice_always",
                activationWord: "hey vault",
                glowColor: "#ef4444",
                fontFamily: "Inter",
                fontSize: "lg",
                glowIntensity: 50,
            };
        } catch (e) {
            return {
                enabled: false,
                inputMode: "voice_always",
                activationWord: "hey vault",
                glowColor: "#ef4444",
                fontFamily: "Inter",
                fontSize: "lg",
                glowIntensity: 50,
            };
        }
    }

    const settings = getSettings();

    const activationWord = settings.activationWord.toLowerCase();

    // Use refs to track state inside event listeners without re-running effects
    const isListeningRef = useRef(isListening);
    const recognitionInstance = useRef<any>(null);

    // Keep ref in sync
    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Logic to prevent re-renders (Standby Mode)
    // We only update state if we are ACTIVELY listening/processing OR if we detect the wake word

    useEffect(() => {
        if (!settings.enabled) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log("Vault Assistant: Started Listening");
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const cleanTranscript = (finalTranscript || interimTranscript).toLowerCase().trim();

            // ALWAYS update transcript if we have content, so the user sees something
            // Check ref to determine if we should be "Actively Processing" visually
            if (isListeningRef.current && cleanTranscript) {
                setTranscript(cleanTranscript);
            }

            // Wake Word Logic
            if (settings.inputMode === 'voice_always' && !isListeningRef.current) {
                if (cleanTranscript.includes(activationWord)) {
                    activateAssistant();
                }
            }

            // processing
            if (isListeningRef.current && finalTranscript) {
                processCommand(finalTranscript);
            }
        };

        recognition.onend = () => {
            // Restart strictly if we are supposed to be always listening
            if (settings.enabled && settings.inputMode === 'voice_always') {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Restart error", e);
                }
            } else {
                if (status === 'listening') setStatus("idle");
            }
        };

        recognitionInstance.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            console.error("Start error", e);
        }

        return () => {
            recognition.stop();
        };
    }, [settings.enabled, settings.inputMode]); // Removed isListening from deps to prevent re-init loops

    const activateAssistant = () => {
        setIsListening(true);
        setStatus("listening");
        setTranscript(""); // Clear previous
        toast({ title: "Vault Activated", description: "Listening for command..." });

        // Auto-close after silence - extend to 10s
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            deactivateAssistant();
        }, 10000);
    };

    const deactivateAssistant = () => {
        setIsListening(false);
        setStatus("idle");
        setTranscript("");
    };

    const processCommand = (command: string) => {
        const lower = command.toLowerCase();
        console.log("Processing:", lower);

        // Reset silence timer on command
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
            deactivateAssistant();
        }, 10000);

        // [Navigation Logic Same as Before]
        if (lower.includes("go to home")) setLocation("/");
        else if (lower.includes("go to movies")) setLocation("/movies");
        else if (lower.includes("go to shows") || lower.includes("go to series")) setLocation("/series");
        else if (lower.includes("go to anime")) setLocation("/anime");
        else if (lower.includes("go to settings")) setLocation("/settings");
        else if (lower.includes("go to profile")) setLocation("/profile");
        else if (lower.includes("go to social") || lower.includes("go to community")) setLocation("/social");
        else if (lower.includes("search for") || lower.includes("find")) {
            const query = lower.replace("search for", "").replace("find", "").trim();
            if (query) setLocation(`/search?q=${encodeURIComponent(query)}`);
            deactivateAssistant(); // Close after search
        }
        else if (lower.includes("scroll down")) window.scrollBy({ top: 500, behavior: 'smooth' });
        else if (lower.includes("scroll up")) window.scrollBy({ top: -500, behavior: 'smooth' });
        else if (lower.includes("stop") || lower.includes("close")) deactivateAssistant();
    };

    if (!settings.enabled) return null;

    // Font Size Logic
    const fontSizeMap: any = { sm: "text-lg", md: "text-2xl", lg: "text-4xl", xl: "text-6xl" };

    return (
        <AnimatePresence>
            {/* Full Screen Overlay (When Listening) */}
            {status === 'listening' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)`,
                        boxShadow: `inset 0 0 ${settings.glowIntensity * 2}px ${settings.glowColor}80`
                    }}
                >
                    {/* Centered Transcript */}
                    <div className="text-center px-4 w-full pointer-events-auto flex flex-col items-center justify-center">
                        <motion.div
                            key={transcript} // Animate on change
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className={`font-bold text-white drop-shadow-lg ${fontSizeMap[settings.fontSize || 'lg']} transition-all duration-200`}
                            style={{
                                fontFamily: settings.fontFamily || "Inter",
                                textShadow: `0 0 20px ${settings.glowColor}`
                            }}
                        >
                            {transcript || "Listening..."}
                        </motion.div>
                        <Button
                            variant="ghost"
                            className="mt-8 text-white/50 hover:text-white"
                            onClick={deactivateAssistant}
                        >
                            Tap to Cancel
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Corner Orb (Always Visible if Enabled) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed bottom-6 right-6 z-50 group"
            >
                <div
                    className={`relative w-16 h-16 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 ${status === 'listening' ? 'scale-110' : 'hover:scale-105'}`}
                    style={{
                        boxShadow: `0 0 ${status === 'listening' ? 30 : 10}px ${settings.glowColor}${status === 'listening' ? '80' : '20'}`,
                        borderColor: status === 'listening' ? settings.glowColor : 'rgba(255,255,255,0.1)'
                    }}
                    onClick={() => status === 'listening' ? deactivateAssistant() : activateAssistant()}
                >
                    {status === 'listening' && (
                        <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: settings.glowColor }} />
                    )}
                    <Mic className={`w-6 h-6 transition-colors duration-300 ${status === 'listening' ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
            </motion.div>
        </AnimatePresence >
    );
}

// Add these types to global or use any
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}
