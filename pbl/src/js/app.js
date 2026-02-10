import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, child, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAXUrwpU0xoPv-HevayyicFOTqNXmdXghk",
    authDomain: "smart-room-control-1.firebaseapp.com",
    databaseURL: "https://smart-room-control-1-default-rtdb.firebaseio.com",
    projectId: "smart-room-control-1",
    storageBucket: "smart-room-control-1.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// const appleProvider = new OAuthProvider('apple.com'); // Requires Paid Account

// DOM Elements
const els = {
    // Auth UI
    authContainer: document.getElementById('auth-container'),
    signupContainer: document.getElementById('signup-container'),
    pendingContainer: document.getElementById('pending-container'),
    appContainer: document.getElementById('main-app'),
    
    // Auth Forms & Buttons
    loginForm: document.getElementById('email-login-form'),
    signupForm: document.getElementById('signup-form'),
    btnGoogle: document.getElementById('btn-google-login'),
    // btnApple: document.getElementById('btn-apple-login'),
    linkSignup: document.getElementById('link-signup'),
    linkLogin: document.getElementById('link-login'),
    btnLogout: document.getElementById('btn-logout'),
    btnLogoutPending: document.getElementById('btn-logout-pending'),
    pendingEmail: document.getElementById('pending-email'),

    // Admin UI
    btnAdmin: document.getElementById('btn-admin'),
    modalAdmin: document.getElementById('admin-modal'),
    closeAdmin: document.getElementById('close-admin'),
    userList: document.getElementById('user-list'),

    // App UI
    light1: document.getElementById('light1'),
    light2: document.getElementById('light2'),
    ac: document.getElementById('ac'),
    statusLight1: document.getElementById('status-light1'),
    statusLight2: document.getElementById('status-light2'),
    statusAC: document.getElementById('status-ac'),
    fan: document.getElementById('fan'),
    fanValue: document.getElementById('fan-value'),
    status: document.getElementById('connection-status'),
    btnAllOff: document.getElementById('btn-all-off'),
    btnTheme: document.getElementById('btn-theme-toggle'),
    officeIndicator: document.getElementById('office-indicator'),
    // Settings UI
    btnMenu: document.getElementById('btn-settings-menu'),
    dropdownMenu: document.getElementById('dropdown-menu'),
    btnWifiSettings: document.getElementById('btn-wifi-settings'),
    
    modalSettings: document.getElementById('settings-modal'),
    btnCloseSettings: document.getElementById('close-settings'),
    inpSsid: document.getElementById('wifi-ssid'),
    inpPass: document.getElementById('wifi-pass'),
    btnUpdateWifi: document.getElementById('btn-update-wifi')
};

let currentUser = null;
let isUpdatingUI = false;

// --- DROPDOWN LOGIC ---
els.btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    els.dropdownMenu.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!els.dropdownMenu.classList.contains('hidden') && !els.dropdownMenu.contains(e.target) && e.target !== els.btnMenu) {
        els.dropdownMenu.classList.add('hidden');
    }
});

// Settings Modal (via Dropdown)
els.btnWifiSettings.addEventListener('click', () => {
    els.dropdownMenu.classList.add('hidden'); // Close menu
    els.modalSettings.classList.add('show');
});

// --- AUTHENTICATION LOGIC ---

// Toggle between Login and Signup
els.linkSignup.addEventListener('click', (e) => {
    e.preventDefault();
    els.authContainer.classList.add('hidden');
    els.signupContainer.classList.remove('hidden');
});

els.linkLogin.addEventListener('click', (e) => {
    e.preventDefault();
    els.signupContainer.classList.add('hidden');
    els.authContainer.classList.remove('hidden');
});

// Email/Pass Login
els.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch((error) => alert("Login Failed: " + error.message));
});

// Email/Pass Signup
els.signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const pass = document.getElementById('signup-pass').value;
    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            // Create user entry in DB
            const user = userCredential.user;
            createUserEntry(user);
        })
        .catch((error) => alert("Signup Failed: " + error.message));
});

// Google Login
els.btnGoogle.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            createUserEntry(result.user);
        })
        .catch((error) => alert("Google Sign-In Error: " + error.message));
});

// Apple Login (Disabled until Developer Account is available)
/*
els.btnApple.addEventListener('click', () => {
    signInWithPopup(auth, appleProvider)
        .then((result) => {
            createUserEntry(result.user);
        })
        .catch((error) => alert("Apple Sign-In Error: " + error.message));
});
*/

