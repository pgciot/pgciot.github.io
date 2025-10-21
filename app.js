document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyAXUrwpU0xoPv-HevayyicFOTqNXmdXghk",
        authDomain: "smart-room-control-1.firebaseapp.com",
        databaseURL: "https://smart-room-control-1-default-rtdb.firebaseio.com",
        projectId: "smart-room-control-1",
        storageBucket: "smart-room-control-1.firebasestorage.app",
        messagingSenderId: "939024826629",
        appId: "1:939024826629:web:b5ba73b0a3f9738ddcf76c",
    };
    const FIREBASE_BASE_PATH = "smart-room";

    const statusView = document.getElementById('status-view');
    const authView = document.getElementById('auth-view');
    const controlView = document.getElementById('control-view');
    const appStatus = document.getElementById('app-status');
    const authBtn = document.getElementById('auth-btn');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');
    const allOffBtn = document.getElementById('all-off-btn');
    const controls = {
        light1: document.getElementById('light1'),
        light2: document.getElementById('light2'),
        ac: document.getElementById('ac'),
        fanSlider: document.getElementById('fanSlider')
    };

    let db, commandRef, statusRef;

    function init() {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            firebase.auth().onAuthStateChanged(handleAuthStateChange);
            attachEventListeners();
        } catch (e) {
            showErrorStatus(`Firebase config error: ${e.message}`);
        }
    }

    function attachEventListeners() {
        authBtn.addEventListener('click', () => firebase.auth().signInAnonymously().catch(handleAuthError));
        logoutBtn.addEventListener('click', () => firebase.auth().signOut());
        controls.light1.addEventListener('change', () => sendCommand({ device: 'light1', state: controls.light1.checked }));
        controls.light2.addEventListener('change', () => sendCommand({ device: 'light2', state: controls.light2.checked }));
        controls.ac.addEventListener('change', () => sendCommand({ device: 'ac', state: controls.ac.checked }));
        controls.fanSlider.addEventListener('input', () => sendCommand({ device: 'fan', state: parseInt(controls.fanSlider.value, 10) }));
        allOffBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to turn off all devices?')) {
                sendCommand({ device: 'all', state: false });
            }
        });
    }

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    function showErrorStatus(message) {
        appStatus.textContent = message;
        authView.style.display = 'none';
        showView('status-view');
    }

    function handleAuthStateChange(user) {
        if (user) {
            appStatus.textContent = 'Connected';
            showView('control-view');
            listenForStatusUpdates();
        } else {
            if (statusRef) statusRef.off();
            appStatus.textContent = 'Not Authenticated';
            authView.style.display = 'block';
            showView('status-view');
        }
    }

    function handleAuthError(error) {
        authError.textContent = `Authentication failed: ${error.message}`;
        authError.style.display = 'block';
    }

    function listenForStatusUpdates() {
        statusRef = db.ref(`${FIREBASE_BASE_PATH}/status`);
        statusRef.on('value', (snapshot) => {
            const status = snapshot.val();
            if (status) {
                updateUI(status);
            }
        });
    }

    function sendCommand(command) {
        if (!commandRef) {
            commandRef = db.ref(`${FIREBASE_BASE_PATH}/command`);
        }
        command.timestamp = firebase.database.ServerValue.TIMESTAMP;
        commandRef.set(command).catch(error => {
            alert('Failed to send command to device.');
        });
    }

    function updateUI(status) {
        controls.light1.checked = status.light1;
        controls.light2.checked = status.light2;
        controls.ac.checked = status.ac;
        controls.fanSlider.value = status.fan;
        updateDeviceStatus('light1', status.light1);
        updateDeviceStatus('light2', status.light2);
        updateDeviceStatus('ac', status.ac);
        updateFanStatus(status.fan);
    }

    function updateDeviceStatus(deviceId, isOn) {
        const element = document.getElementById(`${deviceId}-status`);
        if (element) {
            element.textContent = isOn ? 'ON' : 'OFF';
            element.className = `status ${isOn ? 'on' : 'off'}`;
        }
    }

    function updateFanStatus(speed) {
        const speeds = ['OFF', 'SPEED 1', 'SPEED 2', 'SPEED 3'];
        const element = document.getElementById('fan-status');
        if (element) {
            element.textContent = speeds[speed];
            element.className = `status ${speed > 0 ? 'on' : 'off'}`;
        }
    }

    init();
});