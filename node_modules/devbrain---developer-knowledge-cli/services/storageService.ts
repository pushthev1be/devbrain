import { Fix, AntiPattern } from '../types';

const API_BASE = 'http://localhost:3000/api';

export const storage = {
  getFixes: async (): Promise<Fix[]> => {
    try {
      const response = await fetch(`${API_BASE}/fixes`);
      if (!response.ok) throw new Error('API server down');
      return await response.json();
    } catch (e) {
      console.warn('Dashboard falling back to local simulation mode');
      return [];
    }
  },

  saveFix: async (fix: Fix) => {
    await fetch(`${API_BASE}/fixes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fix)
    });
  },

  recordOutcome: async (fixId: string, worked: boolean) => {
    // Current server doesn't have an outcome endpoint yet, 
    // but we can simulate it or add it later.
    console.log(`Outcome for ${fixId}: ${worked}`);
  },

  searchFixes: async (query: string): Promise<Fix[]> => {
    const fixes = await storage.getFixes();
    const q = query.toLowerCase();
    return fixes.filter(f =>
      f.errorMessage.toLowerCase().includes(q) ||
      (f.rootCause && f.rootCause.toLowerCase().includes(q)) ||
      (f.mentalModel && f.mentalModel.toLowerCase().includes(q)) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(q)))
    );
  },

  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      return await response.json();
    } catch (e) {
      return {
        totalFixes: 0,
        timeSavedHours: "0.0",
        topTags: [],
        accuracyRate: 0
      };
    }
  },

  getAntiPatterns: async (): Promise<AntiPattern[]> => {
    return []; // Placeholder for now
  },

  saveAntiPattern: async (ap: AntiPattern) => {
    console.log('Anti-pattern save requested');
  }
};