// Logout
const handleLogout = () => {
    signOut(auth).then(() => {
        window.location.reload();
    });
};
els.btnLogout.addEventListener('click', handleLogout);
els.btnLogoutPending.addEventListener('click', handleLogout);

// Create User in DB (if not exists)
function createUserEntry(user) {
    const userRef = ref(db, 'users/' + user.uid);
    get(userRef).then((snapshot) => {
        if (!snapshot.exists()) {
            set(userRef, {
                email: user.email,
                role: 'user',
                approved: false, // Default to unapproved
                createdAt: Date.now()
            });
        }
    });
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Check DB for approval status
        const userRef = ref(db, 'users/' + user.uid);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                if (userData.approved === true) {
                    // Access Granted
                    showApp(userData);
                } else {
                    // Access Pending
                    showPending(user.email);
                }
            } else {
                // User logged in but no DB entry? Create one.
                createUserEntry(user);
            }
        });
    } else {
        // No user
        showLogin();
    }
});

function showLogin() {
    els.authContainer.classList.remove('hidden');
    els.signupContainer.classList.add('hidden');
    els.pendingContainer.classList.add('hidden');
    els.appContainer.classList.add('hidden');
}

function showPending(email) {
    els.authContainer.classList.add('hidden');
    els.signupContainer.classList.add('hidden');
    els.pendingContainer.classList.remove('hidden');
    els.appContainer.classList.add('hidden');
    els.pendingEmail.textContent = email;
}

function showApp(userData) {
    els.authContainer.classList.add('hidden');
    els.signupContainer.classList.add('hidden');
    els.pendingContainer.classList.add('hidden');
    els.appContainer.classList.remove('hidden');
    
    // Show Admin Button if admin
    if (userData.role === 'admin') {
        els.btnAdmin.classList.remove('hidden');
        loadUserList(); // Start listening for users
    }
    
    // Initialize App Listeners
    initAppListeners();
    
    // Initialize Extras (Theme & Time)
    // initTheme(); // Theme is now initialized globally
    checkClientSideOfficeTime();
    setInterval(checkClientSideOfficeTime, 60000); // Check every minute
}

// --- THEME & TIME LOGIC ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Priority: Saved Preference > System Preference > Default (Light)
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeButton(true);
    } else {
        document.documentElement.removeAttribute('data-theme');
        updateThemeButton(false);
    }

    // Listen for system theme changes (only applies if no manual override)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.setAttribute('data-theme', 'dark');
                updateThemeButton(true);
            } else {
                document.documentElement.removeAttribute('data-theme');
                updateThemeButton(false);
            }
        }
    });
}

function updateThemeButton(isDark) {
    if (isDark) {
        els.btnTheme.innerHTML = '<span class="material-icons-round">light_mode</span><span>Disable Dark Mode</span>';
    } else {
        els.btnTheme.innerHTML = '<span class="material-icons-round">dark_mode</span><span>Enable Dark Mode</span>';
    }
}

els.btnTheme.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        updateThemeButton(false);
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        updateThemeButton(true);
    }
});

function checkClientSideOfficeTime() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 for Sunday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Define office hours (e.g., 8:30 AM to 5:30 PM)
    const officeStart = 8 * 60 + 30;
    const officeEnd = 17 * 60 + 30;

    let text = 'Home Time';
    let icon = 'home';
    let className = 'office-indicator home-time';

    // Check for Friday (5) or Saturday (6)
    if (currentDay === 5 || currentDay === 6) {
        text = 'Weekend / Off Day';
        icon = 'celebration';
        className = 'office-indicator off-day';
    } else if (currentTimeInMinutes >= officeStart && currentTimeInMinutes <= officeEnd) {
        text = 'Office Time';
        icon = 'business';
        className = 'office-indicator office-time';
    }

    els.officeIndicator.innerHTML = `<span class="material-icons-round">${icon}</span><span>${text}</span>`;
    els.officeIndicator.className = className;
}

// --- ADMIN LOGIC ---

els.btnAdmin.addEventListener('click', () => {
    els.dropdownMenu.classList.add('hidden'); // Close menu
    els.modalAdmin.classList.add('show');
});

els.closeAdmin.addEventListener('click', () => {
    els.modalAdmin.classList.remove('show');
});

