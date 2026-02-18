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
const uuid_1 = require("uuid");
const conf_1 = __importDefault(require("conf"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const config = new conf_1.default({
    projectName: 'devbrain',
    defaults: {
        projects: []
    }
});
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
    .option('-p, --path <path>', 'Path to watch', '')
    .action((options) => {
    const paths = options.path ? [options.path] : config.get('projects');
    if (paths.length === 0) {
        console.log(chalk_1.default.red('[ERROR] No projects to monitor. Add one with "devbrain monitor add <path>"'));
        return;
    }
    (0, daemon_js_1.startDaemon)(paths);
});
const monitor = program.command('monitor').description('Manage monitored projects');
monitor
    .command('add [path]')
    .description('Add a project to monitor')
    .action((p) => {
    const targetPath = path_1.default.resolve(p || process.cwd());
    const projects = config.get('projects');
    if (!projects.includes(targetPath)) {
        config.set('projects', [...projects, targetPath]);
        console.log(chalk_1.default.green(`✓ Now monitoring: ${targetPath}`));
    }
    else {
        console.log(chalk_1.default.yellow(`! Already monitoring: ${targetPath}`));
    }
});
monitor
    .command('remove [path]')
    .description('Stop monitoring a project')
    .action((p) => {
    const targetPath = path_1.default.resolve(p || process.cwd());
    const projects = config.get('projects');
    const updated = projects.filter(proj => proj !== targetPath);
    config.set('projects', updated);
    console.log(chalk_1.default.green(`✓ Stopped monitoring: ${targetPath}`));
});
monitor
    .command('list')
    .description('List all monitored projects')
    .action(() => {
    const projects = config.get('projects');
    if (projects.length === 0) {
        console.log(chalk_1.default.yellow('No projects currently monitored.'));
        return;
    }
    console.log(chalk_1.default.blue('\nMonitored Projects:'));
    projects.forEach(p => console.log(` - ${p}`));
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
async function learnFromRepo(owner, repo, options) {
    try {
        const token = options.token || process.env.GITHUB_TOKEN || '';
        const aiApiKey = process.env.GEMINI_API_KEY;
        if (options.deep && !aiApiKey) {
            console.log(chalk_1.default.red('[ERROR] GEMINI_API_KEY is required for deep analysis.'));
            return;
        }
        const github = new core_1.GitHubService(token);
        const ai = aiApiKey ? new core_1.AiService(aiApiKey) : null;
        console.log(chalk_1.default.blue(`[DevBrain] Analyzing ${owner}/${repo}${options.deep ? ' (Deep Mode)' : ''}...`));
        const limit = parseInt(options.limit);
        const commits = await github.monitorRepo(owner, repo);
        for (const commit of commits.slice(0, limit)) {
            let block;
            if (options.deep && ai) {
                process.stdout.write(chalk_1.default.gray(` Analyzing commit ${commit.sha.substring(0, 7)}... `));
                try {
                    const diff = await github.getCommitDiff(owner, repo, commit.sha);
                    const analysis = await ai.analyzeCommit(commit.message, diff);
                    if (analysis.isWorthRecording) {
                        const typeLabel = (analysis.type || 'insight').toUpperCase();
                        process.stdout.write(chalk_1.default.green(`${typeLabel} FOUND\n`));
                        block = {
                            id: (0, uuid_1.v4)(),
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
                    }
                    else {
                        process.stdout.write(chalk_1.default.dim('Skipped\n'));
                        continue;
                    }
                }
                catch (e) {
                    process.stdout.write(chalk_1.default.red('Extraction error\n'));
                    continue;
                }
            }
            else {
                block = {
                    id: (0, uuid_1.v4)(),
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
            if (block)
                await core_1.storage.saveFix(block);
        }
        console.log(chalk_1.default.green(`✓ Operation complete for ${owner}/${repo}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`[ERROR] Failed to fetch GitHub data for ${owner}/${repo}:`), error.message);
    }
}
program
    .command('github <owner> <repo>')
    .description('Learn from a GitHub repository')
    .option('-t, --token <token>', 'GitHub token (optional, for private repos)')
    .option('-d, --deep', 'Perform deep AI analysis of commit diffs', false)
    .option('-l, --limit <number>', 'Number of commits to analyze', '10')
    .action(async (owner, repo, options) => {
    await learnFromRepo(owner, repo, options);
});
program
    .command('learn')
    .description('Bulk learn from all your GitHub repositories')
    .option('-t, --token <token>', 'GitHub token')
    .option('-l, --limit <number>', 'Commits per repo', '5')
    .action(async (options) => {
    try {
        const token = options.token || process.env.GITHUB_TOKEN;
        if (!token) {
            console.log(chalk_1.default.red('[ERROR] GitHub token required. Set GITHUB_TOKEN or use --token.'));
            return;
        }
        const github = new core_1.GitHubService(token);
        console.log(chalk_1.default.blue('[DevBrain] Fetching your repositories...'));
        const repos = await github.listUserRepos();
        console.log(chalk_1.default.gray(`Found ${repos.length} repositories. Starting bulk learning (Deep Mode enabled).`));
        for (const repo of repos) {
            console.log(chalk_1.default.cyan(`\nProcessing ${repo.fullName}...`));
            await learnFromRepo(repo.owner, repo.name, { deep: true, limit: options.limit, token });
        }
        console.log(chalk_1.default.green('\n✓ Bulk learning complete!'));
    }
    catch (error) {
        console.error(chalk_1.default.red(`[ERROR] Bulk learn failed:`), error.message);
    }
});
program
    .command('activate')
    .description('Instantly activate DevBrain for this project')
    .option('-l, --limit <number>', 'Number of commits to analyze for history discovery', '10')
    .action(async (options) => {
    const targetPath = process.cwd();
    console.log(chalk_1.default.blue(`[DevBrain] Activating in: ${targetPath}`));
    // 1. Add to monitored projects
    const projects = config.get('projects');
    if (!projects.includes(targetPath)) {
        config.set('projects', [...projects, targetPath]);
        console.log(chalk_1.default.green(`✓ Project added to monitoring list.`));
    }
    else {
        console.log(chalk_1.default.yellow(`! Project already in monitoring list.`));
    }
    // 2. Detect Git Remote
    try {
        const remoteUrl = (0, child_process_1.execSync)('git remote get-url origin', { encoding: 'utf8' }).trim();
        // Parse owner/repo from URL
        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/);
        if (match) {
            const [, owner, repo] = match;
            console.log(chalk_1.default.cyan(`[DevBrain] GitHub detected: ${owner}/${repo}`));
            // 3. Trigger initial Discovery
            console.log(chalk_1.default.gray(`Starting initial history discovery...`));
            await learnFromRepo(owner, repo, { deep: true, limit: options.limit });
        }
        else {
            console.log(chalk_1.default.yellow('! Found remote URL but could not parse GitHub owner/repo.'));
        }
    }
    catch (e) {
        console.log(chalk_1.default.yellow('! No GitHub remote found. DevBrain will only monitor local changes.'));
    }
    console.log(chalk_1.default.gray('\nHint: Ensure "devbrain daemon" is running to capture active development.'));
});
program.parse();
