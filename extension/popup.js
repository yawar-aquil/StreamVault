/**
 * StreamVault Watch Together - Popup Script
 * Auto-detects room from StreamVault tab and connects
 */

// Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const notInRoomView = document.getElementById('notInRoomView');
const roomDetectedView = document.getElementById('roomDetectedView');
const connectedView = document.getElementById('connectedView');
const detectedRoomCode = document.getElementById('detectedRoomCode');
const currentRoomDisplay = document.getElementById('currentRoom');
const hostStatus = document.getElementById('hostStatus');
const isHostCheckbox = document.getElementById('isHost');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');

let detectedRoom = null;

// Update UI based on state
function showView(view) {
    notInRoomView.classList.add('hidden');
    roomDetectedView.classList.add('hidden');
    connectedView.classList.add('hidden');

    if (view === 'notInRoom') {
        notInRoomView.classList.remove('hidden');
        statusDot.classList.remove('connected');
        statusDot.classList.remove('detecting');
        statusText.textContent = 'Not in a room';
    } else if (view === 'roomDetected') {
        roomDetectedView.classList.remove('hidden');
        statusDot.classList.remove('connected');
        statusDot.classList.add('detecting');
        statusText.textContent = 'Room found';
    } else if (view === 'connected') {
        connectedView.classList.remove('hidden');
        statusDot.classList.add('connected');
        statusDot.classList.remove('detecting');
        statusText.textContent = 'Connected';
    }
}

// Check if user is on a StreamVault Watch Together page
async function detectRoom() {
    try {
        // Query for StreamVault watch-together tabs
        const tabs = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url) {
            showView('notInRoom');
            return null;
        }

        const url = currentTab.url;

        // Check if on streamvault.live or localhost watch-together page
        const watchTogetherPattern = /^https?:\/\/((?:www\.)?streamvault\.(?:live|in)|localhost:5000)\/watch-together\/([A-Za-z0-9]{6})/;
        const match = url.match(watchTogetherPattern);

        if (match && match[2]) {
            const roomCode = match[2].toUpperCase();
            detectedRoom = roomCode;
            detectedRoomCode.textContent = roomCode;
            return roomCode;
        }

        return null;
    } catch (e) {
        console.error('Error detecting room:', e);
        return null;
    }
}

// Check current connection status
async function checkStatus() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

        if (response.connected && response.roomCode) {
            // Already connected
            currentRoomDisplay.textContent = response.roomCode;
            hostStatus.textContent = response.isHost ? 'Syncing as Host' : 'Syncing as Viewer';
            showView('connected');
            return;
        }

        // Not connected, check if we can detect a room
        const roomCode = await detectRoom();

        if (roomCode) {
            showView('roomDetected');
        } else {
            showView('notInRoom');
        }
    } catch (e) {
        console.error('Failed to get status:', e);
        showView('notInRoom');
    }
}

// Connect to detected room
async function connectToRoom() {
    if (!detectedRoom) {
        alert('No room detected. Please go to a Watch Together room on StreamVault.');
        return;
    }

    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting...';

    try {
        const isHost = isHostCheckbox.checked;

        await chrome.runtime.sendMessage({
            type: 'JOIN_ROOM',
            roomCode: detectedRoom,
            isHost: isHost
        });

        // Save host preference
        chrome.storage.local.set({ isHost: isHost });

        // Notify content scripts
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_HOST', isHost: isHost }).catch(() => { });
        }

        // Update UI
        currentRoomDisplay.textContent = detectedRoom;
        hostStatus.textContent = isHost ? 'Syncing as Host' : 'Syncing as Viewer';
        showView('connected');

    } catch (e) {
        console.error('Failed to connect:', e);
        alert('Failed to connect. Please try again.');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Connect Extension';
    }
}

// Disconnect from room
async function disconnectFromRoom() {
    try {
        await chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' });

        // Re-check status (will show room detected if still on page)
        checkStatus();
    } catch (e) {
        console.error('Failed to disconnect:', e);
    }
}

// Load saved host preference
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get(['isHost']);
        if (data.isHost !== undefined) {
            isHostCheckbox.checked = data.isHost;
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

// Event listeners
joinBtn.addEventListener('click', connectToRoom);
leaveBtn.addEventListener('click', disconnectFromRoom);

// Initialize
loadSettings();
checkStatus();
