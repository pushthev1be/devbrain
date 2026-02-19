import { Fix } from './types.js';
export declare class AiService {
    private genAI;
    constructor(apiKey: string);
    analyzeError(errorText: string, pastFixes: Fix[]): Promise<any>;
    generateWisdom(error: string, solution: string): Promise<any>;
    analyzeCodeQuality(filename: string, content: string): Promise<any>;
    analyzeCommit(message: string, diff: string): Promise<any>;
}
