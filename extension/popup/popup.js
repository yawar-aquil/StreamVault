/**
 * StreamVault Extension — Popup Script
 * Watch Room video chat + Settings (ad blocker, notifications)
 */

document.addEventListener('DOMContentLoaded', init);

let localStream = null;
let micEnabled = false;
let camEnabled = false;

async function init() {
    setupTabs();
    loadUserInfo();
    loadSettings();
    checkRoomStatus();

    document.getElementById('openSV').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: '/' });
    });

    document.getElementById('openWatchTogether')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: '/' });
    });

    // Manual room join
    document.getElementById('joinRoomBtn').addEventListener('click', joinManualRoom);
    document.getElementById('roomCodeInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinManualRoom();
        document.getElementById('joinError').style.display = 'none';
    });

    // Video controls
    document.getElementById('toggleMic').addEventListener('click', toggleMic);
    document.getElementById('toggleCam').addEventListener('click', toggleCam);
    document.getElementById('leaveRoom').addEventListener('click', leaveRoom);
}

async function joinManualRoom() {
    const input = document.getElementById('roomCodeInput');
    const error = document.getElementById('joinError');
    const code = input.value.trim().toUpperCase();

    if (!code || code.length < 4 || code.length > 6) {
        error.textContent = 'Enter a valid room code (4-6 characters)';
        error.style.display = '';
        return;
    }

    if (!/^[A-Z0-9]+$/.test(code)) {
        error.textContent = 'Room code should be letters and numbers only';
        error.style.display = '';
        return;
    }

    error.style.display = 'none';
    await chrome.runtime.sendMessage({ type: 'JOIN_ROOM', roomCode: code, isHost: false });
    chrome.runtime.sendMessage({ type: 'OPEN_STREAMVAULT', path: `/watch-together/${code}` });
    showRoomUI(code, false);
}

