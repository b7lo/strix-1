# Quickstart: Dual-Party Matching

This document provides a brief overview of how to interact with the Dual-Party Matching feature.

## Core Services

### `crossVerifyAccident(reportA, reportB)`
The core function that runs client-side when a match is found.
- **Input**: Two `AccidentReport` objects.
- **Output**: A `CrossVerifiedAnalysis` object.
- **Location**: `lib/crossVerification.ts` (to be created)

### `renderDualCroquis(analysis)`
The visualization function that takes the cross-verified analysis and draws both vehicles.
- **Input**: `CrossVerifiedAnalysis` object.
- **Output**: React Native JSX (Canvas or SVG elements).
- **Location**: `components/CroquisCanvas.tsx` (to be modified)

## Testing the Flow
1. Open the Strix app on two different physical devices (or simulators).
2. Trigger the "Simulate Crash" button simultaneously on both devices.
3. Observe the "Searching for match..." state.
4. Once matched, the first device to finish uploading will download the second device's report, run the cross-verification, and upload the `CrossVerifiedAnalysis`.
5. Both devices should then display the "Cross-Verified ✓" badge and the dual-perspective croquis.
