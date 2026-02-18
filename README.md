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

## 🕹️ Getting Started & User Flow

Follow this flow to turn your development history into a powerful technical knowledge base.

### 1. Environment Setup
After downloading the source, install dependencies and configure your AI/GitHub keys:

```bash
# Install dependencies
npm install

# Set your keys (Required for Deep Discovery)
export GEMINI_API_KEY="your_google_ai_key"
export GITHUB_TOKEN="your_github_personal_access_token"

# Build the core and CLI
npm run build
```

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

### `devbrain activate`
The one-stop command to start using DevBrain in a new project. Sets up monitoring and learns from recent history.

### `devbrain daemon`
Starts the background observer. It watches all registered projects, analyzes file changes, and captures wisdom as you code.

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
