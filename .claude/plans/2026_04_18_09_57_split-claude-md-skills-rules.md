# Plan: Split CLAUDE.md into Skills + Rules
**Timestamp:** 2026_04_18_09_57
**Plan file (repo):** `.claude/plans/2026_04_18_09_57_split-claude-md-skills-rules.md`

---

## Context

The current `.claude/CLAUDE.md` mixes two distinct concerns in one flat file:
1. **Always-on rules** — constraints Claude must always follow (doc sync, stack, DRY)
2. **Invocable skills** — procedural workflows Claude executes on demand (planning, interrogation, DRY lookup, docs routing)

Mixing these reduces clarity and makes the file harder to maintain. Splitting into the official Claude Code convention (`.claude/skills/<name>/SKILL.md`) gives each concern its own scope, makes skills individually invocable, and keeps CLAUDE.md lean and fast to read.

---

## Files to Create / Modify

### 1. `.claude/skills/planning/SKILL.md` ← NEW

Covers: Section 1 (Interaction Strategy) + Section 2 (Planning Requirements)

Full descriptive content:

```markdown
# Skill: Planning & Interrogation Workflow

## Purpose
This skill governs how Claude gathers requirements and produces implementation plans. It exists because rushed planning leads to scope creep, missed edge cases, and wasted implementation time. The interrogation phase front-loads ambiguity resolution so that by the time code is written, every decision is already made.

---

## Phase 1 — Interrogation Mode

### The One-Question Rule
Ask **exactly ONE question per turn**. Never bundle multiple questions into a single message, even if they feel related. The reason: users give better answers when focused on one thing. Bundled questions dilute attention and produce vague, partial responses that require follow-up anyway.

**Correct:**
> "What is the primary data source for this feature — a REST API, GraphQL, or a database query?"

**Incorrect:**
> "What is the data source, how should errors be handled, and do you want optimistic UI updates?"

### When to Stop Interrogating
Stop when you can answer YES to all of these:
- [ ] Do I know the exact files that will be created or modified?
- [ ] Do I know the specific logic changes inside each file?
- [ ] Do I know the tech stack and any library constraints?
- [ ] Do I know the success criteria (how will we know it works)?
- [ ] Have I identified which existing utilities/patterns to reuse?

Only after all boxes are checked should you say: *"I have enough information to form a full plan."*

### Anti-Patterns to Avoid
- **Do not** provide code snippets during interrogation — even "just to illustrate." It anchors the user on a possibly wrong direction.
- **Do not** assume the tech stack. Even in a Node/React project, a specific feature may use a different pattern.
- **Do not** ask rhetorical questions or questions you can answer by reading the code yourself. Use your tools first.

---

## Phase 2 — Technical Implementation Plan

### Plan File Location (Mandatory)
All plans MUST be saved to **`.claude/plans/`** inside this repository. Never save to temp folders, user home directories, or elsewhere.

### Plan File Naming Convention
Format: `YYYY_MM_DD_HH_mm_<descriptive-name>.md`

**Both date AND time are required.** Examples:
- ✅ `2026_04_18_14_30_feature-auth.md`
- ❌ `2026_04_18_feature-auth.md` (missing time)
- ❌ `2026_04_18_00_00_feature-auth.md` (placeholder time, not real)

**Before writing the filename, you MUST run this command to get the real local time:**
```bash
date +"%H_%M"
```
Do NOT guess the time. Do NOT use `00_00` as a fallback.

### Required Plan Sections
Every plan file must contain all of the following:

#### A. Context
Explain *why* this change is being made. What problem does it solve? What prompted it? What is the intended outcome? A reader with no prior context should understand the motivation after reading this section.

#### B. File-Level Changes
For every file that will be created or modified, list:
- **File Path** — exact path relative to repo root
- **Action** — CREATE, MODIFY, or DELETE
- **Specific Logic/Changes** — describe exactly what code goes in (for new files) or what changes (for modifications). Do not say "add the feature here" — describe the actual logic.

Example entry:
```
**File:** `server/routes/auth.js` — MODIFY
- Add `POST /auth/refresh` route handler
- Call `tokenService.refresh(req.body.token)`, return 200 with new token or 401 on expiry
- Reuse existing `requireAuth` middleware from `server/middleware/auth.js:23`
```

#### C. Documentation Update (Mandatory — Non-Optional)
Every plan MUST include a named documentation task. If a new doc file is needed, specify its path and content outline. If updating an existing file, specify which file and what sections change. A plan without this step is **incomplete and must not be approved**.

#### D. Verification Steps
Describe how to confirm the implementation works end-to-end:
- Which commands to run
- Which endpoints/UI flows to exercise
- What the expected output/behavior is

### Waiting for Approval
After saving the plan file and presenting it to the user:
- **Do NOT begin implementation** until the user explicitly says one of: "implement", "proceed", "go ahead", "yes do it", or a clear equivalent.
- Words like "okay", "I see", "got it", or "looks good" are NOT implementation triggers — confirm explicitly if ambiguous.
```

