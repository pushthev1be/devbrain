import { GoogleGenAI, Type } from "@google/genai";
import { Fix } from "../types";

export async function analyzeErrorAndFindFix(errorText: string, pastFixes: Fix[]): Promise<{
  bestMatch?: Fix;
  confidence: number;
  reasoning: string;
}> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are DevBrain, a local CLI tool designed to find similar past fixes for developer errors.
      
      CURRENT ERROR OBSERVED:
      "${errorText}"
      
      LOCAL KNOWLEDGE DATABASE:
      ${JSON.stringify(pastFixes.map(f => ({
        id: f.id,
        error: f.errorMessage,
        rootCause: f.rootCause,
        mentalModel: f.mentalModel
      })))}
      
      Analyze if the CURRENT ERROR is similar to any in the database.
      Focus on underlying cause similarity rather than exact string matching.
      
      Return a JSON object with:
      - bestMatchId: the ID of the most similar fix
      - confidence: 0-100 score
      - reasoning: 1-2 sentence explanation.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestMatchId: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["confidence", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const bestMatch = pastFixes.find(f => f.id === result.bestMatchId);

    return {
      bestMatch: result.confidence > 50 ? bestMatch : undefined,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || "No match found."
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return { confidence: 0, reasoning: "AI analysis unavailable." };
  }
}

export async function searchWebForFix(query: string): Promise<Fix[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for a technical solution and explanation for this developer query: "${query}".
      Explain the 'Mental Model' and 'Root Cause' of the problem.
      Provide a 'Fix Description' and a code snippet for the solution.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrl = (grounding as any)?.[0]?.web?.uri || "https://google.com/search?q=" + encodeURIComponent(query);

    const structResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Transform this search result into a structured Wisdom Block:
      ${text}
      
      Ensure the fixDescription is concise and mentalModel is insightful.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING },
            mentalModel: { type: Type.STRING },
            fixDescription: { type: Type.STRING },
            afterCodeSnippet: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["rootCause", "mentalModel", "fixDescription", "afterCodeSnippet", "tags"]
        }
      }
    });

    const data = JSON.parse(structResponse.text || '{}');

    return [{
      id: `web-${Math.random().toString(36).substr(2, 9)}`,
      projectName: 'Global Wisdom',
      errorMessage: query,
      rootCause: data.rootCause,
      mentalModel: data.mentalModel,
      fixDescription: data.fixDescription,
      beforeCodeSnippet: '...',
      afterCodeSnippet: data.afterCodeSnippet,
      filePaths: [],
      tags: [...data.tags, 'web-recall'],
      frameworkContext: 'cross-platform',
      createdAt: Date.now(),
      timeSavedMinutes: 20,
      usageCount: 1,
      successCount: 1,
      sourceUrl,
      isWebResult: true
    }];
  } catch (error) {
    console.error("Web search failed:", error);
    return [];
  }
}

export async function generateFixFromInput(error: string, fix: string): Promise<Partial<Fix>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Convert this manual developer log into a structured 'Wisdom Block'.
      ERROR: ${error}
      FIX: ${fix}
      
      Identify the 'mentalModel' (the root psychological/architectural reason this happened).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING },
            mentalModel: { type: Type.STRING },
            fixDescription: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            frameworkContext: { type: Type.STRING }
          },
          required: ["rootCause", "mentalModel", "fixDescription", "tags"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Log generation failed:", error);
    throw error;
  }
}

export async function explainCodeSnippet(code: string): Promise<{ mentalModel: string; explanation: string; antiPatterns: Array<{ name: string, symptoms: string, remedy: string }> }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this code snippet:
      \`\`\`
      ${code}
      \`\`\`
      
      Explain the mental model required to understand it and identify any potential anti-patterns.
      Return a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mentalModel: { type: Type.STRING },
            explanation: { type: Type.STRING },
            antiPatterns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  symptoms: { type: Type.STRING },
                  remedy: { type: Type.STRING }
                },
                required: ["name", "symptoms", "remedy"]
              }
            }
          },
          required: ["mentalModel", "explanation", "antiPatterns"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Code explanation failed:", error);
    throw error;
  }
}

export async function reviewCodeDiff(diff: string): Promise<Array<{ name: string, symptoms: string, remedy: string, file: string }>> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform a code review on this diff:
      ${diff}
      
      Identify any anti-patterns or structural issues.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              symptoms: { type: Type.STRING },
              remedy: { type: Type.STRING },
              file: { type: Type.STRING }
            },
            required: ["name", "symptoms", "remedy", "file"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Review failed:", error);
    return [];
  }
}