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
            'tbody-dir-v': [
                // 0°
                { f: '350',  r: '19.84', a: '15',   l: '1.5' },
                { f: '448',  r: '24.71', a: '16.5', l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                // 90°
                { f: '350',  r: '18.98', a: '15',   l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                // 180°
                { f: '350',  r: '15.32', a: '15',   l: '1.5' },
                { f: '416',  r: '15.87', a: '16',   l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                // 270°
                { f: '350',  r: '17.92', a: '15',   l: '1.5' },
                { f: '650',  r: '13.06', a: '20',   l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
                { f: '',     r: '',      a: '',     l: '1.5' },
            ],
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

    // --- Export / Import ---
    function exportData() {
        const tbodies = ['tbody-dir-v', 'tbody-dir-h', 'tbody-bic-v', 'tbody-bic-h'];
        const deviceName = appData.currentDevice;
        const data = { device: deviceName, tables: {} };

        tbodies.forEach(tbId => {
            const tbody = document.getElementById(tbId);
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            data.tables[tbId] = [];
            rows.forEach(row => {
                data.tables[tbId].push({
                    f: row.querySelector('.t-freq')?.value || '',
                    r: row.querySelector('.t-read')?.value || '',
                    a: row.querySelector('.t-af')?.value || '',
                    l: row.querySelector('.t-loss')?.value || ''
                });
            });
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${deviceName.replace(/\s+/g, '_')}_emc_data.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.tables) { alert('Invalid file format.'); return; }

                // Add device if it doesn't exist
                if (data.device && !appData.devices.includes(data.device)) {
                    appData.devices.push(data.device);
                    DEFAULT_DATA[data.device] = {};
                }
                if (data.device) {
                    appData.currentDevice = data.device;
                    const selector = document.getElementById('device-selector');
                    // Re-render selector options
                    selector.innerHTML = '';
                    appData.devices.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d; opt.textContent = d;
                        selector.appendChild(opt);
                    });
                    selector.value = data.device;
                }

                // Populate tables
                for (const [tbId, rows] of Object.entries(data.tables)) {
                    const tbody = document.getElementById(tbId);
                    if (!tbody) continue;
                    const trs = tbody.querySelectorAll('tr');
                    rows.forEach((row, i) => {
                        if (!trs[i]) return;
                        const fI = trs[i].querySelector('.t-freq');
                        const rI = trs[i].querySelector('.t-read');
                        const aI = trs[i].querySelector('.t-af');
                        const lI = trs[i].querySelector('.t-loss');
                        if (fI) fI.value = row.f || '';
                        if (rI) rI.value = row.r || '';
                        if (aI) aI.value = row.a || '';
                        if (lI) lI.value = row.l || '';
                    });

                    // Also update DEFAULT_DATA so it persists in-session
                    DEFAULT_DATA[appData.currentDevice] = DEFAULT_DATA[appData.currentDevice] || {};
                    DEFAULT_DATA[appData.currentDevice][tbId] = rows;
                }

                calculateTable();
                alert(`Loaded data for "${data.device}".`);
            } catch (err) {
                alert('Error reading file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    document.getElementById('export-data-btn')?.addEventListener('click', exportData);
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
            e.target.value = '';
        }
    });

    // --- Legacy Calculator logic removed ---
    let tableSignals = [];

    // --- Shared Cable Loss Data (S21 measurement) ---
    const cableData = [
        {f: 30, loss: 3.286}, {f: 51.825, loss: 3.068}, {f: 71.225, loss: 2.789},
        {f: 100.325, loss: 2.678}, {f: 129.425, loss: 2.601}, {f: 175.5, loss: 2.377},
        {f: 204.6, loss: 2.225}, {f: 231.275, loss: 2.367}, {f: 262.8, loss: 2.245},
        {f: 328.275, loss: 2.412}, {f: 367.075, loss: 2.28}, {f: 420.425, loss: 2.381},
        {f: 447.1, loss: 2.0}, {f: 478.625, loss: 2.249}, {f: 541.675, loss: 2.043},
        {f: 558.65, loss: 2.107}, {f: 687.175, loss: 1.97}, {f: 721.125, loss: 2.184},
        {f: 767.2, loss: 2.172}, {f: 798.725, loss: 2.246}, {f: 861.775, loss: 2.093},
        {f: 900.575, loss: 2.237}, {f: 958.775, loss: 1.946}, {f: 1000, loss: 1.705}
    ];
    function interpolateCableLoss(freq) {
        if (freq <= cableData[0].f) return cableData[0].loss;
        if (freq >= cableData[cableData.length-1].f) return cableData[cableData.length-1].loss;
        for (let i = 0; i < cableData.length - 1; i++) {
            if (freq >= cableData[i].f && freq <= cableData[i+1].f) {
                const t = (freq - cableData[i].f) / (cableData[i+1].f - cableData[i].f);
                return cableData[i].loss + t * (cableData[i+1].loss - cableData[i].loss);
            }
        }
        return 0;
    }

    // --- Shared AF Data (user-verified at grid intersections) ---
    const bicAFPoints = [
        {x: 30, y: 18}, {x: 40, y: 14}, {x: 50, y: 10}, {x: 60, y: 6.4},
        {x: 64, y: 5.3}, {x: 70, y: 5.5}, {x: 80, y: 7.5}, {x: 90, y: 9.3},
        {x: 100, y: 11}, {x: 130, y: 13.8}, {x: 200, y: 15}, {x: 236, y: 15.5},
        {x: 300, y: 18.6}
    ];
    const dirAFPoints = [
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
    function lookupAF(freq) {
        if (freq >= 30 && freq <= 300) return getInterpolatedAF(freq, bicAFPoints);
        if (freq > 300 && freq <= 1000) return getInterpolatedAF(freq, dirAFPoints);
        return 0;
    }

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
            if (!fInput || !rInput) return;
            
            const f = parseFloat(fInput.value);
            const read = parseFloat(rInput.value);

            // Auto-populate AF and cable loss from measured data
            if (!isNaN(f) && f > 0) {
                if (aInput) aInput.value = lookupAF(f).toFixed(1);
                if (lInput) lInput.value = interpolateCableLoss(f).toFixed(2);
            }
            const af = parseFloat(aInput ? aInput.value : '') || 0;
            const loss = parseFloat(lInput ? lInput.value : '') || 0;

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

        // Update notable peaks summary
        try { generateNotablePeaks(); } catch(e) { console.warn('Notable peaks:', e); }
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

    // --- Notable Peaks Summary ---
    function generateNotablePeaks() {
        const container = document.getElementById('notable-peaks-table');
        if (!container) return;

        const deviceName = appData.currentDevice;
        const deviceData = DEFAULT_DATA[deviceName];
        if (!deviceData) { container.innerHTML = '<p style="color:#aaa;">No data loaded.</p>'; return; }

        const tabLabels = {
            'tbody-dir-h': { antenna: 'Directional UPA 6108', pol: 'Horizontal' },
            'tbody-dir-v': { antenna: 'Directional UPA 6108', pol: 'Vertical' },
            'tbody-bic-h': { antenna: 'Biconical VBA 6106', pol: 'Horizontal' },
            'tbody-bic-v': { antenna: 'Biconical VBA 6106', pol: 'Vertical' }
        };
        const rotLabels = ['0°','0°','0°','0°','90°','90°','90°','90°','180°','180°','180°','180°','270°','270°','270°','270°'];

        let peaks = [];
        for (const [tbodyId, rows] of Object.entries(deviceData)) {
            const info = tabLabels[tbodyId];
            if (!info || !rows) continue;
            rows.forEach((row, i) => {
                const f = parseFloat(row.f), r = parseFloat(row.r), a = parseFloat(row.a);
                if (isNaN(f) || isNaN(r) || f === 0) return;
                const l = interpolateCableLoss(f);
                const total = r + (isNaN(a) ? 0 : a) + l;
                const limit = f < 230 ? 40 : 47;
                const margin = limit - total;
                peaks.push({
                    freq: f, reading: r, af: a, loss: l, total: total,
                    limit: limit, margin: margin,
                    antenna: info.antenna, pol: info.pol,
                    rot: rotLabels[i] || '?'
                });
            });
        }

        peaks.sort((a, b) => b.total - a.total);
        const top = peaks.slice(0, 5);

        let html = `<table class="data-table" style="width:100%; font-size:0.85rem;">
            <thead><tr>
                <th>#</th><th>Freq (MHz)</th><th>Final (dBµV/m)</th><th>Limit</th><th>Margin (dB)</th>
                <th>Antenna</th><th>Polarisation</th><th>Orientation</th>
            </tr></thead><tbody>`;
        top.forEach((p, i) => {
            const mColor = p.margin >= 6 ? 'var(--success)' : p.margin >= 0 ? 'var(--warning)' : 'var(--danger)';
            html += `<tr>
                <td>${i+1}</td>
                <td>${p.freq}</td>
                <td><strong>${p.total.toFixed(1)}</strong></td>
                <td>${p.limit}</td>
                <td style="color:${mColor}; font-weight:bold;">${p.margin >= 0 ? '+' : ''}${p.margin.toFixed(1)}</td>
                <td>${p.antenna}</td>
                <td>${p.pol}</td>
                <td>${p.rot}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }



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

        // AF data is shared (bicAFPoints, dirAFPoints, getInterpolatedAF defined at top scope)
        const bicPoints = bicAFPoints;
        const dirPoints = dirAFPoints;

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

    // --- Cable Loss Chart ---
    function initCableLoss() {
        const canvas = document.getElementById('cable-loss-canvas');
        const slider = document.getElementById('cable-slider');
        const freqInput = document.getElementById('cable-f-input');
        const lossReadout = document.getElementById('cable-loss-readout');
        if (!canvas || !slider) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const pad = { l: 55, r: 20, t: 20, b: 40 };
        const gw = w - pad.l - pad.r, gh = h - pad.t - pad.b;

        // S21 data is shared (cableData defined at top scope)

        const fMin = 30, fMax = 1000, lossMin = 1.0, lossMax = 4.0;
        const mapX = f => pad.l + ((f - fMin) / (fMax - fMin)) * gw;
        const mapY = l => pad.t + ((l - lossMax) / (lossMin - lossMax)) * gh;

        const interpolateLoss = interpolateCableLoss;

        function draw(markerFreq) {
            ctx.clearRect(0, 0, w, h);

            // Grid
            ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.5;
            ctx.fillStyle = '#666'; ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            // X-axis: frequency gridlines every 100 MHz
            for (let f = 100; f <= 1000; f += 100) {
                const x = mapX(f);
                ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + gh); ctx.stroke();
                ctx.fillText(f, x, h - 10);
            }
            // Also label 30
            ctx.fillText('30', mapX(30), h - 10);
            ctx.fillText('Frequency (MHz)', w / 2, h - 1);

            // Y-axis: loss gridlines every 0.5 dB
            ctx.textAlign = 'right';
            for (let l = 1.0; l <= 4.0; l += 0.5) {
                const y = mapY(l);
                ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gw, y); ctx.stroke();
                ctx.fillText(l.toFixed(1), pad.l - 8, y + 4);
            }

            // Y-axis label
            ctx.save();
            ctx.translate(14, h / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText('Insertion Loss (dB)', 0, 0);
            ctx.restore();

            // Data line
            ctx.strokeStyle = 'var(--primary, #0052cc)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            cableData.forEach((p, i) => {
                const x = mapX(p.f), y = mapY(p.loss);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Data points
            ctx.fillStyle = 'var(--primary, #0052cc)';
            cableData.forEach(p => {
                ctx.beginPath();
                ctx.arc(mapX(p.f), mapY(p.loss), 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Marker
            const loss = interpolateLoss(markerFreq);
            const mx = mapX(markerFreq), my = mapY(loss);
            // Crosshair
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = 'rgba(255,86,48,0.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, pad.t + gh); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad.l, my); ctx.lineTo(mx, my); ctx.stroke();
            ctx.setLineDash([]);
            // Dot
            ctx.fillStyle = '#ff5630';
            ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.stroke();
            // Label
            ctx.fillStyle = '#333'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
            ctx.fillText(`${markerFreq} MHz | ${loss.toFixed(2)} dB`, mx + 10, my - 8);

            lossReadout.textContent = loss.toFixed(2);
        }

        function update() {
            const freq = parseInt(slider.value);
            freqInput.value = freq;
            draw(freq);
        }

        slider.addEventListener('input', update);
        freqInput.addEventListener('change', () => {
            const v = Math.min(1000, Math.max(30, parseInt(freqInput.value) || 30));
            freqInput.value = v;
            slider.value = v;
            draw(v);
        });
        freqInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const v = Math.min(1000, Math.max(30, parseInt(freqInput.value) || 30));
                freqInput.value = v;
                slider.value = v;
                draw(v);
            }
        });

        draw(100);
    }

    try {
        initCableLoss();
        console.log("Cable Loss Chart Ready.");
    } catch (e) {
        console.error("Cable Loss Chart Error:", e);
    }

});
