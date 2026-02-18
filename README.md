# DevBrain - Developer Knowledge CLI

> An intelligent CLI tool for managing and accessing developer knowledge with AI-powered assistance.

## About

DevBrain is a comprehensive developer knowledge management system that combines a powerful CLI, a beautiful dashboard, and AI capabilities to help developers organize, search, and access development resources efficiently.

## Features

- 🧠 **AI-Powered Assistance** - Leverages Google Gemini API for intelligent knowledge management
- 📊 **Interactive Dashboard** - Beautiful web-based UI for browsing and managing knowledge
- 💾 **Local Storage** - Store and manage your development knowledge locally
- 🔧 **CLI Tools** - Command-line interface for quick access to knowledge
- 🎨 **ANSI Rendering** - Rich terminal output with color support
- 🚀 **PTY Support** - Full pseudo-terminal capabilities for interactive sessions

## Project Structure

```
├── apps/
│   ├── dashboard/          # Web dashboard UI (React + Vite)
│   └── vscode-extension/   # VS Code extension
├── packages/
│   ├── cli/                # Command-line interface
│   ├── core/               # Core functionality & AI integration
│   └── shared/             # Shared utilities and types
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pushthev1be/devbrain.git
   cd devbrain
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

### Running the Dashboard

```bash
npm run dashboard:dev
```

The dashboard will be available at `http://localhost:5173`

### Running the CLI

```bash
npm run cli:dev
```

## Command Flow & Usage

DevBrain works as an interconnected system. Here's how to use it:

### Complete Setup (3 Terminals)

**Terminal 1: Start the Backend API Server**
```bash
npm run cli:dev -- server --port 3000
```
This starts the API server that stores and retrieves your analyzed code patterns and insights.

**Terminal 2: Start the Dashboard**
```bash
npm run dashboard:dev
```
Opens the web UI at `http://localhost:5173` where you can visualize your collected knowledge.

**Terminal 3: Run the Daemon (in your project)**
```bash
cd /path/to/your/project
devbrain daemon --path ./src
```
The daemon watches your code, analyzes files for patterns and potential issues, and stores data to the local knowledge base.

### CLI Commands Reference

#### `devbrain daemon [options]`
Watches a directory and analyzes code changes in real-time.
```bash
devbrain daemon --path ./src
# Monitors ./src directory for TypeScript, JavaScript, Python files
# Detects: patterns, code complexity, potential issues
# Stores insights to local SQLite database (~/.devbrain/brain.db)
```

#### `devbrain server [options]`
Starts the API backend that the dashboard connects to.
```bash
devbrain server --port 3000
# Exposes API endpoints:
# GET  /api/fixes    - All analyzed code insights
# POST /api/fixes    - Save new insights
# GET  /api/stats    - Statistics and metrics
```

#### `devbrain search <query>`
Search your knowledge base from the CLI.
```bash
devbrain search "loose-typing"
devbrain search "error-handling"
# Returns all matching insights from previous analyses
```

#### `devbrain run <command>`
Run a command and monitor it for errors/patterns.
```bash
devbrain run "npm test"
devbrain run "node src/app.ts"
# Executes command and tracks any errors/issues encountered
```

#### `devbrain stats`
View your brain's metrics and collected knowledge.
```bash
devbrain stats
# Shows:
# - Total blocks indexed
# - Time recovered (estimated)
# - Recall precision
# - Top patterns detected
```

### Workflow Example

```bash
# Step 1: Start backend services (in separate terminals)
npm run cli:dev -- server --port 3000
npm run dashboard:dev

# Step 2: In your project, start monitoring
cd ~/my-project
devbrain daemon --path ./src

# Step 3: Open dashboard
# Visit http://localhost:5173
# See real-time analysis in "0x02_BLOCKS" tab

# Step 4: Search or view stats
devbrain search "any"          # Find loose typing
devbrain stats                 # View collected metrics

# Step 5: Use in other projects (same database!)
cd ~/another-project
devbrain daemon --path ./src
# Dashboard automatically shows insights from both projects
```

### Knowledge Base

All insights are stored in a local SQLite database:
- **Location**: `~/.devbrain/brain.db`
- **Scope**: Shared across all projects on your machine
- **Data**: Code patterns, complexity, issues, metadata
- **Persistence**: Survives daemon restarts

The more you run the daemon, the smarter your DevBrain gets!

## Development

### Available Scripts

- `npm run dashboard:dev` - Start React dashboard (http://localhost:5173)
- `npm run cli:dev` - Run CLI in dev mode
- `npm run cli:build` - Build CLI for production
- `npm run core:build` - Build core package
- `npm run dev` - Start all dev servers
- `npm run build` - Build all packages

### Project Architecture

The project is organized as a monorepo with the following main packages:

- **core** - AI analysis, storage, database management
- **cli** - Command-line interface with daemon, server, search
- **dashboard** - React-based web UI for visualization
- **vscode-extension** - VS Code extension integration

## Configuration

### Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required for AI features)
- `PORT` - Server port (default: 3000 for API)

### Database

DevBrain uses SQLite for local storage. The database is automatically created at:
```
~/.devbrain/brain.db
```

Tables store:
- **fixes** - Code insights, patterns, complexity metrics
- **anti_patterns** - Common mistakes and better approaches

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ by the DevBrain team
