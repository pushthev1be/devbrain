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
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const config = new conf_1.default({
    projectName: 'devbrain',
    defaults: {
        projects: [],
        geminiKey: '',
        githubToken: ''
    }
});
const program = new commander_1.Command();
program
    .name('devbrain')
    .description('Intelligent local developer memory')
    .version('1.0.0');
program
    .command('config <action> [key] [value]')
    .description('Manage configuration (actions: set, get, list)')
    .action((action, key, value) => {
    if (action === 'set') {
        if (key === 'gemini-key') {
            config.set('geminiKey', value);
            console.log(chalk_1.default.green('✓ Gemini API Key stored persistently.'));
        }
        else if (key === 'github-token') {
            config.set('githubToken', value);
            console.log(chalk_1.default.green('✓ GitHub Token stored persistently.'));
        }
        else {
            console.log(chalk_1.default.red('[ERROR] Invalid config key. Use "gemini-key" or "github-token".'));
        }
    }
    else if (action === 'list') {
        console.log(chalk_1.default.blue('\nConfiguration:'));
        console.log(` - gemini-key: ${config.get('geminiKey') ? '********' : 'not set'}`);
        console.log(` - github-token: ${config.get('githubToken') ? '********' : 'not set'}`);
    }
    else {
        console.log(chalk_1.default.red('[ERROR] Unknown config action. Use "set" or "list".'));
    }
});
program
    .command('run <cmd...>')
    .description('Run a command with brain monitoring')
    .action(async (cmd) => {
    const command = cmd.join(' ');
    console.log(chalk_1.default.blue(`[DevBrain] Monitoring: ${command}`));
    await (0, pty_js_1.runWithMonitoring)(command);
    process.exit(0);
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
    (0, daemon_js_1.startDaemon)(paths, false);
});
program
    .command('watch')
    .description('Start stylized "Kernel" monitoring mode')
    .option('-p, --path <path>', 'Path to watch', '')
    .action((options) => {
    const paths = options.path ? [options.path] : config.get('projects');
    if (paths.length === 0) {
        console.log(chalk_1.default.red('[ERROR] No projects to monitor. Add one with "devbrain monitor add <path>"'));
        return;
    }
    (0, daemon_js_1.startDaemon)(paths, true);
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
        const token = options.token || process.env.GITHUB_TOKEN || config.get('githubToken') || '';
        const aiApiKey = options.aiKey || process.env.GEMINI_API_KEY || config.get('geminiKey');
        if (options.deep && !aiApiKey) {
            console.log(chalk_1.default.red('[ERROR] Gemini API Key not found. Set it with "devbrain config set gemini-key <key>" or use env GEMINI_API_KEY.'));
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
        const token = options.token || process.env.GITHUB_TOKEN || config.get('githubToken');
        if (!token) {
            console.log(chalk_1.default.red('[ERROR] GitHub token not found. Set it with "devbrain config set github-token <token>" or use env GITHUB_TOKEN.'));
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
const maint = program.command('maint').description('System maintenance utilities');
maint
    .command('dedupe')
    .description('Clear redundant knowledge blocks from the database')
    .action(async () => {
    try {
        console.log(chalk_1.default.blue('[DevBrain Maintenance] Scanning for duplicates...'));
        await core_1.storage.clearDuplicates();
        console.log(chalk_1.default.green('✓ Database de-duplicated. Redundant blocks removed.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Maintenance failed:'), error);
    }
});
maint
    .command('upgrade')
    .description('Re-analyze generic insights using AI for higher fidelity')
    .action(async () => {
    const apiKey = process.env.GEMINI_API_KEY || config.get('geminiKey');
    if (!apiKey) {
        console.log(chalk_1.default.red('[ERROR] Gemini API Key not found. Set it with "devbrain config set gemini-key <key>".'));
        return;
    }
    const ai = new core_1.AiService(apiKey);
    try {
        console.log(chalk_1.default.blue('[DevBrain Maintenance] Identifying generic blocks...'));
        const targets = await core_1.storage.getGenericFixes();
        if (targets.length === 0) {
            console.log(chalk_1.default.green('✓ All existing insights are already high-fidelity or non-generic.'));
            return;
        }
        console.log(chalk_1.default.yellow(`[UPGRADE] Found ${targets.length} blocks needing re-analysis.`));
        for (let i = 0; i < targets.length; i++) {
            const fix = targets[i];
            const filePath = fix.filePaths[0]; // Primary file
            if (!filePath || !require('fs').existsSync(filePath)) {
                console.log(chalk_1.default.gray(`  [SKIPPING] ${i + 1}/${targets.length} - File not found: ${filePath}`));
                continue;
            }
            try {
                console.log(chalk_1.default.cyan(`  [UPGRADING] ${i + 1}/${targets.length} - ${path_1.default.basename(filePath)}...`));
                const content = require('fs').readFileSync(filePath, 'utf-8');
                const aiData = await ai.analyzeCodeQuality(path_1.default.basename(filePath), content);
                if (aiData.isSignificant) {
                    fix.errorMessage = aiData.title;
                    fix.rootCause = aiData.rationale;
                    fix.mentalModel = aiData.principle;
                    fix.fixDescription = aiData.description;
                    fix.tags = [...new Set([...fix.tags, ...aiData.tags])];
                    fix.confidence = aiData.confidence;
                    await core_1.storage.saveFix(fix);
                    console.log(chalk_1.default.green(`  ✓ Hydrated: ${aiData.title}`));
                }
                else {
                    console.log(chalk_1.default.gray(`  - AI determined no significant change for this block.`));
                }
            }
            catch (e) {
                console.error(chalk_1.default.red(`  [ERROR] Failed to upgrade ${filePath}:`), e.message);
            }
        }
        console.log(chalk_1.default.green('\n✓ Maintenance complete. Data upgraded to High-Fidelity.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Maintenance failed:'), error);
    }
});
maint
    .command('crawl')
    .description('Scan the entire project for deep engineering wisdom')
    .option('--path <path>', 'Path to scan', '.')
    .action(async (options) => {
    const apiKey = process.env.GEMINI_API_KEY || config.get('geminiKey');
    if (!apiKey) {
        console.log(chalk_1.default.red('[ERROR] AI Key missing.'));
        return;
    }
    const ai = new core_1.AiService(apiKey);
    const scanPath = path_1.default.resolve(options.path);
    console.log(chalk_1.default.blue(`[DevBrain Crawler] Scanning project: ${scanPath}`));
    console.log(chalk_1.default.gray('  This might take a while depending on project size...'));
    const getFiles = (dir) => {
        const files = [];
        const items = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                if (['node_modules', 'dist', '.git', 'build', '.next', 'bin', 'obj'].includes(item.name))
                    continue;
                files.push(...getFiles(path_1.default.join(dir, item.name)));
            }
            else {
                const ext = path_1.default.extname(item.name);
                if (['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cs'].includes(ext)) {
                    files.push(path_1.default.join(dir, item.name));
                }
            }
        }
        return files;
    };
    try {
        const allFiles = getFiles(scanPath);
        console.log(chalk_1.default.yellow(`[CRAWL] Found ${allFiles.length} code files. Starting deep extraction...`));
        for (let i = 0; i < allFiles.length; i++) {
            const filePath = allFiles[i];
            const relPath = path_1.default.relative(scanPath, filePath);
            try {
                console.log(chalk_1.default.cyan(`  (${i + 1}/${allFiles.length}) Extracting: ${relPath}...`));
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const contentHash = require('crypto').createHash('md5').update(content).digest('hex');
                const aiData = await ai.analyzeCodeQuality(path_1.default.basename(filePath), content);
                if (aiData.isSignificant) {
                    const fix = {
                        id: (0, uuid_1.v4)(),
                        type: aiData.type || 'pattern',
                        projectName: path_1.default.basename(scanPath),
                        errorMessage: aiData.title,
                        rootCause: aiData.rationale,
                        mentalModel: aiData.principle,
                        fixDescription: aiData.description,
                        filePaths: [filePath],
                        tags: aiData.tags || [],
                        frameworkContext: path_1.default.extname(filePath).slice(1),
                        createdAt: Date.now(),
                        confidence: aiData.confidence || 80,
                        timeSavedMinutes: 15,
                        usageCount: 1,
                        successCount: 1,
                        contentHash
                    };
                    await core_1.storage.saveFix(fix);
                    console.log(chalk_1.default.green(`    ✓ Captured: ${aiData.title}`));
                }
            }
            catch (e) {
                console.warn(chalk_1.default.gray(`    ! Skipped: ${e.message}`));
            }
        }
        console.log(chalk_1.default.green('\n✓ Project Crawl Complete. Your local knowledge base is now populated.'));
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Crawl failed:'), error);
    }
});
maint
    .command('ingest')
    .description('Import manual knowledge from dev_bible/bible.jsonl')
    .action(async () => {
    const biblePath = path_1.default.join(process.cwd(), 'dev_bible', 'bible.jsonl');
    if (!fs_1.default.existsSync(biblePath)) {
        console.log(chalk_1.default.red(`[ERROR] Bible file not found at: ${biblePath}`));
        return;
    }
    try {
        console.log(chalk_1.default.blue('[DevBrain Maintenance] Ingesting manual wisdom from Bible...'));
        const content = fs_1.default.readFileSync(biblePath, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim());
        let count = 0;
        for (const line of lines) {
            try {
                const entry = JSON.parse(line.trim());
                const fix = {
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
                await core_1.storage.saveFix(fix);
                count++;
            }
            catch (e) {
                console.warn(chalk_1.default.yellow(`  [SKIP] Error parsing line: ${e.message}`));
            }
        }
        console.log(chalk_1.default.green(`✓ Successfully ingested ${count} wisdom blocks from DevBible.`));
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Ingestion failed:'), error);
    }
});
program.parse(process.argv);
