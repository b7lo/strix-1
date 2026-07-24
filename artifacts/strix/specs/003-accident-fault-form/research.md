# Research: Accident Fault Assessment Form

## 1. Local Storage vs Remote Storage (Supabase)
- **Decision**: Store assessments locally in `AsyncStorage` first, then sync to Supabase.
- **Rationale**: The app already uses an offline-first architecture for accident reports (saving locally and syncing later). The assessment form should follow the same pattern to ensure it works even if the user is offline right after the accident.
- **Alternatives considered**: Direct remote saving. Rejected due to offline-first requirements (FR-009).

## 2. Data Structure for Assessment
- **Decision**: Create a new table/entity `FaultAssessment` linked to the existing `AccidentReport` via `accident_id`.
- **Rationale**: Keeps the accident core data clean and allows multiple assessments if necessary (though the requirement states to update existing ones, a separate table allows easier schema evolution). Alternatively, we could add the fields directly to the `AccidentReport` object in Supabase. Given that we already have `AccidentSyncRecord` and `AccidentReport` (JSON blob in local storage), we can add an `assessment` object to the `AccidentReport` interface.
- **Alternatives considered**: Adding fields directly to the `AccidentReport` JSON vs a separate related table. We will embed it in the `AccidentReport` JSON locally for simplicity and add it to the sync record.

## 3. Form Input Validation
- **Decision**: Restrict UI inputs to a dropdown or segmented control containing only the values: 100%, 75%, 50%, 25%.
- **Rationale**: Prevents users from entering invalid values and satisfies FR-008.

## 4. Admin Dashboard Average Calculation
- **Decision**: Handled via Supabase database views or direct SQL aggregation queries later.
- **Rationale**: The current feature focuses on data collection. Storing the difference (`najm_difference = app_liability - najm_liability`) explicitly per record makes calculating averages much faster on the dashboard side later.
