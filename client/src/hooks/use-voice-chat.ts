import { useEffect, useRef, useState, useCallback } from 'react';
// @ts-ignore - simple-peer doesn't have proper ESM exports
import SimplePeer from 'simple-peer/simplepeer.min.js';
import type { Socket } from 'socket.io-client';

interface VoiceChatOptions {
    socket: Socket | null;
    roomUsers: { id: string; username: string }[];
    currentUserId: string | null;
    enabled?: boolean;
    onMutedByHost?: () => void; // Called when host mutes user
    onUnmuteRequest?: (onAccept: () => void, onReject: () => void) => void; // Called when host asks to unmute
}

interface PeerConnection {
    peerId: string;
    peer: any; // SimplePeer instance
    stream?: MediaStream;
}

export function useVoiceChat({ socket, roomUsers, currentUserId, enabled = true, onMutedByHost, onUnmuteRequest }: VoiceChatOptions) {
    const [isMuted, setIsMuted] = useState(true);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, PeerConnection>>(new Map());
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const pendingAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    // Ref to always have the latest isMuted value inside the animation frame loop (avoids stale closure)
    const isMutedRef = useRef(true);
    // Refs for debounced speaking detection (avoids rapid true/false bouncing)
    const lastSpeakingRef = useRef(false);
    const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Consecutive frames above threshold required before triggering speaking (prevents ambient noise)
    const speakingFramesRef = useRef(0);
    // Ref to the socket for direct emission from the rAF loop
    const socketRef = useRef<typeof socket>(null);

    // Keep isMutedRef in sync with isMuted state
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Keep socketRef in sync with socket prop
    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    // Resume all pending audio after user interaction
    useEffect(() => {
        const unlockAudio = () => {
            console.log('🔓 Attempting to unlock pending audio...');
            pendingAudioRef.current.forEach(audio => {
                audio.play()
                    .then(() => {
                        console.log('🔊 Audio unlocked and playing!');
                        pendingAudioRef.current.delete(audio);
                    })
                    .catch(err => console.error('Still blocked:', err));
            });
        };

        // Add click listeners to unlock audio after user interaction
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    // Initialize microphone
    const initMicrophone = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            localStreamRef.current = stream;

            // Setup audio analyzer for speaking detection
            try {
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;

                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);

                // Start speaking detection loop with debouncing + hysteresis
                const SPEAK_THRESHOLD = 35;  // Must exceed this to START speaking (filters ambient noise)
                const STOP_THRESHOLD = 20;   // Must drop below this to STOP speaking (hysteresis)
                const SPEAK_FRAMES_REQUIRED = 4; // Consecutive frames above threshold to confirm speaking

                const detectSpeaking = () => {
                    if (!analyserRef.current || isMutedRef.current) {
                        // Muted — immediately clear speaking state
                        speakingFramesRef.current = 0;
                        if (speakingTimeoutRef.current) {
                            clearTimeout(speakingTimeoutRef.current);
                            speakingTimeoutRef.current = null;
                        }
                        if (lastSpeakingRef.current) {
                            lastSpeakingRef.current = false;
                            setIsSpeaking(false);
                            socketRef.current?.emit('voice:speaking', { isSpeaking: false });
                        }
                        animationFrameRef.current = requestAnimationFrame(detectSpeaking);
                        return;
                    }

                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

                    if (!lastSpeakingRef.current) {
                        // Not currently speaking — need N consecutive frames above SPEAK_THRESHOLD
                        if (average > SPEAK_THRESHOLD) {
                            speakingFramesRef.current++;
                            if (speakingFramesRef.current >= SPEAK_FRAMES_REQUIRED) {
                                // Confirmed speaking — clear any silence debounce and fire
                                if (speakingTimeoutRef.current) {
                                    clearTimeout(speakingTimeoutRef.current);
                                    speakingTimeoutRef.current = null;
                                }
                                lastSpeakingRef.current = true;
                                setIsSpeaking(true);
                                socketRef.current?.emit('voice:speaking', { isSpeaking: true });
                            }
                        } else {
                            speakingFramesRef.current = 0; // Reset counter if frame drops below threshold
                        }
                    } else {
                        // Currently speaking — stop only when audio drops below STOP_THRESHOLD for 400ms
                        speakingFramesRef.current = 0;
                        if (average < STOP_THRESHOLD) {
                            if (!speakingTimeoutRef.current) {
                                speakingTimeoutRef.current = setTimeout(() => {
                                    lastSpeakingRef.current = false;
                                    setIsSpeaking(false);
                                    socketRef.current?.emit('voice:speaking', { isSpeaking: false });
                                    speakingTimeoutRef.current = null;
                                }, 400);
                            }
                        } else {
                            // Still speaking — cancel any pending silence timeout
                            if (speakingTimeoutRef.current) {
                                clearTimeout(speakingTimeoutRef.current);
                                speakingTimeoutRef.current = null;
                            }
                        }
                    }

                    animationFrameRef.current = requestAnimationFrame(detectSpeaking);
                };
                detectSpeaking();
            } catch (analyserError) {
                console.warn('Audio analyzer not supported:', analyserError);
            }

            // Start muted
            stream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });

            setIsVoiceEnabled(true);
            setError(null);
            console.log('🎤 Microphone initialized');
            return stream;
        } catch (err: any) {
            console.error('Failed to get microphone:', err);
            setError(err.message || 'Failed to access microphone');
            return null;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Create a peer connection
    const createPeer = useCallback((targetId: string, initiator: boolean, stream: MediaStream) => {
        if (!socket) {
            console.warn('Cannot create peer: socket not connected');
            return null;
        }

        try {
            console.log(`🔗 Creating peer connection to ${targetId}, initiator: ${initiator}`);

            const peer = new SimplePeer({
                initiator,
                trickle: true,
                stream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('signal', (signal: any) => {
                socket?.emit('voice:signal', { targetId, signal });
            });

            peer.on('stream', (remoteStream: MediaStream) => {
                console.log(`🔊 Received stream from ${targetId}`, remoteStream);
                console.log('🔊 Audio tracks:', remoteStream.getAudioTracks());

                // Create audio element for this peer and attach to DOM
                let audio = audioElementsRef.current.get(targetId);
                if (!audio) {
                    audio = document.createElement('audio');
                    audio.id = `remote-audio-${targetId}`;
                    audio.autoplay = true;
                    audio.setAttribute('playsinline', 'true');
                    audio.controls = false;
                    // Append to document body for browsers that require it
                    document.body.appendChild(audio);
                    audioElementsRef.current.set(targetId, audio);
                }

                audio.srcObject = remoteStream;
                audio.volume = 1.0;

                // Try to play, handle autoplay restrictions
                const audioElement = audio;
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log(`🔊 Audio playing for ${targetId}`);
                            pendingAudioRef.current.delete(audioElement);
                        })
                        .catch(err => {
                            console.error('Audio play failed (autoplay blocked):', err.message);
                            console.log('🔒 Audio queued for unlock after user interaction');
                            // Add to pending queue - will be played after user clicks/taps
                            pendingAudioRef.current.add(audioElement);
                        });
                }
            });

            peer.on('connect', () => {
                console.log(`✅ Connected to peer ${targetId}`);
                setConnectedPeers(prev => {
                    const newSet = new Set(prev);
                    newSet.add(targetId);
                    return Array.from(newSet);
                });
            });

            peer.on('close', () => {
                console.log(`❌ Disconnected from peer ${targetId}`);
                setConnectedPeers(prev => prev.filter(id => id !== targetId));
                peersRef.current.delete(targetId);

                const audio = audioElementsRef.current.get(targetId);
                if (audio) {
                    audio.srcObject = null;
                    audio.remove(); // Remove from DOM
                    audioElementsRef.current.delete(targetId);
                }
            });

            peer.on('error', (err: Error) => {
                console.error(`Peer error with ${targetId}:`, err);
            });

            peersRef.current.set(targetId, { peerId: targetId, peer });
            return peer;
        } catch (err) {
            console.error('Failed to create peer connection:', err);
            return null;
        }
    }, [socket]);

    // Handle incoming signals + voice:user-ready for proper mesh
    useEffect(() => {
        if (!socket || !isVoiceEnabled || !localStreamRef.current) return;

        const handleSignal = ({ fromId, signal }: { fromId: string; signal: any }) => {
            console.log(`📡 Received signal from ${fromId}`);

            let peerConnection = peersRef.current.get(fromId);

            if (!peerConnection) {
                // Create new non-initiator peer for incoming connection
                const peer = createPeer(fromId, false, localStreamRef.current!);
                if (!peer) {
                    console.warn('Failed to create peer for incoming connection');
                    return;
                }
                peerConnection = { peerId: fromId, peer };
                peersRef.current.set(fromId, peerConnection);
            }

            try {
                peerConnection.peer.signal(signal);
            } catch (err) {
                console.error('Error signaling peer:', err);
                // If peer is destroyed or errored, recreate it
                peersRef.current.delete(fromId);
                const newPeer = createPeer(fromId, false, localStreamRef.current!);
                if (newPeer) {
                    peersRef.current.set(fromId, { peerId: fromId, peer: newPeer });
                    try { newPeer.signal(signal); } catch (e) { console.error('Retry signal also failed:', e); }
                }
            }
        };

        // When another user broadcasts voice:ready, we (as an existing voice user)
        // initiate a connection TO them. This ensures a clean initiator/non-initiator split.
        const handleUserReady = ({ userId }: { userId: string }) => {
            console.log(`🎤 User ${userId} is voice-ready, initiating connection`);
            if (userId === socket.id) return; // Ignore self
            // Destroy any stale peer first
            const existing = peersRef.current.get(userId);
            if (existing) {
                try { existing.peer.destroy(); } catch (_) {}
                peersRef.current.delete(userId);
            }
            createPeer(userId, true, localStreamRef.current!);
        };

        socket.on('voice:signal', handleSignal);
        socket.on('voice:user-ready', handleUserReady);

        // Handle being muted/unmuted by host
        const handleMutedByHost = ({ isMuted: shouldMute }: { isMuted: boolean }) => {
            console.log(`🔇 Host ${shouldMute ? 'muted' : 'requested unmute from'} you`);

            if (shouldMute) {
                // Host muting - force mute immediately
                if (localStreamRef.current) {
                    localStreamRef.current.getAudioTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                isMutedRef.current = true;
                setIsMuted(true);
                // Call custom callback instead of alert
                onMutedByHost?.();
            } else {
                // Host asking to unmute - call custom callback with accept/reject handlers
                const onAccept = () => {
                    if (localStreamRef.current) {
                        localStreamRef.current.getAudioTracks().forEach(track => {
                            track.enabled = true;
                        });
                    }
                    setIsMuted(false);
                };
                const onReject = () => {
                    // User declined - keep muted
                    console.log('User declined unmute request');
                };
                onUnmuteRequest?.(onAccept, onReject);
            }
        };

        socket.on('voice:muted-by-host', handleMutedByHost);

        return () => {
            socket.off('voice:signal', handleSignal);
            socket.off('voice:user-ready', handleUserReady);
            socket.off('voice:muted-by-host', handleMutedByHost);
        };
    }, [socket, isVoiceEnabled, createPeer]);

    // Clean up peers for users who left the room
    useEffect(() => {
        if (!isVoiceEnabled || !currentUserId) return;

        const currentUserIds = new Set(roomUsers.map(u => u.id));
        peersRef.current.forEach((pc, peerId) => {
            if (!currentUserIds.has(peerId)) {
                console.log(`🔇 Cleaning up peer for departed user ${peerId}`);
                try { pc.peer.destroy(); } catch (_) {}
                peersRef.current.delete(peerId);
                const audio = audioElementsRef.current.get(peerId);
                if (audio) {
                    audio.srcObject = null;
                    audio.remove();
                    audioElementsRef.current.delete(peerId);
                }
                setConnectedPeers(prev => prev.filter(id => id !== peerId));
            }
        });
    }, [roomUsers, isVoiceEnabled, currentUserId]);

    // Emit speaking state to server — now handled directly in detectSpeaking loop via socketRef
    // This effect is kept as a fallback for initial state sync
    useEffect(() => {
        if (!socket || !isVoiceEnabled) return;
        // Only sync the initial not-speaking state when voice is first enabled
        socket.emit('voice:speaking', { isSpeaking: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVoiceEnabled]);


    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;

        const newMuted = !isMuted;
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !newMuted;
        });
        isMutedRef.current = newMuted; // update ref immediately so detection loop sees it
        setIsMuted(newMuted);

        // Notify server
        socket?.emit('voice:toggle-mute', { isMuted: newMuted });

        console.log(newMuted ? '🔇 Muted' : '🔊 Unmuted');
    }, [isMuted, socket]);

    // Start voice chat
    const startVoice = useCallback(async () => {
        const stream = await initMicrophone();
        if (stream && socket) {
            // Broadcast to room that we're ready for voice connections.
            // Existing voice-enabled users will initiate connections to us.
            console.log('🎤 Broadcasting voice:ready to room');
            socket.emit('voice:ready');
        }
    }, [initMicrophone, socket]);

    // Stop voice chat
    const stopVoice = useCallback(() => {
        // Stop all audio tracks
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;

        // Close all peer connections
        peersRef.current.forEach(({ peer }) => {
            peer.destroy();
        });
        peersRef.current.clear();

        // Clean up audio elements
        audioElementsRef.current.forEach(audio => {
            audio.srcObject = null;
        });
        audioElementsRef.current.clear();

        setIsVoiceEnabled(false);
        setConnectedPeers([]);
        setIsMuted(true);

        console.log('🔇 Voice chat stopped');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVoice();
        };
    }, [stopVoice]);

    return {
        isMuted,
        isVoiceEnabled,
        isSpeaking,
        connectedPeers,
        error,
        toggleMute,
        startVoice,
        stopVoice
    };
}
