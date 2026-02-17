#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runWithMonitoring } from './pty.js';
import { startDaemon } from './daemon.js';
import { startServer } from './server.js';
import { storage } from '@devbrain/core';
import inquirer from 'inquirer';

const program = new Command();

program
    .name('devbrain')
    .description('Intelligent local developer memory')
    .version('1.0.0');

program
    .command('run <cmd...>')
    .description('Run a command with brain monitoring')
    .action(async (cmd: string[]) => {
        const command = cmd.join(' ');
        console.log(chalk.blue(`[DevBrain] Monitoring: ${command}`));
        await runWithMonitoring(command);
    });

program
    .command('daemon')
    .description('Start background monitoring daemon')
    .option('-p, --path <path>', 'Path to watch', process.cwd())
    .action((options: { path: string }) => {
        startDaemon(options.path);
    });

program
    .command('server')
    .description('Start the dashboard API server')
    .option('-p, --port <number>', 'Port to run on', '3000')
    .action((options: { port: string }) => {
        startServer(parseInt(options.port));
    });

program
    .command('search <query>')
    .description('Search your knowledge base')
    .action(async (query: string) => {
        // TODO: Implement semantic search with embeddings
        const fixes = await storage.getFixes();
        const results = fixes.filter((f: any) =>
            f.errorMessage.includes(query) || (f.tags && f.tags.includes(query))
        );

        if (results.length === 0) {
            console.log(chalk.yellow('No matching wisdom found.'));
            return;
        }

        results.forEach((f: any) => {
            console.log(chalk.green(`\n[${f.projectName}] ${f.errorMessage.split('\n')[0]}`));
            console.log(chalk.gray(`Model: ${f.mentalModel}`));
        });
    });

program
    .command('stats')
    .description('View your brain metrics')
    .action(async () => {
        const stats = await storage.getStats();
        console.log(chalk.bold('\nSYTEM_TELEMETRY:'));
        console.log(`Blocks Indexed: ${stats.totalFixes}`);
        console.log(`Time Recovered: ${stats.timeSavedHours}h`);
        console.log(`Recall Precision: ${stats.accuracyRate}%`);
    });

program.parse();
