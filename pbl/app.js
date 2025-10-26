// Project:   PBL IoT Project 1
// Version:   5.0.1
// Department: PBL IT & MIS
// Developer: Syed Mortoja Hasan Mithun
// Email: mithun@email.com
// Website: https://eMithun.github.io
// Copyright (c) 2025, Syed Mortoja Hasan Mithun

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXUrwpU0xoPv-HevayyicFOTqNXmdXghk",
  authDomain: "smart-room-control-1.firebaseapp.com",
  databaseURL: "https://smart-room-control-1-default-rtdb.firebaseio.com",
  projectId: "smart-room-control-1",
  storageBucket: "smart-room-control-1.firebasestorage.app",
  messagingSenderId: "939024826629",
  appId: "1:939024826629:web:b5ba73b0a3f9738ddcf76c",
  measurementId: "G-MS62LRP9XP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let statusInterval = null;
let firebaseListener = null;
let deferredPrompt = null;

// Device Control Functions
function toggleDevice(device, state) {
    const deviceRef = database.ref(`devices/${device}/state`);
    deviceRef.set(state);
}

function setFanSpeed(speed) {
    updateFanDisplay(speed); // Keep this for immediate UI feedback
    const fanRef = database.ref('devices/fan/speed');
    fanRef.set(speed);
}

function toggleAllOff() {
    if (confirm('Turn off all devices?')) {
        const devicesRef = database.ref('devices');
        devicesRef.update({
            light1: { state: false },
            light2: { state: false },
            fan: { speed: 0 },
            ac: { state: false }
        });
    }
}

function updateStatus(status) {
    if (!status) return;

    document.getElementById('light1').checked = status.light1;
    document.getElementById('light2').checked = status.light2;
    document.getElementById('ac').checked = status.ac;
    document.getElementById('fanSlider').value = status.fan;

    updateDeviceStatus('light1', status.light1);
    updateDeviceStatus('light2', status.light2);
    updateDeviceStatus('ac', status.ac);
    updateFanDisplay(status.fan);
    
    // Show/hide motion alert
    updateMotionAlert(status.motion);
}

function updateDeviceStatus(deviceId, isOn) {
    const element = document.getElementById(deviceId + '-status');
    if (element) {
        element.textContent = isOn ? 'ON' : 'OFF';
        element.className = `status ${isOn ? 'on' : 'off'}`;
    }
}

function updateFanDisplay(speed) {
    const speeds = ['OFF', 'SPEED 1', 'SPEED 2', 'SPEED 3', 'SPEED 4'];
    const element = document.getElementById('fanSpeedValue');
    if (element) element.textContent = speeds[speed];
}

function updateMotionAlert(motionDetected) {
    const alert = document.getElementById('motion-alert');
    if (alert) {
        alert.style.display = motionDetected ? 'block' : 'none';
    }
}

function checkClientSideOfficeTime() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 5 for Friday, 6 for Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let isOfficeTime = false;
    let isOffDay = false;

    // Check for Friday (5) or Saturday (6) as off days
    if (currentDay === 5 || currentDay === 6) { // Friday or Saturday
        isOffDay = true;
    } else {
        // Define office hours (e.g., 8:30 AM to 5:30 PM)
        const officeStartHour = 8;
        const officeStartMinute = 30;
        const officeEndHour = 17;
        const officeEndMinute = 30;

        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const officeStartTimeInMinutes = officeStartHour * 60 + officeStartMinute;
        const officeEndTimeInMinutes = officeEndHour * 60 + officeEndMinute;

        isOfficeTime = (currentTimeInMinutes >= officeStartTimeInMinutes && currentTimeInMinutes <= officeEndTimeInMinutes);
    }
    
    updateOfficeTimeIndicator(isOfficeTime, isOffDay);
}

function updateOfficeTimeIndicator(isOfficeTime, isOffDay) {
    const element = document.getElementById('office-indicator');
    if (element) {
        if (isOffDay) {
            element.textContent = '🎉 Weekend / Off Day';
            element.className = 'office-indicator off-day';
        } else if (isOfficeTime) {
            element.textContent = '🏢 Office Time';
            element.className = 'office-indicator office-time';
        } else {
            element.textContent = '🏠 Home Time';
            element.className = 'office-indicator home-time';
        }
    }
}

