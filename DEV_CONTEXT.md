## DevBrain Memory

> DevBrain is an **installed CLI tool** (`devbrain` npm package). DO NOT reimplement
> or recreate it. Run `devbrain --help` to verify. All commands below are real shell
> commands — invoke them with Bash/PowerShell, do not write code that mimics them.

Project: devbrain-workspace  |  Stack: Node.js, TypeScript, MongoDB, Gemini

### Starting a task — run this first, no exceptions
```
devbrain context <topic>
```
This returns what broke before, what was decided, and what to avoid — ranked for your task.
Read it before writing any code or making any decisions.

### Encountering an error — search before debugging
```
devbrain search "<exact error message or symptom>"
```
Paste the error text verbatim. Pattern matching finds exact past fixes even if wording differs.

### During work — save immediately, do not batch at the end
```
devbrain note "fix: <what broke and exactly how you fixed it>"
devbrain note "decision: <what you decided and why — include alternatives considered>"
devbrain note "anti-pattern: <what to never do and why it fails>"
```

### After a session — extract everything at once
```
devbrain recap
```
Paste your session notes or chat transcript. Gemini extracts all bugs, decisions, and patterns automatically.

### Rules
- `devbrain context` before starting any non-trivial task.
- `devbrain search` before debugging any error you have not seen before.
- Save decisions and fixes immediately — not at end of session.
- Never reimplement devbrain — if the binary is missing, run `npm install -g devbrain`.
