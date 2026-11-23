# Workflow: `/plan-feature`

Use before starting a new milestone slice or non-trivial feature.

## Steps
1. Read `docs/specs/STATE.md` and identify the target milestone slice.
2. Load only the relevant domain specs (`BLUEPRINT.md`, `ARCHITECTURE.md`, `CONTRACTS.md`, plus `BACKEND.md` or `FRONTEND.md`).
3. Apply **Ponytail** filter: challenge every proposed abstraction; drop anything not strictly required for v1.0.
4. Check if `docs/specs/CONTRACTS.md` needs changes. If yes, draft the Rust struct / TypeScript schema delta first.
5. Output a compact **Micro-Plan** (max 15 lines):
   ```markdown
   ### Micro-Plan: <Feature Name>
   - Spec Refs: <files/sections>
   - Contract Changes: <None | exact fields>
   - Failing Test(s) First: <test file + assertion>
   - Files to Touch: <exact paths>
   - Security Check: <relevant invariant from SECURITY.md>
   ```
6. Wait for approval (or proceed immediately if executing an already-approved milestone task).
