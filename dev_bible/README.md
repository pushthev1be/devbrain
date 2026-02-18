# DevBrain Knowledge Base

A simple, append-only knowledge base that captures development lessons and DevBrain-specific patterns in one place.

## What's Inside

**bible.jsonl** - Your growing knowledge base with 5 types of lessons:
1. **PRINCIPLE** - Architectural truths
2. **PATTERN** - Reusable solutions (including DevBrain patterns)
3. **MISTAKE** - Bugs fixed and lessons learned
4. **RUNBOOK** - Step-by-step guides
5. **DECISION** - Why we chose X over Y

## Quick Start

### View Knowledge
```bash
make stats                          # See all lessons
make search TAG=devbrain           # Find DevBrain lessons
make search TAG=error-handling     # Find error handling patterns
```

### Add a Lesson
```bash
# Interactive
make add-lesson

# Or specific type
make add-mistake
make add-pattern
make add-principle
make add-runbook
make add-decision
```

### Validate
```bash
make validate          # Check JSON formatting
```

## The 3 Core Rules

1. **Append only** — Never edit old lessons; add new versions (add `.v2` to ID)
2. **One idea per line** — Keep lessons atomic and searchable
3. **Tag everything** — Liberal tagging makes grep effective

## ID Conventions

```
p.*     — Principles (e.g., p.daemon_watch)
pat.*   — Patterns (e.g., pat.error_matching.v1)
m.*     — Mistakes (e.g., m.api_key_exposed.2025-02-18)
rb.*    — Runbooks (e.g., rb.devbrain_workflow.v1)
d.*     — Decisions (e.g., d.devbrain_sqlite.2025-02-18)
```

Add dates (YYYY-MM-DD) or versions (v1, v2) to keep IDs unique.

## DevBrain Lessons

Search for `devbrain` tag to find project-specific lessons:

```bash
make search TAG=devbrain
```

This includes:
- File watcher patterns (debouncing, analysis)
- Error matching strategies
- Anti-pattern detection
- GitHub integration patterns
- Database design decisions

## Search Examples

```bash
# Find all mistakes related to the daemon
grep '"daemon"' bible.jsonl | grep MISTAKE

# Find all DevBrain patterns
grep '"devbrain"' bible.jsonl | grep PATTERN

# Find recent lessons
grep '2025-02' bible.jsonl

# Count lessons by type
grep -c '"type":"MISTAKE"' bible.jsonl
```

## Integration with DevBrain

Before implementing features:
1. Search dev_bible for relevant patterns

After fixing bugs:
1. Add a MISTAKE lesson  
2. Run `make validate`
3. Commit with your fix

## Example Workflow

**Morning: Before coding a feature**
```bash
# Need to add error handling?
grep '"error-handling"' bible.jsonl

# Found patterns you should follow!
```

**Evening: After fixing a bug**
```bash
# Document what you learned
make add-mistake

# Validate before commit
make validate

# Stats
make stats
```

## Advanced Queries

With `jq` (if installed):

```bash
# Show all DevBrain mistakes
cat bible.jsonl | jq -r 'select(.type=="MISTAKE" and (.tags | contains(["devbrain"]))) | "\(.id): \(.symptom)"'

# Show all patterns
cat bible.jsonl | jq -r 'select(.type=="PATTERN") | "[\(.id)] \(.name)"'

# Find lessons from this month
cat bible.jsonl | jq -r 'select(.id | contains("2025-02")) | "\(.type): \(.id)"'
```

## Current Knowledge Base Status

Run `make stats` to see current counts.

The knowledge base includes:
- DevBrain architecture principles
- File watcher patterns
- Error matching strategies
- Anti-pattern detection
- GitHub integration
- Security lessons from exposed API keys
- Deployment runbooks

## Add Your First Lesson

```bash
make add-principle
# ID: p.your_first
# Text: Your observation
# Tags: devbrain,your-tag

make validate
make stats
```

---

**Golden Rule:** Search before coding, append after learning. Your future self will thank you.
