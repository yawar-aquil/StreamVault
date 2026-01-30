/**
 * StreamVault Watch Together - Popup Script
 * Handles UI interactions for the extension popup
 */

// Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const connectForm = document.getElementById('connectForm');
const connectedView = document.getElementById('connectedView');
const roomCodeInput = document.getElementById('roomCode');
const isHostCheckbox = document.getElementById('isHost');
const hostToggleRow = document.getElementById('hostToggleRow');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const currentRoomInput = document.getElementById('currentRoom');

// Update UI based on connection status
function updateUI(connected, roomCode = null) {
    if (connected) {
        statusDot.classList.add('connected');
        statusText.classList.add('connected');
        statusText.textContent = 'Connected';
        connectForm.classList.add('hidden');
        connectedView.classList.remove('hidden');
        currentRoomInput.value = roomCode || '';
    } else {
        statusDot.classList.remove('connected');
        statusText.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectForm.classList.remove('hidden');
        connectedView.classList.add('hidden');
    }
}

// Check current status on popup open
async function checkStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
        updateUI(response.connected, response.roomCode);
    } catch (e) {
        console.error('Failed to get status:', e);
    }
}

// Join room
async function joinRoom() {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode || roomCode.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }

    joinBtn.disabled = true;
    joinBtn.textContent = 'Verifying...';

    try {
        // Validate room existence
        // Note: For dev, we might need localhost logic, but extension context is isolated.
        // We'll trust streamvault.live for prod or rely on the user having the app running locally?
        // The manifest allows both. We'll try connection to where the bridge is?
        // Simpler: Just try to fetch from the known production URL if localhost fails?
        // Actually, let's try the server URL. To support both dev and prod, we need a setting or heuristics.
        // For now, let's hardcode the check to the production or localhost depending on context if possible.
        // Or simpler: Just assume the user is using the intended server.

        // Let's rely on the background script to do the check if we want to be fancy, 
        // but `fetch` in popup works if permission is granted.

        // Try production first (or determine from tab?)
        // Let's default to production for the extension published version.
        // For this user (dev), we'll try localhost if fetch fails?

        let apiUrl = 'https://streamvault.live/api/watch-together/check/' + roomCode;

        // If we are in dev mode (localhost tab is open), we might want to target localhost.
        // But for this quick fix, I'll parallel check or just pick one.
        // I will use a simple utility to check.

        // UPDATE: User is likely running on localhost based on context.
        // I'll try localhost first, purely because I see `npm run dev` running.
        let response;
        try {
            const resLocal = await fetch('http://localhost:5000/api/watch-together/check/' + roomCode);
            if (resLocal.ok) response = await resLocal.json();
        } catch (e) {
            // Fallback to prod
            const resProd = await fetch('https://streamvault.live/api/watch-together/check/' + roomCode);
            if (resProd.ok) response = await resProd.json();
        }

        if (!response || !response.exists) {
            alert('Room not found! Please check the code.');
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Room';
            return;
        }

        joinBtn.textContent = 'Connecting...';

        const isHost = isHostCheckbox.checked;

        await chrome.runtime.sendMessage({
            type: 'JOIN_ROOM',
            roomCode: roomCode,
            isHost: isHost
        });

        // Save last room code
        chrome.storage.local.set({ lastRoomCode: roomCode });

        // Save host status
        chrome.storage.local.set({ isHost: isHost });

        // Notify content scripts about host status
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_HOST', isHost: isHost }).catch(() => { });
            }
        });

        // Wait a bit then check status
        setTimeout(checkStatus, 1000);

    } catch (e) {
        console.error('Failed to join:', e);
        alert('Failed to connect. Make sure screenvault.live is reachable.');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Room';
    }
}

// Leave room
async function leaveRoom() {
    try {
        await chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' });
        updateUI(false);
    } catch (e) {
        console.error('Failed to leave:', e);
    }
}

// Load saved settings
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get(['lastRoomCode', 'isHost']);
        if (data.lastRoomCode) {
            roomCodeInput.value = data.lastRoomCode;
        }
        if (data.isHost !== undefined) {
            isHostCheckbox.checked = data.isHost;
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

// Event listeners
joinBtn.addEventListener('click', joinRoom);
leaveBtn.addEventListener('click', leaveRoom);

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

// Initialize
loadSettings();
checkStatus();
