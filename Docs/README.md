# Home-OS documentation

Project canon lives here, versioned alongside the code it describes.

```
Docs/
├── Current/   the authoritative set — read these
└── Archive/   superseded versions — kept for history, never read for guidance
```

## The rule

**`Docs/Current/` is canonical.** If a document here disagrees with a copy in
a chat's project knowledge, or with anything remembered from an earlier
session, this one wins — it is the version committed next to the code.

`Docs/Current/schema.md` is the single source of truth for the database.
Nothing is added to a table without it existing there first.

## Superseding a document

When a document is replaced:

1. Move the old file to `Docs/Archive/`, keeping its version in the filename
   (e.g. `master_schedule_v6.md`).
2. Put the new version in `Docs/Current/` under the plain name.
3. Note what changed and what it supersedes in the new file's header.

Never edit a file in `Archive/`. Never read one for guidance — an archived
document is a record of what was believed at the time, which is exactly what
makes it dangerous as instruction.

## Where to start

- `Current/00_vision.md` — why this exists.
- `Current/01_behavioural_principles.md` — the ten principles the app is
  judged against.
- `Current/master_schedule.md` — active phase, standing rules, tracked debt.
- `Current/PHASE*_HANDOFF.md` — what each completed phase actually shipped,
  including the defects it hit. Read these before building on a phase.

## What does not belong here

**No credentials, ever** — no tokens, keys, passwords or connection strings.
This repository is public, and GitHub Pages serves its contents to anyone.
The publishable Supabase key in `js/config.js` is safe only because RLS is
the security boundary; nothing that gets *past* RLS may be committed.
