# Quickstart: Accident Fault Assessment Form

## 1. Setup

The feature lives within the existing Expo React Native app. It updates existing models in `lib/types.ts` and uses `ReportsContext` for state management.

No additional dependencies are required.

## 2. Integration Points

1.  **UI Navigation**: Add a button or automatic routing to the `FaultAssessmentScreen` after an accident report is finalized, or from the accident report details screen.
2.  **Context (`ReportsContext.tsx`)**: Update the `addReport` and `updateReport` methods if necessary to ensure `faultAssessment` data is persisted along with the rest of the report JSON.
3.  **Local Storage (`lib/storage.ts`)**: No direct changes needed if saving the entire `AccidentReport` object, as long as `faultAssessment` is part of it.
4.  **Supabase Sync**: If sync is implemented, ensure the `faultAssessment` is sent to Supabase.

## 3. Usage Example

```tsx
import { useReports } from '@/context/ReportsContext';

// Inside a component
const { reports, updateReport } = useReports();
const latestReport = reports[0];

// Submit assessment
const submitAssessment = async (najmLiabilityUser: number, description: string) => {
  const updatedReport = {
    ...latestReport,
    faultAssessment: {
      appLiabilityUser: latestReport.liabilityScore, // Adjusted to nearest 25 step
      appLiabilityOther: 100 - latestReport.liabilityScore,
      najmLiabilityUser: najmLiabilityUser,
      najmLiabilityOther: 100 - najmLiabilityUser,
      liabilityDifference: latestReport.liabilityScore - najmLiabilityUser,
      userDescription: description,
      assessedAt: Date.now()
    }
  };
  await updateReport(updatedReport);
};
```
