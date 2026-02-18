#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { runWithMonitoring } from './pty.js';
import { startDaemon } from './daemon.js';
import { startServer } from './server.js';
import { storage, GitHubService, AiService } from '@devbrain/core';
import inquirer from 'inquirer';
import { v4 as uuidv4 } from 'uuid';
import Conf from 'conf';
import path from 'path';

const config = new Conf({
    projectName: 'devbrain',
    defaults: {
        projects: []
    }
});

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
    .option('-p, --path <path>', 'Path to watch', '')
    .action((options: { path: string }) => {
        const paths = options.path ? [options.path] : config.get('projects') as string[];
        if (paths.length === 0) {
            console.log(chalk.red('[ERROR] No projects to monitor. Add one with "devbrain monitor add <path>"'));
            return;
        }
        startDaemon(paths);
    });

const monitor = program.command('monitor').description('Manage monitored projects');

monitor
    .command('add [path]')
    .description('Add a project to monitor')
    .action((p: string) => {
        const targetPath = path.resolve(p || process.cwd());
        const projects = config.get('projects') as string[];
        if (!projects.includes(targetPath)) {
            config.set('projects', [...projects, targetPath]);
            console.log(chalk.green(`✓ Now monitoring: ${targetPath}`));
        } else {
            console.log(chalk.yellow(`! Already monitoring: ${targetPath}`));
        }
    });

monitor
    .command('remove [path]')
    .description('Stop monitoring a project')
    .action((p: string) => {
        const targetPath = path.resolve(p || process.cwd());
        const projects = config.get('projects') as string[];
        const updated = projects.filter(proj => proj !== targetPath);
        config.set('projects', updated);
        console.log(chalk.green(`✓ Stopped monitoring: ${targetPath}`));
    });

