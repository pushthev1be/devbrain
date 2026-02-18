import os from 'os';
import * as pty from 'node-pty';
import { AiService, storage } from '@devbrain/core';
import chalk from 'chalk';

import path from 'path';
import crypto from 'crypto';

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let lastFailedRun: { command: string, output: string, timestamp: number } | null = null;
let capturedErrors: string[] = [];

export async function runWithMonitoring(command: string) {
    capturedErrors = [];
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env as any
    });

    let fullOutput = '';
    const aiApiKey = process.env.GEMINI_API_KEY;
    const ai = aiApiKey ? new AiService(aiApiKey) : null;

    ptyProcess.onData((data: string) => {
        process.stdout.write(data);
        fullOutput += data;
        checkForErrors(data);
    });

    ptyProcess.write(`${command}\r`);

    ptyProcess.onExit(async ({ exitCode }) => {
        console.log(chalk.blue(`\n[DevBrain] Process exited with code ${exitCode}`));

        if (exitCode !== 0) {
            // Store failure context
            lastFailedRun = { command, output: fullOutput, timestamp: Date.now() };

            // Search database for similar errors
            if (capturedErrors.length > 0) {
                console.log(chalk.yellow.bold('\n[DevBrain] Searching knowledge base for similar issues...'));
                await alertOnMatchingErrors(capturedErrors, fullOutput, command);
            }
        } else if (lastFailedRun && (Date.now() - lastFailedRun.timestamp < 300000)) { // 5 min window
            // If we just fixed a failure!
            console.log(chalk.green.bold('\n[DevBrain] CONGRATS! You just fixed a previous failure.'));
            console.log(chalk.cyan('Generating Wisdom Block...'));

            if (ai) {
                const wisdom = await ai.generateWisdom(lastFailedRun.output, "User successfully ran: " + command);
                const newFix = {
                    id: crypto.randomUUID(),
                    projectName: path.basename(process.cwd()),
                    errorMessage: lastFailedRun.output.substring(0, 500),
                    rootCause: wisdom.rootCause || "Unknown",
                    mentalModel: wisdom.mentalModel || "Trial and Error",
                    fixDescription: "Verified by successful run: " + command,
                    beforeCodeSnippet: "",
                    afterCodeSnippet: "",
                    filePaths: [],
                    tags: wisdom.tags || [],
                    frameworkContext: wisdom.frameworkContext || "",
                    createdAt: Date.now(),
                    confidence: 90,
                    timeSavedMinutes: 5,
                    usageCount: 1,
                    successCount: 1
                };
                await storage.saveFix(newFix);
                console.log(chalk.green('✓ Wisdom saved to brain.db as Verified Solution.'));
            }
            lastFailedRun = null;
        }
    });
}

async function alertOnMatchingErrors(errors: string[], fullOutput: string, command: string) {
    try {
        // Get all fixes from database
        const allFixes = await storage.getFixes();

        if (allFixes.length === 0) {
            console.log(chalk.gray('  No knowledge in database yet. Run more commands to build wisdom.'));
            return;
        }

        // Search for matches
        const matches: any[] = [];
        const searchTerms = errors.concat([
            fullOutput.split('\n')[0], // First line of output
            fullOutput.split('\n').slice(-3).join(' ') // Last 3 lines
        ]);

        for (const fix of allFixes) {
            for (const term of searchTerms) {
                if (!term || term.length < 3) continue;

                // Check if error message or tags match
                if (fix.errorMessage.toLowerCase().includes(term.toLowerCase()) ||
                    fix.mentalModel.toLowerCase().includes(term.toLowerCase()) ||
                    fix.tags.some(t => t.toLowerCase().includes(term.toLowerCase()))) {

                    // Avoid duplicates
                    if (!matches.find(m => m.id === fix.id)) {
                        matches.push(fix);
                    }
                    break;
                }
            }
        }

        if (matches.length === 0) {
            console.log(chalk.gray('  No matching issues found in knowledge base.'));
            return;
        }

        // Alert user with matching solutions
        console.log(chalk.yellow.bold(`\n⚠️  Found ${matches.length} similar issue(s) in knowledge base!\n`));

        matches.slice(0, 5).forEach((fix, idx) => {
            console.log(chalk.cyan(`[Match ${idx + 1}] ${fix.errorMessage.split('\n')[0]}`));
            console.log(chalk.gray(`  Project: ${fix.projectName}`));
            console.log(chalk.gray(`  Root Cause: ${fix.rootCause}`));
            console.log(chalk.gray(`  Mental Model: ${fix.mentalModel}`));
            console.log(chalk.green(`  Solution: ${fix.fixDescription?.substring(0, 100)}...`));
            console.log(chalk.gray(`  Confidence: ${fix.confidence}%, Success Rate: ${fix.successCount}/${fix.usageCount}`));
            console.log('');
        });

        if (matches.length > 5) {
            console.log(chalk.yellow(`  ... and ${matches.length - 5} more matches. Run 'devbrain search' for details.\n`));
        }

    } catch (error) {
        console.error(chalk.red('[ERROR] Failed to search knowledge base:'), error);
    }
}

function checkForErrors(data: string) {
    const errorPatterns = [
        /(?:^|\s)Error:/m,
        /(?:^|\s)TypeError:/m,
        /(?:^|\s)SyntaxError:/m,
        /(?:^|\s)ReferenceError:/m,
        /(?:^|\s)Exception:/m,
        /at\s+.*:\d+:\d+/m, // Stack trace
        /^\[ERROR\]/m,
        /^FAIL/m,
        /uncaught/i,
        /unhandled/i,
        /undefined is not/i,
        /cannot read property/i
    ];

    for (const pattern of errorPatterns) {
        const matches = data.match(pattern);
        if (matches) {
            const errorLine = data.split('\n').find(line => pattern.test(line));
            if (errorLine && !capturedErrors.includes(errorLine)) {
                capturedErrors.push(errorLine);
            }
        }
    }
}
