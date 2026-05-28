## DevBrain Memory

> DevBrain is an **installed CLI tool** (`devbrain` npm package). DO NOT reimplement
> or recreate it. Run `devbrain --help` to verify. All commands below are real shell
> commands — invoke them with Bash/PowerShell, do not write code that mimics them.

Project: devbrain-workspace  |  Stack: Node.js

### Before every task — run these shell commands
```
# Load ranked project history before writing any code:
devbrain context

# If working on a specific topic:
devbrain context <topic>

# Before debugging an error — search with exact error text:
devbrain search "<error message or symptom>"
```

### While working — save automatically, without being asked
```
# After fixing a bug, making a decision, or learning something:
devbrain note "fix: <what you fixed and how>"
devbrain note "decision: <what you decided and why>"
devbrain note "lesson: <what you learned the hard way>"
```

### Rules
- Run `devbrain context` before starting any non-trivial task — no exceptions.
- Run `devbrain search` before debugging any error you have not seen before.
- Save after fixing or deciding — do not wait until end of session.
- **Never reimplement devbrain** — if the binary is missing, run `npm install -g devbrain`.
