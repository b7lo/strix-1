# Feature Specification: Dual-Party Accident Cross-Referencing

**Feature Branch**: `002-dual-party-matching`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "عندما يكون يوجد شخصين يستخدمون نفس التطبيق وحصل بينهم حادث يظهر بالتقرير ان هذا الشخصين يستخدمون نفس التطبيق لقياس نسبة المسؤلية وايضا يتم اخذ معطيات كل واحد من الاثنين مكان الصدمه و الاتجاه و السرعه ومن الذي صدم اول و اي جهة ويظهر بالكروكي مكان الصدمة بناء على المعطيات يعني مافيه شيء يكون مجهول او قابل للغلط في حال كل الشخصين يستخدمون التطبيق نبي خورزمية صارمة تكشف كل شيء"

## Problem Statement

Currently, when an accident occurs between two vehicles, Strix generates a single-sided forensic report based solely on one device's sensor readings. The system already performs basic matching (finding a nearby accident within 5 seconds and 100 meters), but once a match is found, **nothing meaningful happens with the other party's data**. The matched report's rich sensor telemetry (impact zone, G-force, speed, braking, gyroscope data) is stored but never cross-referenced, verified, or merged into a unified forensic analysis.

This means:
- The liability analysis is still based on educated guesses about the other party (estimated speed, estimated vehicle type).
- The croquis diagram shows only one side's perspective.
- There is no mechanism to detect contradictions between the two reports.
- The "matched" badge provides no additional forensic value beyond confirming two devices were nearby.

**This feature transforms a basic proximity match into a forensic-grade cross-examination** that eliminates unknowns and produces a single authoritative reconstruction of the accident when both parties use Strix.

## Clarifications

### Session 2026-05-19
- Q: If the other party's report arrives after the first user has already viewed their single-sided report, how should the first user be notified? → A: Option B - In-app banner or alert when the user next opens the app.
- Q: Are there any privacy concerns with sharing raw data (e.g., exact speed) with the other user? → A: Option B - Share only the conclusion/liability and the croquis, hide raw telemetry from the user-facing report.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cross-Verified Forensic Report (Priority: P1)

When two Strix users are involved in the same accident, both upload their sensor data. The system automatically detects that both parties are Strix users, merges their independent sensor readings, and produces a **cross-verified report** where every data point (impact zone, speed, direction, who hit first) is corroborated or flagged as inconsistent by comparing both sides.

**Why this priority**: This is the core value proposition. Without cross-verification, matching is just a novelty badge. With it, Strix becomes a definitive forensic tool that eliminates he-said/she-said disputes.

**Independent Test**: Two devices simultaneously trigger a simulated crash at the same location. Verify that the report for each party shows a "Cross-Verified" badge, displays the other party's real (not estimated) data, and recalculates liability using both sets of sensor readings.

**Acceptance Scenarios**:

1. **Given** both parties upload within 60 seconds and are within 100 meters, **When** the matching algorithm runs, **Then** the backend enriches the analysis using actual sensor data, but the user-facing report hides the raw telemetry of the other party (e.g. exact speed) and only displays the verified conclusions and croquis.
2. **Given** Party A reports front-right impact and Party B reports front-left impact, **When** the cross-referencing algorithm runs, **Then** the system confirms the impact directions are physically consistent (mirror-opposite) and marks the analysis as "Verified ✓".
3. **Given** Party A's sensors show 80 km/h and Party B's sensors show 35 km/h, **When** the merged report is generated, **Then** the liability calculation uses actual measured speeds from both parties instead of estimated values.
4. **Given** Party A records impact at timestamp T and Party B records impact at timestamp T+200ms, **When** the first-contact analysis runs, **Then** the system determines who made first contact and from which direction, with sub-second precision.

---

### User Story 2 — Dual-Perspective Croquis (Priority: P2)

When a cross-verified match exists, the accident croquis diagram is regenerated using data from both vehicles. Instead of showing one car with an estimated "ghost" second car, it shows both vehicles with **precise positions, impact points, approach angles, and trajectories** derived from real sensor data.

**Why this priority**: The croquis is the visual centerpiece of the forensic report and the document most likely to be shared with insurance companies or traffic authorities. An accurate dual-perspective diagram dramatically increases credibility.

**Independent Test**: Trigger a matched dual-party accident. Verify that the generated croquis shows two distinct vehicles with labeled impact zones, speed annotations, and approach vectors that match the sensor-verified data.

**Acceptance Scenarios**:

1. **Given** a cross-verified match exists, **When** the croquis is generated, **Then** it displays both vehicles with their actual impact zones (not estimated) drawn from sensor data.
2. **Given** Party A was traveling at 80 km/h from the east and Party B at 35 km/h from the north, **When** the croquis renders, **Then** the approach vectors, speed labels, and collision point are positioned accurately based on merged GPS and sensor data.
3. **Given** both vehicles' braking data is available, **When** the croquis is generated, **Then** braking marks are drawn for each vehicle showing pre-impact deceleration distance.

---

### User Story 3 — Strict Contradiction Detection (Priority: P3)

When both parties' data is available, the system runs a strict consistency check that flags any physical impossibilities or contradictions between the two reports. For example, if Party A claims rear impact but Party B's data shows a front-on approach angle, the system flags this inconsistency and adjusts the confidence score accordingly.

**Why this priority**: Contradictions may indicate sensor errors, data corruption, or unusual accident dynamics. Flagging them ensures the report's integrity and prevents false conclusions.