monitor
    .command('list')
    .description('List all monitored projects')
    .action(() => {
        const projects = config.get('projects') as string[];
        if (projects.length === 0) {
            console.log(chalk.yellow('No projects currently monitored.'));
            return;
        }
        console.log(chalk.blue('\nMonitored Projects:'));
        projects.forEach(p => console.log(` - ${p}`));
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
    .option('-d, --deep', 'Perform deep AI analysis of commit diffs', false)
    .option('-l, --limit <number>', 'Number of commits to analyze', '10')
    .action(async (owner: string, repo: string, options: { token?: string, deep?: boolean, limit: string }) => {
        try {
            const token = options.token || process.env.GITHUB_TOKEN || '';
            const aiApiKey = process.env.GEMINI_API_KEY;

            if (options.deep && !aiApiKey) {
                console.log(chalk.red('[ERROR] GEMINI_API_KEY is required for deep analysis.'));
                return;
            }

            const github = new GitHubService(token);
            const ai = aiApiKey ? new AiService(aiApiKey) : null;

            console.log(chalk.blue(`[DevBrain] Analyzing ${owner}/${repo}${options.deep ? ' (Deep Mode)' : ''}...`));

            const limit = parseInt(options.limit);
            const commits = await github.monitorRepo(owner, repo);

            for (const commit of commits.slice(0, limit)) {
                let fix: any;

                if (options.deep && ai) {
                    process.stdout.write(chalk.gray(` Analyzing commit ${commit.sha.substring(0, 7)}... `));
                    try {
                        const diff = await github.getCommitDiff(owner, repo, commit.sha);
                        const analysis = await ai.analyzeCommit(commit.message, diff);

                        if (analysis.isFix) {
                            process.stdout.write(chalk.green('WISDOM FOUND\n'));
                            fix = {
                                id: uuidv4(),
                                projectName: `${owner}/${repo}`,
                                errorMessage: analysis.errorMessage,
                                rootCause: analysis.rootCause,
                                mentalModel: analysis.mentalModel,
                                fixDescription: analysis.fixDescription,
                                beforeCodeSnippet: `SHA: ${commit.sha}`,
                                afterCodeSnippet: `Author: ${commit.author || 'unknown'}`,
                                filePaths: [`https://github.com/${owner}/${repo}/commit/${commit.sha}`],
                                tags: [...(analysis.tags || []), 'github-deep'],
                                frameworkContext: 'git',
                                createdAt: Date.now(),
                                confidence: analysis.confidence || 80,
                                timeSavedMinutes: 15,
                                usageCount: 0,
                                successCount: 0
                            };
                        } else {
                            process.stdout.write(chalk.dim('No fix detected\n'));
                            continue;
                        }
                    } catch (e) {
                        process.stdout.write(chalk.red('Extraction error\n'));
                        continue;
                    }
                } else {
                    fix = {
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
                }

                if (fix) await storage.saveFix(fix);
            }

            console.log(chalk.green(`✓ Operation complete for ${owner}/${repo}`));
        } catch (error: any) {
            console.error(chalk.red(`[ERROR] Failed to fetch GitHub data:`), error.message);
            process.exit(1);
        }
    });

program
    .command('learn')
    .description('Bulk learn from all your GitHub repositories')
    .option('-t, --token <token>', 'GitHub token')
    .option('-l, --limit <number>', 'Commits per repo', '5')
    .action(async (options: { token?: string, limit: string }) => {
        try {
            const token = options.token || process.env.GITHUB_TOKEN;
            if (!token) {
                console.log(chalk.red('[ERROR] GitHub token required. Set GITHUB_TOKEN or use --token.'));
                return;
            }

            const github = new GitHubService(token);
            console.log(chalk.blue('[DevBrain] Fetching your repositories...'));
            const repos = await github.listUserRepos();

            console.log(chalk.gray(`Found ${repos.length} repositories. Starting bulk learning (Deep Mode enabled).`));

            for (const repo of repos) {
                console.log(chalk.cyan(`\nProcessing ${repo.fullName}...`));
                const commits = await github.monitorRepo(repo.owner, repo.name);
                const aiApiKey = process.env.GEMINI_API_KEY;
                const ai = aiApiKey ? new AiService(aiApiKey) : null;

                for (const commit of commits.slice(0, parseInt(options.limit))) {
                    if (ai) {
                        process.stdout.write(chalk.gray(` Analyzing ${commit.sha.substring(0, 7)}... `));
                        try {
                            const diff = await github.getCommitDiff(repo.owner, repo.name, commit.sha);
                            const analysis = await ai.analyzeCommit(commit.message, diff);
                            if (analysis.isFix) {
                                process.stdout.write(chalk.green('Wisdom extracted\n'));
                                await storage.saveFix({
                                    id: uuidv4(),
                                    projectName: repo.fullName,
                                    errorMessage: analysis.errorMessage,
                                    rootCause: analysis.rootCause,
                                    mentalModel: analysis.mentalModel,
                                    fixDescription: analysis.fixDescription,
                                    beforeCodeSnippet: `SHA: ${commit.sha}`,
                                    afterCodeSnippet: `Author: ${commit.author || 'unknown'}`,
                                    filePaths: [`https://github.com/${repo.fullName}/commit/${commit.sha}`],
                                    tags: [...(analysis.tags || []), 'bulk-learn'],
                                    frameworkContext: 'git',
                                    createdAt: Date.now(),
                                    confidence: analysis.confidence || 80,
                                    timeSavedMinutes: 15,
                                    usageCount: 0,
                                    successCount: 0
                                });
                            } else {
                                process.stdout.write(chalk.dim('Skipped\n'));
                            }
                        } catch (e) {
                            process.stdout.write(chalk.red('Error\n'));
                        }
                    }
                }
            }
            console.log(chalk.green('\n✓ Bulk learning complete!'));
        } catch (error: any) {
            console.error(chalk.red(`[ERROR] Bulk learn failed:`), error.message);
        }
    });

program.parse();
