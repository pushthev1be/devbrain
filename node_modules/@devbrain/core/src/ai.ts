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
      model: 'gemini-1.5-flash-001',
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
      model: 'gemini-1.5-flash-001',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    return JSON.parse(result.text || result.response?.text() || '{}');
  }

  async analyzeCodeQuality(filename: string, content: string) {
    const prompt = `
      Analyze the following source code to extract high-quality engineering wisdom for a local Knowledge Base.
      FILE: ${filename}
      CONTENT:
      ${content.substring(0, 15000)}
      
      CRITERIA:
      1. This is a Knowledge Base capture. Every file in the project has a purpose.
      2. Identify DOMAIN ROLE: What is this file's "job" in the overall architecture? (e.g. 'Storage Engine', 'API Routing', 'State Management')
      3. Identify PATTERNS & PRINCIPLES: How is it solving problems? (e.g. 'Dependency Injection', 'Lazy Loading').
      4. Avoid generic "Code Analysis". Be specific about the LOGIC.
      5. BE BEGINNER FRIENDLY. Explain the "Why" simply.
      6. Return ONLY a JSON object:
      {
        "hasWisdom": true,
        "type": "pattern" | "principle" | "runbook" | "decision",
        "title": "Clear Name (e.g. 'Persistent Storage Layer')",
        "rationale": "High-level goal. What engineering problem does this solve?",
        "principle": "The design pattern or concept used.",
        "description": "Implementation details. How does it work internally?",
        "tags": ["relevant", "keywords"],
        "confidence": 0-100
      }
    `;

    const result = await (this.genAI as any).models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const data = JSON.parse(result.text || result.response?.text() || '{}');
    return data;
  }

  async analyzeCommit(message: string, diff: string) {
    const prompt = `
      You are DevBrain, an expert senior engineer. Analyze this GitHub commit to extract high-quality development wisdom.
      
      COMMIT MESSAGE: "${message}"
      COMMIT DIFF:
      ${diff.substring(0, 10000)} // Limit size
      
      CRITERIA:
      1. Extract if this is:
         - A BUG FIX (resolves a specific error or symptom)
         - An ENGINEERING PATTERN (implements a best practice, architectural improvement, or reusable logic)
         - A SIGNIFICANT OPTIMIZATION (performance boost, resource reduction)
      2. IGNORE trivial changes (chores, documentation, formatting, minor variable renames).
      3. Return ONLY a JSON object:
      {
        "isWorthRecording": true,
        "type": "bugfix" | "pattern" | "optimization",
        "title": "Clear, technical summary of the insight",
        "problemContext": "The issue or state before the change (the 'why')",
        "mentalModel": "The deeper technical principle or pattern (e.g. 'Single Responsibility Principle avoids X', 'Memoization prevents redundant Y calculations')",
        "implementationDetails": "Concise summary of how the logic was structured",
        "tags": ["relevant", "technologies", "patterns"],
        "confidence": 0-100
      }
      4. If it is NOT worth recording, return { "isWorthRecording": false }.
      5. BE DEEP. Avoid generic answers. Explain the engineering mechanics.
    `;

    const result = await (this.genAI as any).models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    const data = JSON.parse(result.text || result.response?.text() || '{}');
    return data;
  }
}
