# Testing and Git Workflow

## Test Stack
- **Unit tests**: Vitest (`npm test` runs `vitest --run`). Co-located with source files as `*.test.ts` / `*.test.tsx`.
- **Property-based tests**: fast-check, file naming convention `*.property.test.ts`. Co-located with the module under test.
- **Integration / E2E**: Playwright (`npm run test:e2e`). Files in `e2e/`.
- Tests must pass before any phase is marked complete or committed.

## Unit Test Conventions
1. Test files import from `vitest` only (`describe`, `it`, `expect`, `vi`). Do not mix Jest and Vitest APIs.
2. Pure modules (`inferenceEngine`, `storyEngine`, `c2paInspector`) must have ≥ 80% branch coverage.
3. Mock `exifr` and Canvas APIs with `vi.mock()` in extractor and cleaner tests — never make real filesystem or network calls in unit tests.
4. Each test file must have a one-line comment at the top describing which requirement(s) it covers, e.g., `// Covers R6: Home/Work/School Inference`.

## Property-Based Test Conventions
5. Property files use `fc.assert(fc.property(…))` from fast-check.
6. The 16 correctness properties defined in `design.md` §Correctness Properties map to these files:
   - Props 1–3 → `src/modules/fileValidator.property.test.ts`
   - Props 4, 5 → `src/modules/extractor.property.test.ts`
   - Props 6–10 → `src/modules/inferenceEngine.property.test.ts`
   - Props 11–12 → `src/modules/storyEngine.property.test.ts`
   - Props 13–14 → `src/modules/cleaner.property.test.ts`
   - Props 15–16 → `src/modules/c2paInspector.property.test.ts`
7. Each property test must include a comment citing the property number and requirement (e.g., `// Property 7: cluster label prefix — R6.4`).

## Git Workflow
8. Work on `main` branch unless a phase is experimental. Use feature branches only for Phase 7 (C2PA) and stretch features.
9. Commit message convention: `<type>: <short description>` where type is one of `feat`, `fix`, `chore`, `test`, `docs`. Examples:
   - `feat: implement haunted landing experience`
   - `feat: add browser-based exif extraction`
   - `test: add property tests for inference engine`
10. Before every commit:
    - Run `npm run build` — must exit 0 with zero TypeScript errors.
    - Run `npm test` — all tests must pass.
    - Run `git diff --name-only` and confirm no `.env`, private photo, or credential file is staged.
11. After every successfully completed development phase, push to the GitHub remote. Verify the push with `git log --oneline -3`.
12. Never force-push to `main`. Never commit `node_modules/`, `dist/`, or `.env*` files.
13. `.gitignore` must include: `node_modules/`, `dist/`, `.env*`, `*.local`, and any test output directories.

## Build Verification
14. `vite build` must exit with code 0 and report zero TypeScript type errors (from `tsc --noEmit`) before any phase commit.
15. If the build fails, fix the TypeScript errors before committing. Do not use `// @ts-ignore` or `// @ts-nocheck` to suppress errors.
