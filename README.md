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
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Running the CLI

```bash
npm run cli
```

## Development

### Available Scripts

- `npm run dev` - Start development server for dashboard
- `npm run build` - Build all packages
- `npm run cli` - Run CLI tool
- `npm run test` - Run tests

### Project Architecture

The project is organized as a monorepo with the following main packages:

- **core** - Core AI and storage functionality
- **cli** - Command-line interface with daemon support
- **dashboard** - React-based web interface
- **vscode-extension** - VS Code extension integration

## Configuration

### Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required)
- `PORT` - Server port (default: 3000)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ by the DevBrain team
