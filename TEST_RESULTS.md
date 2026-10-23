# Faymio verification

Initial application and browser checks ran in the managed Linux workspace on 22 October 2026. The saved browser report was independently reviewed on 23 October 2026. Launcher and PostgreSQL deployment checks, plus the final Vitest rerun, ran on 23 October 2026. All fixture data is fictional.

| Check                     | Result                                                      |
| ------------------------- | ----------------------------------------------------------- |
| Dependency install        | Passed; package lock included in source                     |
| Prisma Client generation  | Passed, Prisma 6.19.0                                       |
| SQLite migration deploy   | Passed; one checked-in initial migration                    |
| Repeatable seed           | Passed; existing demo edits preserved                       |
| `npm run setup`           | Passed end to end                                           |
| TypeScript                | Passed                                                      |
| Vitest                    | **54 tests passed across 5 suites** in the final rerun      |
| Optimized Next.js build   | Passed; all application routes built                        |
| ESLint                    | Passed; final run reported no errors or warnings            |
| Chromium browser journeys | **2 passed**, no failures, skips, flaky results, or retries |

## Automated coverage

Fourteen integration tests exercise actual Prisma records in disposable SQLite databases: exact GlowLab counts, repeated seeding, talent create/edit/search/archive, retained history, reviewed and edited brief campaign creation, assignments, duplicate detection, archive handling, submit/request changes/resubmit/approve/publish, publication without required approval, fixed-precision invoice flags, overdue task completion, manipulated organization IDs and nested relation IDs, demo access gating, audit consistency, and CSV quoting/formula protection.

Fifteen origin-validation tests cover internal hostname normalization, matching browser-facing hosts, invalid or foreign origins, explicit canonical origins, and rejection of untrusted forwarded headers.

Twenty-one AI tests cover deterministic parsing, Indian currency, missing fields and start-date warnings, approvals/overdue/payments/summary/reminder answers from stored records, unsupported and unknown-campaign questions, provider malformed-output/timeout fallback, validation of supported read-only model routing, and rate-limit windows.

Four database-configuration tests verify connection-variable precedence and the Vercel PostgreSQL URL aliases. These bring the final Vitest total to 54 tests across five suites.

## Completed browser journeys

The saved report at `playwright-report/index.html` records **2 tests passed**, zero unexpected results, zero skipped or flaky tests, and no report errors. Both tests passed on their first attempt. `test-results/.last-run.json` also records `"status": "passed"` with an empty failed-test list. The run began on 22 October 2026 at 18:34:37 IST and took **162.529 seconds**, including setup and teardown.

| Browser test                                                                                | Result | Duration |
| ------------------------------------------------------------------------------------------- | ------ | -------: |
| Seeded dashboard, talent persistence, reviewed brief, assignment, approval and task journey | Passed | 79.706 s |
| Mobile navigation, forms and tracker remain usable without page overflow                    | Passed | 64.734 s |

The suite uses a separate `/tmp/faymio-e2e.db`, never `prisma/dev.db`, and exercises the optimized Next.js server with Chromium. Desktop uses a 1440 × 1000 viewport; mobile uses 390 × 844. Twelve full-page screenshots were saved under `work/screenshots/`, covering all five core screens, with additional desktop and mobile dark-mode dashboard captures. These screenshots are evidence from the completed run, not visual regression assertions.

## Requested acceptance flows

| Flow                                          | Completed evidence                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — dashboard metrics match persisted records | Integration assertions verify all exact GlowLab counts. The browser checks the workspace API counts and rendered assigned/published KPI values.                                                                                                                                    |
| B — add, edit, search, persist talent         | Browser creates a fictional creator, changes its city to Pune, reloads, searches, and verifies the saved result; integration also checks archival and history retention.                                                                                                           |
| C — review a brief and create a campaign      | Browser structures a brief, edits its fields, verifies creation is disabled before confirmation, confirms, creates the campaign, and reloads it.                                                                                                                                   |
| D — assign talent to an existing campaign     | Browser assigns the new creator to GlowLab and manages the assignment through its tracker.                                                                                                                                                                                         |
| E — submit, approve, update progress          | Browser confirms talent, submits a URL, approves, publishes, reloads, and verifies 12 published GlowLab deliverables. Integration additionally covers requesting changes and resubmission.                                                                                         |
| F — overdue task appears in action queue      | Browser creates an overdue task and verifies the dashboard count increases from 2 to 3. Integration verifies completing the task removes it from overdue results.                                                                                                                  |
| G — assistant reads actual pending approvals  | Browser receives four supporting approval records referencing GlowLab. Integration and AI tests verify responses reflect stored state and subsequent approval changes.                                                                                                             |
| H — saved changes survive reload              | Browser reloads and verifies edited talent, the created campaign, published work, and theme preference.                                                                                                                                                                            |
| I — desktop and mobile layouts                | Both browser journeys pass. Mobile checks navigation, talent and assignment dialogs, theme persistence, and page-width assertions on overview, tracker, briefs, and assistant.                                                                                                     |
| J — organization ownership                    | Integration creates a foreign organization and rejects its talent, campaign, assignment, task, export, note, and nested-relation IDs without foreign writes or disclosure. The demo still uses one server-selected identity; authenticated multi-organization sign-in is deferred. |

The desktop journey also recorded no unhandled page errors. Browser coverage is a focused smoke journey; it does not claim exhaustive accessibility, browser compatibility, performance, or security testing.

