import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Fix, Stats } from './types.js';

const DB_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '', '.devbrain', 'brain.db');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Open database
const db = new sqlite3.Database(DB_PATH);

// Wrap db calls in promises
const run = (sql: string, params: any[] = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql: string, params: any[] = []) => new Promise<any[]>((resolve, reject) => {
  db.all(sql, params, (err: Error | null, rows: any[]) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Initialize schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS fixes (
      id TEXT PRIMARY KEY,
      projectName TEXT,
      errorMessage TEXT,
      rootCause TEXT,
      mentalModel TEXT,
      fixDescription TEXT,
      beforeCodeSnippet TEXT,
      afterCodeSnippet TEXT,
      filePaths TEXT,
      tags TEXT,
      frameworkContext TEXT,
      createdAt INTEGER,
      confidence REAL,
      timeSavedMinutes INTEGER,
      usageCount INTEGER,
      successCount INTEGER,
      contentHash TEXT,
      UNIQUE(projectName, errorMessage, contentHash)
    )
  `);

  // Migration: Add missing columns if they don't exist
  db.run("ALTER TABLE fixes ADD COLUMN type TEXT", (err) => { });
  db.run("ALTER TABLE fixes ADD COLUMN contentHash TEXT", (err) => { });

  db.run(`
    CREATE TABLE IF NOT EXISTS anti_patterns (
      id TEXT PRIMARY KEY,
      patternName TEXT,
      symptoms TEXT,
      betterApproach TEXT,
      projectsAffected TEXT,
      createdAt INTEGER
    )
  `);
});

export const storage = {
  getFixes: async (): Promise<Fix[]> => {
    const rows = await all('SELECT * FROM fixes ORDER BY createdAt DESC');
    return rows.map(r => ({
      ...r,
      filePaths: JSON.parse(r.filePaths || '[]'),
      tags: JSON.parse(r.tags || '[]')
    }));
  },

  getGenericFixes: async (): Promise<Fix[]> => {
    const rows = await all("SELECT * FROM fixes WHERE fixDescription LIKE 'Analyzed % lines of%'");
    return rows.map(r => ({ ...r, filePaths: JSON.parse(r.filePaths || '[]'), tags: JSON.parse(r.tags || '[]') }));
  },

  saveFix: async (fix: Fix) => {
    const sql = `
      INSERT OR REPLACE INTO fixes (
        id, type, projectName, errorMessage, rootCause, mentalModel, 
        fixDescription, beforeCodeSnippet, afterCodeSnippet, 
        filePaths, tags, frameworkContext, createdAt, 
        confidence, timeSavedMinutes, usageCount, successCount, contentHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await run(sql, [
      fix.id, fix.type, fix.projectName, fix.errorMessage, fix.rootCause, fix.mentalModel,
      fix.fixDescription, fix.beforeCodeSnippet, fix.afterCodeSnippet,
      JSON.stringify(fix.filePaths), JSON.stringify(fix.tags), fix.frameworkContext, fix.createdAt,
      fix.confidence || 0, fix.timeSavedMinutes, fix.usageCount, fix.successCount, fix.contentHash
    ]);
  },

  getStats: async (): Promise<Stats> => {
    const fixes = await storage.getFixes();
    const totalMinutes = fixes.reduce((acc, f) => acc + (f.timeSavedMinutes || 0), 0);
    const totalSuccess = fixes.reduce((acc, f) => acc + (f.successCount || 0), 0);
    const totalUsage = fixes.reduce((acc, f) => acc + (f.usageCount || 0), 0);

    return {
      totalFixes: fixes.length,
      timeSavedHours: (totalMinutes / 60).toFixed(1),
      topTags: Array.from(new Set(fixes.flatMap(f => f.tags))).slice(0, 5),
      accuracyRate: totalUsage > 0 ? Math.round((totalSuccess / totalUsage) * 100) : 0
    };
  },

  getAntiPatterns: async (): Promise<any[]> => {
    const rows = await all('SELECT * FROM anti_patterns ORDER BY createdAt DESC');
    return rows.map(r => ({
      ...r,
      projectsAffected: JSON.parse(r.projectsAffected || '[]')
    }));
  },

  clearDuplicates: async () => {
    // Keep most recent for each unique insight
    const sql = `
      DELETE FROM fixes 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, MAX(createdAt) 
          FROM fixes 
          GROUP BY projectName, errorMessage
        )
      )
    `;
    await run(sql);

    // Also cleanup anti-patterns
    const apSql = `
      DELETE FROM anti_patterns 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, MAX(createdAt) 
          FROM anti_patterns 
          GROUP BY patternName
        )
      )
    `;
    await run(apSql);
  },

  saveAntiPattern: async (pattern: any) => {
    const sql = `
      INSERT OR REPLACE INTO anti_patterns (
        id, patternName, symptoms, betterApproach, projectsAffected, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await run(sql, [
      pattern.id,
      pattern.patternName,
      pattern.symptoms,
      pattern.betterApproach,
      JSON.stringify(pattern.projectsAffected || []),
      pattern.createdAt || Date.now()
    ]);
  }
};
