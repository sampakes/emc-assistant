# EMC Analysis Tool

A web-based radiated emission measurement and analysis tool for EMC pre-compliance testing per CISPR 32 / EN 55032. Built for a final year dissertation project using a Rohde & Schwarz ESCI 7 EMI Receiver.

## Features

### Measurement Data Collection
- **64-point input grid** — 4 antenna/polarisation configurations × 4 DUT rotations × 4 peaks per rotation
- **Multi-device support** — Add, switch, and delete devices under test (DUT)
- **Export/Import JSON** — Save and load measurement data as portable JSON files

### Automated Calculations
- **Antenna Factor (AF)** — Automatically looked up via logarithmic interpolation of digitised manufacturer datasheet curves:
  - Teseq VBA 6106 Biconical (30–300 MHz)
  - Teseq UPA 6108 Directional (300–1000 MHz)
- **Cable Loss** — Automatically looked up via linear interpolation of measured S21 insertion loss data (24 data points, 30–1000 MHz)
- **Field Strength** — `Field Strength (dBµV/m) = Reading + AF + Cable Loss`
- **Compliance Margin** — Compared against CISPR 32 Class A and Class B limits at 3 m and 10 m distance

### Visualisation
- **Spectrum display** — Canvas-rendered with limit lines, noise floor, and colour-coded peak stems
- **Three plot modes**:
  - *Current Band* — 4 peaks from the active rotation
  - *All Rotations* — All 16 peaks for the active antenna/polarisation
  - *Overlay All* — All measurements from all configurations
- **Interactive AF reference graphs** — Calibrated dot overlays on datasheet images with dashed crosshair guides and frequency input
- **Cable loss chart** — Canvas-drawn S21 graph with interactive frequency lookup

### Analysis
- **Notable Peaks Summary** — Top 5 strongest emissions ranked by field strength with pass/fail margin colour coding
- **Calculation Proof** — Collapsible section showing formula, CISPR 32 limits, and a fully worked example

## How to Run

1. Clone this repository.
2. Open `emc-analysis-tool.html` in any modern web browser.
3. No build step or dependencies required.

## File Structure

| File | Purpose |
|------|---------|
| `emc-analysis-tool.html` | Main interface |
| `style.css` | Dark-themed UI styling |
| `app.js` | Application logic, interpolation, canvas rendering |
| `VBA 6106 Typical AF.png` | Biconical antenna factor datasheet graph |
| `UPA 6108 Typical AF .png` | Directional antenna factor datasheet graph |

## Usage

1. **Select or add a device** from the dropdown.
2. **Enter frequency and reading** values in the measurement tables.
3. **Click "Calculate & Update Sim"** — AF, cable loss, field strength, and margin are computed automatically.
4. **Switch plot modes** to visualise peaks across rotations or all configurations.
5. **Export data** as JSON to save measurements for later or share across machines.

## Tech Stack

- **HTML5 / CSS3** — Custom dark-themed industrial UI
- **Vanilla JavaScript** — No frameworks or dependencies
- **Canvas API** — Real-time spectrum and chart rendering
