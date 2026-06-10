# Research: Dual-Party Matching

## 1. Where should the cross-referencing algorithm run?
- **Decision**: Client-side (Mobile App), driven by the first device that discovers the match.
- **Rationale**: 
  - The application already has robust physics and logic written in TypeScript (`otherPartyAnalysis.ts`, `sensorUtils.ts`). Replicating this in a Supabase Edge Function (Deno) or Postgres RPC (PL/pgSQL) would duplicate complex physics logic and complicate deployment.
  - While FR-011 requires hiding raw telemetry from the user, performing the math locally in the app layer (without rendering it in React components) satisfies the privacy requirement while maintaining a local-first architecture.
  - The client will generate a `CrossVerifiedAnalysis` object, persist it to Supabase (e.g. in a new table or as a JSON field), and both reports will update to reference it.
- **Alternatives considered**: 
  - *Supabase Edge Functions*: High security, but requires Deno deployment setup and moving logic out of the app.
  - *PostgreSQL RPC*: Too difficult to write vector math and physics calculations in SQL.

## 2. Notification for Asynchronous Matches
- **Decision**: In-app Banner on next app load.
- **Rationale**: As decided in Clarification Session 1, if the second party uploads late (within the window), the first party will get an in-app banner instead of a push notification to avoid Firebase/APNs infrastructure overhead right now.
- **Alternatives considered**: Push Notifications (rejected for complexity), Silent update (rejected for bad UX).

## 3. Storage Model for CrossVerifiedAnalysis
- **Decision**: Add a new table `cross_verified_analyses` and link it to both accident reports, OR embed it in the `accidents` table.
- **Rationale**: Since `CrossVerifiedAnalysis` is a shared entity, it's best modeled as a separate table `cross_verified_analyses`. Each `accident` row will have a `cross_verified_id` foreign key.
- **Alternatives considered**: Storing the JSON directly inside the `accidents` table on both rows (rejected because it creates data duplication and synchronization issues).