// ─── Tabs ────────────────────────────────────────────────────────────
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.getAttribute('data-tab')}`).classList.add('active');
        });
    });
}

// ─── Room Status ─────────────────────────────────────────────────────
async function checkRoomStatus() {
    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
        if (resp?.connected && resp.roomCode) {
            showRoomUI(resp.roomCode, resp.isHost);
        } else {
            showNoRoomUI();
        }
    } catch {
        showNoRoomUI();
    }
}

function showNoRoomUI() {
    document.getElementById('noRoom').style.display = '';
    document.getElementById('inRoom').style.display = 'none';
    stopLocalStream();
}

function showRoomUI(roomCode, isHost) {
    document.getElementById('noRoom').style.display = 'none';
    document.getElementById('inRoom').style.display = '';
    document.getElementById('roomCode').textContent = roomCode;

    const roleEl = document.getElementById('roomRole');
    if (isHost) {
        roleEl.textContent = 'Host';
        roleEl.classList.add('host');
    } else {
        roleEl.textContent = 'Viewer';
        roleEl.classList.remove('host');
    }

    // Show "You" as 1 person in room
    document.getElementById('peerCount').textContent = '1';
    document.getElementById('peerLabel').textContent = 'person in room (you)';

    // Start with everything off
    micEnabled = false;
    camEnabled = false;
    updateControlButtons();
    showMediaStatus('Click camera or mic button to enable');
    document.getElementById('localVideoOff').style.display = 'flex';
}

// ─── Media Status ────────────────────────────────────────────────────
function showMediaStatus(text, isError = false) {
    const el = document.getElementById('mediaStatus');
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? '' : 'none';
    el.style.color = isError ? '#f87171' : '#71717a';
}

// ─── Media Stream ────────────────────────────────────────────────────
async function requestMedia(constraints) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return { stream, error: null };
    } catch (err) {
        console.log('[StreamVault] Media request failed:', err.name, err.message);
        let errorMsg = 'Media access failed';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = 'Permission denied — allow camera/mic in browser settings';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMsg = 'No camera/microphone found on this device';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            errorMsg = 'Camera/mic is being used by another app';
        } else if (err.name === 'OverconstrainedError') {
            errorMsg = 'Camera doesn\'t support requested settings';
        } else if (err.name === 'AbortError') {
            errorMsg = 'Media request was interrupted';
        }
        return { stream: null, error: errorMsg };
    }
}

function attachStream(stream) {
    localStream = stream;
    const video = document.getElementById('localVideo');
    video.srcObject = stream;
}

function stopLocalStream() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    const video = document.getElementById('localVideo');
    if (video) video.srcObject = null;
    micEnabled = false;
    camEnabled = false;
}

// ─── Controls ────────────────────────────────────────────────────────
async function toggleMic() {
    showMediaStatus('Requesting microphone...');

    // If no stream, create one with audio
    if (!localStream) {
        const { stream, error } = await requestMedia({ audio: true });
        if (stream) {
            attachStream(stream);
            micEnabled = true;
            updateControlButtons();
            showMediaStatus('');
        } else {
            showMediaStatus(error, true);
        }
        return;
    }

    const audioTracks = localStream.getAudioTracks();

    if (audioTracks.length > 0) {
        micEnabled = !micEnabled;
        audioTracks.forEach(t => t.enabled = micEnabled);
        updateControlButtons();
        showMediaStatus('');
        return;
    }

    // No audio tracks — add one
    const { stream: audioStream, error } = await requestMedia({ audio: true });
    if (audioStream) {
        const audioTrack = audioStream.getAudioTracks()[0];
        localStream.addTrack(audioTrack);
        micEnabled = true;
        updateControlButtons();
        showMediaStatus('');
    } else {
        showMediaStatus(error, true);
    }
}

async function toggleCam() {
    showMediaStatus('Requesting camera...');

    // If no stream, create one with video (+ audio)
    if (!localStream) {
        // Try video + audio first
        let result = await requestMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 } },
            audio: true
        });

        // Fallback: video only (simpler constraints)
        if (!result.stream) {
            result = await requestMedia({ video: true, audio: true });
        }

        // Fallback: video only, no audio
        if (!result.stream) {
            result = await requestMedia({ video: true });
        }

        if (result.stream) {
            attachStream(result.stream);
            camEnabled = true;
            micEnabled = result.stream.getAudioTracks().length > 0;
            document.getElementById('localVideoOff').style.display = 'none';
            updateControlButtons();
            showMediaStatus('');
        } else {
            showMediaStatus(result.error, true);
        }
        return;
    }

    const videoTracks = localStream.getVideoTracks();

    // Toggle existing video tracks
    if (videoTracks.length > 0) {
        camEnabled = !camEnabled;
        videoTracks.forEach(t => t.enabled = camEnabled);
        document.getElementById('localVideoOff').style.display = camEnabled ? 'none' : 'flex';
        updateControlButtons();
        showMediaStatus('');
        return;
    }

    // No video tracks — try to add one
    let result = await requestMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 } } });
    if (!result.stream) {
        result = await requestMedia({ video: true });
    }

    if (result.stream) {
        const videoTrack = result.stream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        const video = document.getElementById('localVideo');
        video.srcObject = localStream;
        document.getElementById('localVideoOff').style.display = 'none';
        camEnabled = true;
        updateControlButtons();
        showMediaStatus('');
    } else {
        showMediaStatus(result.error, true);
    }
}

function updateControlButtons() {
    const micBtn = document.getElementById('toggleMic');
    const camBtn = document.getElementById('toggleCam');

    micBtn.querySelector('.icon-on').style.display = micEnabled ? '' : 'none';
    micBtn.querySelector('.icon-off').style.display = micEnabled ? 'none' : '';
    micBtn.classList.toggle('active', !micEnabled);

    camBtn.querySelector('.icon-on').style.display = camEnabled ? '' : 'none';
    camBtn.querySelector('.icon-off').style.display = camEnabled ? 'none' : '';
    camBtn.classList.toggle('active', !camEnabled);
}

async function leaveRoom() {
    stopLocalStream();
    await chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' });
    showNoRoomUI();
    updateControlButtons();
}

// ─── Settings ────────────────────────────────────────────────────────
async function loadSettings() {
    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
        if (!resp) return;

        const adToggle = document.getElementById('adBlockToggle');
        const adDesc = document.getElementById('adBlockDesc');

        adToggle.checked = resp.adBlockEnabled;

        if (!resp.isSubscribed) {
            adToggle.disabled = true;
            adDesc.textContent = 'Requires Premium subscription';
            adDesc.style.color = '#DC2626';
            document.getElementById('adBlockSetting').style.opacity = '0.6';
        } else {
            adDesc.textContent = 'Block ads at network level';
        }

        document.getElementById('notifToggle').checked = resp.notificationsEnabled;

        adToggle.addEventListener('change', async (e) => {
            const result = await chrome.runtime.sendMessage({
                type: 'SAVE_SETTINGS',
                settings: { adBlockEnabled: e.target.checked }
            });
            if (result && !result.success) {
                e.target.checked = false;
                adDesc.textContent = result.error || 'Subscription required';
            }
        });

        document.getElementById('notifToggle').addEventListener('change', (e) => {
            chrome.runtime.sendMessage({
                type: 'SAVE_SETTINGS',
                settings: { notificationsEnabled: e.target.checked }
            });
        });
    } catch { }

    // Load API Key
    chrome.storage.local.get(['apiKey'], (result) => {
        if (result.apiKey) {
            document.getElementById('apiKeyInput').value = result.apiKey;
        }
    });

    // Save API Key
    document.getElementById('saveKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        chrome.storage.local.set({ apiKey: key }, () => {
            const status = document.getElementById('keyStatus');
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 2000);
        });
    });

    // Load Server URL
    chrome.storage.local.get(['baseUrl'], (result) => {
        if (result.baseUrl) {
            document.getElementById('serverUrlInput').value = result.baseUrl;
        }
    });

    // Save Server URL
    document.getElementById('saveUrlBtn').addEventListener('click', () => {
        let url = document.getElementById('serverUrlInput').value.trim();
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }
        // Remove trailing slash
        if (url.endsWith('/')) url = url.slice(0, -1);

        chrome.storage.local.set({ baseUrl: url }, () => {
            const status = document.getElementById('urlStatus');
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 2000);
        });
    });
}

// ─── User Info ───────────────────────────────────────────────────────
async function loadUserInfo() {
    try {
        const resp = await chrome.runtime.sendMessage({ type: 'GET_USER' });
        const userInfo = document.getElementById('userInfo');
        const statusDot = document.getElementById('statusDot');

        if (resp?.user) {
            // Parse and filter badges
            let badgeHTML = '';

            // Handle badges (ensure it's an array)
            let badges = [];
            try {
                if (Array.isArray(resp.user.badges)) {
                    badges = resp.user.badges;
                } else if (typeof resp.user.badges === 'string') {
                    badges = JSON.parse(resp.user.badges);
                }
            } catch (e) {
                console.error('Error parsing badges:', e);
            }

            // Filter: Equipped only + No Skins + Valid Image
            // Aggressive filtering based on server logic
            const validBadges = badges.filter(b =>
                b.equipped &&
                b.imageUrl &&
                (!b.category || !['skin', 'theme', 'cosmetic'].some(c => b.category.toLowerCase().includes(c))) &&
                (!b.name || !b.name.toLowerCase().includes('skin')) && // Filter out names with 'Skin'
                b.name !== 'Premium'
            );

            // Debug logging for badges
            // console.log('All Badges:', badges);
            // console.log('Valid Badges:', validBadges);

            if (validBadges.length > 0 || resp.user.isSubscribed) {
                badgeHTML += '<span class="user-badges">';

                // Render valid badges
                validBadges.forEach((b, index) => {
                    badgeHTML += `<img src="${b.imageUrl}" class="badge-icon" title="${b.name}" data-index="${index}">`;
                });

                // Add Separator if both badges and subscription exist
                if (validBadges.length > 0 && resp.user.isSubscribed) {
                    badgeHTML += '<span class="badge-separator"></span>';
                }

                // Render Premium Icon (Animated Ad-Free Logic)
                if (resp.user.isSubscribed) {
                    const isYearly = resp.user.subscriptionType === 'yearly';
                    const iconClass = isYearly ? 'yearly' : 'monthly';
                    const planName = isYearly ? 'YEARLY' : 'MONTHLY';
                    const titleText = isYearly ? 'Ad-Free Yearly' : 'Ad-Free Monthly';

                    badgeHTML += `
                        <div class="ad-status-wrapper" title="${titleText}">
                            <div class="ad-free-icon ${iconClass}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="100%" height="100%">
                                    <path class="ad-circle" d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
                                    <path class="ad-slash" d="M7 7L17 17" stroke-linecap="round" />
                                    <text class="ad-text" x="12" y="16.5" text-anchor="middle" fill="currentColor" font-size="7" font-weight="bold" stroke="none">AD</text>
                                </svg>
                            </div>
                            <span class="ad-status-text ${iconClass}">${planName}</span>
                        </div>`;
                }

                badgeHTML += '</span>';
            }

            userInfo.innerHTML = (resp.user.displayName || resp.user.username) + badgeHTML;

            // Attach error handlers to hide broken images (CSP-compliant)
            const badgeImages = userInfo.querySelectorAll('.badge-icon');
            badgeImages.forEach(img => {
                img.onerror = () => { img.style.display = 'none'; };
            });

            statusDot.classList.remove('offline');
        } else {
            userInfo.textContent = 'Not logged in';
            statusDot.classList.add('offline');
        }
    } catch {
        document.getElementById('userInfo').textContent = 'Not logged in';
    }
}
