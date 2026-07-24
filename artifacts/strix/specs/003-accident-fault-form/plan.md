# Implementation Plan: Accident Fault Assessment Form

**Branch**: `003-accident-fault-form` | **Date**: 2026-06-04 | **Spec**: [spec.md](file:///home/b7lo/strix-test/Strix-Assets-main/artifacts/strix/specs/003-accident-fault-form/spec.md)
**Input**: Feature specification from `/specs/003-accident-fault-form/spec.md`

## Summary

This feature adds a form inside the app that allows users to manually input the fault percentage assigned by Najm (the official traffic accident evaluator). It automatically fetches the app's calculated fault percentage from the latest recorded accident, calculates the difference, and provides a text field for a user description. The data is saved locally and synced to Supabase for future analysis via an admin dashboard.

## Technical Context

**Language/Version**: TypeScript (React Native / Expo)
**Primary Dependencies**: React Native, Expo, Supabase
**Storage**: AsyncStorage (Local), Supabase PostgreSQL (Remote)
**Testing**: Jest / React Native Testing Library (if applicable)
**Target Platform**: iOS / Android
**Project Type**: Mobile App
**Performance Goals**: N/A for form entry
**Constraints**: Must work offline (save locally, sync later)
**Scale/Scope**: Form UI, Type definitions, Context updates

## Constitution Check

*GATE: Passed*

No constitution violations detected. The approach follows the existing offline-first architecture pattern using `ReportsContext`.

## Project Structure

### Documentation (this feature)

```text
specs/003-accident-fault-form/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
Strix-Assets-main/artifacts/strix/
├── app/
│   └── (tabs)/
│       └── [form_route].tsx    # New screen for the form
├── components/
│   └── AssessmentForm.tsx      # Reusable form component (optional)
├── context/
│   └── ReportsContext.tsx      # Update state/saving if necessary
└── lib/
    ├── types.ts                # Update AccidentReport type
    └── storage.ts              # Update storage logic if necessary
```

**Structure Decision**: The feature fits cleanly into the existing Expo Router `app` directory and `lib` directory structure.

