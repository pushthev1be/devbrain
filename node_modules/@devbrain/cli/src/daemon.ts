import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { storage, AiService } from '@devbrain/core';
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

async function storeAnalysisAsKnowledge(filePath: string, analysis: AnalysisResult, projectName: string) {
    try {
        if (analysis.potentialIssues.length === 0 && analysis.patterns.length === 0) {
            return; // Nothing interesting to store
        }
        
        const fix = {
            id: uuidv4(),
            projectName,
            errorMessage: `Pattern detected: ${analysis.potentialIssues.join(', ') || 'code-review'}`,
            rootCause: `File: ${path.basename(filePath)} (${analysis.fileType})`,
            mentalModel: `Complexity: ${analysis.complexity}, Patterns: ${analysis.patterns.join(', ')}`,
            fixDescription: analysis.insights,
            beforeCodeSnippet: filePath,
            afterCodeSnippet: `Review recommended for: ${analysis.potentialIssues.join(', ')}`,
            filePaths: [filePath],
            tags: [...analysis.patterns, ...analysis.potentialIssues],
            frameworkContext: analysis.fileType,
            createdAt: Date.now(),
            confidence: analysis.potentialIssues.length > 0 ? 85 : 60,
            timeSavedMinutes: 5,
            usageCount: 0,
            successCount: 0
        };
        
        await storage.saveFix(fix);
        console.log(chalk.green(`[SAVED] Analysis for ${path.basename(filePath)}`));
    } catch (error) {
        console.error(chalk.red(`[ERROR] Failed to store analysis:`), error);
    }
}

const fileAnalysisQueue = new Map<string, NodeJS.Timeout>();
const ANALYSIS_DEBOUNCE_MS = 2000; // Wait 2s after last change before analyzing

export function startDaemon(watchPath: string) {
    const projectName = path.basename(path.resolve(watchPath));
    console.log(chalk.blue(`[DevBrain Daemon] Watching ${watchPath}`));
    console.log(chalk.gray(`Project: ${projectName}`));
    console.log(chalk.dim('Press Ctrl+C to stop\n'));

    const watcher = chokidar.watch(watchPath, {
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
        
        console.log(chalk.gray(`[FS_EVENT] ${path.relative(watchPath, filePath)}`));
        
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
