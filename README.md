# DevBrain - Developer Knowledge CLI

> An intelligent CLI tool for managing and accessing developer knowledge with AI-powered assistance.

## About

DevBrain is a comprehensive developer knowledge management system that combines a powerful CLI, a beautiful dashboard, and AI capabilities to help developers organize, search, and access development resources efficiently. It identifies user patterns, errors, techniques, and architectural styles, recording these insights to prevent future bugs and improve code quality.

## Core Features

- 🧠 **Smart Activation** - `devbrain activate` instantly connects any project and scans its history.
- 🏗️ **Engineering patterns** - Extracts architectural styles and optimizations, not just bug fixes.
- 🔄 **Multi-Project Monitoring** - Watch multiple codebases simultaneously with a single daemon.
- 📊 **Interactive Dashboard** - Beautiful web-based UI for browsing and managing insights.
- 💾 **Local Storage** - Your knowledge stays on your machine in a private SQLite database.
- 🚀 **Deep Discovery** - Crawler that performs AI-powered analysis of entire GitHub repositories.

## 🚀 Quick Essential Commands

| Command | Description | Recommended Frequency |
| :--- | :--- | :--- |
| `devbrain activate` | Connect project & scan history | **Once per project** |
| `devbrain watch` | Stylized "Kernel Mode" monitoring | **Keep running in background** |
| `devbrain daemon` | Standard monitoring daemon | **Alternative to watch** |
| `devbrain config set` | "Hardwire" your API keys | **Initial setup only** |
| `devbrain github --deep`| Deep dive into a public repo | **When studying new stacks** |
| `devbrain run "cmd"` | Run & monitor a command | **During active debugging** |

## 🕹️ Getting Started & User Flow

Follow this flow to turn your development history into a powerful technical knowledge base.

### 1. Environment Setup & Persistent Config
After downloading the source, install dependencies and build. Then, "hardwire" your AI keys persistently so you don't have to set them every time:

```bash
# Install and build everything
npm install
npm run build

# Securely store your keys (Recommended)
devbrain config set gemini-key "your_ai_key"
devbrain config set github-token "your_token"

# Verify your configuration
devbrain config list
```
*Storing keys via `config set` keeps them out of your environment logs but makes them permanent for all DevBrain commands.*

### 2. Instant Project Activation
Navigate to any of your project directories and "activate" DevBrain. This is the first thing you should do in a project.

```bash
cd /path/to/your/project
devbrain activate
```

**What happens?**
- DevBrain automatically detects your GitHub repo.
- It scans recent history.
- It extracts **Bug Fixes**, **Engineering Patterns**, and **Optimizations** into your local brain.

### 3. Continuous Learning (The Daemon)
To capture new wisdom as you work, keep the DevBrain daemon running in a background terminal:

```bash
# In your main project or global terminal
devbrain daemon
```
As you run commands (via `devbrain run`) or save files, the daemon analyzes the changes and records new insights automatically.

### 4. Explore your Brain
Use the CLI or the Dashboard to recall and search your captured wisdom:

- **CLI Search**: `devbrain search "react lifecycle"`
- **Dashboard**: `npm run dashboard:dev` (Open http://localhost:5173)

## 📖 Command Reference

### `devbrain config <set|list>`
Manage your persistent configuration.
- `devbrain config set gemini-key "key"` - Stores key locally.
- `devbrain config set github-token "token"` - Stores token locally.
- `devbrain config list` - Shows current (masked) configuration.

### `devbrain activate`
The one-stop command to start using DevBrain in a new project. Sets up monitoring and learns from recent history.

### `devbrain watch`
The vibrant, high-fidelity alternative to the standard daemon. Features a stylized "Kernel" UI, real-time "Neural Intercept" status, and cyberpunk-themed anomaly logging.

### `devbrain daemon`
Starts the standard background observer. It watches all registered projects and captures wisdom as you code with a clean, professional output.

### `devbrain monitor <add|list|remove>`
Manage which projects DevBrain is watching.
```bash
devbrain monitor add ./src
devbrain monitor list
```

### `devbrain github <owner> <repo> [--deep]`
Perform a deep AI scan of any GitHub repository.
```bash
devbrain github facebook react --deep --limit 20
```

### `devbrain learn`
Bulk-learn from all your GitHub repositories at once.

### `devbrain run <command>`
Run a command (like `npm test`) and monitor it for errors. If a failure is later fixed, DevBrain automatically generates a "Verified Solution" block.

### `devbrain search <query>`
Quickly find solutions or patterns from your terminal.

## 📚 Developer Knowledge Base

DevBrain includes a local **Project Bible** system for capturing and organizing development lessons:

```bash
cd dev_bible

# View all knowledge
make stats

# Search for lessons
make search TAG=devbrain
make search TAG=error-handling

# Add what you learned
make add-mistake
make add-pattern
make add-principle

# Validate before commit
make validate
```

### Knowledge Base Structure

The `dev_bible/` folder contains:
- **bible.jsonl** - Your growing knowledge base (PRINCIPLES, PATTERNS, MISTAKES, RUNBOOKS, DECISIONS)
- **Makefile** - Helper commands for managing lessons
- **validate.py** - CI-ready JSON validator
- **README.md** - Complete documentation
- **CHEATSHEET.md** - Quick reference guide

### Golden Workflow

**Before coding:** Search for relevant lessons
```bash
grep '"your-feature"' dev_bible/bible.jsonl
```

**After fixing a bug:** Document what you learned
```bash
make -C dev_bible add-mistake
make -C dev_bible validate
```

This captures institutional knowledge across the entire DevBrain project and prevents recurring mistakes.

## Configuration Details

DevBrain prioritizes keys in the following order:
1. **Command Line Options** (`--token`)
2. **Environment Variables** (`GEMINI_API_KEY`, `GITHUB_TOKEN`)
3. **Persistent Config Store** (`devbrain config set`)

The persistent store is located at `~/.devbrain/config.json`.

## Project Structure

```
├── apps/
│   ├── dashboard/          # Web dashboard UI (React + Vite)
│   └── vscode-extension/   # VS Code extension
├── packages/
│   ├── cli/                # Command-line interface & Daemon
│   ├── core/               # AI analysis, storage, & GitHub service
│   └── shared/             # Shared utilities and types
```

## Running the Dashboard

Visualize your collected knowledge base in the browser:
```bash
npm run dashboard:dev
```
Available at `http://localhost:5173`

## Configuration

- `GEMINI_API_KEY`: Required for AI analysis and pattern extraction.
- `GITHUB_TOKEN`: Used for deep repo crawling and private repos.
- `PORT`: API server port (default: 3000).

## Persistence

All insights are stored in `~/.devbrain/brain.db`. This database is shared across all projects on your machine, allowing you to recall a solution in Project B that you first discovered in Project A.

---

Built with ❤️ by the DevBrain team
