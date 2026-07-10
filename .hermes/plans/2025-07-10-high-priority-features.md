# Plan: 4 High-Priority Features for brandly-plugin

## Context
The brandly-plugin has 12 tools covering the full video production pipeline, but lacks operational resilience: no way to cancel a running project, no retry on failures, no progress visibility, and no export of finished work. These 4 features complete the production story.

---

## Feature 1: Cancel/Pause Project (`brandly_cancel`)
**File:** `src/tools/cancel.ts` (new)

- New tool `brandly_cancel` with params: `projectID`, `reason?`, `action?: "pause" | "cancel"`
- Sets project `status` to `"paused"` or `"cancelled"` based on `action` (default: `"cancelled"`)
- Records `cancelledAt` timestamp and optional `reason` in project state
- Prevents further `brandly_approve` and `brandly_run_project` calls by checking status
- Validates project ID, checks project exists

**Modifications:**
- `src/index.ts`: register `createCancelTool(ctx)` → 13 tools
- `src/constants.ts`: add `"paused" | "cancelled"` to valid statuses
- `src/tools/approve.ts`: guard against `status !== "running"` (allow only running/pending)
- `src/tools/run.ts`: guard against `status === "cancelled" | "paused"`

---

## Feature 2: Retry Logic (`src/retry.ts`)
**File:** `src/retry.ts` (new)

- `withRetry<T>(fn, opts)` utility: retries `fn` up to `maxRetries` times with exponential backoff
- Default: 3 retries, base delay 1000ms, max delay 10000ms
- Each retry logs attempt number to `opts.onRetry?` callback
- Throws after final failure with combined error message

**Modifications:**
- `src/tools/run.ts`: wrap agent dispatch in `withRetry()` for file-read + validation failures
- `src/tools/validate.ts`: wrap validation call in `withRetry()` for transient failures

---

## Feature 3: Progress Tracking (`brandly_progress`)
**File:** `src/tools/progress.ts` (new)

- New tool `brandly_progress` with params: `projectID`
- Returns current phase, overall % complete (phases completed / total), phase-by-phase status, time in current phase, estimated time remaining
- Reads project state and computes progress from `phases` object

**Modifications:**
- `src/index.ts`: register `createProgressTool(ctx)` → 14 tools

---

## Feature 4: Export Tool (`brandly_export`)
**File:** `src/tools/export.ts` (new)

- New tool `brandly_export` with params: `projectID`, `outputPath?`
- Collects all completed artifact files from `.brandly/projects/{id}/artifacts/`
- Creates `export-manifest.json` listing: project metadata, phase results, artifact paths, cost summary
- Copies artifacts to `outputPath` if specified (default: `.brandly/projects/{id}/export/`)
- Returns manifest contents

**Modifications:**
- `src/index.ts`: register `createExportTool(ctx)` → 15 tools

---

## Files Modified
| File | Change |
|------|--------|
| `src/constants.ts` | Add cancelled/paused status values |
| `src/index.ts` | Register 3 new tools (cancel, progress, export) |
| `src/tools/approve.ts` | Guard: only advance if status is "running" or "pending" |
| `src/tools/run.ts` | Guard: block if cancelled/paused; wrap in withRetry |
| `src/tools/validate.ts` | Wrap in withRetry |

## Files Created
| File | Purpose |
|------|---------|
| `src/tools/cancel.ts` | brandly_cancel tool |
| `src/retry.ts` | withRetry utility |
| `src/tools/progress.ts` | brandly_progress tool |
| `src/tools/export.ts` | brandly_export tool |
| `tests/cancel.test.ts` | Tests for cancel/pause |
| `tests/progress.test.ts` | Tests for progress tracking |
| `tests/export.test.ts` | Tests for export |

## Verification
1. `bun run build` — compiles cleanly
2. `bun test` — all existing + new tests pass (target: 26+ tests)
3. `bun run lint` — no lint errors
4. Manual: create project → cancel → verify approve/run rejected
5. Manual: run project → verify retry on simulated failure
6. Manual: complete project → export → verify manifest.json created
