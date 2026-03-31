import websocketService from './websocket.service.js';

class CallService {
    constructor() {
        this.userId = null;
        this.currentCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.audioContext = null;
        this.localAnalyser = null;
        this.remoteAnalyser = null;
        this.localAudioData = null;
        this.remoteAudioData = null;
        this.audioLevelAnimationFrame = null;

        // WebRTC configuration
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    // Initialize call listeners
    initCallListeners(userId) {
        this.userId = userId;
        const destination = `/topic/call.audio.${userId}`;

        console.log('Initializing call listeners for user:', userId);
        console.log('Subscribing to:', destination);

        // Ensure WebSocket is connected
        if (!websocketService.isConnected()) {
            console.log('WebSocket not connected, connecting...');
            websocketService.connect().then(() => {
                console.log('WebSocket connected, subscribing to call signals...');
                websocketService.subscribe(destination, (message) => {
                    console.log('Call signal received:', message);
                    this.handleCallSignal(message);
                });
            }).catch(err => {
                console.error('Failed to connect WebSocket:', err);
            });
        } else {
            console.log('WebSocket already connected, subscribing...');
            websocketService.subscribe(destination, (message) => {
                console.log('Call signal received:', message);
                this.handleCallSignal(message);
            });
        }
    }

    // Start audio call
    async startAudioCall(fromUserId, toUserId, toUsername) {
        try {
            this.currentCall = {
                type: 'audio',
                fromUserId,
                toUserId,
                toUsername,
                status: 'initiating'
            };

            // Get audio stream
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            this.startAudioMonitoring('local', this.localStream);
            this.notifyCallState('dialing');

            // Send ready signal
            this.sendSignal({
                fromUserId,
                toUserId,
                type: 'ready'
            });

            return { success: true, stream: this.localStream };
        } catch (error) {
            console.error('Error starting audio call:', error);
            return { success: false, error: error.message };
        }
    }

    // Start video call
    async startVideoCall(fromUserId, toUserId, toUsername) {
        try {
            this.currentCall = {
                type: 'video',
                fromUserId,
                toUserId,
                toUsername,
                status: 'initiating'
            };

            // Get video + audio stream
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            this.startAudioMonitoring('local', this.localStream);
            this.notifyCallState('dialing');

            // Send ready signal
            this.sendSignal({
                fromUserId,
                toUserId,
                type: 'ready'
            });

            return { success: true, stream: this.localStream };
        } catch (error) {
            console.error('Error starting video call:', error);
            return { success: false, error: error.message };
        }
    }

    // Accept incoming call
    async acceptCall() {
        if (!this.currentCall) return;

        try {
            const remoteUserId = this.getRemoteUserId();
            if (!remoteUserId) {
                return { success: false, error: 'Missing remote user for call acceptance' };
            }

            const constraints = this.currentCall.type === 'video'
                ? { audio: true, video: true }
                : { audio: true, video: false };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.startAudioMonitoring('local', this.localStream);
            this.notifyCallState('connecting');

            this.sendSignal({
                fromUserId: this.userId,
                toUserId: remoteUserId,
                type: 'accept'
            });

            await this.createPeerConnection();

            return { success: true, stream: this.localStream };
        } catch (error) {
            console.error('Error accepting call:', error);
            return { success: false, error: error.message };
        }
    }

    // Reject incoming call
    rejectCall() {
        if (!this.currentCall) return;

        const remoteUserId = this.getRemoteUserId();
        if (!remoteUserId) return;

        this.sendSignal({
            fromUserId: this.userId,
            toUserId: remoteUserId,
            type: 'reject'
        });

        this.endCall(false);
    }

    // Create peer connection
    async createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.configuration);
        this.notifyCallState('connecting');

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const remoteUserId = this.getRemoteUserId();
                if (!remoteUserId) return;

