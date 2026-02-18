"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const genai_1 = require("@google/genai");
class AiService {
    genAI;
    constructor(apiKey) {
        this.genAI = new genai_1.GoogleGenAI({ apiKey });
    }
    async analyzeError(errorText, pastFixes) {
        const prompt = `
      You are DevBrain, a local CLI tool designed to find similar past fixes for developer errors.
      
      CURRENT ERROR: "${errorText}"
      
      LOCAL KNOWLEDGE:
      ${JSON.stringify(pastFixes.map(f => ({
            id: f.id,
            error: f.errorMessage,
            rootCause: f.rootCause,
            mentalModel: f.mentalModel
        })))}
      
      Return JSON: { bestMatchId: string | null, confidence: number (0-100), reasoning: string }
    `;
        const result = await this.genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        return JSON.parse(result.text || result.response?.text() || '{}');
    }
    async generateWisdom(error, solution) {
        const prompt = `
      Convert this error and fix into a structured Wisdom Block.
      ERROR: ${error}
      FIX: ${solution}
      
      Return JSON with: rootCause, mentalModel, fixDescription, tags (array), frameworkContext.
    `;
        const result = await this.genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        return JSON.parse(result.text || result.response?.text() || '{}');
    }
    async analyzeCommit(message, diff) {
        const prompt = `
      You are DevBrain, an expert senior engineer. Analyze this GitHub commit to extract high-quality development wisdom.
      
      COMMIT MESSAGE: "${message}"
      COMMIT DIFF:
      ${diff.substring(0, 10000)} // Limit size
      
      CRITERIA:
      1. ONLY extract if this is a bug fix, a solution to a technical problem, or a significant architectural change.
      2. IGNORE trivial changes (chores, documentation, formatting, simple refactors).
      3. If it IS a fix, extract the following JSON:
      {
        "isFix": true,
        "errorMessage": "The specific error or symptom being addressed",
        "rootCause": "Why did this happen? (e.g. 'off-by-one in loop', 'missing null check in X lifecycle')",
        "mentalModel": "The deeper technical principle or pattern (e.g. 'Immutable state prevents race conditions in Y')",
        "fixDescription": "Concise summary of how it was solved",
        "tags": ["relevant", "technologies", "patterns"],
        "confidence": 0-100
      }
      4. If it is NOT a fix/significant insight, return { "isFix": false }.
      5. BE DEEP. Avoid generic answers like "fixed syntax". Explain the mechanics.
    `;
        const result = await this.genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });
        const data = JSON.parse(result.text || result.response?.text() || '{}');
        return data;
    }
}
exports.AiService = AiService;
