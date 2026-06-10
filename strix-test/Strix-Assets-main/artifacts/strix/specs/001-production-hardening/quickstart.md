# Quickstart: Production Hardening

**Branch**: `001-production-hardening`

## Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS device or Simulator for testing
- Supabase project with `accidents` table (already configured)

## Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_STRIX_API_URL=  # Optional — Strix API fallback
```

## Development

```bash
cd artifacts/strix
npm install
npx expo start
```

## Verification Commands

```bash
# Verify no deprecated function calls
grep -r "filterSample" --include="*.ts" --include="*.tsx" lib/ context/ app/

# Verify testing directory removed
ls app/testing/  # Should fail with "No such file or directory"

# Verify iOS build
npx expo export --platform ios
```

## File Change Summary

| File | Action | FR |
|------|--------|----|
| `lib/sensorUtils.ts` | Fix `analyzeBraking()` + remove `filterSample()` | FR-001, FR-005 |
| `lib/accidentSync.ts` | Add error propagation + fix device ID race | FR-003, FR-004 |
| `lib/types.ts` | Add `syncStatus` field to `AccidentReport` | FR-003 |
| `lib/storage.ts` | Handle `syncStatus` migration | FR-003 |
| `context/SessionContext.tsx` | Add Alert Dialog on sync failure | FR-003 |
| `app.json` | Add iOS permissions + background modes | FR-006 |
| `app/testing/` | DELETE directory | FR-007 |

## Key Decisions

1. **No auth required** — RLS policies are already open for anon_key
2. **Manual retry** — No auto-retry queue; user triggers via "Retry Sync" button
3. **Alert Dialog** — Interactive failure notification with retry/save options
4. **Delete testing/** — Complete removal, not `__DEV__` gating
