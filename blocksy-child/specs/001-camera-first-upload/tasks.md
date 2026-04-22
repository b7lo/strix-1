# Tasks: Camera-First Photo Integrity

**Input**: Design documents from `/specs/001-camera-first-upload/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions (WordPress Child Theme)

- **Backend logic**: `includes/<feature>.php` (registered in `functions.php`)
- **Frontend templates**: `templates/mobile/` or `templates/desktop/` (device-specific)
- **Directorist overrides**: `directorist/<original-plugin-path>` (mirror plugin structure)
- **CSS assets**: `assets/css/<feature>.css` (enqueued conditionally)
- **JS assets**: `assets/js/<feature>.js` (enqueued conditionally)
- **Global styles**: `style.css` (keep minimal — feature CSS goes in `assets/css/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create blank `includes/camera-upload-validator.php` file
- [ ] T002 [P] Create blank `assets/js/camera-upload.js` file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Hook `includes/camera-upload-validator.php` by requiring it in `functions.php`
- [ ] T004 Add enqueue logic in `functions.php` to load `assets/js/camera-upload.js` only on Directorist add/edit listing pages.
- [ ] T005 Set up the `wp_handle_upload_prefilter` hook stub in `includes/camera-upload-validator.php`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Unverified Merchant Uploads Perfume (Priority: P1) 🎯 MVP

**Goal**: Force unverified merchants to use the live camera for perfume listing image uploads to prevent fraud.

**Independent Test**: Log in as an unverified merchant. Go to "Add Listing". Tap the add photo button; it should open the device camera without offering the gallery. Server should reject any bypassed file uploads that lack camera EXIF data with an Arabic error message.

### Implementation for User Story 1

- [ ] T006 [US1] In `assets/js/camera-upload.js`, write JS to find the Directorist file input (`input[type="file"]`) and add attributes `capture="environment"` and `accept="image/*"`.
- [ ] T007 [US1] In `includes/camera-upload-validator.php`, implement the condition to target only requests destined for `/directorist/v1/temp-media-upload`.
- [ ] T008 [US1] In `includes/camera-upload-validator.php`, implement `exif_read_data()` validation to check for `DateTimeOriginal` or `Make`/`Model` tags and ensure no editing software tags exist.
- [ ] T009 [US1] In `includes/camera-upload-validator.php`, return a `WP_Error` if EXIF validation fails, using the Arabic message: "يجب التقاط الصورة مباشرة من الكاميرا".

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Verified Merchant Exemption (Priority: P1)

**Goal**: Exempt verified merchants from the camera-only restriction, allowing them to upload professionally edited images from their studio/gallery.

**Independent Test**: Log in as a verified merchant (`ph_verified_merchant = 1`). Go to "Add Listing". Tap the add photo button; the gallery/files option should be available. Upload an image; the server should accept it without EXIF validation.

### Implementation for User Story 2

- [ ] T010 [P] [US2] In `functions.php` (where the script is enqueued), use `wp_localize_script` to pass a boolean variable `ph_is_verified_merchant` to the JS file based on user meta `ph_verified_merchant`.
- [ ] T011 [US2] In `assets/js/camera-upload.js`, update the logic to only apply `capture="environment"` if the localized `ph_is_verified_merchant` is false.
- [ ] T012 [US2] In `includes/camera-upload-validator.php`, update the `wp_handle_upload_prefilter` logic to bypass EXIF validation if the current user has `ph_verified_merchant = 1`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T013 Run quickstart.md validation manually to ensure all acceptance criteria are met for both user stories.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Phase 4 (US2) builds upon the scripts and hooks established in Phase 3 (US1).

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 scripts/hooks.

### Within Each User Story

- Frontend/Backend implementations can be executed in parallel where marked with `[P]`.
- Core implementation before integration.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T010 can run in parallel with US1 tasks if separate files are edited.

---

## Parallel Example: User Story 1

```bash
# Launch frontend and backend for User Story 1 together:
Task: "In assets/js/camera-upload.js, write JS to find the Directorist file input and add attributes"
Task: "In includes/camera-upload-validator.php, implement the condition to target only requests destined for Directorist"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently (MVP!)
3. Add User Story 2 → Test independently
4. Both stories complete and tested.
