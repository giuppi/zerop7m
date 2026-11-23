# Workflow: `/execute-task`

Atomic Red-Green-Refactor execution loop for a single task slice.

## Steps
1. **Context Load:** Read `docs/specs/STATE.md` + task-specific spec (`BACKEND.md`, `FRONTEND.md`, `TESTING.md`, `CODE_STYLE.md`).
2. **Contract Sync (if applicable):** Update Rust types in `crates/p7m-core`, run `cargo test -p p7m-core export_bindings`, and update `packages/shared-types` Zod validators.
3. **RED:** Add failing test in `crates/*/tests/` or `apps/web/src/**/*.test.ts`. Run test command and confirm expected failure.
4. **GREEN:** Implement minimal, clean code following **Ponytail** and `CODE_STYLE.md`. Re-run tests until green.
5. **REFACTOR & VERIFY:**
   ```bash
   cargo fmt --all -- --check
   cargo clippy --workspace --all-targets -- -D warnings
   cargo test --workspace
   pnpm --filter web typecheck && pnpm --filter web test
   ```
6. **Handoff:** Update `docs/specs/STATE.md` in **Caveman** style (Completed / Verified / Next).
