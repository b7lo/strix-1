# Data Model: Accident Fault Assessment Form

## 1. Updated `AccidentReport` Entity

The existing `AccidentReport` interface in `lib/types.ts` will be updated to include an optional `faultAssessment` field.

```typescript
export interface FaultAssessment {
  /** The liability percentage calculated by the app (100, 75, 50, 25) */
  appLiabilityUser: number;
  appLiabilityOther: number;

  /** The liability percentage evaluated by Najm (100, 75, 50, 25) */
  najmLiabilityUser: number;
  najmLiabilityOther: number;

  /** Difference between app and Najm for the user (appLiabilityUser - najmLiabilityUser) */
  liabilityDifference: number;

  /** Optional user description of the accident */
  userDescription?: string;

  /** Timestamp of the assessment */
  assessedAt: number;
}

export interface AccidentReport {
  // ... existing fields ...
  faultAssessment?: FaultAssessment;
}
```

## 2. Updated Supabase Table

If there is a dedicated `accident_reports` table in Supabase, we should update it to include the assessment data as JSONB or separate columns. For simplicity, storing it inside the existing `report_json` (if used) or adding JSONB column `fault_assessment` is recommended.

```sql
-- Potential database migration
ALTER TABLE accident_reports
ADD COLUMN fault_assessment JSONB;
```

## Validation Rules
- `appLiabilityUser` + `appLiabilityOther` = 100
- `najmLiabilityUser` + `najmLiabilityOther` = 100
- Values must be exactly one of: `100, 75, 50, 25`.
- `liabilityDifference` = `appLiabilityUser` - `najmLiabilityUser`
