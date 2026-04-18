# Claude Code Project Rules

## Core Directive
Before implementing any changes, invoke the **planning** skill to create a detailed plan, save it to `.claude/plans/`, and wait for user approval.

### Plan File Naming Convention
All plan files saved to `.claude/plans/` must follow this naming pattern:
```
YYYY_MM_DD_HH_mm_<description-of-pr>.md
```
- **HH_mm is mandatory.** Before creating any plan file, you MUST run `date +%Y_%m_%d_%H_%M` (or `Get-Date -Format 'yyyy_MM_dd_HH_mm'` on Windows) to get the current timestamp. Never use a guessed or hardcoded time.
- Example: `2026_04_21_14_30_add-user-authentication.md`

## Always-On Rules

### Documentation Synchronization
For every code change or new model, simultaneously create or update the relevant documentation (e.g., README.md, `.md` docs in `/docs`, or JSDoc comments). If a data structure or model changes, verify that all architectural docs and types are updated to match.

### Technical Context
- **Stack:** Node.js & React (Senior-level implementation)

## Skills Available in This Project
The following skills define the procedural workflows Claude must follow:

| Skill | Trigger | File |
|-------|---------|------|
| `planning` | Any implementation task | `.claude/skills/planning/SKILL.md` |
| `dry-utils` | Before writing any utility function | `.claude/skills/dry-utils/SKILL.md` |
| `docs-routing` | Before starting any task | `.claude/skills/docs-routing/SKILL.md` |