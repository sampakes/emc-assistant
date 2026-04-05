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

    // --- Hardcoded Default Measurement Data ---
    // Format per table body: array of 16 rows (4 peaks × 4 rotations)
    // Each row: { f: freq, r: reading, a: AF (blank until datasheet), l: loss }
    // Row order: 0° (×4), 90° (×4), 180° (×4), 270° (×4)
    const DEFAULT_DATA = {
        'STM32 Demo Board': {
            'tbody-dir-h': [
                // 0°
                { f: '350',    r: '23.2',  a: '15',   l: '1.5' },
                { f: '384',    r: '17.73', a: '15.5', l: '1.5' },
                { f: '512',    r: '15.53', a: '19',   l: '1.5' },
                { f: '576',    r: '16.55', a: '20',   l: '1.5' },
                // 90°
                { f: '350',    r: '22.91', a: '15',   l: '1.5' },
                { f: '384.04', r: '17.13', a: '15.5', l: '1.5' },
                { f: '450',    r: '15',    a: '17',   l: '1.5' },
                { f: '576',    r: '17.63', a: '20',   l: '1.5' },
                // 180°
                { f: '350',    r: '16.34', a: '15',   l: '1.5' },
                { f: '384',    r: '17.11', a: '15.5', l: '1.5' },
                { f: '448',    r: '15.24', a: '17',   l: '1.5' },
                { f: '512',    r: '14.59', a: '19',   l: '1.5' },
                // 270°
                { f: '350',    r: '14.9',  a: '15',   l: '1.5' },
                { f: '383.96', r: '15.58', a: '15.5', l: '1.5' },
                { f: '500',    r: '14.52', a: '19',   l: '1.5' },
                { f: '512',    r: '16.7',  a: '19',   l: '1.5' },
            ],
            // 'tbody-dir-v': [ ... ],  // Will be added when user provides data
            'tbody-bic-h': [
                // 0°
                { f: '50',     r: '24.33', a: '10',   l: '1.5' },
                { f: '150',    r: '16.56', a: '13',   l: '1.5' },
                { f: '200',    r: '16.21', a: '14',   l: '1.5' },
                { f: '288',    r: '20.65', a: '17.5', l: '1.5' },
                // 90°
                { f: '50',     r: '25.22', a: '10',   l: '1.5' },
                { f: '94.5',   r: '25.78', a: '9',    l: '1.5' },
                { f: '144',    r: '18.61', a: '12',   l: '1.5' },
                { f: '224',    r: '15.59', a: '14.5', l: '1.5' },
                // 180°
                { f: '50',     r: '26.29', a: '10',   l: '1.5' },
                { f: '105',    r: '24.56', a: '10',   l: '1.5' },
                { f: '150',    r: '17.86', a: '13',   l: '1.5' },
                { f: '219.60', r: '18.45', a: '14.5', l: '1.5' },
                // 270°
                { f: '50',     r: '25.77', a: '10',   l: '1.5' },
                { f: '94.52',  r: '27.95', a: '9',    l: '1.5' },
                { f: '144',    r: '17.23', a: '12',   l: '1.5' },
                { f: '250',    r: '17.74', a: '15.5', l: '1.5' },
            ],
            'tbody-bic-v': [
                // 0° (Redo)
                { f: '50',     r: '31.02', a: '10',   l: '1.5' },
                { f: '106.72', r: '17.94', a: '10',   l: '1.5' },
                { f: '144',    r: '16.21', a: '12',   l: '1.5' },
                { f: '256',    r: '20.34', a: '16',   l: '1.5' },
                // 90°
                { f: '50',     r: '31.37', a: '10',   l: '1.5' },
                { f: '94.48',  r: '20.04', a: '9',    l: '1.5' },
                { f: '224',    r: '17.36', a: '14.5', l: '1.5' },
                { f: '262.88', r: '19.48', a: '16',   l: '1.5' },
                // 180°
                { f: '50',     r: '30.01', a: '10',   l: '1.5' },
                { f: '99.8',   r: '23.05', a: '9.5',  l: '1.5' },
                { f: '199.92', r: '19.48', a: '14',   l: '1.5' },
                { f: '288',    r: '21.16', a: '17.5', l: '1.5' },
                // 270°
                { f: '50',     r: '29.29', a: '10',   l: '1.5' },
                { f: '99.76',  r: '22.49', a: '9.5',  l: '1.5' },
                { f: '209.88', r: '18.87', a: '14.5', l: '1.5' },
                { f: '288',    r: '20.12', a: '17.5', l: '1.5' },
            ],
        },
        'DMU11': {
            // Data will be added when user provides it
        }
    };

    // --- Device State Manager (in-memory, no localStorage) ---
    let appData = {
        devices: Object.keys(DEFAULT_DATA),
        currentDevice: Object.keys(DEFAULT_DATA)[0] || 'STM32 Demo Board',
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
            appData.currentDevice = selector.value;
            loadDeviceState();
            calculateTable();
        });
    }

    function loadDeviceState() {
        const tbodies = ['tbody-dir-v', 'tbody-dir-h', 'tbody-bic-v', 'tbody-bic-h'];
        const defaults = DEFAULT_DATA[appData.currentDevice] || {};

        tbodies.forEach(tbId => {
            const tbody = document.getElementById(tbId);
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            const source = defaults[tbId];

            rows.forEach((row, i) => {
                row.querySelector('.t-freq').value = source && source[i] ? source[i].f : '';
                row.querySelector('.t-read').value = source && source[i] ? source[i].r : '';
                row.querySelector('.t-af').value   = source && source[i] ? source[i].a : '';
                row.querySelector('.t-loss').value  = source && source[i] && source[i].l !== '' ? source[i].l : '1.5';

                row.querySelector('.t-final').textContent = '--';
                row.querySelector('.t-margin').textContent = '--';
                row.querySelector('.t-margin').style.color = '';
            });
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

    document.querySelectorAll('input[name="plot-mode"]').forEach(r => r.addEventListener('change', calculateTable));

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

        // Mappers
        const startF = Receiver.freq.start;
        const stopF = Receiver.freq.stop;
        const span = Receiver.freq.span;
        const mapX = (f) => pad.l + ((f - startF) / span) * graphW;

        const minL = 0, maxL = 100;
        const mapY = (l) => pad.t + graphH - ((Math.min(maxL, Math.max(minL, l)) - minL) / (maxL - minL)) * graphH;

        // Grid lines
        ctx.strokeStyle = '#224422'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
            const x = pad.l + i * (graphW / 10); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b);
            const y = pad.t + i * (graphH / 10); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y);
        }
        ctx.stroke();

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
                    if (plotMode === 'all' || plotMode === 'active-full') {
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

    // --- Interactive AF Graphs Overlay ---
    function initAFSliders() {
        const bicSlider = document.getElementById('bic-slider');
        const dirSlider = document.getElementById('dir-slider');

        if (!bicSlider || !dirSlider) return;

        // High-resolution curve data (user-verified at grid intersections)
        const bicPoints = [
            {x: 30, y: 18}, {x: 40, y: 14}, {x: 50, y: 10}, {x: 60, y: 6.4},
            {x: 64, y: 5.3}, {x: 70, y: 5.5}, {x: 80, y: 7.5}, {x: 90, y: 9.3},
            {x: 100, y: 11}, {x: 130, y: 13.8}, {x: 200, y: 15}, {x: 236, y: 15.5},
            {x: 300, y: 18.6}
        ];
        const dirPoints = [
            {x: 300, y: 15.6}, {x: 327, y: 14.7}, {x: 373, y: 14.9},
            {x: 400, y: 15.6}, {x: 500, y: 17.6}, {x: 600, y: 18.9},
            {x: 700, y: 20.9}, {x: 800, y: 22.0}, {x: 900, y: 23.8},
            {x: 1000, y: 24.9}
        ];

        function getInterpolatedAF(freq, points) {
            if (freq <= points[0].x) return points[0].y;
            if (freq >= points[points.length-1].x) return points[points.length-1].y;
            for (let i = 0; i < points.length - 1; i++) {
                if (freq >= points[i].x && freq <= points[i+1].x) {
                    const logF = Math.log10(freq);
                    const logX1 = Math.log10(points[i].x);
                    const logX2 = Math.log10(points[i+1].x);
                    const ratio = (logF - logX1) / (logX2 - logX1);
                    return points[i].y + ratio * (points[i+1].y - points[i].y);
                }
            }
            return 0;
        }

        // Calibration computed from user click coordinates
        const bicPads = { l: 14.6, r: 4.4, b: 15.5, t: 4.5, xMin: 30, xMax: 300, yMin: 0, yMax: 20 };
        const dirPads = { l: 19.4, r: 9.4, b: 19.0, t: 4.6, xMin: 200, xMax: 1000, yMin: 0, yMax: 30 };

        function updateSlider(type) {
            const isBic = type === 'bic';
            const slider = isBic ? bicSlider : dirSlider;
            const p = isBic ? bicPads : dirPads;
            
            const freq = parseFloat(slider.value);
            const clampedFreq = isBic ? freq : Math.max(300, freq);
            const af = isBic ? getInterpolatedAF(freq, bicPoints) : getInterpolatedAF(clampedFreq, dirPoints);

            document.getElementById(`${type}-f-input`).value = freq.toFixed(0);
            document.getElementById(`${type}-af-readout`).textContent = af.toFixed(1);
            
            const dotLabel = document.getElementById(`${type}-dot-label`);
            if (dotLabel) {
                dotLabel.textContent = `${freq.toFixed(0)} MHz | ${af.toFixed(1)} dB/m`;
            }

            const dot = document.getElementById(`${type}-dot`);
            dot.style.display = 'block';

            // Logarithmic mapping for X axis
            const logRange = Math.log10(p.xMax) - Math.log10(p.xMin);
            const xPercent = ((Math.log10(freq) - Math.log10(p.xMin)) / logRange) * (100 - p.l - p.r) + p.l;
            
            // Linear mapping for Y axis
            const yRange = p.yMax - p.yMin;
            const yPercent = ((af - p.yMin) / yRange) * (100 - p.b - p.t) + p.b;

            dot.style.left = `${xPercent}%`;
            dot.style.bottom = `${yPercent}%`;

            // Position crosshair lines (dot to left axis & bottom axis, clipped to graph)
            const bounds = isBic
                ? { xMin: 14.7, yMin: 15.9 }
                : { xMin: 18.9, yMin: 17.7 };
            const vLine = document.getElementById(`${type}-crosshair-v`);
            const hLine = document.getElementById(`${type}-crosshair-h`);
            if (vLine) {
                vLine.style.display = 'block';
                vLine.style.left = `${xPercent}%`;
                vLine.style.bottom = `${bounds.yMin}%`;
                vLine.style.height = `${yPercent - bounds.yMin}%`;
            }
            if (hLine) {
                hLine.style.display = 'block';
                hLine.style.bottom = `${yPercent}%`;
                hLine.style.left = `${bounds.xMin}%`;
                hLine.style.width = `${xPercent - bounds.xMin}%`;
            }
        }

        // Slider → updates dot & input
        bicSlider.addEventListener('input', () => updateSlider('bic'));
        dirSlider.addEventListener('input', () => updateSlider('dir'));

        // Input field → updates slider & dot (on Enter or blur)
        const bicInput = document.getElementById('bic-f-input');
        const dirInput = document.getElementById('dir-f-input');
        
        function applyInput(type) {
            const input = type === 'bic' ? bicInput : dirInput;
            const slider = type === 'bic' ? bicSlider : dirSlider;
            const min = type === 'bic' ? 30 : 300;
            const max = type === 'bic' ? 300 : 1000;
            const v = Math.min(max, Math.max(min, parseInt(input.value) || min));
            input.value = v;
            slider.value = v;
            updateSlider(type);
        }

        bicInput.addEventListener('change', () => applyInput('bic'));
        dirInput.addEventListener('change', () => applyInput('dir'));
        bicInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyInput('bic'); });
        dirInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyInput('dir'); });

        updateSlider('bic');
        updateSlider('dir');
    }

    // --- Initialization Wrapper ---
    try {
        initDeviceManager();
        loadDeviceState();
        calculateTable();
        
        console.log("EMC Assistant Core Initialized.");
    } catch (e) {
        console.warn("Core initialization notice:", e.message);
    }
    
    // Always initialize AF sliders regardless of other failures
    try {
        initAFSliders();
        console.log("AF Calibration Ready.");
    } catch (e) {
        console.error("AF Slider Error:", e);
    }

});
