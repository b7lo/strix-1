# UI Contract: Accident Fault Assessment Form

## Inputs

| Element | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `Najm Liability` | Segmented Control / Dropdown | `100%`, `75%`, `50%`, `25%` | The user selects the fault percentage assigned by Najm. |
| `Accident Description` | Text Input (Multiline) | Max 500 chars, Optional | Free-form text for the user to describe the accident. |
| `Submit Button` | Button | Enabled if Najm Liability is selected | Saves the assessment. |

## Outputs (Display)

| Element | Data Source | Description |
| :--- | :--- | :--- |
| `App Liability` | `AccidentReport.liabilityScore` | Displayed automatically based on the app's calculation (mapped to nearest 25 step). |
| `Liability Difference` | Calculated | `App Liability - Najm Liability`. Displayed after user selects Najm Liability. |
| `Accident ID / Date` | `AccidentReport.id` / `timestamp` | Identifies which accident is being assessed. |

## State Transitions

1.  **Initial Load**: App Liability is pre-filled. Najm Liability is empty. Difference is hidden.
2.  **Selection**: User selects Najm Liability. Difference is calculated and displayed.
3.  **Submission**: Data is saved to `ReportsContext` and persisted locally/remotely. User is shown a success message and navigated back.
