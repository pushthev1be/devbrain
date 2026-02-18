# DevBrain Knowledge Base Cheat Sheet

## The 3 Core Commands

```bash
# Search for lessons
grep '"tag-name"' dev_bible/bible.jsonl

# Append what you learned
echo '{"type":"MISTAKE",...}' >> dev_bible/bible.jsonl

# Validate
make -C dev_bible validate
```

## Quick Copy-Paste Templates

### PRINCIPLE
```json
{"type":"PRINCIPLE","id":"p.name","text":"Your principle","tags":["tag1","tag2"]}
```

### PATTERN
```json
{"type":"PATTERN","id":"pat.name.v1","name":"Pattern Name","when":"When to use","steps":["step1","step2"],"tags":["tag1"]}
```

### MISTAKE
```json
{"type":"MISTAKE","id":"m.bug.2025-02-18","symptom":"What went wrong","root_cause":"Why","fix_steps":["how to fix"],"tags":["tag1"]}
```

### RUNBOOK
```json
{"type":"RUNBOOK","id":"rb.task.v1","title":"Task","steps":["step1","step2"],"tags":["tag1"]}
```

### DECISION
```json
{"type":"DECISION","id":"d.choice.2025-02-18","question":"What did you choose?","decision":"Your choice","reason":"Why","tags":["tag1"]}
```

## Common Make Commands

```bash
cd dev_bible

make stats              # View all lesson counts
make search TAG=x      # Search by tag
make validate          # Check JSON
make add-lesson        # Interactive
make add-mistake       # Quick add
make add-pattern       # Quick add
make help              # Show all commands
```

## Common Searches

```bash
# DevBrain specific
grep '"devbrain"' dev_bible/bible.jsonl

# Error handling
grep '"error-handling"' dev_bible/bible.jsonl | grep PATTERN

# Recent mistakes
grep '2025-02' dev_bible/bible.jsonl | grep MISTAKE

# All patterns with specific tag
grep '"database"' dev_bible/bible.jsonl | grep PATTERN

# Count by type
grep -c '"type":"PATTERN"' dev_bible/bible.jsonl
```

## Naming Conventions

```
p.principles_are_short_and_lowercase
pat.patterns_versioned.v1
m.mistakes_dated.2025-02-18
rb.runbooks_versioned.v1
d.decisions_dated.2025-02-18
```

## ID Examples

```
p.daemon_watch
pat.two_phase_delete.v1
m.api_key_exposed.2025-02-18
rb.devbrain_workflow.v1
d.devbrain_sqlite.2025-02-18
```

## Bash Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Search DevBrain knowledge
alias bible='grep'
alias bible-devbrain='grep "\"devbrain\"" dev_bible/bible.jsonl'
alias bible-mistakes='grep "\"type\":\"MISTAKE\"" dev_bible/bible.jsonl'
alias bible-patterns='grep "\"type\":\"PATTERN\"" dev_bible/bible.jsonl'

# Quick stats
alias bible-stats='make -C dev_bible stats'

# Validate before commit
alias bible-check='make -C dev_bible validate'
```

## jq One-Liners

```bash
# Pretty print all lessons
cat dev_bible/bible.jsonl | jq .

# Show all MISTAKE IDs and symptoms
cat dev_bible/bible.jsonl | jq -r 'select(.type=="MISTAKE") | "[\(.id)]\n  \(.symptom)\n"'

# Show all PATTERN names
cat dev_bible/bible.jsonl | jq -r 'select(.type=="PATTERN") | "• \(.name) (\(.id))"'

# Export to markdown
cat dev_bible/bible.jsonl | jq -r 'select(.type=="MISTAKE") | "## \(.id) - \(.symptom)"'
```

## Git Integration

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
python3 dev_bible/validate.py dev_bible/bible.jsonl || exit 1
```

## Quick Workflow

**Before coding:**
```bash
grep '"your-feature-tag"' dev_bible/bible.jsonl
```

**After learning:**
```bash
echo '{"type":"MISTAKE","id":"m.what_happened.2025-02-18",...}' >> dev_bible/bible.jsonl
make -C dev_bible validate
```

**End of day:**
```bash
make -C dev_bible stats
```

---

**Remember:** Append-only, tag everything, search before coding!