---

### 2. `.claude/skills/dry-utils/SKILL.md` ← NEW

Covers: Section 5 (DRY Principle Enforcement)

Full descriptive content:

```markdown
# Skill: DRY Utility Enforcement

## Purpose
This skill prevents utility duplication. In this codebase, core utilities have been extracted into well-defined modules under `server/utils/`. Writing a new utility function when an equivalent already exists wastes time, creates maintenance burden, and introduces subtle behavioral divergence (e.g., two URL normalization functions that handle edge cases differently).

**Default assumption before writing any utility: it probably already exists.**

---

## Mandatory Pre-Check Workflow

Before writing ANY new utility function — no matter how simple — execute all three steps below in order. Do not skip steps.

### Step 1 — Read the Utility Documentation
Read `server/docs/utils.md`. This file is the authoritative index of all documented core utilities. It describes what each utility does, its function signatures, and usage examples.

If `server/docs/utils.md` does not exist, note this and skip to Step 2.

### Step 2 — Scan the Core Utility Files
Check these files for existing implementations:

| File | Covers |
|------|--------|
| `server/utils/urlHelper.js` | URL parsing, normalization, conversion between formats |
| `server/utils/platformUtils.js` | Platform detection, validation (YouTube, Vimeo, etc.) |
| `server/utils/enums.js` | Shared enumerations and constants |
| `server/utils/videoThumbnailExtractor.js` | Thumbnail URL extraction from video embeds |

Read the relevant file(s) based on the category of utility you're considering writing. Look for:
- Functions with similar names
- Functions that solve the same problem even if named differently
- Constants or enums that match what you'd define

### Step 3 — Search Broadly
If Step 2 doesn't find a match, use grep to search the broader codebase:
```bash
grep -r "functionNameOrKeyword" server/utils/
```
Also check `server/helpers/` and `server/services/` if they exist.

---

## Decision Tree

```
Need a utility function?
        │
        ▼
Read server/docs/utils.md ──► Found it? ──YES──► Use it. Done.
        │
        NO
        ▼
