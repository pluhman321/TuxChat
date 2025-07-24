// === GLOBAL VARIABLES ===
let currentUser = '';
let currentUserProfilePicture = '';
let isSignupMode = false;
let messagePollingInterval = null;
let userPollingInterval = null;
let lastMessageCount = 0;
let allUsers = new Set();

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadTheme();
    checkAutoLogin();
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    // Auth
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    
    // Chat
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', handleMessageKeyPress);
    document.getElementById('messageInput').addEventListener('input', updateCharCounter);
    
    // Header buttons
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Settings modal
    document.getElementById('closeSettings').addEventListener('click', closeSettings);
    document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('profilePictureInput').click());
    document.getElementById('profilePictureInput').addEventListener('change', handleProfilePictureUpload);
    document.getElementById('removePhotoBtn').addEventListener('click', removeProfilePicture);
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Theme selector
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', applyTheme);
    });
    
    // Modal backdrop
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') closeSettings();
    });
    
    // Attach button (placeholder)
    document.getElementById('attachBtn').addEventListener('click', () => {
        showToast('File attachments coming soon! 📎', 'info');
    });
}

// === AUTHENTICATION ===
function switchTab(mode) {
    isSignupMode = mode === 'signup';
    
    document.getElementById('signinTab').classList.toggle('active', !isSignupMode);
    document.getElementById('signupTab').classList.toggle('active', isSignupMode);
    
    const button = document.getElementById('authButton');
    button.querySelector('.btn-text').textContent = isSignupMode ? 'Sign Up' : 'Sign In';
    
    clearError();
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (username.length < 3) {
        showError('Username must be at least 3 characters');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    setAuthLoading(true);
    
    try {
        const endpoint = isSignupMode ? '/signup' : '/signin';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            if (isSignupMode) {
                showToast('Account created successfully! Please sign in.', 'success');
                switchTab('signin');
                document.getElementById('authUsername').value = username;
                document.getElementById('authPassword').value = '';
            } else {
                currentUser = username;
                localStorage.setItem('tuxchat_user', username);
                await initializeChatApp();
            }
        } else {
            showError(data.error || 'Authentication failed');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showError('Network error. Please try again.');
    } finally {
        setAuthLoading(false);
    }
}

function setAuthLoading(loading) {
    const button = document.getElementById('authButton');
    const spinner = button.querySelector('.btn-spinner');
    const text = button.querySelector('.btn-text');
    
    if (loading) {
        spinner.style.display = 'inline-block';
        text.style.opacity = '0.7';
        button.disabled = true;
    } else {
        spinner.style.display = 'none';
        text.style.opacity = '1';
        button.disabled = false;
    }
}

function showError(message) {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function clearError() {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
}

function checkAutoLogin() {
    const savedUser = localStorage.getItem('tuxchat_user');
    if (savedUser) {
        currentUser = savedUser;
        initializeChatApp();
    }
}

// === CHAT APP INITIALIZATION ===
async function initializeChatApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('chatApp').style.display = 'flex';
    
    updateUserProfile();
    await loadMessages();
    startPolling();
    
    // Focus on message input
    document.getElementById('messageInput').focus();
    
    showToast(`Welcome back, ${currentUser}! 🎉`, 'success');
}

function updateUserProfile() {
    const initials = currentUser.charAt(0).toUpperCase();
    
    document.getElementById('currentUserName').textContent = currentUser;
    document.getElementById('currentUserInitials').textContent = initials;
    
    // Update settings modal
    document.getElementById('settingsInitials').textContent = initials;
    
    if (currentUserProfilePicture) {
        document.getElementById('currentUserAvatar').src = currentUserProfilePicture;
        document.getElementById('currentUserAvatar').style.display = 'block';
        document.getElementById('currentUserInitials').style.display = 'none';
        
        document.getElementById('settingsAvatar').src = currentUserProfilePicture;
        document.getElementById('settingsAvatar').style.display = 'block';
        document.getElementById('settingsInitials').style.display = 'none';
    }
}

// === MESSAGING ===
function handleMessageKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const recipient = document.getElementById('recipient').value;
    
    if (!message) return;
    
    // Show sending state
    const sendBtn = document.getElementById('sendBtn');
    const originalIcon = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span>⏳</span>';
    sendBtn.disabled = true;
    
    try {
        const response = await fetch('/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                message: message,
                recipient: recipient,
                profilePicture: currentUserProfilePicture
            })
        });
        
        if (response.ok) {
            messageInput.value = '';
            updateCharCounter();
            await loadMessages();
            
            // Auto-scroll to bottom
            const container = document.getElementById('messagesContainer');
            container.scrollTop = container.scrollHeight;
            
            showToast('Message sent! 📤', 'success');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Send error:', error);
        showToast('Network error. Message not sent.', 'error');
    } finally {
        sendBtn.innerHTML = originalIcon;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

async function loadMessages() {
    try {
        const response = await fetch('/receive');
        const data = await response.json();
        
        if (response.ok && data.messages) {
            displayMessages(data.messages);
            updateUsersList(data.messages);
            updateRecipientSelect();
        }
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    const wasAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
    
    // Only update if message count changed
    if (messages.length === lastMessageCount) return;
    lastMessageCount = messages.length;
    
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-banner">
                <div class="welcome-icon">🎉</div>
                <h2>Welcome to TuxChat!</h2>
                <p>Your messages are secure. Start chatting below!</p>
            </div>
        `;
        return;
    }
    
    messages.forEach(msg => {
        if (msg.recipient === 'all' || msg.recipient === currentUser || msg.username === currentUser) {
            const messageEl = createMessageElement(msg);
            container.appendChild(messageEl);
        }
    });
    
    // Auto-scroll if user was at bottom
    if (wasAtBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

function createMessageElement(msg) {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    
    if (msg.username === currentUser) {
        messageEl.classList.add('own');
    }
    
    const initials = msg.username.charAt(0).toUpperCase();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const avatarHtml = msg.profilePicture ? 
        `<img src="${msg.profilePicture}" class="message-avatar" alt="${msg.username}">` :
        `<div class="message-initials">${initials}</div>`;
    
    messageEl.innerHTML = `
        <div class="message-header">
            ${avatarHtml}
            <span class="message-username">${msg.username}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.message)}</div>
    `;
    
    return messageEl;
}

function updateUsersList(messages) {
    const users = new Set();
    messages.forEach(msg => {
        if (msg.username !== currentUser) {
            users.add(msg.username);
        }
    });
    
    allUsers = users;
    
    const usersList = document.getElementById('usersList');
    const userCount = document.getElementById('userCount');
    
    userCount.textContent = users.size;
    document.getElementById('onlineCount').textContent = `${users.size + 1} online`;
    
    if (users.size === 0) {
        usersList.innerHTML = '<div class="no-users">No other users online</div>';
        return;
    }
    
    usersList.innerHTML = '';
    users.forEach(username => {
        const userEl = document.createElement('div');
        userEl.classList.add('user-item');
        
        const initials = username.charAt(0).toUpperCase();
        userEl.innerHTML = `
            <div class="user-initials">${initials}</div>
            <span class="username">${username}</span>
        `;
        
        usersList.appendChild(userEl);
    });
}

function updateRecipientSelect() {
    const select = document.getElementById('recipient');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="all">🌍 Everyone</option>';
    
    allUsers.forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = `👤 ${username}`;
        select.appendChild(option);
    });
    
    // Restore selection if still valid
    if (Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
}

function updateCharCounter() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCount');
    const count = input.value.length;
    
    counter.textContent = count;
    counter.style.color = count > 800 ? 'var(--accent-danger)' : 'var(--text-muted)';
}

// === POLLING ===
function startPolling() {
    // Poll messages every 2 seconds
    messagePollingInterval = setInterval(loadMessages, 2000);
}

function stopPolling() {
    if (messagePollingInterval) clearInterval(messagePollingInterval);
    if (userPollingInterval) clearInterval(userPollingInterval);
}

// === SETTINGS ===
function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
    updateSettingsModal();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function updateSettingsModal() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    document.querySelector(`input[name="theme"][value="${currentTheme}"]`).checked = true;
}

async function handleProfilePictureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) { // 1MB limit
        showToast('Image too large. Please choose a file under 1MB.', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageUrl = e.target.result;
        
        // Update preview
        document.getElementById('settingsAvatar').src = imageUrl;
        document.getElementById('settingsAvatar').style.display = 'block';
        document.getElementById('settingsInitials').style.display = 'none';
        
        showToast('Profile picture updated! Click "Save Changes" to apply.', 'info');
    };
    reader.readAsDataURL(file);
}

function removeProfilePicture() {
    document.getElementById('settingsAvatar').style.display = 'none';
    document.getElementById('settingsInitials').style.display = 'flex';
    document.getElementById('profilePictureInput').value = '';
    
    showToast('Profile picture removed! Click "Save Changes" to apply.', 'info');
}

function saveSettings() {
    const avatarImg = document.getElementById('settingsAvatar');
    const newProfilePicture = avatarImg.style.display === 'block' ? avatarImg.src : '';
    
    // Save profile picture
    currentUserProfilePicture = newProfilePicture;
    localStorage.setItem('tuxchat_profile_picture', currentUserProfilePicture);
    
    // Update UI
    updateUserProfile();
    
    // Save other settings
    const soundEnabled = document.getElementById('soundNotifications').checked;
    const desktopEnabled = document.getElementById('desktopNotifications').checked;
    
    localStorage.setItem('tuxchat_sound_notifications', soundEnabled);
    localStorage.setItem('tuxchat_desktop_notifications', desktopEnabled);
    
    closeSettings();
    showToast('Settings saved successfully! ✅', 'success');
}

// === THEME MANAGEMENT ===
function loadTheme() {
    const savedTheme = localStorage.getItem('tuxchat_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Load saved profile picture
    const savedProfilePicture = localStorage.getItem('tuxchat_profile_picture');
    if (savedProfilePicture) {
        currentUserProfilePicture = savedProfilePicture;
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('tuxchat_theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Update radio button in settings
    const radio = document.querySelector(`input[name="theme"][value="${newTheme}"]`);
    if (radio) radio.checked = true;
    
    showToast(`Switched to ${newTheme} mode! ${newTheme === 'dark' ? '🌙' : '☀️'}`, 'info');
}

function applyTheme(e) {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('tuxchat_theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// === LOGOUT ===
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        stopPolling();
        localStorage.removeItem('tuxchat_user');
        currentUser = '';
        currentUserProfilePicture = '';
        
        document.getElementById('chatApp').style.display = 'none';
        document.getElementById('authScreen').style.display = 'flex';
        
        // Reset form
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
        switchTab('signin');
        clearError();
        
        showToast('Logged out successfully! 👋', 'info');
    }
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// === UTILITY FUNCTIONS ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === PAGE VISIBILITY HANDLING ===
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopPolling();
    } else if (currentUser) {
        startPolling();
    }
});

// === NOTIFICATION PERMISSIONS ===
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Desktop notifications enabled! 🔔', 'success');
            }
        });
    }
}

// Request notification permission when user interacts
document.addEventListener('click', requestNotificationPermission, { once: true });

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.getElementById('messageInput') === document.activeElement) {
            sendMessage();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        if (document.getElementById('settingsModal').style.display === 'flex') {
            closeSettings();
        }
    }
});

console.log('🐧 TuxChat initialized successfully!');