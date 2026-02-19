import { Fix, Stats } from './types.js';
export declare const storage: {
    getFixes: () => Promise<Fix[]>;
    getGenericFixes: () => Promise<Fix[]>;
    saveFix: (fix: Fix) => Promise<void>;
    getStats: () => Promise<Stats>;
    getAntiPatterns: () => Promise<any[]>;
    clearDuplicates: () => Promise<void>;
    saveAntiPattern: (pattern: any) => Promise<void>;
};
