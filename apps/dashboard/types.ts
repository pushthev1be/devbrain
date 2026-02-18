import React from 'react';

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
  sourceUrl?: string;
  isWebResult?: boolean;
}

export interface AntiPattern {
  id: string;
  patternName: string;
  symptoms: string;
  betterApproach: string;
  projectsAffected: string[];
  createdAt: number;
}

export interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'warning' | 'info' | 'component' | 'input-prompt';
  content: string | React.ReactNode;
}

export enum AppState {
  TERMINAL = 'TERMINAL',
  DATABASE = 'DATABASE',
  ANTI_PATTERNS = 'ANTI_PATTERNS',
  INSIGHTS = 'INSIGHTS',
  MASTERY = 'MASTERY',
  CLI_EXPORT = 'CLI_EXPORT',
  HELP = 'HELP'
}