"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = path_1.default.join(process.env.HOME || process.env.USERPROFILE || '', '.devbrain', 'brain.db');
// Ensure directory exists
if (!fs_1.default.existsSync(path_1.default.dirname(DB_PATH))) {
    fs_1.default.mkdirSync(path_1.default.dirname(DB_PATH), { recursive: true });
}
// Open database
const db = new sqlite3_1.default.Database(DB_PATH);
// Wrap db calls in promises
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err)
            reject(err);
        else
            resolve(this);
    });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err)
            reject(err);
        else
            resolve(rows);
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
exports.storage = {
    getFixes: async () => {
        const rows = await all('SELECT * FROM fixes ORDER BY createdAt DESC');
        return rows.map(r => ({
            ...r,
            filePaths: JSON.parse(r.filePaths || '[]'),
            tags: JSON.parse(r.tags || '[]')
        }));
    },
    getGenericFixes: async () => {
        const rows = await all("SELECT * FROM fixes WHERE fixDescription LIKE 'Analyzed % lines of%'");
        return rows.map(r => ({ ...r, filePaths: JSON.parse(r.filePaths || '[]'), tags: JSON.parse(r.tags || '[]') }));
    },
    saveFix: async (fix) => {
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
    getStats: async () => {
        const fixes = await exports.storage.getFixes();
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
    getAntiPatterns: async () => {
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
    saveAntiPattern: async (pattern) => {
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
