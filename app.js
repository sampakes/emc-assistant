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

    // --- Menu / Keys (Simplified) ---
    // Retaining basic menu logic for completeness, though specific request focused on calc.
    const Menus = {
        FREQ: [
            { label: 'CENTER', action: () => setParam('CENTER') },
            { label: 'SPAN', action: () => setParam('SPAN') },
            { label: '', action: null }
        ],
        SPAN: [
            { label: 'SPAN', action: () => setParam('SPAN') },
            { label: 'FULL', action: () => { Receiver.freq.span = 1000; updateFreqs(); } },
            { label: 'ZERO', action: () => { Receiver.freq.span = 0; updateFreqs(); } }
        ]
    };

    function setParam(p) { Receiver.activeParam = p; writeFooter(`${p}: Enter Value...`); }
    function writeFooter(msg) { document.getElementById('footer-msg').textContent = msg; }
    function updateFreqs() { Receiver.updateDisplay(); }

    // --- Calculator Logic (The Core) ---
    const calcBtn = document.getElementById('calc-btn');

    function performCalculation(updateReceiver = true) {
        const freqVal = parseFloat(document.getElementById('freq').value);
        const voltVal = parseFloat(document.getElementById('voltage').value) || 0;
        const afVal = parseFloat(document.getElementById('af').value) || 0;
        const cabVal = parseFloat(document.getElementById('cable').value) || 0;
        const distVal = parseInt(document.getElementById('dist').value);
        const clsVal = document.getElementById('class').value;

        if (isNaN(freqVal) || freqVal <= 0) return;

        // 1. Calculate Field Strength (E = V + AF + Loss)
        const totalE = voltVal + afVal + cabVal;

        // 2. Determine Limit
        const limit = getLimit(freqVal, distVal, clsVal);

        // 3. Margin
        const margin = limit - totalE;

        // 4. Update UI
        document.getElementById('total-field').textContent = `${totalE.toFixed(2)} dBµV/m`;
        document.getElementById('limit-val').textContent = `${limit.toFixed(2)} dBµV/m`;
        const mEl = document.getElementById('margin-val');
        mEl.textContent = `${margin.toFixed(2)} dB`;

        // Colorize
        const box = document.getElementById('result-box');
        mEl.className = margin >= 0 ? 'pass' : 'fail';
        mEl.style.color = margin >= 6 ? '#4c9' : (margin >= 0 ? 'var(--warning)' : 'var(--danger)');
        box.style.borderLeft = margin >= 0 ? "5px solid var(--success)" : "5px solid var(--danger)";

        // 5. Update Proof Section
        document.getElementById('math-voltage').innerHTML = `Input: <strong>${voltVal.toFixed(1)} dBµV</strong>`;
        document.getElementById('math-af').innerHTML = `Add: <strong>${afVal.toFixed(1)} dB/m</strong>`;
        document.getElementById('math-cable').innerHTML = `Add: <strong>${cabVal.toFixed(1)} dB</strong>`;
        document.getElementById('math-total').innerHTML = `<strong>= ${totalE.toFixed(2)} dBµV/m</strong>`;

        // 6. Update Simulation State
        // Store the EXACT calculated level to be used as the Fundamental Amplitude
        Receiver.simulatedLevel = totalE;

        if (updateReceiver) {
            Receiver.freq.center = freqVal;
            // Auto Span: keep it reasonable e.g. 500MHz or 200MHz
            if (Receiver.freq.span < 50) Receiver.freq.span = 100;

            // Update range
            Receiver.freq.start = Receiver.freq.center - Receiver.freq.span / 2;
            Receiver.freq.stop = Receiver.freq.center + Receiver.freq.span / 2;

            // Marker on peak
            Receiver.marker.active = true;
            Receiver.marker.freq = freqVal;
            Receiver.marker.level = totalE;

            Receiver.updateDisplay();
        }
    }

    if (calcBtn) calcBtn.addEventListener('click', () => performCalculation(true));

    // --- Drawing ---
    function drawScreen() {
        // Read Inputs
        const calcFreq = parseFloat(document.getElementById('freq').value) || 100;
        const sourceMode = document.querySelector('input[name="source-mode"]:checked').value;
        const useJitter = document.getElementById('toggle-jitter').checked;
        const filterStr = parseInt(document.getElementById('filter-slider').value) / 100;

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

        // Signal Generation
        let signals = [];

        // Fundamental (The "One Main One")
        // Always at calcFreq, Amplitude = Receiver.simulatedLevel
        // Verify it is within view
        // Note: We generate it even if out of view, the loop filters it.

        if (sourceMode === 'clock') {
            // Harmonics
            const maxN = Math.floor(stopF / calcFreq);
            for (let n = 1; n <= Math.max(15, maxN); n++) {
                const f = calcFreq * n;

                // Amplitude Logic
                // n=1: EXACTLY Receiver.simulatedLevel
                // n>1: Fast decay. 
                let amp = 0;
                if (n === 1) {
                    amp = Receiver.simulatedLevel;
                } else {
                    // Decay: Start from fundamental, drop 40dB/dec
                    // But ensure it looks like harmonics
                    amp = Receiver.simulatedLevel - (40 * Math.log10(n));
                }

                // Jitter
                if (useJitter && n > 1) amp += (Math.sin(n * 17) * 3);

                // Filter
                if (f > 300) amp -= (f - 300) * 0.05 * filterStr;

                if (f >= startF - span * 0.1 && f <= stopF + span * 0.1 && amp > 0) {
                    signals.push({ f, l: amp });
                }
            }

        } else {
            // SMPS: Dense, Messy
            const step = Math.max(0.5, span / 300);
            for (let f = Math.max(startF, 0.1); f <= stopF; f += step) {
                // Envelope guided by simulatedLevel at fund, but decaying 1/f
                let ref = Receiver.simulatedLevel; // if f were calcFreq
                // Scale relative to calcFreq
                // 20*log(f/f0) decay
                let base = ref - 20 * Math.log10(f / calcFreq);
                if (f < calcFreq) base = ref - 40; // suppression below switch freq

                const hash = (Math.random() * 10);
                const val = base + hash;
                signals.push({ f: f, l: val });
            }
        }

        // Draw Trace
        ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 1.5; ctx.beginPath();
        let firstPt = true;
        for (let ix = 0; ix <= graphW; ix++) {
            const f = startF + (ix / graphW) * span;

            // Noise Floor
            let val = 5 + Math.random() * 3;
            if (sourceMode === 'smps') val += 10;

            // Peaks
            // Simple max-hold scan
            const rbwVis = Math.max(span / 150, 1.0);
            for (let s of signals) {
                const delta = Math.abs(f - s.f);
                if (delta < rbwVis * 3) {
                    const peak = (s.l - minL) * Math.exp(-0.5 * (delta / (rbwVis * 0.4)) ** 2);
                    val = Math.max(val, peak);
                }
            }
            const y = mapY(val);
            if (firstPt) { ctx.moveTo(pad.l + ix, y); firstPt = false; }
            else ctx.lineTo(pad.l + ix, y);
        }
        ctx.stroke();

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

    // Auto-AF
    const antennaData = {
        'upa': (f) => 10 + 20 * Math.log10(f / 200),
        'bicon': (f) => 8 + 15 * Math.log10(f / 30),
        'horn': (f) => 20 + 10 * Math.log10(f / 1000),
        'custom': () => 0
    };
    document.getElementById('ant-select').addEventListener('change', () => {
        const f = parseFloat(document.getElementById('freq').value);
        const type = document.getElementById('ant-select').value;
        if (f && type !== 'custom') document.getElementById('af').value = antennaData[type](f).toFixed(1);
    });

    // Inputs listener to redraw
    // We want real-time update if user types in freq? No, user said "Calculate & Update Sim".
    // But we should probably redraw if they toggle mode.
    document.querySelectorAll('input[name="source-mode"]').forEach(r => r.addEventListener('change', drawScreen));
    document.getElementById('toggle-jitter').addEventListener('change', drawScreen);
    document.getElementById('filter-slider').addEventListener('input', drawScreen);

    // Hardkeys (Legacy)
    document.getElementById('key-freq').addEventListener('click', () => setParam('CENTER'));
    document.getElementById('key-span').addEventListener('click', () => setParam('SPAN'));

    // Number Pad
    document.querySelectorAll('.numkey').forEach(k => {
        k.addEventListener('click', () => {
            const v = k.textContent;
            if (v === '⌫') Receiver.inputBuffer = Receiver.inputBuffer.slice(0, -1);
            else Receiver.inputBuffer += v;
            writeFooter(`Entry: ${Receiver.inputBuffer}`);
        });
    });
    // Helper to calc start/stop from center/span
    function recalcFreqRange() {
        Receiver.freq.start = Receiver.freq.center - Receiver.freq.span / 2;
        Receiver.freq.stop = Receiver.freq.center + Receiver.freq.span / 2;
    }

    // GO/Enter
    function handleGo(scale = 1) {
        if (!Receiver.inputBuffer) return;
        const v = parseFloat(Receiver.inputBuffer) * scale;
        if (Receiver.activeParam === 'CENTER') {
            Receiver.freq.center = v;
            recalcFreqRange();
        }
        if (Receiver.activeParam === 'SPAN') {
            Receiver.freq.span = v;
            recalcFreqRange();
            updateFreqs();
        }
        Receiver.inputBuffer = ''; Receiver.activeParam = null;
        drawScreen();
    }
    document.querySelectorAll('.unitkey').forEach(k => {
        k.addEventListener('click', () => {
            let s = 1;
            if (k.textContent === 'GHz') s = 1000;
            if (k.textContent === 'kHz') s = 0.001;
            handleGo(s);
        });
    });
    document.getElementById('key-go').addEventListener('click', () => handleGo(1));

    // Span Control Buttons (Left/Right)
    const btnSpanDown = document.getElementById('btn-span-down');
    const btnSpanUp = document.getElementById('btn-span-up');

    if (btnSpanDown) {
        btnSpanDown.addEventListener('click', () => {
            Receiver.freq.span = Math.max(0.001, Receiver.freq.span / 2); // Prevent 0 or negative
            updateFreqs(); // Update internal min/max
            recalcFreqRange();
            drawScreen();
            writeFooter(`Span: ${Receiver.freq.span.toFixed(2)} MHz`);
        });
    }

    if (btnSpanUp) {
        btnSpanUp.addEventListener('click', () => {
            Receiver.freq.span = Math.min(1000, Receiver.freq.span * 2); // Cap at 1000 MHz
            updateFreqs(); // Update internal min/max
            recalcFreqRange();
            drawScreen();
            writeFooter(`Span: ${Receiver.freq.span.toFixed(2)} MHz`);
        });
    }

    // PRESET (Reset) Button
    document.getElementById('key-preset').addEventListener('click', () => {
        // Reset Logic
        Receiver.freq.center = 1000; // Standard for checking
        Receiver.freq.span = 1000; // Full span
        Receiver.freq.start = 0;
        Receiver.freq.stop = 1000; // But wait, standard preset might be 100 center?
        // Let's use 100MHz Center, 100MHz Span as per initial load
        Receiver.freq.center = 100;
        Receiver.freq.span = 100;
        recalcFreqRange();

        Receiver.marker.active = false;
        Receiver.inputBuffer = '';
        Receiver.activeParam = null;

        // Reset Inputs in Calc too? User asked for "reset button for the interface"
        // Let's just reset the RECEIVER state for now as that's the main "Breakable" part

        updateFreqs();
        drawScreen();
        writeFooter('System Reset Complete.');
    });

    // Proof Section Toggles
    const proofToggleBtn = document.getElementById('toggle-proof');
    const proofContent = document.getElementById('proof-content');

    if (proofToggleBtn && proofContent) {
        proofToggleBtn.addEventListener('click', () => {
            proofContent.classList.toggle('hidden');
        });
    }

    // Bio Toggles (Question Marks)
    document.querySelectorAll('.bio-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.toggle('hidden');
            }
        });
    });

    // Init
    performCalculation(true);

});
