---
description: "Task list for Accident Fault Assessment Form implementation"
---

# Tasks: Accident Fault Assessment Form

**Input**: Design documents from `/specs/003-accident-fault-form/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create basic empty screen component for the Fault Assessment form in `app/(tabs)/[form_route].tsx` (or equivalent location according to app routing)
- [x] T002 Link the new screen in the navigation flow from the main accident report details view

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update `AccidentReport` type and add `FaultAssessment` interface in `lib/types.ts`
- [x] T004 Review and update `context/ReportsContext.tsx` to ensure `updateReport` safely persists the new `faultAssessment` object
- [x] T005 [P] Review `lib/storage.ts` to ensure no changes are needed for the updated `AccidentReport` structure

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - عرض نموذج التقييم التلقائي (Priority: P1) 🎯 MVP

**Goal**: Automatically fetch and display the app's calculated fault percentage from the latest recorded accident.

**Independent Test**: Open the form after an accident and verify the App Liability fields are pre-populated correctly.

### Implementation for User Story 1

- [x] T006 [US1] Create the UI layout in the assessment screen to display "App Liability" (User & Other Party)
- [x] T007 [US1] Implement logic to fetch the latest `AccidentReport` from `ReportsContext`
- [x] T008 [US1] Map the `liabilityScore` from the report to the nearest predefined 25-step value (100, 75, 50, 25)

**Checkpoint**: At this point, the form correctly displays the App's assessment.

---

## Phase 4: User Story 2 - إدخال نسب نجم اليدوية (Priority: P1)

**Goal**: Allow the user to input Najm's liability percentage and calculate the difference.

**Independent Test**: Select a Najm percentage and verify the difference is calculated and displayed.

### Implementation for User Story 2

- [x] T009 [US2] Add a segmented control or dropdown for "Najm Liability" (100, 75, 50, 25) in the assessment screen
- [x] T010 [US2] Implement state management for the selected Najm liability
- [x] T011 [US2] Implement the calculation logic: `Difference = App Liability - Najm Liability`
- [x] T012 [US2] Display the calculated difference dynamically in the UI

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 4 - حفظ البيانات في قاعدة البيانات (Priority: P1)

**Goal**: Save all the form data to the database (locally first, syncing remotely) associated with the accident ID.

**Independent Test**: Submit the form and verify the `faultAssessment` object is attached to the report in local storage.

### Implementation for User Story 4

- [x] T013 [US4] Add a "Submit" button to the assessment form
- [x] T014 [US4] Implement the save handler using `updateReport` from `ReportsContext` to construct the `FaultAssessment` object
- [x] T015 [US4] Handle user feedback (success message, error handling, navigation back)

**Checkpoint**: The core feature loop is now complete.

---

## Phase 6: User Story 3 - وصف الحادث من المستخدم (Priority: P2)

**Goal**: Provide an optional text field for the user to describe the accident.

**Independent Test**: Write a description, submit, and verify it saves.

### Implementation for User Story 3

- [x] T016 [US3] Add a multiline `TextInput` component for the user description in the assessment form
- [x] T017 [US3] Connect the text input state to the submission payload created in T014

---

## Phase 7: User Story 5 - لوحة تحكم متوسط نسبة الفرق (Priority: P3)

**Goal**: Admin dashboard to view the average difference.

**Independent Test**: (Deferred for future implementation as noted in the spec)

### Implementation for User Story 5

- [x] T018 [US5] (Deferred) Create an admin view or Supabase SQL query to aggregate `liabilityDifference` across all assessments.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T019 [P] Code cleanup and refactoring of the form component
- [x] T020 Ensure UI adheres to RTL (Arabic) layout and styling requirements
- [x] T021 Validate offline capabilities (test form submission with no network)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: US1, US2, and US3 UI work can be done largely in parallel or sequentially. US4 (Save) depends on US1 and US2 states. US5 is deferred.

### Parallel Opportunities

- T003 (Types) and T001 (UI Route Shell) can be done in parallel.
- Once Foundational is done, UI layout for US1, US2, US3 can be built simultaneously by assigning the different sections of the form.

## Implementation Strategy

### MVP First

1. Complete Phase 1 & Phase 2.
2. Build US1 (Display App Liability).
3. Build US2 (Input Najm Liability).
4. Build US4 (Save Form).
5. Stop and validate the end-to-end flow.
6. Add US3 (Optional Description) as an incremental improvement.
