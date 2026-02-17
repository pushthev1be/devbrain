import { GoogleGenAI, Type } from "@google/genai";
import { Fix } from './types.js';

export class AiService {
    private genAI: GoogleGenAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async analyzeError(errorText: string, pastFixes: Fix[]) {
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

        const result = await (this.genAI as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });

        return JSON.parse(result.text || result.response?.text() || '{}');
    }

    async generateWisdom(error: string, solution: string) {
        const prompt = `
      Convert this error and fix into a structured Wisdom Block.
      ERROR: ${error}
      FIX: ${solution}
      
      Return JSON with: rootCause, mentalModel, fixDescription, tags (array), frameworkContext.
    `;

        const result = await (this.genAI as any).models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
        });

        return JSON.parse(result.text || result.response?.text() || '{}');
    }
}
