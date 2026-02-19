export interface Fix {
    id: string;
    type: 'bugfix' | 'pattern' | 'optimization' | 'principle' | 'runbook' | 'decision';
    projectName: string;
    errorMessage: string; // Title or problem description
    rootCause: string;    // Rationale or why this pattern is used
    mentalModel: string;  // The underlying engineering principle
    fixDescription: string; // Implementation details
    beforeCodeSnippet: string;
    afterCodeSnippet: string;
    filePaths: string[];
    tags: string[];
    frameworkContext: string;
    createdAt: number;
    confidence?: number;
    timeSavedMinutes: number;
    usageCount: number;
    successCount: number;
    contentHash?: string;
}

export interface AntiPattern {
    id: string;
    patternName: string;
    symptoms: string;
    betterApproach: string;
    projectsAffected: string[];
    createdAt: number;
}

export interface Stats {
    totalFixes: number;
    timeSavedHours: string;
    topTags: string[];
    accuracyRate: number;
}
