document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    const Receiver = {
        freq: { center: 100, start: 50, stop: 150, span: 100 },
        marker: { active: false, freq: 100, level: 0 },
        // Exact level of the calculated fundamental field strength
        simulatedLevel: 60,

        updateDisplay() {
            // Header
            document.getElementById('center-freq-readout').textContent =
                `CENTER ${this.freq.center.toFixed(2)} MHz`;
            document.querySelector('.rbw-ind').textContent = `RBW: 120 kHz`;

            // Marker
            const mkrEl = document.getElementById('marker-readout');
            if (this.marker.active) {
                mkrEl.style.display = 'block';
                document.getElementById('mkr-freq').textContent = this.marker.freq.toFixed(2);
                document.getElementById('mkr-level').textContent = this.marker.level.toFixed(1);
            } else {
                mkrEl.style.display = 'none';
            }

            // Sync with Calculator Input (Source of Truth)
            // If calculator has a value, we can use it, but typically we want the SIM to drive the calculation on boot?
            // User requested: Calculator Input -> Sim. 
            // So we just read DOM in drawScreen.

            drawScreen();
        }
    };

    function writeFooter(msg) { document.getElementById('footer-msg').textContent = msg; }
    // Legacy softkey and hardkey functions removed

    // --- Device State Manager (LocalStorage) ---
    let appData = JSON.parse(localStorage.getItem('emcData')) || {
        devices: ['STM32 Demo Board', 'DMU11'],
        currentDevice: 'STM32 Demo Board',
        deviceStates: {}
    };

    function initDeviceManager() {
        const selector = document.getElementById('device-selector');
        
        function renderOptions() {
            selector.innerHTML = '';
            appData.devices.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                selector.appendChild(opt);
            });
            selector.value = appData.currentDevice;
        }

        if (selector) renderOptions();

        if (selector) selector.addEventListener('change', () => {
            saveDeviceState();
            appData.currentDevice = selector.value;
            localStorage.setItem('emcData', JSON.stringify(appData));
            loadDeviceState();
            calculateTable();
        });

        const addBtn = document.getElementById('add-device-btn');
        if (addBtn) addBtn.addEventListener('click', () => {
            const newName = prompt('Enter new device name:');
            if (newName && newName.trim() !== '') {
                if (!appData.devices.includes(newName)) {
                    saveDeviceState(); // save current before switching
                    appData.devices.push(newName);
                    appData.currentDevice = newName;
                    renderOptions();
                    loadDeviceState(); // loads empty for new
                    calculateTable();
                    localStorage.setItem('emcData', JSON.stringify(appData));
                } else {
                    alert('Device already exists.');
                }
            }
        });

        const delBtn = document.getElementById('del-device-btn');
        if (delBtn) delBtn.addEventListener('click', () => {
            if (appData.devices.length <= 1) return alert('Cannot delete the last device.');
            if (confirm(`Are you sure you want to delete ${appData.currentDevice} and all its data?`)) {
                appData.devices = appData.devices.filter(d => d !== appData.currentDevice);
                delete appData.deviceStates[appData.currentDevice];
                appData.currentDevice = appData.devices[0];
                renderOptions();
                loadDeviceState();
                calculateTable();
                localStorage.setItem('emcData', JSON.stringify(appData));
            }
        });

        // Auto-save on any input change
        document.querySelectorAll('.data-table input').forEach(inp => {
            inp.addEventListener('change', () => saveDeviceState());
        });
    }

    function saveDeviceState() {
        const rows = document.querySelectorAll('.data-table tbody tr');
        let state = [];
        rows.forEach(row => {
            state.push({
                f: row.querySelector('.t-freq').value,
                r: row.querySelector('.t-read').value,
                a: row.querySelector('.t-af').value,
                l: row.querySelector('.t-loss').value
            });
        });
        
        // Save distance and class specifically for device?
        // Let's just save the table data for now as per user request.
        appData.deviceStates[appData.currentDevice] = state;
        localStorage.setItem('emcData', JSON.stringify(appData));
    }

    function loadDeviceState() {
        const rows = document.querySelectorAll('.data-table tbody tr');
        const state = appData.deviceStates[appData.currentDevice];
        
        rows.forEach((row, i) => {
            row.querySelector('.t-freq').value = state && state[i] ? state[i].f : '';
            row.querySelector('.t-read').value = state && state[i] ? state[i].r : '';
            row.querySelector('.t-af').value = state && state[i] ? state[i].a : '';
            row.querySelector('.t-loss').value = state && state[i] && state[i].l !== '' ? state[i].l : '1.5';
            
            row.querySelector('.t-final').textContent = '--';
            row.querySelector('.t-margin').textContent = '--';
            row.querySelector('.t-margin').style.color = '';
        });
    }

    // --- Legacy Calculator logic removed ---
    let tableSignals = [];

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            drawScreen();
        });
    });

    document.querySelectorAll('.rot-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabContent = this.closest('.tab-content');
            tabContent.querySelectorAll('.rot-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const selectedRot = this.dataset.rot;
            tabContent.querySelectorAll('.data-table tbody tr').forEach(row => {
                if (row.dataset.rot === selectedRot) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
            drawScreen();
        });
    });

    function calculateTable() {
        const distVal = parseInt(document.getElementById('dist').value) || 3;
        const clsVal = document.getElementById('class').value || 'B';
        tableSignals = [];

        document.querySelectorAll('.data-table tbody tr').forEach(row => {
            const fInput = row.querySelector('.t-freq');
            const rInput = row.querySelector('.t-read');
            const aInput = row.querySelector('.t-af');
            const lInput = row.querySelector('.t-loss');
            
            const f = parseFloat(fInput.value);
            const read = parseFloat(rInput.value);
            const af = parseFloat(aInput.value) || 0;
            const loss = parseFloat(lInput.value) || 0;

            if (!isNaN(f) && !isNaN(read)) {
                const total = read + af + loss;
                const limit = getLimit(f, distVal, clsVal);
                const margin = limit - total;

                const finalEl = row.querySelector('.t-final');
                const marginEl = row.querySelector('.t-margin');

                finalEl.textContent = total.toFixed(2);
                marginEl.textContent = margin.toFixed(2);

                if (margin >= 0) {
                    marginEl.style.color = margin >= 6 ? 'var(--success)' : 'var(--warning)';
                } else {
                    marginEl.style.color = 'var(--danger)';
                }

                const tabId = row.closest('.tab-content').id;
                const rotId = row.dataset.rot;
                tableSignals.push({ f: f, l: total, tab: tabId, rot: rotId });
            }
        });

        // Ensure calculation saves current state
        if (typeof saveDeviceState === 'function') saveDeviceState();

        // Auto-scale to fit the new points
        autoSpanTable();
    }

    function autoSpanTable() {
        const plotModeEl = document.querySelector('input[name="plot-mode"]:checked');
        const plotMode = plotModeEl ? plotModeEl.value : 'active';
        const activeTabEl = document.querySelector('.tab-btn.active');
        const activeTab = activeTabEl ? activeTabEl.dataset.tab : '';

        let nStart, nStop;

        if (plotMode === 'all' || plotMode === 'active-full') {
            nStart = 30;
            nStop = 1000;
        } else {
            // plotMode === 'active'
            if (activeTab.startsWith('bic')) {
                nStart = 30;
                nStop = 300;
            } else if (activeTab.startsWith('dir')) {
                nStart = 300;
                nStop = 1000;
            } else {
                nStart = 30;
                nStop = 1000;
            }
        }

        let nSpan = nStop - nStart;
        let nCenter = (nStop + nStart) / 2;

        Receiver.freq.center = nCenter;
        Receiver.freq.span = nSpan;
        Receiver.freq.start = nStart;
        Receiver.freq.stop = nStop;
        
        Receiver.updateDisplay(); // updateDisplay calls drawScreen()
    }

    const calcTableBtn = document.getElementById('calc-table-btn');
    if (calcTableBtn) calcTableBtn.addEventListener('click', calculateTable);

    document.querySelectorAll('input[name="plot-mode"]').forEach(r => r.addEventListener('change', drawScreen));

    // --- Drawing ---
    function drawScreen() {
        // Canvas Setup
        const canvas = document.getElementById('esci-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const pad = { l: 40, r: 20, t: 20, b: 30 };
        const graphW = w - pad.l - pad.r;
        const graphH = h - pad.t - pad.b;

        // Layout Actions
        ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#000'; ctx.fillRect(pad.l, pad.t, graphW, graphH);

        // Grid
        ctx.strokeStyle = '#224422'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = pad.l + i * (graphW / 10); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b);
            const y = pad.t + i * (graphH / 10); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y);
        }
        ctx.stroke();

        // Mappers
        const startF = Receiver.freq.start;
        const stopF = Receiver.freq.stop;
        const span = Receiver.freq.span;
        const mapX = (f) => pad.l + ((f - startF) / span) * graphW;

        const minL = 0, maxL = 100;
        const mapY = (l) => pad.t + graphH - ((Math.min(maxL, Math.max(minL, l)) - minL) / (maxL - minL)) * graphH;

        // Limit Line
        const dist = parseInt(document.getElementById('dist').value);
        const cls = document.getElementById('class').value;
        ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 2; ctx.beginPath();
        let started = false;
        for (let ix = 0; ix <= graphW; ix += 2) {
            const f = startF + (ix / graphW) * span;
            const l = getLimit(f, dist, cls);
            const y = mapY(l);
            if (!started) { ctx.moveTo(pad.l + ix, y); started = true; } else ctx.lineTo(pad.l + ix, y);
        }
        ctx.stroke();

        const plotModeEl = document.querySelector('input[name="plot-mode"]:checked');
        const plotMode = plotModeEl ? plotModeEl.value : 'active';
        const activeTabEl = document.querySelector('.tab-btn.active');
        const activeTab = activeTabEl ? activeTabEl.dataset.tab : '';
        const activeTabContent = document.getElementById(activeTab);
        const activeRotBtn = activeTabContent ? activeTabContent.querySelector('.rot-btn.active') : null;
        const activeRot = activeRotBtn ? activeRotBtn.dataset.rot : '0';
        
        const colorMap = {
            'dir-v': '#00ffff',
            'dir-h': '#ff00ff',
            'bic-v': '#00ff00',
            'bic-h': '#ffaa00'
        };

        const activeTabsArray = (plotMode === 'all') ? Object.keys(colorMap) : [activeTab];

        // Draw general noise floor trace
        ctx.strokeStyle = '#555522'; ctx.lineWidth = 1; ctx.beginPath();
        for (let ix = 0; ix <= graphW; ix++) {
             let y = mapY(5 + Math.random() * 3);
             if(ix === 0) ctx.moveTo(pad.l + ix, y); else ctx.lineTo(pad.l + ix, y);
        }
        ctx.stroke();

        // Draw color-coded peaks as stems and markers
        for (let tab of activeTabsArray) {
            ctx.strokeStyle = colorMap[tab];
            ctx.fillStyle = colorMap[tab];
            ctx.lineWidth = 1.5;
            
            for (let s of tableSignals) {
                if (s.tab === tab) {
                    let shouldDraw = false;
                    if (plotMode === 'all') {
                        shouldDraw = true;
                    } else if (s.rot === activeRot) {
                        shouldDraw = true;
                    }

                    if (shouldDraw) {
                        let mx = mapX(s.f);
                        let my = mapY(s.l);
                        
                        if (mx >= pad.l && mx <= pad.l + graphW) {
                            // Stem from floor
                            ctx.beginPath();
                            ctx.moveTo(mx, mapY(8));
                            ctx.lineTo(mx, my);
                            ctx.stroke();
                            
                            // Dot
                            ctx.beginPath();
                            ctx.arc(mx, my, 4, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }
        }

        // Marker (Linked to Sim Level)
        if (Receiver.marker.active) {
            const mx = mapX(Receiver.marker.freq);
            const my = mapY(Receiver.marker.level);
            // Draw only if in bounds
            if (mx >= pad.l && mx <= pad.l + graphW) {
                ctx.fillStyle = '#f0f'; ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Axis Labels
        ctx.fillStyle = '#aaa'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 10; i += 2) {
            const ys = pad.t + graphH - i * (graphH / 10);
            ctx.fillText((i * 10).toString(), pad.l - 5, ys);
        }

        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let i = 0; i <= 10; i += 2) {
            const f = startF + i * (span / 10);
            ctx.fillText(f.toFixed(0), pad.l + i * (graphW / 10), h - pad.b + 5);
        }
        ctx.fillStyle = '#0f0'; ctx.fillText('MHz', pad.l + graphW / 2, h - 12);
    }

    // Helpers
    function getLimit(f, dist, cls) {
        let l = (cls === 'B') ? (f <= 230 ? 30 : 37) : (f <= 230 ? 40 : 47);
        if (dist === 3) l += 10.5;
        return l;
    }

    // Auto-AF configuration removed

    // Keyboard interaction dependencies removed

    // Init
    initDeviceManager();
    loadDeviceState();
    calculateTable();

});
