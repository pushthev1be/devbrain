import os from 'os';
import * as pty from 'node-pty';
import { AiService, storage } from '@devbrain/core';
import chalk from 'chalk';

import path from 'path';
import crypto from 'crypto';

const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let lastFailedRun: { command: string, output: string, timestamp: number } | null = null;

export async function runWithMonitoring(command: string) {
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
        checkForErrors(data, ai);
    });

    ptyProcess.write(`${command}\r`);

    ptyProcess.onExit(async ({ exitCode }) => {
        console.log(chalk.blue(`\n[DevBrain] Process exited with code ${exitCode}`));

        if (exitCode !== 0) {
            // Store failure context
            lastFailedRun = { command, output: fullOutput, timestamp: Date.now() };
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

function checkForErrors(data: string, ai: any) {
    const errorKeywords = ['Error', 'Exception', 'Failed', 'fatal', 'Traceback'];
    if (errorKeywords.some(kw => data.includes(kw))) {
        // In a real implementation, we'd buffer and dedup
        // For now just log a highlight
        console.log(chalk.red.bold('\n[DevBrain] Potential anomaly detected in stream...'));
    }
}