function loadUserList() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        els.userList.innerHTML = '';
        const users = snapshot.val();
        if (!users) {
            els.userList.innerHTML = '<p>No users found.</p>';
            return;
        }
        
        Object.keys(users).forEach(uid => {
            const u = users[uid];
            const div = document.createElement('div');
            div.className = 'user-item';
            
            let actionBtn = '';
            if (!u.approved) {
                actionBtn = `<button class="btn-approve" onclick="approveUser('${uid}')">Approve</button>`;
            } else {
                actionBtn = `<span class="approved-badge">Approved</span>`;
            }
            
            div.innerHTML = `
                <div class="user-info">
                    <span class="user-email">${u.email}</span>
                    <span class="user-role">${u.role}</span>
                </div>
                <div>${actionBtn}</div>
            `;
            els.userList.appendChild(div);
        });
    });
}

// Global function for onclick button
window.approveUser = (uid) => {
    if(confirm("Approve this user?")) {
        update(ref(db, 'users/' + uid), { approved: true });
    }
};


// --- APP LOGIC (Existing) ---
function initAppListeners() {
    // Only attach these once or ensure they are safe
    // ... (This replaces the previous global execution)
    
    // Listen for Status
    const statusRef = ref(db, 'status');
    onValue(statusRef, (snapshot) => {
        // ... (Existing logic)
        const data = snapshot.val();
        if (data) {
            isUpdatingUI = true;
            els.status.innerText = "Connected";
            els.status.className = "connection-status network-online";
            els.status.style.color = ""; // Remove inline style
            
            els.light1.checked = data.light1;
            els.light2.checked = data.light2;
            els.ac.checked = data.ac;
            els.fan.value = data.fan;
            
            // Update Passive Status Indicators
            updateStatusBadge(els.statusLight1, data.light1);
            updateStatusBadge(els.statusLight2, data.light2);
            updateStatusBadge(els.statusAC, data.ac);

            const fanTxt = data.fan == 0 ? "OFF" : data.fan;
            els.fanValue.innerText = fanTxt;
            
            isUpdatingUI = false;
        }
    });

    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        // Check if we are in Hotspot Mode
        if (window.location.hostname === '192.168.4.1') {
            els.status.innerText = "HOTSPOT MODE";
            els.status.className = "connection-status network-hotspot";
        } else if (snap.val() === true) {
            // Connected to Firebase
            // Note: We might want to keep "Connected" from the status listener instead
            // But this confirms network presence
        } else {
            els.status.innerText = "Disconnected";
            els.status.className = "connection-status network-offline";
        }
    });
}

// Helper to send commands
function sendCommand(device, value) {
    set(ref(db, 'command'), {
        device: device,
        value: String(value), // Ensure string format
        timestamp: Date.now()
    });
}

// Event Listeners (UI Controls)
els.light1.addEventListener('change', () => {
    if(!isUpdatingUI) sendCommand('light1', els.light1.checked);
});
els.light2.addEventListener('change', () => {
    if(!isUpdatingUI) sendCommand('light2', els.light2.checked);
});
els.ac.addEventListener('change', () => {
    if(!isUpdatingUI) sendCommand('ac', els.ac.checked);
});
els.fan.addEventListener('input', () => {
    const val = els.fan.value;
    els.fanValue.innerText = val == 0 ? "OFF" : val;
});
els.fan.addEventListener('change', () => {
    if(!isUpdatingUI) sendCommand('fan', els.fan.value);
});

els.btnAllOff.addEventListener('click', () => {
    if(confirm("Turn everything OFF?")) {
        sendCommand('all', '0');
    }
});

// Settings Logic
// els.btnSettings is replaced by els.btnMenu

els.btnCloseSettings.addEventListener('click', () => {
    els.modalSettings.classList.remove('show');
});

window.onclick = (event) => {
    if (event.target == els.modalSettings) {
        els.modalSettings.classList.remove('show');
    }
    if (event.target == els.modalAdmin) {
        els.modalAdmin.classList.remove('show');
    }
};

els.btnUpdateWifi.addEventListener('click', () => {
    const ssid = els.inpSsid.value.trim();
    const pass = els.inpPass.value.trim();
    
    if (!ssid) {
        alert("Please enter a WiFi SSID");
        return;
    }
    
    if (confirm(`Are you sure you want to update WiFi to "${ssid}"?\nThe device will restart.`)) {
        // Send command as JSON string for safety
        const payload = JSON.stringify({ ssid: ssid, pass: pass });
        sendCommand('sys_wifi_update', payload);
        alert('Command sent! Device will restart shortly.');
        els.modalSettings.classList.remove('show');
    }
});

function updateStatusBadge(element, isActive) {
    if (isActive) {
        element.textContent = "ON";
        element.classList.add('on');
    } else {
        element.textContent = "OFF";
        element.classList.remove('on');
    }
}

// Initialize Theme on Load
initTheme();