**Independent Test**: Submit two reports with deliberately inconsistent data (e.g., both claiming rear impact). Verify that the system detects the physical impossibility, flags it in the report, and lowers the overall confidence score.

**Acceptance Scenarios**:

1. **Given** both parties report the same impact zone (e.g., both say "front"), **When** the consistency check runs, **Then** the system flags this as physically impossible (one must be front, the other must be rear/side) and marks the analysis as "Inconsistent ⚠".
2. **Given** both parties' GPS coordinates are more than 200 meters apart at the time of impact, **When** the consistency check runs, **Then** the system warns that the match may be a false positive.
3. **Given** all cross-references pass validation, **When** the consistency check completes, **Then** the report displays a "Fully Verified ✓✓" badge indicating maximum forensic confidence.

---

### Edge Cases

- What happens when only one party has GPS data and the other doesn't? → The system uses the available GPS for location but marks location verification as "Partial".
- What happens when one party's phone was in a different orientation (flat vs. portrait)? → The existing `toVehicleFrame()` transformation normalizes readings before cross-comparison.
- What happens when the time difference between the two recordings is greater than 5 seconds? → The match is rejected; the existing 5-second window is maintained.
- What happens when a match is found but the other party's report hasn't been uploaded yet? → The system should poll or listen for the match to arrive within a configurable window (default: 60 seconds) and enrich the report when it arrives. If the user has already viewed their single-sided report before the match arrives, they will receive an in-app banner/alert upon their next app session notifying them that a cross-verified update is available.
- What happens when the matched report is later updated or corrected? → The cross-verified analysis uses the data available at match time; re-analysis is not triggered automatically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when both parties in an accident are Strix users by successfully matching their uploaded reports within the existing time (5 seconds) and distance (100 meters) criteria.
- **FR-002**: Upon successful match, the system MUST retrieve the other party's full sensor telemetry (peak G-force, impact zone, impact direction, speed, jerk, braking analysis, gyroscope snapshot, approach angle) from the matched report.
- **FR-003**: System MUST perform a cross-referencing analysis that compares both parties' data to determine:
  - Verified impact zones (confirmed mirror-opposite, or flagged as inconsistent)
  - Actual speeds of both vehicles (measured, not estimated)
  - First-contact determination (which party struck first, based on timestamp precision)
  - Verified approach angles and directions
- **FR-004**: System MUST recalculate liability percentages using verified dual-party data instead of single-party estimations when a cross-verified match exists.
- **FR-005**: System MUST generate a dual-perspective croquis diagram showing both vehicles with their verified positions, impact points, approach vectors, and speed annotations.
- **FR-006**: System MUST run a strict consistency validation that checks for physical impossibilities between both reports and flags contradictions clearly.
- **FR-007**: System MUST display a visual indicator ("Cross-Verified ✓" or "Inconsistent ⚠") on the report to clearly communicate the verification status.
- **FR-008**: System MUST persist the cross-referencing results to the backend so both parties' reports reflect the merged analysis.
- **FR-009**: System MUST handle the timing gap gracefully: if the other party's report arrives after the initial report is generated, the system should enrich the existing report when the match data becomes available.
- **FR-010**: System MUST ensure that both users' reports show consistent conclusions — the same liability split, same croquis, same verified data — to prevent one party seeing a different story than the other.
- **FR-011**: System MUST NOT expose the raw telemetry (e.g., exact speed, exact G-force) of the other party in the user-facing UI; it MUST only display the technical conclusions and the croquis diagram to protect user privacy.

### Key Entities

- **CrossVerifiedAnalysis**: Represents the merged forensic analysis from both parties — contains verified impact data, consistency flags, first-contact determination, and dual liability scores.
- **MatchedPairReport**: The linked pair of accident reports with a reference to the shared CrossVerifiedAnalysis, ensuring both reports point to the same source of truth.
- **ConsistencyCheck**: A set of validation results (pass/fail/warning) for each cross-referenced data point (zones, speeds, angles, timestamps).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When both parties are Strix users, the report eliminates 100% of estimated/guessed data points and replaces them with sensor-verified values.
- **SC-002**: Cross-verified liability calculations differ by no more than 5 percentage points from the single-party estimate when input data is consistent, confirming the single-party algorithm's baseline accuracy.
- **SC-003**: The dual-perspective croquis accurately reflects both vehicles' positions, impact zones, and speeds within the precision limits of the sensors (±2 meters for GPS, ±5 km/h for speed).
- **SC-004**: Physical contradictions between two reports are detected and flagged 100% of the time (e.g., both claiming rear impact, GPS distance >200m).
- **SC-005**: The cross-referencing process completes within 3 seconds of both reports being available, ensuring no noticeable delay for the user.
- **SC-006**: Both parties' reports display identical liability percentages, croquis diagrams, and forensic conclusions to prevent disputes.

## Assumptions

- Both users are running the same version of the Strix application with sensor access enabled.
- The existing matching criteria (5 seconds, 100 meters, opposite approach angles) are sufficient to avoid false-positive matches.
- No user authentication is required; matching is based on device ID, timestamp, GPS proximity, and approach angle consistency, as per the current system design.
- The backend (Supabase) stores the full `report_json` for each accident, making the other party's complete sensor data available upon match.
- GPS accuracy on modern smartphones is sufficient (±5 meters) to confirm spatial proximity for accident matching.
- The existing `toVehicleFrame()` transformation ensures that sensor data from different phone orientations is comparable across devices.
