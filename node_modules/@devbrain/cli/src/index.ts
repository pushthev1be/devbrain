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
import fs from 'fs';
import { execSync } from 'child_process';

const config = new Conf({
    projectName: 'devbrain',
    defaults: {
        projects: [],
        geminiKey: '',
        githubToken: ''
    }
});

const program = new Command();

program
    .name('devbrain')
    .description('Intelligent local developer memory')
    .version('1.0.0');

program
    .command('config <action> [key] [value]')
    .description('Manage configuration (actions: set, get, list)')
    .action((action: string, key: string, value: string) => {
        if (action === 'set') {
            if (key === 'gemini-key') {
                config.set('geminiKey', value);
                console.log(chalk.green('✓ Gemini API Key stored persistently.'));
            } else if (key === 'github-token') {
                config.set('githubToken', value);
                console.log(chalk.green('✓ GitHub Token stored persistently.'));
            } else {
                console.log(chalk.red('[ERROR] Invalid config key. Use "gemini-key" or "github-token".'));
            }
        } else if (action === 'list') {
            console.log(chalk.blue('\nConfiguration:'));
            console.log(` - gemini-key: ${config.get('geminiKey') ? '********' : 'not set'}`);
            console.log(` - github-token: ${config.get('githubToken') ? '********' : 'not set'}`);
        } else {
            console.log(chalk.red('[ERROR] Unknown config action. Use "set" or "list".'));
        }
    });

program
    .command('run <cmd...>')
    .description('Run a command with brain monitoring')
    .action(async (cmd: string[]) => {
        const command = cmd.join(' ');
        console.log(chalk.blue(`[DevBrain] Monitoring: ${command}`));
        await runWithMonitoring(command);
        process.exit(0);
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
        startDaemon(paths, false);
    });