Read relevant server/utils/*.js ──► Found it? ──YES──► Use it. Done.
        │
        NO
        ▼
Grep broadly ──► Found it? ──YES──► Use it. Done.
        │
        NO
        ▼
Write the new utility in the appropriate server/utils/ file
        │
        ▼
Document it in server/docs/utils.md (mandatory)
```

---

## When You Must Write a New Utility

Only proceed to write a new utility when all three steps above confirm nothing equivalent exists. When you do write one:

1. **Place it** in the most appropriate existing file under `server/utils/`. Prefer extending an existing file over creating a new one unless the new function is clearly a new domain.
2. **Export it** using the same export pattern as the rest of the file (CommonJS `module.exports` or ES module `export`).
3. **Document it** in `server/docs/utils.md` immediately — add the function name, signature, description, and a usage example. This is non-optional.

---

## Anti-Patterns

- **Do not** inline a utility function inside a route handler or component when it could be reused elsewhere.
- **Do not** create a `utils.js` file at a feature level that duplicates server-level utilities.
- **Do not** write a new utility and skip the `server/docs/utils.md` update — this defeats the purpose of the DRY enforcement system.
```

---

### 3. `.claude/skills/docs-routing/SKILL.md` ← NEW

Covers: Section 6 (Documentation Index)

Full descriptive content:

```markdown
# Skill: Documentation Index Routing

## Purpose
This skill ensures that before any implementation begins, Claude reads the right documentation — no more, no less. The `docs/index.md` file is a routing layer: it maps task types to specific documentation files and code areas. Reading it first prevents wasted effort reading irrelevant docs and ensures architectural decisions are respected.

---

## Mandatory First Read

**Before starting any implementation task**, read `docs/index.md`.

This is not optional. Even if you believe you understand the task from the user's description alone, `docs/index.md` may identify:
- Relevant architectural constraints not obvious from the code
- Existing patterns you must follow
- Global files that must always be read (e.g., shared types, base configs)
- Feature-specific documentation that changes your approach

### What to do if `docs/index.md` does not exist
If the file is missing, note this to the user. Offer to create it as part of the current task or as a standalone task. Do not skip the documentation step — instead, read the most relevant existing `.md` files you can find in the codebase.

---

## How to Use the Index

After reading `docs/index.md`:

1. **Identify your task category** — the index maps task types (e.g., "adding a new API route", "modifying a data model", "adding a UI component") to specific doc files.
2. **Load only the relevant docs** — do not read all documentation upfront. Load only what the index routes you to for your specific task. This keeps your context focused.
3. **Read the global mandatory files** — the index will list files that must always be read regardless of task type. Read these first.
4. **Follow referenced code files** — the index may point to specific source files as "typically touched" for each feature area. Review these before planning changes.

---

## Keeping the Index Updated

If you create or modify any `.md` documentation file during a task, you MUST update `docs/index.md` to reflect the change. Specifically:

- **New file created:** Add an entry describing what the file covers and which task types it's relevant to.
- **Existing file modified:** Update the description if the file's scope changed.
- **File deleted:** Remove its entry from the index.

The index is only useful if it stays accurate. An outdated index is worse than no index — it routes Claude to stale information.

---

## Anti-Patterns

- **Do not** skip `docs/index.md` because the task "seems simple." Simple tasks can still violate architectural constraints documented there.
- **Do not** read all docs in `docs/` indiscriminately. Only read what the index routes you to.
- **Do not** update documentation without updating the index. Orphaned docs that aren't indexed will never be found.
```

---

### 4. `.claude/CLAUDE.md` ← MODIFY

Replace with a lean rules-only file that references the skills:

```markdown
# Claude Code Project Rules

## Core Directive
Before implementing any changes, invoke the **planning** skill to create a detailed plan, save it to `.claude/plans/`, and wait for user approval.

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
```

---

### 5. `docs/index.md` ← CREATE

Required by CLAUDE.md rules — must exist before the docs-routing skill can function.

```markdown
# Documentation Index

This file is the routing layer for all project documentation.

## Task Routing

| Task Type | Read These Files | Code Areas |
|-----------|-----------------|------------|
| General setup | This file | — |

> **Note:** This index will grow as features and documentation are added. Update it whenever a new `.md` doc file is created.

## Global Mandatory Files
- `.claude/CLAUDE.md` — always-on project rules
- `.claude/skills/planning/SKILL.md` — planning workflow
- `.claude/skills/dry-utils/SKILL.md` — utility reuse rules
- `.claude/skills/docs-routing/SKILL.md` — documentation workflow
```

---

### 6. `.claude/plans/2026_04_18_09_57_split-claude-md-skills-rules.md` ← CREATE

A copy of this plan saved to the repo's plans folder (per CLAUDE.md requirement).

---

## Verification Steps

1. Run `ls .claude/skills/` — should show `planning/`, `dry-utils/`, `docs-routing/` directories
2. Run `cat .claude/CLAUDE.md` — should be lean, reference skills, no procedural content
3. Run `cat .claude/skills/planning/SKILL.md` — should contain full interrogation + planning workflow
4. Run `cat docs/index.md` — should exist and reference all skill files
5. Manually confirm: no content from old CLAUDE.md is lost — everything maps to exactly one new file
