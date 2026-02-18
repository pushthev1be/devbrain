#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runWithMonitoring } from './pty.ts';
import { startDaemon } from './daemon.ts';
import { startServer } from './server.ts';
import { storage, GitHubService } from '@devbrain/core';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';

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

program
    .command('github <owner> <repo>')
    .description('Learn from a GitHub repository')
    .option('-t, --token <token>', 'GitHub token (optional, for private repos)')
    .action(async (owner: string, repo: string, options: { token?: string }) => {
        try {
            // Use provided token or empty (public repos don't need auth)
            const token = options.token || process.env.GITHUB_TOKEN || '';
            const github = new GitHubService(token);

            console.log(chalk.blue(`[DevBrain] Analyzing ${owner}/${repo}...`));

            // Fetch recent commits
            console.log(chalk.gray('Fetching recent commits...'));
            const commits = await github.monitorRepo(owner, repo);
            
            // Fetch closed issues/bugs
            console.log(chalk.gray('Fetching closed issues...'));
            const issues = await github.getRecentErrorsInIssues(owner, repo);

            // Store commit insights
            for (const commit of commits.slice(0, 10)) {
                const fix = {
                    id: uuidv4(),
                    projectName: `${owner}/${repo}`,
                    errorMessage: `Commit: ${commit.message.split('\n')[0]}`,
                    rootCause: `GitHub Repository: ${owner}/${repo}`,
                    mentalModel: `Author: ${commit.author || 'unknown'}, Approach: Git history analysis`,
                    fixDescription: commit.message,
                    beforeCodeSnippet: `SHA: ${commit.sha}`,
                    afterCodeSnippet: `Date: ${commit.date || 'unknown'}`,
                    filePaths: [`https://github.com/${owner}/${repo}/commit/${commit.sha}`],
                    tags: ['github-commit', 'repository', owner, repo],
                    frameworkContext: 'git',
                    createdAt: Date.now(),
                    confidence: 75,
                    timeSavedMinutes: 10,
                    usageCount: 0,
                    successCount: 0
                };
                await storage.saveFix(fix);
            }

            // Store issue insights
            for (const issue of issues.slice(0, 10)) {
                const fix = {
                    id: uuidv4(),
                    projectName: `${owner}/${repo}`,
                    errorMessage: `Issue: ${issue.title}`,
                    rootCause: `GitHub Issue #${issue.number}`,
                    mentalModel: `Bug Report: Known issue in ${owner}/${repo}`,
                    fixDescription: issue.body || 'No description provided',
                    beforeCodeSnippet: `Status: closed`,
                    afterCodeSnippet: `Issue URL: ${issue.html_url}`,
                    filePaths: [issue.html_url],
                    tags: ['github-issue', 'bug-report', 'repository', owner, repo],
                    frameworkContext: 'issue-tracking',
                    createdAt: Date.now(),
                    confidence: 80,
                    timeSavedMinutes: 15,
                    usageCount: 0,
                    successCount: 0
                };
                await storage.saveFix(fix);
            }

            console.log(chalk.green(`✓ Learned from ${commits.length} commits and ${issues.length} issues`));
            console.log(chalk.cyan(`Total insights stored: ${commits.length + issues.length}`));
            console.log(chalk.gray(`Search with: devbrain search "${repo}"`));
        } catch (error: any) {
            console.error(chalk.red(`[ERROR] Failed to fetch GitHub data:`), error.message);
            process.exit(1);
        }
    });

program.parse();
