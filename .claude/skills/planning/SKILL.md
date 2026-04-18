---
name: planning
description: >
  Governs requirement gathering and implementation planning. Invoke for any
  implementation task — new features, bug fixes, refactors, or anything that
  touches code. Runs a structured interrogation phase (one question at a time)
  to reach full clarity before producing a file-level Technical Implementation
  Plan saved to `.claude/plans/`.
when_to_use: >
  Use whenever the user asks to build, fix, change, or refactor anything in
  the codebase. Do not skip for "small" tasks — even a one-line change may
  have non-obvious ripple effects that the interrogation phase will surface.
allowed-tools: Bash Glob Grep Read Write Edit TodoWrite
---

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
- ✅ `2026_04_19_14_30_feature-auth.md`
- ❌ `2026_04_19_feature-auth.md` (missing time)
- ❌ `2026_04_19_00_00_feature-auth.md` (placeholder time, not real)

**Before writing the filename, you MUST generate the real local timestamp (`YYYY_MM_DD_HH_mm`) from your machine. Do NOT guess. Do NOT use `00_00`.**

- **PowerShell (Windows)**:
```powershell
Get-Date -Format "yyyy_MM_dd_HH_mm"
```

- **bash (macOS/Linux/Git Bash)**:
```bash
date +"%Y_%m_%d_%H_%M"
```

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
