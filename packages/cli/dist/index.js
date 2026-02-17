#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const pty_js_1 = require("./pty.js");
const daemon_js_1 = require("./daemon.js");
const server_js_1 = require("./server.js");
const core_1 = require("@devbrain/core");
const program = new commander_1.Command();
program
    .name('devbrain')
    .description('Intelligent local developer memory')
    .version('1.0.0');
program
    .command('run <cmd...>')
    .description('Run a command with brain monitoring')
    .action(async (cmd) => {
    const command = cmd.join(' ');
    console.log(chalk_1.default.blue(`[DevBrain] Monitoring: ${command}`));
    await (0, pty_js_1.runWithMonitoring)(command);
});
program
    .command('daemon')
    .description('Start background monitoring daemon')
    .option('-p, --path <path>', 'Path to watch', process.cwd())
    .action((options) => {
    (0, daemon_js_1.startDaemon)(options.path);
});
program
    .command('server')
    .description('Start the dashboard API server')
    .option('-p, --port <number>', 'Port to run on', '3000')
    .action((options) => {
    (0, server_js_1.startServer)(parseInt(options.port));
});
program
    .command('search <query>')
    .description('Search your knowledge base')
    .action(async (query) => {
    // TODO: Implement semantic search with embeddings
    const fixes = await core_1.storage.getFixes();
    const results = fixes.filter((f) => f.errorMessage.includes(query) || (f.tags && f.tags.includes(query)));
    if (results.length === 0) {
        console.log(chalk_1.default.yellow('No matching wisdom found.'));
        return;
    }
    results.forEach((f) => {
        console.log(chalk_1.default.green(`\n[${f.projectName}] ${f.errorMessage.split('\n')[0]}`));
        console.log(chalk_1.default.gray(`Model: ${f.mentalModel}`));
    });
});
program
    .command('stats')
    .description('View your brain metrics')
    .action(async () => {
    const stats = await core_1.storage.getStats();
    console.log(chalk_1.default.bold('\nSYTEM_TELEMETRY:'));
    console.log(`Blocks Indexed: ${stats.totalFixes}`);
    console.log(`Time Recovered: ${stats.timeSavedHours}h`);
    console.log(`Recall Precision: ${stats.accuracyRate}%`);
});
program.parse();
