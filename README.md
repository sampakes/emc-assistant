# EMC Pre-Compliance Assistant (ESCI 7 Simulation)

An interactive, web-based simulation of a Rohde & Schwarz ESCI 7 EMI Receiver, designed for educational purposes and pre-compliance estimation.

## Project Overview

This tool helps users understand the relationship between receiver voltage readings ($dB\mu V$), antenna factors ($dB/m$), and cable loss ($dB$) to determine the final Field Strength ($dB\mu V/m$) and compare it against CISPR limit lines.

### Features

*   **Realistic Simulation**: Simulates the UI and behavior of a classic EMI receiver.
*   **Physics-Based Rendering**:
    *   **Digital Clock Mode**: Generates accurate harmonics at integer multiples of a fundamental frequency ($f_0, 2f_0, 3f_0...$) with realistic decay (40 dB/decade).
    *   **SMPS Mode**: Simulates the broadband noise and envelope of a Switch Mode Power Supply.
*   **Integrated Calculator**:
    *   Input a Receiver Reading, Antenna Factor, and Cable Loss.
    *   Automatically calculates **Field Strength**.
    *   Drives the simulation visualization: The plotted peak **exactly matches** the calculated result for visual verification.
*   **Compliance Limits**:
    *   CISPR 32 Class A (Industrial) and Class B (Residential).
    *   Distance correction logic (3m vs 10m).
*   **Educational Proof**: "Show Math" feature explains the step-by-step calculation.

## Tech Stack

*   **HTML5/CSS3**: Custom dark-themed "industrial" UI.
*   **Vanilla JavaScript**: No framework dependencies. Handles all canvas rendering and physics logic.
*   **Canvas API**: Used for real-time spectrum plotting.

## How to Run

1.  Clone this repository.
2.  Open `index.html` in any modern web browser.
3.  No build step required.

## Structure

*   `index.html`: Main interface structure.
*   `style.css`: Styling for the chassis, screen, and controls.
*   `app.js`: Application logic, harmonic generation physics, and calculator syncing.

## Usage Guide

1.  **Select Mode**: Choose between "Clock" (Discrete harmonics) or "SMPS" (Broadband noise) in the Calculator panel.
2.  **Enter Parameters**:
    *   **Frequency**: The fundamental frequency of your source.
    *   **Receiver Reading**: The value you "measured" (or want to simulate).
    *   **Antenna/Cable**: Correction factors.
3.  **Click "Calculate & Update Sim"**:
    *   The tool computes the total Field Strength.
    *   The Simulation screen updates to show a trace with the main peak exactly at that level.
    *   Pass/Fail margin is calculated against the selected Limit Class.
