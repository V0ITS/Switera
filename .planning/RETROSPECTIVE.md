# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Completion & Polish

**Shipped:** 2026-06-24
**Phases:** 5 | **Plans:** 9 | **Sessions:** 1 continuous session for Phases 4-5 + close

### What Was Built
- Admin city/stock management UI (CRUD, cascade-rename, block-delete)
- Role-differentiated Laporan (Manajer Distribusi vs Tim Logistik see genuinely different data)
- Field-level validation across Login/Register/StatusDistribusi/InputData
- Landing/Login/Register migrated onto the shared `Tombol`/`Card`/`IkonDaun` component library
- Full 12-page completeness audit with 4 cross-page validation inconsistencies found and fixed

### What Worked
- Inline execution (no subagent spawning) for routine plan execution and quality gates (code review, security audit, UI review, goal verification) kept token usage low while still producing the full set of artifacts — this was an explicit, repeated user preference and held up well across Phases 4 and 5.
- Porting an already-validated pattern from a sibling file (StatusDistribusi's modal validation → Dashboard's identical modal; Dashboard's duplicate-decision guard → KeputusanDistribusi; Login's per-field error clearing → Register) caught real, concrete bugs cheaply — these were genuine behavioral inconsistencies, not cosmetic nitpicks.
- Delegating the broad, open-ended Phase 5 audit (12 pages × 9 checklist dimensions) to a single research-style subagent kept the orchestrator's own context lean while still getting specific, file/line-level findings — the right call versus reading all 12 pages inline.
- Explicit user check-ins before acting on ambiguous UX decisions (Login's non-functional "Lupa Password?"/"Ingat saya" controls, the Git push-to-main authorization) avoided unilateral scope or risk decisions.

### What Was Inefficient
- No `chromium-cli`/Playwright browser automation was available in the execution environment. DESIGN-04 (Phase 4) and Phase 5's fix verification had to rely on structural proxies (build passes, byte-unchanged shared components, pattern-matching against reference implementations) instead of actual rendered screenshots — disclosed honestly each time, but it's a real confidence gap that should be closed with one manual browser pass before the next milestone builds further UI on top.
- A prior session's executor subagent raw-committed `.planning/` files despite `commit_docs: false`, requiring a `git reset --soft` to undo — caught and documented in `.continue-here.md`, and avoided in this session by self-imposing the same discipline while executing inline (never `git add`ing `.planning/` paths).
- `git push origin main` hung repeatedly (Git Credential Manager likely needed an interactive re-auth the sandboxed session couldn't complete) — required the user to run the push manually via the `!` shell-passthrough each time. Worth checking GCM credential freshness before relying on agent-initiated pushes in future sessions.
- Jumped one step ahead when starting the v2.0 milestone (pre-wrote PROJECT.md/STATE.md for v2.0 before realizing `/gsd-complete-milestone` for v1.0 hadn't run yet) — caught before any commit, reverted cleanly, no actual damage, but worth remembering: always close the current milestone before opening the next one.

### Patterns Established
- "When the same user action is reachable from two different pages, both entry points must share identical validation logic" — a recurring class of bug in this codebase (Dashboard vs StatusDistribusi, Dashboard vs KeputusanDistribusi), worth checking explicitly in future audits.
- `Tombol`/`Card`'s `style` override prop is the sanctioned, source-preserving way to express bespoke layout needs without editing the shared component file — used consistently across Phase 4's migration.
- `phases.clear --confirm` **deletes** (not archives) phase directories — only safe to run after `/gsd-complete-milestone` has archived them first.

### Key Lessons
1. Before running any destructive-sounding GSD CLI command (`phases.clear`, etc.), dry-run or read its actual behavior first — naming ("clear") can undersell that it's a deletion, not an archive.
2. Token-efficient inline execution is the right default for bounded, well-understood fixes in this project; reserve subagent spawning for genuinely broad, open-ended exploration (audits, research) where the context-isolation benefit outweighs the spawn cost.
3. Always disclose tooling limitations explicitly (e.g., "no browser automation available, this is a structural check, not a visual one") rather than letting a verification report imply more confidence than the evidence supports.
4. Always run `/gsd-complete-milestone` to close the current milestone before starting `/gsd-new-milestone` for the next one — don't jump ahead even when the next milestone's scope is already well understood.

### Cost Observations
- Model mix: primarily Sonnet 4.6 for inline execution; one general-purpose subagent (same model) for the Phase 5 audit
- Sessions: 1 continuous session covering Phase 4 execution through v1.0 milestone close
- Notable: avoiding the full plan→execute→verify→review→security→ui-review subagent chain for Phases 4-5 (doing it inline instead) was the single biggest efficiency lever this milestone

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 (for P4-5 + close) | 5 | Switched from full multi-agent GSD pipeline to inline execution + targeted subagent use for broad audits only |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | 0 | N/A (no test framework) | 0 (no new dependencies added) |

### Top Lessons (Verified Across Milestones)

1. Inline execution for routine fixes + subagent delegation for broad audits is a stable, repeatable split that worked across both Phase 4 and Phase 5 of v1.0.