## Saved check evidence

`work/tests-final.log` records the original 50 Vitest tests passing across four suites in 23.70 seconds. `work/lint-final.log` contains the completed ESLint command with no diagnostics. `work/build-final.log` records the initial successful optimized Next.js 15.5.9 build, including lint/type validation, all 17 generated static pages, and the dynamic API/campaign routes. Subsequent launcher and PostgreSQL checks and the final 54-test result are recorded below.

Copies of the completed build, Vitest and lint logs, the self-contained browser report, and screenshots are included under `docs/verification/` and `docs/screenshots/` so this evidence remains available in downloaded source.

## Environment notes

The initial dependency attempt could not reach the environment proxy from the default network sandbox. The supported network-enabled execution succeeded without bypassing the proxy. A fresh separate SQLite database was also created successfully using the documented migration and seed commands. Prisma migration required preparing its target SQLite file; `scripts/migrate.mjs` now performs that safe, repeatable step. The tsx CLI attempted an IPC listener restricted by the default sandbox; the seed command uses `node --import tsx` and succeeds. Integration setup applies the actual migration directly through Prisma to avoid child-process restrictions in test workers.

No real OpenAI API key was configured. The provider behavior was checked with deterministic mocks; **a real provider call is unverified**. No messages or financial payments were sent.

## Local launch verification — 23 October 2026

The dependency-free `scripts/demo.mjs` bootstrap and the Windows/macOS launch helpers were added after the application checks above. Scoped verification completed without changing application workflows:

- **Eight launcher tests passed** with `node --test tests/demo-launcher.test.mjs`. They cover supported Node versions, strict port validation, preserving an existing `.env`, missing-dependency detection, refusing a busy port without stopping its existing server, waiting for an actual workspace HTTP 200, readiness failure/cancellation, and native browser-command selection.
- JavaScript syntax, macOS helper shell syntax, and targeted ESLint checks passed.
- A full launch on **127.0.0.1:3010** used **`file:/tmp/faymio-local-launcher-check.db`**. Prisma generation, migration, and seed succeeded; the workspace API returned **200** with 24 fictional talent, four campaigns, and 20 GlowLab assignments, and the dashboard returned **200**.
- A second launch against that same isolated database found no pending migration and preserved the existing seeded workspace. The launcher waited for both `/api/workspace` and `/dashboard` to return **200** before reporting readiness.
- **SIGINT cleanup passed:** the controlled launcher exited with code 130, and port 3010 no longer served HTTP. Cleanup targeted only its own child process tree. The application demonstration database was not used for either launch.

Repeat the isolated check on a Unix shell with:

```bash
FAYMIO_PORT=3010 DATABASE_URL=file:/tmp/faymio-local-launcher-check.db FAYMIO_NO_OPEN=1 npm run demo
```

The launcher tests and real startup ran on managed Linux with Node.js 24.19.0. **The Windows `.bat` and macOS `.command` helpers were not executed on their native operating systems.** Their browser commands were checked by unit tests; automatic GUI browser opening was skipped in this headless environment. Existing dependencies were used for the full startup checks; detection of missing dependencies was unit-tested, and the fresh-install path invokes `npm ci --include=dev` so development dependencies are installed even when `NODE_ENV=production` is inherited. Loopback tests require the environment's supported network-enabled execution because the default sandbox blocks local listeners.

## PostgreSQL and Vercel build verification — 23 October 2026

Verification used an actual disposable PostgreSQL 16 Docker container bound only to **127.0.0.1:5433**. Its generated password stayed in process memory and child environment variables; build and runtime logs were redacted before saving. No hosted database or paid service was created.

- PostgreSQL Prisma Client generation and the checked-in PostgreSQL migration passed.
- The real database produced the exact GlowLab seed metrics: **20 assigned, 16 confirmed, 11 published, four pending approvals, two overdue tasks, and three payment follow-ups**.
- The guarded integration script passed talent creation/edit/archive, retained assignment history, campaign creation, confirmation, submission, requested changes, resubmission, approval, publication, and foreign organization/nested-ID denial checks.
- **The complete `npm run vercel-build` passed against PostgreSQL**, including repeatable migrations, preservation of existing demo edits, compilation, lint/type validation, 17 static pages, dynamic routes, and build traces.
- A production Next.js server on **127.0.0.1:3011** returned **200** for the workspace API and `/dashboard`, `/talent`, `/briefs`, `/campaigns/glow-lab`, `/assistant`, `/campaigns`, `/activity`, and `/settings`. HTTP talent creation, editing, a subsequent persisted read, and archival also passed against PostgreSQL.
- The test server and disposable database container were removed. The **SQLite Prisma Client was restored**, then **all 54 Vitest tests passed across five suites in 11.14 seconds**.

The guarded script is `tests/postgres.integration.ts`; it refuses nonlocal targets and requires explicit `FAYMIO_POSTGRES_TEST=true`. It is intentionally excluded from the ordinary SQLite Vitest run.

Safe copies of the completed evidence are included in `docs/verification/postgres-build.log`, `postgres-integration.log`, `postgres-runtime.log`, and `tests-postgres-restored.log`. The PostgreSQL build log is the final successful run.

**An actual Vercel deployment and a hosted Neon/PostgreSQL connection were not verified.** Those require the user's Vercel/database account connection and deployment environment variables. The local PostgreSQL build/runtime checks validate the application and deployment build path, not Vercel account configuration, hosted TLS/pooling, or a published URL.
