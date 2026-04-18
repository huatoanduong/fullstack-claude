---
name: docs-routing
description: >
  Routes Claude to the correct documentation before any implementation task
  begins. Reads `docs/index.md` to identify which feature docs and code areas
  are relevant, then loads only those — avoiding both under-reading (missing
  constraints) and over-reading (wasted context).
when_to_use: >
  Use at the start of every implementation task, before any code is read or
  written. Must run before the `planning` skill's interrogation phase so that
  known architectural constraints inform the questions asked. Also run after
  completing any task that creates or modifies a `.md` file, to keep the
  index current.
allowed-tools: Bash Glob Grep Read Write Edit
---

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