export interface Fix {
    id: string;
    projectName: string;
    errorMessage: string;
    rootCause: string;
    mentalModel: string;
    fixDescription: string;
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
