import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FRAMEWORK_MAP: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  next: 'Next.js',
  nuxt: 'Nuxt',
  express: 'Express',
  fastify: 'Fastify',
  '@nestjs/core': 'NestJS',
  'hono': 'Hono',
  prisma: 'Prisma',
  typeorm: 'TypeORM',
  mongoose: 'MongoDB/Mongoose',
  sequelize: 'Sequelize',
  drizzle: 'Drizzle ORM',
  tailwindcss: 'Tailwind CSS',
  typescript: 'TypeScript',
  vite: 'Vite',
  webpack: 'Webpack',
  electron: 'Electron',
  'react-native': 'React Native',
  expo: 'Expo',
  trpc: 'tRPC',
  graphql: 'GraphQL',
  socket: 'Socket.io',
};

/** Labels detectStack adds from a file rather than a dependency. */
const FILE_SIGNAL_LABELS = ['Node.js', 'Dart', 'Flutter', 'Rust', 'Go', 'Java', 'Ruby', 'Python', 'C#/.NET'] as const;

/**
 * Every label detectStack can produce.
 *
 * Exported so the thing that draws stack marks can be checked against it
 * rather than against a second hand-written list. The first version of that
 * list was already missing tRPC, GraphQL and Socket.io on the day it was
 * written, and nothing said so — the marks just did not appear.
 */
export const ALL_STACK_LABELS: readonly string[] =
  [...new Set([...FILE_SIGNAL_LABELS, ...Object.values(FRAMEWORK_MAP)])].sort();

/**
 * How many levels below the repo root to look for a manifest.
 *
 * One. A repo whose root holds only README files and two folders is the normal
 * shape of anything with an app and a server in it, and reading the root alone
 * reported no stack at all for three of five real projects here — a Flutter app
 * with an Express backend, a monorepo of two web apps, and another app/server
 * pair. Going deeper would start reading node_modules and example directories
 * for no further gain.
 */
const SCAN_DEPTH = 1;

/** Directories never worth opening: vendored code, build output, tooling. */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'target',
  '.git', '.next', '.nuxt', '.venv', 'venv', '__pycache__', 'Pods', '.dart_tool',
]);

/** Everything detectable in one directory, ignoring its children. */
function detectInDir(dir: string): string[] {
  const stack: string[] = [];

  // Node.js / JS / TS
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    stack.push('Node.js');
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [dep, label] of Object.entries(FRAMEWORK_MAP)) {
        if (allDeps[dep] || allDeps[`@types/${dep}`]) {
          stack.push(label);
        }
      }
    } catch {}
  }

  // Dart / Flutter. A pubspec is Dart; Flutter is a dependency within it, the
  // same relationship as Node and React, so both are reported when both apply.
  const pubspec = join(dir, 'pubspec.yaml');
  if (existsSync(pubspec)) {
    stack.push('Dart');
    try {
      if (/^\s*flutter\s*:/m.test(readFileSync(pubspec, 'utf-8'))) stack.push('Flutter');
    } catch {}
  }

  if (existsSync(join(dir, 'Cargo.toml'))) stack.push('Rust');
  if (existsSync(join(dir, 'go.mod'))) stack.push('Go');
  if (existsSync(join(dir, 'pom.xml')) || existsSync(join(dir, 'build.gradle'))) stack.push('Java');
  if (existsSync(join(dir, 'Gemfile'))) stack.push('Ruby');

  const pythonSignals = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  if (pythonSignals.some(f => existsSync(join(dir, f)))) stack.push('Python');

  const dotnetSignals = ['*.csproj', '*.fsproj', '*.sln'];
  if (dotnetSignals.some(f => existsSync(join(dir, f)))) stack.push('C#/.NET');

  return stack;
}

/**
 * What a project is built with, read from its manifests.
 *
 * Scans the root and one level below it, so an app-and-server repo reports both
 * halves rather than nothing.
 */
export function detectStack(projectPath: string): string[] {
  const stack = detectInDir(projectPath);

  if (SCAN_DEPTH > 0) {
    let children: string[] = [];
    try {
      children = readdirSync(projectPath, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
        .map(d => d.name);
    } catch { /* unreadable project directory */ }
    for (const child of children) stack.push(...detectInDir(join(projectPath, child)));
  }

  return [...new Set(stack)];
}

export function getProjectName(projectPath: string): string {
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return projectPath.split(/[\\/]/).filter(Boolean).pop() ?? 'unknown';
}