function updateNetworkStatus() {
    const element = document.getElementById('network-status');
    if (element) {
        if (window.location.hostname === '192.168.4.1') {
            element.textContent = '🔴 HOTSPOT MODE';
            element.className = 'network-status hotspot';
        } else {
            element.textContent = '🟢 ONLINE';
            element.className = 'network-status online';
        }
    }
}

// Configuration Modal
function openConfig() {
    document.getElementById('configModal').style.display = 'block';
}

function closeConfig() {
    document.getElementById('configModal').style.display = 'none';
}

// Login Modal
function openAboutModal() {
    document.getElementById('aboutModal').style.display = 'block';
}

function closeAboutModal() {
    document.getElementById('aboutModal').style.display = 'none';
}

// Firebase Authentication Functions
async function signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const authError = document.getElementById('auth-error');
    authError.style.display = 'none';

    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        closeFirebaseAuthModal();
    } catch (error) {
        authError.textContent = error.message;
        authError.style.display = 'block';
        console.error('Email sign up error:', error);
    }
}

async function signInWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const authError = document.getElementById('auth-error');
    authError.style.display = 'none';

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        closeFirebaseAuthModal();
    } catch (error) {
        authError.textContent = error.message;
        authError.style.display = 'block';
        console.error('Email sign in error:', error);
    }
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await firebase.auth().signInWithPopup(provider);
        closeFirebaseAuthModal();
    } catch (error) {
        document.getElementById('auth-error').textContent = error.message;
        document.getElementById('auth-error').style.display = 'block';
        console.error('Google sign in error:', error);
    }
}

async function signInWithApple() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    try {
        await firebase.auth().signInWithPopup(provider);
        closeFirebaseAuthModal();
    } catch (error) {
        document.getElementById('auth-error').textContent = error.message;
        document.getElementById('auth-error').style.display = 'block';
        console.error('Apple sign in error:', error);
    }
}

async function signInAnonymously() {
    try {
        await firebase.auth().signInAnonymously();
        closeFirebaseAuthModal();
    } catch (error) {
        document.getElementById('auth-error').textContent = error.message;
        document.getElementById('auth-error').style.display = 'block';
        console.error('Anonymous sign in error:', error);
    }
}

async function signOutFirebase() {
    try {
        await firebase.auth().signOut();
        console.log("Firebase user signed out.");
        // Re-initialize app to prompt for login again
        initializeApp(); 
    } catch (error) {
        console.error('Firebase sign out error:', error);
        showErrorNotification('Failed to sign out from Firebase.');
    }
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeButton(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
    closeConfig();
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
}

// Firebase Integration
function setupFirebaseListeners() {
    firebaseListener = database.ref('devices').on('value', (snapshot) => {
        const devices = snapshot.val();
        if (devices) {
            updateStatus({
                light1: devices.light1?.state || false,
                light2: devices.light2?.state || false,
                fan: devices.fan?.speed || 0,
                ac: devices.ac?.state || false,
                motion: devices.motion?.detected || false
            });
        }
    });
}

// PWA Functions
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            if (deferredPrompt) showInstallPrompt();
        }, 10000);
    });
}

function showInstallPrompt() {
    document.getElementById('installPrompt').style.display = 'block';
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            dismissInstall();
        });
    }
}

function dismissInstall() {
    document.getElementById('installPrompt').style.display = 'none';
}

function showErrorNotification(message) {
    // For simplicity, using alert. In a real app, use a toast notification library.
    alert('Error: ' + message);
}

// App Initialization
function initializeApp() {
    updateNetworkStatus();
    // Set up Firebase Auth state listener
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Firebase user signed in:", user.uid);
            setupFirebaseListeners();
            setInterval(checkClientSideOfficeTime, 60000); // Update office time every minute
            setupPWA();
        } else {
            console.log("No Firebase user signed in.");
            // If no Firebase user, prompt for Firebase login
            openFirebaseAuthModal();
        }
    });
}

// Firebase Auth Modal
function openFirebaseAuthModal() {
    document.getElementById('firebaseAuthModal').style.display = 'block';
    document.getElementById('auth-error').style.display = 'none';
}

function closeFirebaseAuthModal() {
    document.getElementById('firebaseAuthModal').style.display = 'none';
}

function openFirebaseAuthTab(tabName) {
    document.querySelectorAll('#firebaseAuthModal .tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#firebaseAuthModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeApp();
    checkClientSideOfficeTime(); // Initial call
    
    window.onclick = (event) => {
        if (event.target.matches('.modal') && event.target.id !== 'firebaseAuthModal') {
            event.target.style.display = 'none';
        }
    };
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
});