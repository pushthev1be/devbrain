"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithMonitoring = runWithMonitoring;
const os_1 = __importDefault(require("os"));
const pty = __importStar(require("node-pty"));
const core_1 = require("@devbrain/core");
const chalk_1 = __importDefault(require("chalk"));
const conf_1 = __importDefault(require("conf"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const config = new conf_1.default({
    projectName: 'devbrain',
});
const shell = os_1.default.platform() === 'win32' ? 'powershell.exe' : 'bash';
let lastFailedRun = null;
let capturedErrors = [];
// Load persistent strikes
const errorStrikes = config.get('errorStrikes') || {};
function runWithMonitoring(command) {
    return new Promise((resolve) => {
        capturedErrors = [];
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 100,
            rows: 30,
            cwd: process.cwd(),
            env: process.env
        });
        let fullOutput = '';
        const aiApiKey = process.env.GEMINI_API_KEY || config.get('geminiKey');
        const ai = aiApiKey ? new core_1.AiService(aiApiKey) : null;
        const scraper = ai ? new core_1.ScraperService(ai) : null;
        ptyProcess.onData((data) => {
            process.stdout.write(data);
            fullOutput += data;
            checkForErrors(data);
        });
        ptyProcess.write(`${command}\r`);
        ptyProcess.onExit(async ({ exitCode }) => {
            console.log(chalk_1.default.blue(`\n[DevBrain] Process exited with code ${exitCode}`));
            const fingerprint = capturedErrors.length > 0
                ? crypto_1.default.createHash('md5').update(capturedErrors.join('|')).digest('hex')
                : 'no-error';
            if (exitCode !== 0) {
                // Increment persistent strike counter
                const strikes = (errorStrikes[fingerprint] || 0) + 1;
                errorStrikes[fingerprint] = strikes;
                config.set('errorStrikes', errorStrikes);
                // Search database for similar errors
                let matchedIds = [];
                if (capturedErrors.length > 0) {
                    console.log(chalk_1.default.yellow.bold(`\n[DevBrain] Searching knowledge base for similar issues...`));
                    matchedIds = await alertOnMatchingErrors(capturedErrors, fullOutput, command);
                }
                if (strikes < 3) {
                    console.log(chalk_1.default.dim(`  [STRIKE ${strikes}/3] Error identified. Waiting for recurrence (3x) to trigger deep web search.`));
                }
                else {
                    if (matchedIds.length === 0 && scraper) {
                        console.log(chalk_1.default.magenta.bold(`  [STRIKE ${strikes}/3] Chronic unknown issue detected. Deploying web scraper...`));
                        const errorQuery = capturedErrors[0] || fullOutput.split('\n').filter(l => l.trim()).pop() || command;
                        console.log(chalk_1.default.cyan(`  🔍 Scraping StackOverflow for: "${errorQuery}"...`));
                        const solution = await scraper.findSolution(errorQuery);
                        if (solution) {
                            console.log(chalk_1.default.green(`  ✨ Found accepted solution on StackOverflow!`));
                            console.log(chalk_1.default.gray(`     Title: ${solution.title}`));
                            console.log(chalk_1.default.gray(`     URL: ${solution.url}`));
                            const newFix = {
                                id: crypto_1.default.randomUUID(),
                                type: 'bugfix',
                                projectName: path_1.default.basename(process.cwd()),
                                errorMessage: `[AUTO-SCRAPED] ${solution.title}`,
                                rootCause: `StackOverflow match for: ${errorQuery}`,
                                mentalModel: "Community Solution",
                                fixDescription: solution.solution,
                                beforeCodeSnippet: errorQuery,
                                afterCodeSnippet: `See: ${solution.url}`,
                                filePaths: [solution.url],
                                tags: ['stackoverflow', 'auto-scraped', 'web-search'],
                                frameworkContext: 'web',
                                createdAt: Date.now(),
                                confidence: 70,
                                timeSavedMinutes: 30,
                                usageCount: 1,
                                successCount: 1
                            };
                            await core_1.storage.saveFix(newFix);
                            console.log(chalk_1.default.green(`  ✓ Saved web solution to local database.`));
                        }
                        else {
                            console.log(chalk_1.default.yellow(`  No direct solution found on StackOverflow.`));
                        }
                    }
                    else {
                        console.log(chalk_1.default.magenta.bold(`  [STRIKE ${strikes}/3] Chronic issue detected. DevBrain is tracking this.`));
                    }
                }
                // Store failure context
                lastFailedRun = {
                    command,
                    output: fullOutput,
                    timestamp: Date.now(),
                    matchedFixIds: matchedIds,
                    fingerprint
                };
            }
            else if (lastFailedRun && (Date.now() - lastFailedRun.timestamp < 300000)) { // 5 min window
                // If we just fixed a failure!
                const strikes = errorStrikes[lastFailedRun.fingerprint] || 1;
                if (strikes >= 3) {
                    console.log(chalk_1.default.green.bold('\n[DevBrain] CONGRATS! You just fixed a persistent failure.'));
                    console.log(chalk_1.default.cyan('Generating High-Fidelity Verified Wisdom...'));
                    // Update success counts for matched items
                    for (const id of lastFailedRun.matchedFixIds) {
                        try {
                            const fixes = await core_1.storage.getFixes();
                            const fix = fixes.find(f => f.id === id);
                            if (fix) {
                                fix.successCount = (fix.successCount || 0) + 1;
                                await core_1.storage.saveFix(fix);
                                console.log(chalk_1.default.green(`  ✓ Verification improved for: ${fix.errorMessage.split('\n')[0]}`));
                            }
                        }
                        catch (e) { }
                    }
                    if (ai) {
                        try {
                            const wisdom = await ai.generateWisdom(lastFailedRun.output, "User successfully ran: " + command);
                            const newFix = {
                                id: crypto_1.default.randomUUID(),
                                type: 'bugfix',
                                projectName: path_1.default.basename(process.cwd()),
                                errorMessage: `Fixed: ${command}`,
                                rootCause: wisdom.rootCause || "Previous execution failure context.",
                                mentalModel: wisdom.mentalModel || "Operational recovery pattern.",
                                fixDescription: wisdom.fixDescription || `Verified solution via command: ${command}`,
                                beforeCodeSnippet: lastFailedRun.output.substring(0, 1000),
                                afterCodeSnippet: `Successful Execution: ${command}`,
                                filePaths: [],
                                tags: [...new Set(['verified', ...(wisdom.tags || [])])],
                                frameworkContext: wisdom.frameworkContext || path_1.default.extname(command) || "",
                                createdAt: Date.now(),
                                confidence: 95,
                                timeSavedMinutes: 10,
                                usageCount: strikes,
                                successCount: 1
                            };
                            await core_1.storage.saveFix(newFix);
                            console.log(chalk_1.default.green('✓ Wisdom captured as high-fidelity Verified Solution.'));
                        }
                        catch (e) {
                            console.warn(chalk_1.default.yellow(`[AI_ERROR] Failed to generate deep wisdom: ${e}`));
                        }
                    }
                }
                else {
                    console.log(chalk_1.default.gray(`\n[DevBrain] Quick fix detected (${strikes}/3 strikes). Skipping recording to keep brain high-signal.`));
                }
                lastFailedRun = null;
            }
            if (os_1.default.platform() === 'win32') {
                ptyProcess.kill();
            }
            resolve();
            process.exit(exitCode);
        });
    });
}
async function alertOnMatchingErrors(errors, fullOutput, command) {
    try {
        // Get all fixes from database
        const allFixes = await core_1.storage.getFixes();
        if (allFixes.length === 0) {
            console.log(chalk_1.default.gray('  No knowledge in database yet. Run more commands to build wisdom.'));
            return [];
        }
        // Search for matches
        const matches = [];
        const searchTerms = errors.concat([
            fullOutput.split('\n')[0], // First line of output
            fullOutput.split('\n').slice(-3).join(' ') // Last 3 lines
        ]);
        for (const fix of allFixes) {
            for (const term of searchTerms) {
                if (!term || term.length < 3)
                    continue;
                // Check if error message or tags match
                if (fix.errorMessage.toLowerCase().includes(term.toLowerCase()) ||
                    fix.mentalModel.toLowerCase().includes(term.toLowerCase()) ||
                    fix.tags.some(t => t.toLowerCase().includes(term.toLowerCase()))) {
                    // Avoid duplicates
                    if (!matches.find(m => m.id === fix.id)) {
                        matches.push(fix);
                        // Increment usage count for this hit
                        try {
                            const currentFixes = await core_1.storage.getFixes();
                            const actualFix = currentFixes.find(f => f.id === fix.id);
                            if (actualFix) {
                                actualFix.usageCount = (actualFix.usageCount || 0) + 1;
                                await core_1.storage.saveFix(actualFix);
                            }
                        }
                        catch (e) { }
                    }
                    break;
                }
            }
        }
        if (matches.length === 0) {
            console.log(chalk_1.default.gray('  No matching issues found in knowledge base.'));
            return [];
        }
        // Alert user with matching solutions
        console.log(chalk_1.default.yellow.bold(`\n⚠️  Found ${matches.length} similar issue(s) in knowledge base!\n`));
        matches.slice(0, 5).forEach((fix, idx) => {
            console.log(chalk_1.default.cyan(`[Match ${idx + 1}] ${fix.errorMessage.split('\n')[0]}`));
            console.log(chalk_1.default.gray(`  Project: ${fix.projectName}`));
            console.log(chalk_1.default.gray(`  Root Cause: ${fix.rootCause}`));
            console.log(chalk_1.default.gray(`  Mental Model: ${fix.mentalModel}`));
            console.log(chalk_1.default.green(`  Solution: ${fix.fixDescription?.substring(0, 100)}...`));
            console.log(chalk_1.default.gray(`  Confidence: ${fix.confidence}%, Success Rate: ${fix.successCount}/${fix.usageCount}`));
            console.log('');
        });
        if (matches.length > 5) {
            console.log(chalk_1.default.yellow(`  ... and ${matches.length - 5} more matches. Run 'devbrain search' for details.\n`));
        }
        return matches.map(m => m.id);
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Failed to search knowledge base:'), error);
        return [];
    }
}
function checkForErrors(data) {
    const errorPatterns = [
        /Error:\s.+/i,
        /Exception:\s.+/i,
        /TypeError:\s.+/i,
        /SyntaxError:\s.+/i,
        /ReferenceError:\s.+/i,
        /at\s+.+:\d+:\d+/i, // Stack trace
        /^\[ERROR\].+/im,
        /^FAIL\s.+/im,
        /uncaught exception/i,
        /unhandled rejection/i,
        /cannot find module/i
    ];
    for (const pattern of errorPatterns) {
        const matches = data.match(pattern);
        if (matches) {
            // Extract the full line that matched
            const lines = data.split('\n');
            for (const line of lines) {
                if (pattern.test(line)) {
                    const cleanLine = line.trim();
                    if (!capturedErrors.includes(cleanLine)) {
                        capturedErrors.push(cleanLine);
                        process.stdout.write(chalk_1.default.red.bold(`\n [DevBrain] 🔴 TRACKED: ${cleanLine.substring(0, 50)}...`));
                    }
                }
            }
        }
    }
}
