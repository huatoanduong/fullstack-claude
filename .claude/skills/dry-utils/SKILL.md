---
name: dry-utils
description: >
  Enforces DRY (Don't Repeat Yourself) for utility functions. Invoke before
  writing any new utility function to check whether an equivalent already
  exists in `server/utils/`. Runs a mandatory three-step lookup: docs index,
  core utility file scan, and broad grep search.
when_to_use: >
  Use whenever you are about to write a helper, utility, or shared function —
  no matter how small. Applies equally to server-side utilities and any shared
  constants or enums. Do not skip for "trivial" helpers; duplication starts
  with the helpers that seemed too simple to check.
allowed-tools: Bash Glob Grep Read
---

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