"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDaemon = startDaemon;
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const core_1 = require("@devbrain/core");
const chalk_1 = __importDefault(require("chalk"));
const uuid_1 = require("uuid");
const conf_1 = __importDefault(require("conf"));
const crypto_1 = __importDefault(require("crypto"));
const config = new conf_1.default({
    projectName: 'devbrain',
});
async function analyzeCodeFile(filePath) {
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        // Basic analysis
        const patterns = [];
        const potentialIssues = [];
        // Detect patterns
        if (content.includes('try-catch'))
            patterns.push('error-handling');
        if (content.includes('async') && content.includes('await'))
            patterns.push('async-await');
        if (content.includes('console.log') && content.includes('DEBUG') === false)
            patterns.push('logging');
        if (content.match(/\.map\(|\.filter\(|\.reduce\(/))
            patterns.push('functional-programming');
        if (content.includes('interface') || content.includes('type '))
            patterns.push('typescript');
        // Detect potential issues
        if (content.includes('any'))
            potentialIssues.push('loose-typing');
        if (content.match(/console\.error|throw new Error/))
            potentialIssues.push('error-handling');
        if (content.length > 5000)
            potentialIssues.push('file-too-large');
        if (content.match(/while\s*\(/))
            potentialIssues.push('potential-infinite-loop');
        if (content.includes('==') && !content.includes('==='))
            potentialIssues.push('loose-comparison');
        const complexity = lines.length > 500 ? 'high' : lines.length > 200 ? 'medium' : 'low';
        const fileType = path_1.default.extname(filePath).slice(1) || 'unknown';
        return {
            fileType,
            complexity,
            patterns: [...new Set(patterns)],
            potentialIssues: [...new Set(potentialIssues)],
            insights: `Analyzed ${lines.length} lines of ${fileType} code`
        };
    }
    catch (error) {
        console.error(chalk_1.default.red(`[ERROR] Failed to analyze ${filePath}:`), error);
        return {
            fileType: path_1.default.extname(filePath).slice(1) || 'unknown',
            complexity: 'low',
            patterns: [],
            potentialIssues: ['analysis-failed'],
            insights: 'Analysis failed'
        };
    }
}
async function detectAntiPatterns(filePath, content, projectName) {
    const antiPatterns = [];
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
        const sessionKey = `${filePath}:${pattern.name}`;
        if (sessionAntiPatterns.has(sessionKey))
            continue;
        try {
            const antiPatternRecord = {
                id: (0, uuid_1.v4)(),
                patternName: pattern.name,
                symptoms: pattern.symptoms,
                betterApproach: pattern.betterApproach,
                projectsAffected: [filePath],
                createdAt: Date.now()
            };
            await core_1.storage.saveAntiPattern(antiPatternRecord);
            updateAntiPatternCache(sessionKey);
            console.log(chalk_1.default.red(`  ⚠️  Anti-Pattern: ${pattern.name}`));
        }
        catch (error) {
            console.error(chalk_1.default.red(`[ERROR] Failed to save anti-pattern:`), error);
        }
    }
}
async function storeAnalysisAsKnowledge(filePath, analysis, projectName, aiData, contentHash) {
    try {
        const fix = {
            id: (0, uuid_1.v4)(),
            type: 'pattern',
            projectName,
            errorMessage: aiData?.hasWisdom ? aiData.title : `Significant Pattern: ${analysis.patterns.join(', ') || 'Code Structure'}`,
            rootCause: aiData?.hasWisdom ? aiData.rationale : `Contextual analysis of ${path_1.default.basename(filePath)} (${analysis.fileType}).`,
            mentalModel: aiData?.hasWisdom ? aiData.principle : `Engineering Principle: ${analysis.patterns[0] || 'Clean Code'}`,
            fixDescription: aiData?.hasWisdom ? aiData.description : `Verified pattern in ${analysis.fileType} development.`,
            beforeCodeSnippet: filePath,
            afterCodeSnippet: aiData?.hasWisdom ? `Implementation Pattern: ${aiData.title}` : `Review recommended for: ${analysis.potentialIssues.join(', ') || 'general-review'}`,
            filePaths: [filePath],
            tags: aiData?.hasWisdom ? [...new Set([...analysis.patterns, ...analysis.potentialIssues, ...aiData.tags])] : [...analysis.patterns, ...analysis.potentialIssues],
            frameworkContext: analysis.fileType,
            createdAt: Date.now(),
            confidence: aiData?.hasWisdom ? aiData.confidence : (analysis.potentialIssues.length > 0 ? 85 : (analysis.patterns.length > 0 ? 70 : 50)),
            timeSavedMinutes: 5,
            usageCount: 0,
            successCount: 0,
            contentHash
        };
        await core_1.storage.saveFix(fix);
    }
    catch (error) {
        console.error(chalk_1.default.red(`[ERROR] Failed to store analysis:`), error);
    }
}
const fileAnalysisQueue = new Map();
const ANALYSIS_DEBOUNCE_MS = 2000; // Wait 2s after last change before analyzing
// Stateful de-duplication (Persistent via Conf)
const lastAnalysisResults = config.get('analysisCache') || {};
const sessionAntiPatterns = new Set(config.get('antiPatternCache') || []);
const lastContentHashes = new Map(); // In-memory for current run
function updateCache(filePath, resultString) {
    lastAnalysisResults[filePath] = resultString;
    config.set('analysisCache', lastAnalysisResults);
}
function updateAntiPatternCache(sessionKey) {
    sessionAntiPatterns.add(sessionKey);
    config.set('antiPatternCache', Array.from(sessionAntiPatterns));
}
function startDaemon(watchPath, kernelMode = false) {
    const paths = Array.isArray(watchPath) ? watchPath : [watchPath];
    const resolvedPaths = paths.map(p => path_1.default.resolve(p));
    const aiApiKey = process.env.GEMINI_API_KEY || config.get('geminiKey');
    const aiService = aiApiKey ? new core_1.AiService(aiApiKey) : null;
    if (kernelMode) {
        console.log(chalk_1.default.cyan('\nDEVBRAIN_KERNEL::PTY_SESSION_V5_STABLE'));
        console.log(chalk_1.default.gray(`PTY_EMULATOR: ON // NEURAL_INTERCEPT: ACTIVE`));
        // Neural Interceptor check
        if (aiApiKey) {
            console.log(chalk_1.default.green('DAEMON_INIT: Neural link established. Intercepting streams...'));
        }
        else {
            console.log(chalk_1.default.red('[KERNEL ERROR] Link to neural processor severed.'));
            console.log(chalk_1.default.yellow('INTERCEPTOR::ANOMALY_FOUND_IN_STREAM - AI features disabled.'));
        }
    }
    else {
        console.log(chalk_1.default.blue(`[DevBrain Daemon] Starting monitoring...`));
        resolvedPaths.forEach(p => {
            console.log(chalk_1.default.gray(` Watching: ${p}`));
        });
        console.log(chalk_1.default.dim('Press Ctrl+C to stop\n'));
    }
    const watcher = chokidar_1.default.watch(resolvedPaths, {
        ignored: [
            /(^|[\/\\])\./, // ignore dotfiles
            /node_modules/, // ignore node_modules
            /dist/, // ignore build output
            /\.git/ // ignore git
        ],
        persistent: true,
        awaitWriteFinish: true
    });
    watcher.on('change', (filePath) => {
        const ext = path_1.default.extname(filePath);
        const isCodeFile = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go'].includes(ext);
        if (!isCodeFile)
            return;
        // Find which project this file belongs to
        const projectPath = resolvedPaths.find(p => filePath.startsWith(p));
        const projectName = projectPath ? path_1.default.basename(projectPath) : 'unknown';
        // Debounce analysis - if file keeps changing, wait until it settles
        if (fileAnalysisQueue.has(filePath)) {
            clearTimeout(fileAnalysisQueue.get(filePath));
        }
        const timeoutId = setTimeout(async () => {
            const content = fs_1.default.readFileSync(filePath, 'utf-8');
            const contentHash = crypto_1.default.createHash('md5').update(content).digest('hex');
            // Skip if content is exactly the same as last processed in this run
            if (lastContentHashes.get(filePath) === contentHash) {
                fileAnalysisQueue.delete(filePath);
                return;
            }
            lastContentHashes.set(filePath, contentHash);
            const analysis = await analyzeCodeFile(filePath);
            const currentResultString = JSON.stringify({
                issues: analysis.potentialIssues.sort(),
                patterns: analysis.patterns.sort()
            });
            const lastResultString = lastAnalysisResults[filePath];
            if (currentResultString !== lastResultString) {
                console.log(chalk_1.default.gray(`[FS_EVENT] ${path_1.default.relative(process.cwd(), filePath)} (${projectName})`));
                let aiData = null;
                if (aiService) {
                    try {
                        aiData = await aiService.analyzeCodeQuality(path_1.default.basename(filePath), content);
                    }
                    catch (e) {
                        console.warn(chalk_1.default.yellow(`[AI_ERROR] Failed to obtain deep insight: ${e}`));
                    }
                }
                if (analysis.potentialIssues.length > 0 || analysis.patterns.length > 0 || aiData?.hasWisdom) {
                    if (kernelMode) {
                        if (aiData?.hasWisdom) {
                            console.log(chalk_1.default.magenta(`[STORY_CAPTURED] ${aiData.title.toUpperCase()}`));
                            console.log(chalk_1.default.gray(`  WHY: ${aiData.rationale}`));
                        }
                        if (analysis.potentialIssues.length > 0) {
                            console.log(chalk_1.default.red(`  [ANOMALY] ${analysis.potentialIssues.join(', ')}`));
                        }
                    }
                    else {
                        if (aiData?.hasWisdom) {
                            console.log(chalk_1.default.cyan(`\n✨ [WISDOM] ${aiData.title}`));
                            console.log(chalk_1.default.gray(`   Rationale: ${aiData.rationale}`));
                        }
                    }
                    await storeAnalysisAsKnowledge(filePath, analysis, projectName, aiData, contentHash);
                }
                updateCache(filePath, currentResultString);
            }
            // Detect and save anti-patterns
            await detectAntiPatterns(filePath, content, projectName);
            fileAnalysisQueue.delete(filePath);
        }, ANALYSIS_DEBOUNCE_MS);
        fileAnalysisQueue.set(filePath, timeoutId);
    });
    watcher.on('error', (error) => {
        console.error(chalk_1.default.red('[ERROR]'), error);
    });
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(chalk_1.default.blue('\n[DevBrain] Shutting down daemon...'));
        watcher.close();
        fileAnalysisQueue.forEach(timeout => clearTimeout(timeout));
        process.exit(0);
    });
    return watcher;
}
