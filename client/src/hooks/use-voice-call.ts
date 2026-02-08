import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export interface CallState {
    isInCall: boolean;
    isCalling: boolean;
    isReceivingCall: boolean;
    callerId: string | null;
    callerName: string | null;
    callerAvatar: string | null;
    isMuted: boolean;
    callDuration: number;
}

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
];

export function useVoiceCall(
    socket: Socket | null,
    userId: string | undefined,
    onMissedCall?: (type: 'declined' | 'not_answered' | 'cancelled', callerName: string) => void
) {
    const [callState, setCallState] = useState<CallState>({
        isInCall: false,
        isCalling: false,
        isReceivingCall: false,
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
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout for unanswered calls

    // Initialize remote audio element
    useEffect(() => {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;

        // Create ringtone
        ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
        ringtoneRef.current.loop = true;

        return () => {
            endCall();
        };
    }, []);

    // Start call duration timer
    const startCallTimer = useCallback(() => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
            setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
        }, 1000);
    }, []);

    // Stop call duration timer
    const stopCallTimer = useCallback(() => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    }, []);

    // Create peer connection
    const createPeerConnection = useCallback((targetUserId: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call:ice-candidate', {
                    toUserId: targetUserId,
                    fromUserId: userId,
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
    }, [socket, userId]);

    // Get user media
    const getUserMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            throw error;
        }
    };

    // Initiate a call
    const initiateCall = useCallback(async (targetUserId: string, targetUsername: string, myUsername: string, myAvatar?: string) => {
        if (!socket || !userId) return;

        try {
            setCallState(prev => ({
                ...prev,
                isCalling: true,
                callerId: targetUserId,
                callerName: targetUsername,
            }));

            // Play ringtone
            ringtoneRef.current?.play().catch(() => { });

            // Request the call
            socket.emit('call:initiate', {
                toUserId: targetUserId,
                fromUserId: userId,
                fromUsername: myUsername,
                fromAvatar: myAvatar,
            });

            // Set timeout for unanswered call (30 seconds)
            if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = setTimeout(() => {
                // Stop ringtone
                ringtoneRef.current?.pause();
                if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

                // Notify about unanswered call
                if (onMissedCall) {
                    onMissedCall('not_answered', targetUsername);
                }

                // Reset call state
                setCallState({
                    isInCall: false,
                    isCalling: false,
                    isReceivingCall: false,
                    callerId: null,
                    callerName: null,
                    callerAvatar: null,
                    isMuted: false,
                    callDuration: 0,
                });

                // Notify the recipient that we cancelled (so they dismiss their incoming call)
                socket.emit('call:end', {
                    toUserId: targetUserId,
                    fromUserId: userId,
                });
            }, 120000); // 120 seconds (2 minutes) timeout

        } catch (error) {
            console.error('Failed to initiate call:', error);
            setCallState(prev => ({
                ...prev,
                isCalling: false,
                callerId: null,
                callerName: null,
            }));
        }
    }, [socket, userId, onMissedCall]);

    // Accept an incoming call
    const acceptCall = useCallback(async () => {
        if (!socket || !userId || !callState.callerId) return;

        try {
            // Stop ringtone
            ringtoneRef.current?.pause();
            if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

            const stream = await getUserMedia();
            const pc = createPeerConnection(callState.callerId);

            // Add local stream tracks to peer connection
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // Notify caller that we accepted
            socket.emit('call:accept', {
                toUserId: callState.callerId,
                fromUserId: userId,
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
    }, [socket, userId, callState.callerId, createPeerConnection, startCallTimer]);

    // Decline an incoming call
    const declineCall = useCallback(() => {
        if (!socket || !userId || !callState.callerId) return;

        // Stop ringtone
        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

        socket.emit('call:decline', {
            toUserId: callState.callerId,
            fromUserId: userId,
        });

        setCallState({
            isInCall: false,
            isCalling: false,
            isReceivingCall: false,
            callerId: null,
            callerName: null,
            callerAvatar: null,
            isMuted: false,
            callDuration: 0,
        });
    }, [socket, userId, callState.callerId]);

    // End the current call
    const endCall = useCallback(() => {
        // Stop ringtone
        ringtoneRef.current?.pause();
        if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

        // Notify the other party
        if (socket && userId && callState.callerId) {
            socket.emit('call:end', {
                toUserId: callState.callerId,
                fromUserId: userId,
            });
        }

        // Clean up peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        stopCallTimer();

        setCallState({
            isInCall: false,
            isCalling: false,
            isReceivingCall: false,
            callerId: null,
            callerName: null,
            callerAvatar: null,
            isMuted: false,
            callDuration: 0,
        });
    }, [socket, userId, callState.callerId, stopCallTimer]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
            }
        }
    }, []);

    // Handle socket events
    useEffect(() => {
        if (!socket) return;

        // Incoming call
        const handleIncomingCall = (data: { fromUserId: string; fromUsername: string; fromAvatar?: string }) => {
            console.log('📞 Incoming call from:', data.fromUsername);

            // Play ringtone
            ringtoneRef.current?.play().catch(() => { });

            setCallState(prev => ({
                ...prev,
                isReceivingCall: true,
                callerId: data.fromUserId,
                callerName: data.fromUsername,
                callerAvatar: data.fromAvatar || null,
            }));
        };

        // Call accepted - now create offer
        const handleCallAccepted = async (data: { fromUserId: string }) => {
            console.log('✅ Call accepted by:', data.fromUserId);

            // Clear the unanswered timeout
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }

            // Stop ringtone
            ringtoneRef.current?.pause();
            if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

            try {
                const stream = await getUserMedia();
                const pc = createPeerConnection(data.fromUserId);

                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
                });

                // Create and send offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('call:offer', {
                    toUserId: data.fromUserId,
                    fromUserId: userId,
                    offer: offer,
                });

                setCallState(prev => ({
                    ...prev,
                    isCalling: false,
                    isInCall: true,
                    callDuration: 0,
                }));

                startCallTimer();

            } catch (error) {
                console.error('Failed to handle call accepted:', error);
                endCall();
            }
        };

        // Call declined
        const handleCallDeclined = (data?: { declinedByName?: string }) => {
            console.log('❌ Call was declined');

            // Stop ringtone
            ringtoneRef.current?.pause();
            if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

            // Clear the unanswered timeout
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }

            // Notify about missed call (the person we were calling declined)
            const callerName = callState.callerName;
            if (onMissedCall && callerName) {
                onMissedCall('declined', callerName);
            }

            setCallState({
                isInCall: false,
                isCalling: false,
                isReceivingCall: false,
                callerId: null,
                callerName: null,
                callerAvatar: null,
                isMuted: false,
                callDuration: 0,
            });
        };

        // Call ended by other party
        const handleCallEnded = () => {
            console.log('📴 Call ended by other party');
            endCall();
        };

        // Call error
        const handleCallError = (data: { message: string }) => {
            console.error('Call error:', data.message);

            // Stop ringtone
            ringtoneRef.current?.pause();
            if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;

            setCallState({
                isInCall: false,
                isCalling: false,
                isReceivingCall: false,
                callerId: null,
                callerName: null,
                callerAvatar: null,
                isMuted: false,
                callDuration: 0,
            });
        };

        // WebRTC: Handle incoming offer
        const handleOffer = async (data: { fromUserId: string; offer: RTCSessionDescriptionInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnectionRef.current.createAnswer();
                await peerConnectionRef.current.setLocalDescription(answer);

                socket.emit('call:answer', {
                    toUserId: data.fromUserId,
                    fromUserId: userId,
                    answer: answer,
                });
            } catch (error) {
                console.error('Failed to handle offer:', error);
            }
        };

        // WebRTC: Handle incoming answer
        const handleAnswer = async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
                console.error('Failed to handle answer:', error);
            }
        };

        // WebRTC: Handle ICE candidate
        const handleIceCandidate = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
            if (!peerConnectionRef.current) return;

            try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Failed to add ICE candidate:', error);
            }
        };

        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:accepted', handleCallAccepted);
        socket.on('call:declined', handleCallDeclined);
        socket.on('call:ended', handleCallEnded);
        socket.on('call:error', handleCallError);
        socket.on('call:offer', handleOffer);
        socket.on('call:answer', handleAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);

        return () => {
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:accepted', handleCallAccepted);
            socket.off('call:declined', handleCallDeclined);
            socket.off('call:ended', handleCallEnded);
            socket.off('call:error', handleCallError);
            socket.off('call:offer', handleOffer);
            socket.off('call:answer', handleAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
        };
    }, [socket, userId, createPeerConnection, startCallTimer, endCall, onMissedCall, callState.callerName]);

    return {
        callState,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
    };
}
