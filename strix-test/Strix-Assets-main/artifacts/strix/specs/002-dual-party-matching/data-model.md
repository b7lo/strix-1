# Data Model: Dual-Party Matching

## Entities

### `CrossVerifiedAnalysis`
This entity represents the merged forensic truth between two matched accidents.

**Fields**:
- `id` (UUID, Primary Key)
- `accident_a_id` (String, Foreign Key to `accidents.id`)
- `accident_b_id` (String, Foreign Key to `accidents.id`)
- `verified_impact_zone_a` (String) - e.g., 'FRONT', 'REAR', 'LEFT', 'RIGHT'
- `verified_impact_zone_b` (String)
- `verified_speed_a_kmh` (Number) - The actual speed at impact for A
- `verified_speed_b_kmh` (Number) - The actual speed at impact for B
- `first_contact_party` (String) - 'A', 'B', or 'UNKNOWN' (based on timestamp comparison)
- `consistency_status` (String) - 'VERIFIED', 'INCONSISTENT', 'PARTIAL'
- `consistency_flags` (String Array) - E.g., `["Impact zones not opposite", "GPS distance > 200m"]`
- `liability_a_percent` (Number) - 0 to 100
- `liability_b_percent` (Number) - 0 to 100
- `created_at` (Timestamp)

### Modified Entities

**`accidents` (Table)**
- Add column `cross_verified_id` (UUID, Nullable, Foreign Key to `cross_verified_analyses.id`).

**`AccidentReport` (TypeScript Type in `lib/types.ts`)**
- Add `crossVerifiedId?: string;`
- Add `crossVerifiedAnalysis?: CrossVerifiedAnalysis;` (Loaded client-side)

## Validation Rules
- **Impact Zone Consistency**: `verified_impact_zone_a` and `verified_impact_zone_b` MUST be physically consistent (e.g., if A is FRONT, B must be REAR or SIDE. If both are FRONT, it's a head-on collision but angles must be opposite).
- **Time/Distance Match**: Both reports must be within 100 meters and 5 seconds of each other.
- **Privacy Rule**: The raw `verified_speed` or `braking_data` of party B MUST NOT be rendered directly on party A's UI, and vice versa. Only the aggregated `liability_percent`, `consistency_status`, and the croquis representation are shown.

## State Transitions
1. **Unmatched**: `cross_verified_id` is null.
2. **Matching Pending**: `findMatchingAccident` identifies a candidate but the cross-verification hasn't run.
3. **Verified**: `cross_verified_id` is populated. The frontend loads the `CrossVerifiedAnalysis` to render the dual-perspective report.