program
    .command('watch')
    .description('Start stylized "Kernel" monitoring mode')
    .option('-p, --path <path>', 'Path to watch', '')
    .action((options: { path: string }) => {
        const paths = options.path ? [options.path] : config.get('projects') as string[];
        if (paths.length === 0) {
            console.log(chalk.red('[ERROR] No projects to monitor. Add one with "devbrain monitor add <path>"'));
            return;
        }
        startDaemon(paths, true);
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

async function learnFromRepo(owner: string, repo: string, options: { deep?: boolean, limit: string, token?: string, aiKey?: string }) {
    try {
        const token = options.token || process.env.GITHUB_TOKEN || config.get('githubToken') as string || '';
        const aiApiKey = options.aiKey || process.env.GEMINI_API_KEY || config.get('geminiKey') as string;

        if (options.deep && !aiApiKey) {
            console.log(chalk.red('[ERROR] Gemini API Key not found. Set it with "devbrain config set gemini-key <key>" or use env GEMINI_API_KEY.'));
            return;
        }

        const github = new GitHubService(token);
        const ai = aiApiKey ? new AiService(aiApiKey) : null;

        console.log(chalk.blue(`[DevBrain] Analyzing ${owner}/${repo}${options.deep ? ' (Deep Mode)' : ''}...`));

        const limit = parseInt(options.limit);
        const commits = await github.monitorRepo(owner, repo);

        for (const commit of commits.slice(0, limit)) {
            let block: any;

            if (options.deep && ai) {
                process.stdout.write(chalk.gray(` Analyzing commit ${commit.sha.substring(0, 7)}... `));
                try {
                    const diff = await github.getCommitDiff(owner, repo, commit.sha);
                    const analysis = await ai.analyzeCommit(commit.message, diff);

                    if (analysis.isWorthRecording) {
                        const typeLabel = (analysis.type || 'insight').toUpperCase();
                        process.stdout.write(chalk.green(`${typeLabel} FOUND\n`));
                        block = {
                            id: uuidv4(),
                            type: analysis.type || 'bugfix',
                            projectName: `${owner}/${repo}`,
                            errorMessage: analysis.title || analysis.errorMessage || 'Untitled Insight',
                            rootCause: analysis.problemContext || analysis.rootCause || 'N/A',
                            mentalModel: analysis.mentalModel || 'General Engineering Principle',
                            fixDescription: analysis.implementationDetails || analysis.fixDescription || 'See commit diff',
                            beforeCodeSnippet: `SHA: ${commit.sha}`,
                            afterCodeSnippet: `Author: ${commit.author || 'unknown'}`,
                            filePaths: [`https://github.com/${owner}/${repo}/commit/${commit.sha}`],
                            tags: [...(analysis.tags || []), 'github-deep', analysis.type],
                            frameworkContext: 'git',
                            createdAt: Date.now(),
                            confidence: analysis.confidence || 80,
                            timeSavedMinutes: 15,
                            usageCount: 0,
                            successCount: 0
                        };
                    } else {
                        process.stdout.write(chalk.dim('Skipped\n'));
                        continue;
                    }
                } catch (e) {
                    process.stdout.write(chalk.red('Extraction error\n'));
                    continue;
                }
            } else {
                block = {
                    id: uuidv4(),
                    type: 'bugfix',
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

            if (block) await storage.saveFix(block);
        }

        console.log(chalk.green(`✓ Operation complete for ${owner}/${repo}`));
    } catch (error: any) {
        console.error(chalk.red(`[ERROR] Failed to fetch GitHub data for ${owner}/${repo}:`), error.message);
    }
}

program
    .command('github <owner> <repo>')
    .description('Learn from a GitHub repository')
    .option('-t, --token <token>', 'GitHub token (optional, for private repos)')
    .option('-d, --deep', 'Perform deep AI analysis of commit diffs', false)
    .option('-l, --limit <number>', 'Number of commits to analyze', '10')
    .action(async (owner: string, repo: string, options: any) => {
        await learnFromRepo(owner, repo, options);
    });

program
    .command('learn')
    .description('Bulk learn from all your GitHub repositories')
    .option('-t, --token <token>', 'GitHub token')
    .option('-l, --limit <number>', 'Commits per repo', '5')
    .action(async (options: { token?: string, limit: string }) => {
        try {
            const token = options.token || process.env.GITHUB_TOKEN || config.get('githubToken') as string;
            if (!token) {
                console.log(chalk.red('[ERROR] GitHub token not found. Set it with "devbrain config set github-token <token>" or use env GITHUB_TOKEN.'));
                return;
            }

            const github = new GitHubService(token);
            console.log(chalk.blue('[DevBrain] Fetching your repositories...'));
            const repos = await github.listUserRepos();

            console.log(chalk.gray(`Found ${repos.length} repositories. Starting bulk learning (Deep Mode enabled).`));

            for (const repo of repos) {
                console.log(chalk.cyan(`\nProcessing ${repo.fullName}...`));
                await learnFromRepo(repo.owner, repo.name, { deep: true, limit: options.limit, token });
            }
            console.log(chalk.green('\n✓ Bulk learning complete!'));
        } catch (error: any) {
            console.error(chalk.red(`[ERROR] Bulk learn failed:`), error.message);
        }
    });

program
    .command('activate')
    .description('Instantly activate DevBrain for this project')
    .option('-l, --limit <number>', 'Number of commits to analyze for history discovery', '10')
    .action(async (options: { limit: string }) => {
        const targetPath = process.cwd();
        console.log(chalk.blue(`[DevBrain] Activating in: ${targetPath}`));

        // 1. Add to monitored projects
        const projects = config.get('projects') as string[];
        if (!projects.includes(targetPath)) {
            config.set('projects', [...projects, targetPath]);
            console.log(chalk.green(`✓ Project added to monitoring list.`));
        } else {
            console.log(chalk.yellow(`! Project already in monitoring list.`));
        }

        // 2. Detect Git Remote
        try {
            const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
            // Parse owner/repo from URL
            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
            if (match) {
                const [, owner, repo] = match;
                console.log(chalk.cyan(`[DevBrain] GitHub detected: ${owner}/${repo}`));

                // 3. Trigger initial Discovery
                console.log(chalk.gray(`Starting initial history discovery...`));
                await learnFromRepo(owner, repo, { deep: true, limit: options.limit });
            } else {
                console.log(chalk.yellow('! Found remote URL but could not parse GitHub owner/repo.'));
            }
        } catch (e) {
            console.log(chalk.yellow('! No GitHub remote found. DevBrain will only monitor local changes.'));
        }

        console.log(chalk.gray('\nHint: Ensure "devbrain daemon" is running to capture active development.'));
    });

const maint = program.command('maint').description('System maintenance utilities');

maint
    .command('dedupe')
    .description('Clear redundant knowledge blocks from the database')
    .action(async () => {
        try {
            console.log(chalk.blue('[DevBrain Maintenance] Scanning for duplicates...'));
            await storage.clearDuplicates();
            console.log(chalk.green('✓ Database de-duplicated. Redundant blocks removed.'));
        } catch (error) {
            console.error(chalk.red('[ERROR] Maintenance failed:'), error);
        }
    });

maint
    .command('upgrade')
    .description('Re-analyze generic insights using AI for higher fidelity')
    .action(async () => {
        const apiKey = process.env.GEMINI_API_KEY || (config as any).get('geminiKey');
        if (!apiKey) {
            console.log(chalk.red('[ERROR] Gemini API Key not found. Set it with "devbrain config set gemini-key <key>".'));
            return;
        }

        const ai = new AiService(apiKey);
        try {
            console.log(chalk.blue('[DevBrain Maintenance] Identifying generic blocks...'));
            const targets = await storage.getGenericFixes();

            if (targets.length === 0) {
                console.log(chalk.green('✓ All existing insights are already high-fidelity or non-generic.'));
                return;
            }

            console.log(chalk.yellow(`[UPGRADE] Found ${targets.length} blocks needing re-analysis.`));

            for (let i = 0; i < targets.length; i++) {
                const fix = targets[i];
                const filePath = fix.filePaths[0]; // Primary file

                if (!filePath || !require('fs').existsSync(filePath)) {
                    console.log(chalk.gray(`  [SKIPPING] ${i + 1}/${targets.length} - File not found: ${filePath}`));
                    continue;
                }

                try {
                    console.log(chalk.cyan(`  [UPGRADING] ${i + 1}/${targets.length} - ${path.basename(filePath)}...`));
                    const content = require('fs').readFileSync(filePath, 'utf-8');
                    const aiData = await ai.analyzeCodeQuality(path.basename(filePath), content);

                    if (aiData.isSignificant) {
                        fix.errorMessage = aiData.title;
                        fix.rootCause = aiData.rationale;
                        fix.mentalModel = aiData.principle;
                        fix.fixDescription = aiData.description;
                        fix.tags = [...new Set([...fix.tags, ...aiData.tags])];
                        fix.confidence = aiData.confidence;

                        await storage.saveFix(fix);
                        console.log(chalk.green(`  ✓ Hydrated: ${aiData.title}`));
                    } else {
                        console.log(chalk.gray(`  - AI determined no significant change for this block.`));
                    }
                } catch (e) {
                    console.error(chalk.red(`  [ERROR] Failed to upgrade ${filePath}:`), (e as any).message);
                }
            }

            console.log(chalk.green('\n✓ Maintenance complete. Data upgraded to High-Fidelity.'));
        } catch (error) {
            console.error(chalk.red('[ERROR] Maintenance failed:'), error);
        }
    });

maint
    .command('crawl')
    .description('Scan the entire project for deep engineering wisdom')
    .option('--path <path>', 'Path to scan', '.')
    .action(async (options) => {
        const apiKey = process.env.GEMINI_API_KEY || (config as any).get('geminiKey');
        if (!apiKey) {
            console.log(chalk.red('[ERROR] AI Key missing.'));
            return;
        }

        const ai = new AiService(apiKey);
        const scanPath = path.resolve(options.path);

        console.log(chalk.blue(`[DevBrain Crawler] Scanning project: ${scanPath}`));
        console.log(chalk.gray('  This might take a while depending on project size...'));

        const getFiles = (dir: string): string[] => {
            const files: string[] = [];
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory()) {
                    if (['node_modules', 'dist', '.git', 'build', '.next', 'bin', 'obj'].includes(item.name)) continue;
                    files.push(...getFiles(path.join(dir, item.name)));
                } else {
                    const ext = path.extname(item.name);
                    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cs'].includes(ext)) {
                        files.push(path.join(dir, item.name));
                    }
                }
            }
            return files;
        };

        try {
            const allFiles = getFiles(scanPath);
            console.log(chalk.yellow(`[CRAWL] Found ${allFiles.length} code files. Starting deep extraction...`));

            for (let i = 0; i < allFiles.length; i++) {
                const filePath = allFiles[i];
                const relPath = path.relative(scanPath, filePath);

                try {
                    console.log(chalk.cyan(`  (${i + 1}/${allFiles.length}) Extracting: ${relPath}...`));
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const contentHash = require('crypto').createHash('md5').update(content).digest('hex');

                    const aiData = await ai.analyzeCodeQuality(path.basename(filePath), content);

                    if (aiData.isSignificant) {
                        const fix: any = {
                            id: uuidv4(),
                            type: aiData.type || 'pattern',
                            projectName: path.basename(scanPath),
                            errorMessage: aiData.title,
                            rootCause: aiData.rationale,
                            mentalModel: aiData.principle,
                            fixDescription: aiData.description,
                            filePaths: [filePath],
                            tags: aiData.tags || [],
                            frameworkContext: path.extname(filePath).slice(1),
                            createdAt: Date.now(),
                            confidence: aiData.confidence || 80,
                            timeSavedMinutes: 15,
                            usageCount: 1,
                            successCount: 1,
                            contentHash
                        };

                        await storage.saveFix(fix);
                        console.log(chalk.green(`    ✓ Captured: ${aiData.title}`));
                    }
                } catch (e) {
                    console.warn(chalk.gray(`    ! Skipped: ${(e as any).message}`));
                }
            }
            console.log(chalk.green('\n✓ Project Crawl Complete. Your local knowledge base is now populated.'));
        } catch (error) {
            console.error(chalk.red('[ERROR] Crawl failed:'), error);
        }
    });

maint
    .command('ingest')
    .description('Import manual knowledge from dev_bible/bible.jsonl')
    .action(async () => {
        const biblePath = path.join(process.cwd(), 'dev_bible', 'bible.jsonl');
        if (!fs.existsSync(biblePath)) {
            console.log(chalk.red(`[ERROR] Bible file not found at: ${biblePath}`));
            return;
        }

        try {
            console.log(chalk.blue('[DevBrain Maintenance] Ingesting manual wisdom from Bible...'));
            const content = fs.readFileSync(biblePath, 'utf-8');
            const lines = content.split('\n').filter((l: string) => l.trim());
            let count = 0;

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line.trim());
                    const fix: any = {
                        id: entry.id || `manual_${Date.now()}_${count}`,
                        projectName: 'DevBible',
                        tags: entry.tags || [],
                        createdAt: Date.now(),
                        usageCount: 1,
                        successCount: 1,
                        timeSavedMinutes: 10,
                        filePaths: [],
                        frameworkContext: 'Manual'
                    };

                    const entryType = entry.type?.toUpperCase();
                    switch (entryType) {
                        case 'PRINCIPLE':
                            fix.type = 'principle';
                            fix.errorMessage = `[PRINCIPLE] ${entry.id}`;
                            fix.fixDescription = entry.text;
                            break;
                        case 'PATTERN':
                            fix.type = 'pattern';
                            fix.errorMessage = entry.name;
                            fix.rootCause = entry.when;
                            fix.fixDescription = Array.isArray(entry.steps) ? entry.steps.join('\n') : entry.steps;
                            break;
                        case 'MISTAKE':
                            fix.type = 'bugfix';
                            fix.errorMessage = entry.symptom;
                            fix.rootCause = entry.root_cause;
                            fix.fixDescription = Array.isArray(entry.fix_steps) ? entry.fix_steps.join('\n') : entry.fix_steps;
                            break;
                        case 'RUNBOOK':
                            fix.type = 'runbook';
                            fix.errorMessage = entry.title;
                            fix.fixDescription = Array.isArray(entry.steps) ? entry.steps.join('\n') : entry.steps;
                            break;
                        case 'DECISION':
                            fix.type = 'decision';
                            fix.errorMessage = entry.question;
                            fix.rootCause = `Outcome: ${entry.decision}`;
                            fix.fixDescription = `Reason: ${entry.reason}`;
                            break;
                        default:
                            continue;
                    }

                    await storage.saveFix(fix);
                    count++;
                } catch (e) {
                    console.warn(chalk.yellow(`  [SKIP] Error parsing line: ${(e as any).message}`));
                }
            }

            console.log(chalk.green(`✓ Successfully ingested ${count} wisdom blocks from DevBible.`));
        } catch (error) {
            console.error(chalk.red('[ERROR] Ingestion failed:'), error);
        }
    });

program.parse(process.argv);
