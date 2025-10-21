
document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const loginView = document.getElementById('login-view');
    const controlView = document.getElementById('control-view');
    const loginError = document.getElementById('login-error');
    const connectionStatus = document.getElementById('connection-status');

    // Login View Elements
    const deviceAddressInput = document.getElementById('device-address');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');

    // Control View Elements
    const logoutBtn = document.getElementById('logout-btn');
    const allOffBtn = document.getElementById('all-off-btn');
    const controls = {
        light1: document.getElementById('light1'),
        light2: document.getElementById('light2'),
        ac: document.getElementById('ac'),
        fanSlider: document.getElementById('fanSlider')
    };

    // --- State Management ---
    let state = {
        deviceAddress: null,
        token: null,
        statusPoller: null
    };

    // --- Main Initialization ---
    function init() {
        loadState();
        if (state.deviceAddress && state.token) {
            showView('control-view');
            startStatusPolling();
        } else {
            showView('login-view');
        }
        attachEventListeners();
    }

    function attachEventListeners() {
        loginBtn.addEventListener('click', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);

        // Attach listeners for device controls
        controls.light1.addEventListener('change', () => toggleDevice('light1', controls.light1.checked));
        controls.light2.addEventListener('change', () => toggleDevice('light2', controls.light2.checked));
        controls.ac.addEventListener('change', () => toggleDevice('ac', controls.ac.checked));
        controls.fanSlider.addEventListener('input', () => setFanSpeed(controls.fanSlider.value));
        allOffBtn.addEventListener('click', turnAllOff);
    }

    // --- View & State Management ---
    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
        document.getElementById(viewId).style.display = 'block';
    }

    function saveState() {
        localStorage.setItem('smartRoomState', JSON.stringify({ 
            deviceAddress: state.deviceAddress, 
            token: state.token 
        }));
    }

    function loadState() {
        const saved = localStorage.getItem('smartRoomState');
        if (saved) {
            const loadedState = JSON.parse(saved);
            state.deviceAddress = loadedState.deviceAddress;
            state.token = loadedState.token;
            deviceAddressInput.value = state.deviceAddress;
        }
    }

    function clearState() {
        localStorage.removeItem('smartRoomState');
        state.deviceAddress = null;
        state.token = null;
    }

    function displayError(element, message) {
        element.textContent = message;
        element.style.display = message ? 'block' : 'none';
    }

    // --- Authentication ---
    async function handleLogin() {
        const deviceAddress = deviceAddressInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!deviceAddress) {
            displayError(loginError, 'Device Address cannot be empty.');
            return;
        }

        displayError(loginError, '');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${deviceAddress}/login`, { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                state.deviceAddress = deviceAddress;
                state.token = data.token;
                saveState();
                showView('control-view');
                startStatusPolling();
            } else {
                throw new Error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            displayError(loginError, `Login failed: ${error.message}. Check address and network.`);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    function handleLogout() {
        clearState();
        stopStatusPolling();
        showView('login-view');
    }

    // --- API Communication ---
    async function authenticatedFetch(endpoint) {
        if (!state.deviceAddress || !state.token) {
            handleLogout(); // Auto-logout if state is invalid
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${state.deviceAddress}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });

            if (response.status === 401) { // Unauthorized
                handleLogout();
                throw new Error('Session expired. Please log in again.');
            }
            if (!response.ok) {
                throw new Error(`Network response was not ok (status: ${response.status})`);
            }
            displayError(connectionStatus, ''); // Clear connection error on success
            return response.json();
        } catch (error) {
            displayError(connectionStatus, 'Connection to device lost. Retrying...');
            console.error('API Fetch Error:', error);
            throw error; // Re-throw to stop promise chain
        }
    }

    function getStatus() {
        authenticatedFetch('/status').then(updateUI).catch(() => {});
    }

    function toggleDevice(device, isChecked) {
        authenticatedFetch(`/toggle?device=${device}&state=${isChecked ? '1' : '0'}`)
            .then(updateUI).catch(() => {});
    }

    function setFanSpeed(speed) {
        authenticatedFetch(`/toggle?device=fan&state=${speed}`)
            .then(updateUI).catch(() => {});
    }

    function turnAllOff() {
        if (confirm('Are you sure you want to turn off all devices?')) {
            authenticatedFetch(`/toggle?device=all&state=0`)
                .then(updateUI).catch(() => {});
        }
    }

    // --- UI Updates ---
    function updateUI(status) {
        if (!status) return;
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

    // --- Polling ---
    function startStatusPolling() {
        if (state.statusPoller) clearInterval(state.statusPoller);
        getStatus(); // Get initial status immediately
        state.statusPoller = setInterval(getStatus, 5000);
    }

    function stopStatusPolling() {
        if (state.statusPoller) clearInterval(state.statusPoller);
    }

    // --- Run Application ---
    init();
});
