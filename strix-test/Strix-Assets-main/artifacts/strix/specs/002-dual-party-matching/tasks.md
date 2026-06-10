---

description: "Task list template for feature implementation"
---

# Tasks: Dual-Party Accident Cross-Referencing

**Input**: Design documents from `/specs/002-dual-party-matching/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create `lib/crossVerification.ts` for cross-referencing logic
- [x] T002 [P] Export `CrossVerifiedAnalysis` types in `lib/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update `lib/types.ts` to include `crossVerifiedId` and `crossVerifiedAnalysis` in `AccidentReport`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Cross-Verified Forensic Report (Priority: P1) 🎯 MVP

**Goal**: Merge independent sensor readings into a cross-verified report with actual measured speeds, maintaining privacy for raw telemetry.

**Independent Test**: Simulate two crash reports, ensure they match, and verify the UI shows verified liability without exposing exact raw speed of the other party.

### Implementation for User Story 1

- [x] T004 [P] [US1] Implement physics cross-validation math (speed, impact zone, first-contact) in `lib/crossVerification.ts`
- [x] T005 [US1] Modify `lib/accidentSync.ts` to download the second party's full `AccidentReport` JSON upon successful match
- [x] T006 [US1] Integrate `lib/crossVerification.ts` into `lib/accidentSync.ts` to run analysis and persist `CrossVerifiedAnalysis` payload to Supabase
- [x] T007 [US1] Update `components/LiabilityMeter.tsx` to consume `liability_percent` from `CrossVerifiedAnalysis` if available
- [x] T008 [US1] Modify Report UI components to hide raw telemetry (e.g., exact speed, exact G-force) of the other party, ensuring privacy compliance (FR-011)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Dual-Perspective Croquis (Priority: P2)

**Goal**: Regenerate accident croquis using data from both vehicles with precise positions and approach angles.

**Independent Test**: Check the generated croquis for a matched accident and ensure two distinct vehicles are rendered with accurate vectors.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update `components/CroquisCanvas.tsx` to accept dual-vehicle data from `CrossVerifiedAnalysis`
- [x] T010 [US2] Implement rendering logic for the second vehicle's approach vector, speed annotations, and impact zone in `components/CroquisCanvas.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Strict Contradiction Detection (Priority: P3)

**Goal**: Flag physical impossibilities or contradictions between the two reports.

**Independent Test**: Submit two reports claiming "rear impact" and ensure the system flags the contradiction.

### Implementation for User Story 3

- [x] T011 [P] [US3] Implement physical impossibility checks (e.g., both front impacts, GPS > 200m apart) in `lib/crossVerification.ts`
- [x] T012 [US3] Update Report UI components to display "Inconsistent ⚠", "Cross-Verified ✓", or "Partial" badge based on the `consistency_status`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T013 [P] Implement in-app banner notification on app launch for delayed match arrivals
- [x] T014 Run `quickstart.md` validation tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - integrates with US1 for the analysis payload
- **User Story 3 (P3)**: Can start after Foundational (Phase 2)

### Parallel Opportunities

- Setup tasks (T001, T002) can run in parallel.
- Math functions in `lib/crossVerification.ts` (T004, T011) and UI updates (T009) can be developed in parallel by different team members.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready
