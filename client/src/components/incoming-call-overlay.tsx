import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, PhoneIncoming, MicOff, Mic, X } from 'lucide-react';
import { useSocialSocket } from '@/hooks/use-social-socket';
import { useAuth } from '@/contexts/auth-context';

interface CallState {
    isReceivingCall: boolean;
    isInCall: boolean;
    callerId: string | null;
    callerName: string | null;
    callerAvatar: string | null;
    isMuted: boolean;
    callDuration: number;
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export function IncomingCallOverlay() {
    const { user } = useAuth();
    const { socket } = useSocialSocket();

    const [callState, setCallState] = useState<CallState>({
        isReceivingCall: false,
        isInCall: false,
        callerId: null,
        callerName: null,
        callerAvatar: null,
        isMuted: false,
        callDuration: 0,
    });

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio elements
    useEffect(() => {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;

        // Try to create ringtone (will fail silently if file doesn't exist)
        ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
        ringtoneRef.current.loop = true;

        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    };

    const startCallTimer = () => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
        }, 1000);
    };

    const createPeerConnection = (targetUserId: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call:ice-candidate', {
                    toUserId: targetUserId,
                    fromUserId: user?.id,
                    candidate: event.candidate.toJSON(),
                });
            }
        };

        pc.ontrack = (event) => {
            if (remoteAudioRef.current && event.streams[0]) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const getUserMedia = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        return stream;
    };

    const acceptCall = async () => {
        if (!socket || !user?.id || !callState.callerId) return;

        try {
            ringtoneRef.current?.pause();
            if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

            const stream = await getUserMedia();
            const pc = createPeerConnection(callState.callerId);

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            socket.emit('call:accept', {
                toUserId: callState.callerId,
                fromUserId: user.id,
            });

            setCallState(prev => ({
                ...prev,
                isReceivingCall: false,
                isInCall: true,
                callDuration: 0,
            }));

            startCallTimer();
        } catch (error) {
            console.error('Failed to accept call:', error);
            declineCall();
        }
    };

    const declineCall = () => {
        if (!socket || !user?.id || !callState.callerId) return;

        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

        socket.emit('call:decline', {
            toUserId: callState.callerId,
            fromUserId: user.id,
            declinedByName: user.username,
        });

        cleanup();
        setCallState({
            isReceivingCall: false,
            isInCall: false,
            callerId: null,
            callerName: null,
            callerAvatar: null,
            isMuted: false,
            callDuration: 0,
        });
    };

    // Dismiss call silently (just close overlay without notifying caller)
    const dismissCall = () => {
        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

        cleanup();
        setCallState({
            isReceivingCall: false,
            isInCall: false,
            callerId: null,
            callerName: null,
            callerAvatar: null,
            isMuted: false,
            callDuration: 0,
        });
    };

    const endCall = () => {
        if (socket && user?.id && callState.callerId) {
            socket.emit('call:end', {
                toUserId: callState.callerId,
                fromUserId: user.id,
            });
        }

        cleanup();
        setCallState({
            isReceivingCall: false,
            isInCall: false,
            callerId: null,
            callerName: null,
            callerAvatar: null,
            isMuted: false,
            callDuration: 0,
        });
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
            }
        }
    };

    // Listen for socket events
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data: { fromUserId: string; fromUsername: string; fromAvatar?: string }) => {
            console.log('📞 GLOBAL: Incoming call from:', data.fromUsername);

            ringtoneRef.current?.play().catch(() => { });

            setCallState(prev => ({
                ...prev,
                isReceivingCall: true,
                callerId: data.fromUserId,
                callerName: data.fromUsername,
                callerAvatar: data.fromAvatar || null,
            }));
        };

        const handleCallEnded = () => {
            console.log('📴 GLOBAL: Call ended');
            cleanup();
            setCallState({
                isReceivingCall: false,
                isInCall: false,
                callerId: null,
                callerName: null,
                callerAvatar: null,
                isMuted: false,
                callDuration: 0,
            });
        };

        const handleOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);

                socket.emit('call:answer', {
                    toUserId: data.fromUserId,
                    fromUserId: user?.id,
                    answer: answer,
                });
            } catch (error) {
                console.error('Failed to handle offer:', error);
            }
        };

        const handleAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
                console.error('Failed to handle answer:', error);
            }
        };

        const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Failed to add ICE candidate:', error);
            }
        };

        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:ended', handleCallEnded);
        socket.on('call:offer', handleOffer);
        socket.on('call:answer', handleAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);

        return () => {
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:ended', handleCallEnded);
            socket.off('call:offer', handleOffer);
            socket.off('call:answer', handleAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
        };
    }, [socket, user?.id]);

    // Show nothing if no call active
    if (!callState.isReceivingCall && !callState.isInCall) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center relative">
                {/* Incoming Call UI */}
                {callState.isReceivingCall && (
                    <>
                        {/* Dismiss button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 rounded-full hover:bg-muted h-8 w-8 bg-card border shadow-md"
                            onClick={dismissCall}
                            title="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <div className="mb-6">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mb-4 animate-pulse">
                                {callState.callerAvatar ? (
                                    <img
                                        src={callState.callerAvatar}
                                        alt={callState.callerName || 'Caller'}
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {callState.callerName?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                )}
                            </div>
                            <PhoneIncoming className="h-8 w-8 mx-auto text-green-500 animate-bounce mb-2" />
                            <h2 className="text-xl font-bold">{callState.callerName}</h2>
                            <p className="text-muted-foreground">Incoming voice call...</p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button
                                size="lg"
                                className="bg-green-500 hover:bg-green-600 rounded-full w-16 h-16"
                                onClick={acceptCall}
                            >
                                <Phone className="h-6 w-6" />
                            </Button>
                            <Button
                                size="lg"
                                variant="destructive"
                                className="rounded-full w-16 h-16"
                                onClick={declineCall}
                            >
                                <PhoneOff className="h-6 w-6" />
                            </Button>
                        </div>
                    </>
                )}

                {/* Active Call UI */}
                {callState.isInCall && (
                    <>
                        <div className="mb-6">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
                                {callState.callerAvatar ? (
                                    <img
                                        src={callState.callerAvatar}
                                        alt={callState.callerName || 'Caller'}
                                        className="w-20 h-20 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {callState.callerName?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                )}
                            </div>
                            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2 animate-pulse" />
                            <h2 className="text-xl font-bold">{callState.callerName}</h2>
                            <p className="text-2xl font-mono text-green-500">
                                {Math.floor(callState.callDuration / 60).toString().padStart(2, '0')}:
                                {(callState.callDuration % 60).toString().padStart(2, '0')}
                            </p>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button
                                size="lg"
                                variant={callState.isMuted ? "destructive" : "outline"}
                                className="rounded-full w-16 h-16"
                                onClick={toggleMute}
                            >
                                {callState.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                            </Button>
                            <Button
                                size="lg"
                                variant="destructive"
                                className="rounded-full w-16 h-16"
                                onClick={endCall}
                            >
                                <PhoneOff className="h-6 w-6" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
