import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { storage, AiService, Fix } from '@devbrain/core';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisResult {
    fileType: string;
    complexity: 'low' | 'medium' | 'high';
    patterns: string[];
    potentialIssues: string[];
    insights: string;
}

async function analyzeCodeFile(filePath: string): Promise<AnalysisResult> {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Basic analysis
        const patterns: string[] = [];
        const potentialIssues: string[] = [];

        // Detect patterns
        if (content.includes('try-catch')) patterns.push('error-handling');
        if (content.includes('async') && content.includes('await')) patterns.push('async-await');
        if (content.includes('console.log') && content.includes('DEBUG') === false) patterns.push('logging');
        if (content.match(/\.map\(|\.filter\(|\.reduce\(/)) patterns.push('functional-programming');
        if (content.includes('interface') || content.includes('type ')) patterns.push('typescript');

        // Detect potential issues
        if (content.includes('any')) potentialIssues.push('loose-typing');
        if (content.match(/console\.error|throw new Error/)) potentialIssues.push('error-handling');
        if (content.length > 5000) potentialIssues.push('file-too-large');
        if (content.match(/while\s*\(/)) potentialIssues.push('potential-infinite-loop');
        if (content.includes('==') && !content.includes('===')) potentialIssues.push('loose-comparison');

        const complexity = lines.length > 500 ? 'high' : lines.length > 200 ? 'medium' : 'low';
        const fileType = path.extname(filePath).slice(1) || 'unknown';

        return {
            fileType,
            complexity,
            patterns: [...new Set(patterns)],
            potentialIssues: [...new Set(potentialIssues)],
            insights: `Analyzed ${lines.length} lines of ${fileType} code`
        };
    } catch (error) {
        console.error(chalk.red(`[ERROR] Failed to analyze ${filePath}:`), error);
        return {
            fileType: path.extname(filePath).slice(1) || 'unknown',
            complexity: 'low',
            patterns: [],
            potentialIssues: ['analysis-failed'],
            insights: 'Analysis failed'
        };
    }
}

async function detectAntiPatterns(filePath: string, content: string, projectName: string) {
    const antiPatterns: Array<{ name: string, symptoms: string, betterApproach: string }> = [];

    // Callback Hell detection - nested callbacks
    const callbackNestingDepth = (content.match(/\.then\(/g) || []).length + (content.match(/\.catch\(/g) || []).length;
    if (callbackNestingDepth > 3) {
        antiPatterns.push({
            name: 'Callback Hell',
            symptoms: `${callbackNestingDepth} chained promise callbacks detected. Hard to read and maintain.`,
            betterApproach: 'Use async/await syntax instead of .then().catch() chains for cleaner, more readable code.'
        });
    }

    // Overly Complex Function - too many lines in single function
    const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*(?=\(|async)/g) || [];
    const lines = content.split('\n');
    if (lines.length > 300) {
        antiPatterns.push({
            name: 'Overly Complex File',
            symptoms: `${lines.length} lines in single file. Difficult to maintain and test.`,
            betterApproach: 'Split file into smaller, focused modules. Aim for 100-200 lines per file.'
        });
    }

    // Missing Error Handling
    const asyncAwaitCount = (content.match(/await\s+/g) || []).length;
    const tryCatchCount = (content.match(/try\s*\{/g) || []).length;
    if (asyncAwaitCount > 3 && tryCatchCount === 0) {
        antiPatterns.push({
            name: 'Missing Error Handling',
            symptoms: `${asyncAwaitCount} await statements but no try-catch blocks. Unhandled promise rejections likely.`,
            betterApproach: 'Wrap async operations in try-catch blocks to handle errors gracefully.'
        });
    }

    // Magic Numbers - hardcoded numeric values
    const magicNumbers = content.match(/[^a-zA-Z_](\d{3,})[^a-zA-Z_]/g) || [];
    if (magicNumbers.length > 5) {
        antiPatterns.push({
            name: 'Magic Numbers',
            symptoms: `${magicNumbers.length} hardcoded numbers without explanation. Makes code hard to understand.`,
            betterApproach: 'Extract magic numbers to named constants with clear meanings.'
        });
    }

    // Deep Nesting - multiple levels of indentation
    const deepNesting = content.match(/^\s{16,}/gm) || [];
    if (deepNesting.length > 5) {
        antiPatterns.push({
            name: 'Deeply Nested Code',
            symptoms: `${deepNesting.length} deeply nested blocks detected (>4 levels). Reduces readability.`,
            betterApproach: 'Extract nested logic into separate functions or use early returns to reduce nesting.'
        });
    }

    // Silent Failures - try-catch that doesn't re-throw
    const silentCatches = (content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length;
    if (silentCatches > 0) {
        antiPatterns.push({
            name: 'Silent Failures',
            symptoms: `${silentCatches} empty catch block(s). Errors are being silently ignored.`,
            betterApproach: 'Log errors, handle them appropriately, or re-throw if they cannot be handled.'
        });
    }

    // Save detected anti-patterns to database
    for (const pattern of antiPatterns) {
        try {
            const antiPatternRecord = {
                id: uuidv4(),
                patternName: pattern.name,
                symptoms: pattern.symptoms,
                betterApproach: pattern.betterApproach,
                projectsAffected: [filePath],
                createdAt: Date.now()
            };

            await storage.saveAntiPattern(antiPatternRecord);
            console.log(chalk.red(`  ⚠️  Anti-Pattern: ${pattern.name}`));
        } catch (error) {
            console.error(chalk.red(`[ERROR] Failed to save anti-pattern:`), error);
        }
    }
}

async function storeAnalysisAsKnowledge(filePath: string, analysis: AnalysisResult, projectName: string) {
    try {
        // Save even if minimal issues, just to track file complexity
        const fix: Fix = {
            id: uuidv4(),
            type: 'pattern',
            projectName,
            errorMessage: `Pattern detected: ${analysis.potentialIssues.join(', ') || analysis.patterns.join(', ') || 'file-complexity'}`,
            rootCause: `File: ${path.basename(filePath)} (${analysis.fileType})`,
            mentalModel: `Complexity: ${analysis.complexity}, Patterns: ${analysis.patterns.join(', ')}`,
            fixDescription: analysis.insights,
            beforeCodeSnippet: filePath,
            afterCodeSnippet: `Review recommended for: ${analysis.potentialIssues.join(', ') || 'general-review'}`,
            filePaths: [filePath],
            tags: [...analysis.patterns, ...analysis.potentialIssues],
            frameworkContext: analysis.fileType,
            createdAt: Date.now(),
            confidence: analysis.potentialIssues.length > 0 ? 85 : (analysis.patterns.length > 0 ? 70 : 50),
            timeSavedMinutes: 5,
            usageCount: 0,
            successCount: 0
        };

        await storage.saveFix(fix);
        console.log(chalk.green(`[SAVED] ${path.basename(filePath)} - Tags: ${fix.tags.join(', ')}`));
    } catch (error) {
        console.error(chalk.red(`[ERROR] Failed to store analysis:`), error);
    }
}

const fileAnalysisQueue = new Map<string, NodeJS.Timeout>();
const ANALYSIS_DEBOUNCE_MS = 2000; // Wait 2s after last change before analyzing

export function startDaemon(watchPath: string | string[]) {
    const paths = Array.isArray(watchPath) ? watchPath : [watchPath];
    const resolvedPaths = paths.map(p => path.resolve(p));

    console.log(chalk.blue(`[DevBrain Daemon] Starting monitoring...`));
    resolvedPaths.forEach(p => {
        console.log(chalk.gray(` Watching: ${p}`));
    });
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    const watcher = chokidar.watch(resolvedPaths, {
        ignored: [
            /(^|[\/\\])\./,  // ignore dotfiles
            /node_modules/,   // ignore node_modules
            /dist/,           // ignore build output
            /\.git/           // ignore git
        ],
        persistent: true,
        awaitWriteFinish: true
    });

    watcher.on('change', (filePath) => {
        const ext = path.extname(filePath);
        const isCodeFile = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go'].includes(ext);

        if (!isCodeFile) return;

        // Find which project this file belongs to
        const projectPath = resolvedPaths.find(p => filePath.startsWith(p));
        const projectName = projectPath ? path.basename(projectPath) : 'unknown';

        console.log(chalk.gray(`[FS_EVENT] ${path.relative(process.cwd(), filePath)} (${projectName})`));

        // Debounce analysis - if file keeps changing, wait until it settles
        if (fileAnalysisQueue.has(filePath)) {
            clearTimeout(fileAnalysisQueue.get(filePath));
        }

        const timeoutId = setTimeout(async () => {
            const analysis = await analyzeCodeFile(filePath);
            if (analysis.potentialIssues.length > 0 || analysis.patterns.length > 0) {
                console.log(chalk.yellow(`  📊 Issues: ${analysis.potentialIssues.join(', ')}`));
                console.log(chalk.cyan(`  🔍 Patterns: ${analysis.patterns.join(', ')}`));
                await storeAnalysisAsKnowledge(filePath, analysis, projectName);
            }
            // Detect and save anti-patterns
            const content = fs.readFileSync(filePath, 'utf-8');
            await detectAntiPatterns(filePath, content, projectName);
            fileAnalysisQueue.delete(filePath);
        }, ANALYSIS_DEBOUNCE_MS);

        fileAnalysisQueue.set(filePath, timeoutId);
    });

    watcher.on('error', (error) => {
        console.error(chalk.red('[ERROR]'), error);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(chalk.blue('\n[DevBrain] Shutting down daemon...'));
        watcher.close();
        fileAnalysisQueue.forEach(timeout => clearTimeout(timeout));
        process.exit(0);
    });

    return watcher;
}
