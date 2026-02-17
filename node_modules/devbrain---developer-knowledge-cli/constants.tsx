import { Fix, AntiPattern } from './types';

export const INITIAL_FIXES: Fix[] = [
  {
    id: '1',
    projectName: 'solana-bot',
    errorMessage: "TypeError: Cannot read property 'map' of undefined",
    rootCause: 'API returns null when no positions are found',
    mentalModel: 'The API returns null but component assumes array. Data shape contract violation. API team won\'t change, so UI must be defensive.',
    fixDescription: 'Wrap response with fallback: data || []',
    beforeCodeSnippet: 'positions.map(p => ...)',
    afterCodeSnippet: '(positions || []).map(p => ...)',
    filePaths: ['src/components/Dashboard.tsx'],
    tags: ['react', 'api', 'null-handling'],
    frameworkContext: 'react',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    timeSavedMinutes: 45,
    usageCount: 12,
    successCount: 11
  },
  {
    id: '2',
    projectName: 'dashbird',
    errorMessage: "Warning: Context sprawl. Deeply nested providers causing performance lag.",
    rootCause: 'Passing global state through 10+ context providers',
    mentalModel: 'Context is for dependency injection, not high-frequency state updates. Use an external store for complex state trees.',
    fixDescription: 'Migrate global state to Zustand',
    beforeCodeSnippet: '<UserProvider><ConfigProvider><UIProvider>...',
    afterCodeSnippet: 'const useStore = create((set) => ({ ... }))',
    filePaths: ['src/App.tsx'],
    tags: ['react', 'state-management', 'performance'],
    frameworkContext: 'react',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    timeSavedMinutes: 120,
    usageCount: 4,
    successCount: 4
  }
];

export const INITIAL_ANTI_PATTERNS: AntiPattern[] = [
  {
    id: 'ap-1',
    patternName: 'Prop Drilling Hell',
    symptoms: 'Passing "user" object through 5 layers of components just for a header avatar.',
    betterApproach: 'Use a simple store like Zustand or a shallow Context specifically for the avatar.',
    projectsAffected: ['solana-bot', 'legacy-crm'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30
  }
];

export const APP_VERSION = "v1.3.0-learning-loop";