                this.sendSignal({
                    fromUserId: this.userId,
                    toUserId: remoteUserId,
                    type: 'ice',
                    candidate: JSON.stringify(event.candidate.candidate),
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex
                });
            }
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.startAudioMonitoring('remote', this.remoteStream);
            if (window.onRemoteStream) {
                window.onRemoteStream(this.remoteStream);
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            if (state === 'connected') {
                this.notifyCallState('connected');
            } else if (state === 'connecting') {
                this.notifyCallState('connecting');
            } else if (state === 'disconnected' || state === 'failed') {
                this.notifyCallState('reconnecting');
            } else if (state === 'closed') {
                this.notifyCallState('ended');
            }
        };

        return this.peerConnection;
    }

    // Create offer
    async createOffer() {
        if (!this.peerConnection) {
            await this.createPeerConnection();
        }

        const remoteUserId = this.getRemoteUserId();
        if (!remoteUserId) return;

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.sendSignal({
            fromUserId: this.userId,
            toUserId: remoteUserId,
            type: 'offer',
            sdp: offer.sdp
        });
    }

    // Create answer
    async createAnswer(offer) {
        if (!this.peerConnection) {
            await this.createPeerConnection();
        }

        const remoteUserId = this.getRemoteUserId();
        if (!remoteUserId) return;

        await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription({ type: 'offer', sdp: offer.sdp })
        );

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.sendSignal({
            fromUserId: this.userId,
            toUserId: remoteUserId,
            type: 'answer',
            sdp: answer.sdp
        });
    }

    // Handle incoming call signals
    async handleCallSignal(message) {
        console.log('Call signal received:', message);

        switch (message.type) {
            case 'ready':
                // Incoming call
                this.currentCall = {
                    type: 'audio', // Will be determined by the caller
                    fromUserId: message.fromUserId,
                    toUserId: message.toUserId,
                    status: 'incoming'
                };
                if (window.onIncomingCall) {
                    window.onIncomingCall(message);
                }
                break;

            case 'accept':
                // Call accepted
                if (this.currentCall) {
                    this.currentCall.status = 'accepted';
                }
                this.notifyCallState('accepted');
                await this.createPeerConnection();
                await this.createOffer();
                break;

            case 'reject':
                // Call rejected
                if (window.onCallRejected) {
                    window.onCallRejected();
                }
                this.endCall(false);
                break;

            case 'offer':
                // Received offer
                await this.createAnswer(message);
                break;

            case 'answer':
                // Received answer
                if (this.peerConnection) {
                    if (this.peerConnection.signalingState !== 'have-local-offer') {
                        console.warn(
                            'Ignoring unexpected answer in signaling state:',
                            this.peerConnection.signalingState
                        );
                        break;
                    }

                    await this.peerConnection.setRemoteDescription(
                        new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
                    );
                    this.notifyCallState('connected');
                }
                break;

            case 'ice':
                // Received ICE candidate
                if (this.peerConnection && message.candidate) {
                    const candidate = new RTCIceCandidate({
                        candidate: JSON.parse(message.candidate),
                        sdpMid: message.sdpMid,
                        sdpMLineIndex: message.sdpMLineIndex
                    });
                    await this.peerConnection.addIceCandidate(candidate);
                }
                break;

            case 'hangup':
                // Call ended
                if (window.onCallEnded) {
                    window.onCallEnded();
                }
                this.endCall(false);
                break;
        }
    }

    // Send signal to backend
    sendSignal(message) {
        websocketService.send('/app/call.audio', message);
    }

    // Toggle video
    toggleVideo() {
        if (!this.localStream) return false;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.isVideoEnabled = videoTrack.enabled;
            return this.isVideoEnabled;
        }
        return false;
    }

    // Toggle audio
    toggleAudio() {
        if (!this.localStream) return false;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.isAudioEnabled = audioTrack.enabled;
            return this.isAudioEnabled;
        }
        return false;
    }

    // End call
    endCall(shouldSendHangup = true) {
        // Send hangup signal if call is active
        if (shouldSendHangup && this.currentCall && this.currentCall.status !== 'ended') {
            const remoteUserId = this.getRemoteUserId();
            if (remoteUserId) {
                this.sendSignal({
                    fromUserId: this.userId,
                    toUserId: remoteUserId,
                    type: 'hangup'
                });
            }
        }

        if (this.currentCall) {
            this.currentCall.status = 'ended';
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.stopAudioMonitoring();

        // Reset state
        this.currentCall = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
    }

    getRemoteUserId() {
        if (!this.currentCall || !this.userId) return null;

        if (this.currentCall.fromUserId === this.userId) {
            return this.currentCall.toUserId;
        }
        if (this.currentCall.toUserId === this.userId) {
            return this.currentCall.fromUserId;
        }
        return null;
    }

    // Get current call
    getCurrentCall() {
        return this.currentCall;
    }

    notifyCallState(status) {
        if (window.onCallStateChange) {
            window.onCallStateChange({ status, call: this.currentCall });
        }
    }

    startAudioMonitoring(channel, stream) {
        if (!stream) return;
        try {
            if (!this.audioContext || this.audioContext.state === 'closed') {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;
                this.audioContext = new AudioContextClass();
            }

            const source = this.audioContext.createMediaStreamSource(stream);
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);

            if (channel === 'local') {
                this.localAnalyser = analyser;
                this.localAudioData = new Uint8Array(analyser.fftSize);
            } else {
                this.remoteAnalyser = analyser;
                this.remoteAudioData = new Uint8Array(analyser.fftSize);
            }

            this.startAudioLevelLoop();
        } catch (error) {
            console.warn('Audio monitoring unavailable:', error);
        }
    }

    startAudioLevelLoop() {
        if (this.audioLevelAnimationFrame) return;

        const tick = () => {
            const localLevel = this.computeAudioLevel(this.localAnalyser, this.localAudioData);
            const remoteLevel = this.computeAudioLevel(this.remoteAnalyser, this.remoteAudioData);

            if (window.onCallAudioLevel) {
                window.onCallAudioLevel({
                    local: localLevel,
                    remote: remoteLevel
                });
            }

            this.audioLevelAnimationFrame = window.requestAnimationFrame(tick);
        };

        this.audioLevelAnimationFrame = window.requestAnimationFrame(tick);
    }

    computeAudioLevel(analyser, dataBuffer) {
        if (!analyser || !dataBuffer) return 0;

        analyser.getByteTimeDomainData(dataBuffer);
        let sum = 0;
        for (let i = 0; i < dataBuffer.length; i += 1) {
            const normalized = (dataBuffer[i] - 128) / 128;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataBuffer.length);
        return Math.max(0, Math.min(1, rms * 4));
    }

    stopAudioMonitoring() {
        if (this.audioLevelAnimationFrame) {
            window.cancelAnimationFrame(this.audioLevelAnimationFrame);
            this.audioLevelAnimationFrame = null;
        }

        this.localAnalyser = null;
        this.remoteAnalyser = null;
        this.localAudioData = null;
        this.remoteAudioData = null;

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => { });
        }
        this.audioContext = null;
    }
}

export default new CallService();
