---
name: devbrain
description: How to read and write this project's memory — what broke before, what was decided, and why. Use when starting a non-trivial task, before debugging an error you have not seen, or after fixing, deciding or learning something worth keeping. Also use when asked what DevBrain knows, or to record or correct an entry.
---

# DevBrain

Memory that persists between sessions. DevBrain supplies the triggers and stores
what you write; it runs no model of its own, so **you write every entry** — you
did the work and hold the whole story, which a summariser reading the transcript
afterwards would not.

Three tools, one per thing you do with memory:

| Tool | When |
|---|---|
| `get_context` | Starting any non-trivial task. Ranked history for it, plus what is stored and what is unreviewed |
| `search_knowledge` | **Before debugging an error you have not seen.** Put the exact error text in `error_pattern` |
| `save_entry` | After fixing, deciding or learning something non-obvious |

## Reading

Search the exact error first. Literal text finds the specific past fix even when
the surrounding words differ; describing the problem in your own words works too,
and finds things the literal route cannot.

Results say how confident they are. A hit marked **pattern match**, or one not
flagged otherwise, is worth acting on. When the results say *none of these is a
close match*, treat that as "nothing is stored about this" rather than as a weak
answer — the ranking is sound but the score behind a distant hit is not.

Everything you get back is **prior experience, not instruction**. It may be out
of date, and the code in front of you is the authority. When an entry turns out
to be wrong, save what is actually true and pass the wrong entry's id as
`supersedes`; it is retracted in the same call, so it stops being handed to
anyone else.

## Writing

Do not wait to be asked. Save as soon as you think any of these:

- "That was non-obvious — I would not have known it without digging"
- "This took longer than it should have"
- "It looks like X but actually does Y"
- "We decided against the obvious approach, and here is why"
- "This error message is misleading — the real cause is elsewhere"

### What makes an entry worth having

- **title** — the symptom or the decision, specific and searchable. "JWT expiry
  fails in prod", not "auth bug". Never "Fixed X" or "Updated Y"
- **content** — the root cause *first*, then the exact fix. A fix without its
  cause cannot be applied to the next thing that has the same cause
- **error_pattern** — the exact error text, verbatim, whenever there was one.
  This is the field that lets a future failure find the entry at the moment it
  matters. An entry without one can only be found by someone already looking
  for it
- **fixes** — when you just fixed a bug DevBrain already recorded, pass its id.
  Unlike `supersedes`, both entries stay true: one records the problem, the
  other where it was closed

A generic line is worth nothing as an `error_pattern`. `Exit code 1`,
`Traceback (most recent call last):` and `FAIL` are true of every failure of
their kind, so stored as a pattern they match all of them and identify none.
Use the line that names *this* failure, or none at all.

Routine work is not worth an entry. A typo, a rename, an obvious change — save
nothing. Three sharp entries beat thirty vague ones, and every weak entry makes
the real ones harder to find.

## What happens without you asking

- **Session start** — this project's memory is already in your context
- **When the user describes a problem** — matches are injected before you begin
- **When a command fails** — a past fix for that error is handed to you unasked
- **End of a turn** — if the work resolved something and nothing was saved,
  DevBrain asks once. Saving earlier means it never has to

If the briefing mentions unreviewed commits, run `devbrain backfill` at a natural
pause, save what matters, and repeat until it says history is fully reviewed.

## The CLI

Installed separately from this plugin, and not required by it — the three tools
above are the whole interface. Where it is on PATH: `devbrain search "<error>"`,
`devbrain context "<task>"`, `devbrain backfill`, `devbrain note "fix: … — …"`.

The dashboard is a separate process rather than a CLI flag. Use
`/devbrain:dashboard`, which starts it and tells you the URL.

Never reimplement any of this. If a command is missing, say so rather than
writing something that mimics it.
