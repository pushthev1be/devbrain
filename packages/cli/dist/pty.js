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
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const shell = os_1.default.platform() === 'win32' ? 'powershell.exe' : 'bash';
let lastFailedRun = null;
let capturedErrors = [];
async function runWithMonitoring(command) {
    capturedErrors = [];
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.cwd(),
        env: process.env
    });
    let fullOutput = '';
    const aiApiKey = process.env.GEMINI_API_KEY;
    const ai = aiApiKey ? new core_1.AiService(aiApiKey) : null;
    ptyProcess.onData((data) => {
        process.stdout.write(data);
        fullOutput += data;
        checkForErrors(data);
    });
    ptyProcess.write(`${command}\r`);
    ptyProcess.onExit(async ({ exitCode }) => {
        console.log(chalk_1.default.blue(`\n[DevBrain] Process exited with code ${exitCode}`));
        if (exitCode !== 0) {
            // Store failure context
            lastFailedRun = { command, output: fullOutput, timestamp: Date.now() };
            // Search database for similar errors
            if (capturedErrors.length > 0) {
                console.log(chalk_1.default.yellow.bold('\n[DevBrain] Searching knowledge base for similar issues...'));
                await alertOnMatchingErrors(capturedErrors, fullOutput, command);
            }
        }
        else if (lastFailedRun && (Date.now() - lastFailedRun.timestamp < 300000)) { // 5 min window
            // If we just fixed a failure!
            console.log(chalk_1.default.green.bold('\n[DevBrain] CONGRATS! You just fixed a previous failure.'));
            console.log(chalk_1.default.cyan('Generating Wisdom Block...'));
            if (ai) {
                const wisdom = await ai.generateWisdom(lastFailedRun.output, "User successfully ran: " + command);
                const newFix = {
                    id: crypto_1.default.randomUUID(),
                    projectName: path_1.default.basename(process.cwd()),
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
                await core_1.storage.saveFix(newFix);
                console.log(chalk_1.default.green('✓ Wisdom saved to brain.db as Verified Solution.'));
            }
            lastFailedRun = null;
        }
    });
}
async function alertOnMatchingErrors(errors, fullOutput, command) {
    try {
        // Get all fixes from database
        const allFixes = await core_1.storage.getFixes();
        if (allFixes.length === 0) {
            console.log(chalk_1.default.gray('  No knowledge in database yet. Run more commands to build wisdom.'));
            return;
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
                    }
                    break;
                }
            }
        }
        if (matches.length === 0) {
            console.log(chalk_1.default.gray('  No matching issues found in knowledge base.'));
            return;
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
    }
    catch (error) {
        console.error(chalk_1.default.red('[ERROR] Failed to search knowledge base:'), error);
    }
}
function checkForErrors(data) {
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
