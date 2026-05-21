import { existsSync, readFileSync } from 'fs';
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

export function detectStack(projectPath: string): string[] {
  const stack: string[] = [];

  // Node.js / JS / TS
  const pkgPath = join(projectPath, 'package.json');
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

  if (existsSync(join(projectPath, 'Cargo.toml'))) stack.push('Rust');
  if (existsSync(join(projectPath, 'go.mod'))) stack.push('Go');
  if (existsSync(join(projectPath, 'pom.xml')) || existsSync(join(projectPath, 'build.gradle'))) stack.push('Java');
  if (existsSync(join(projectPath, 'Gemfile'))) stack.push('Ruby');

  const pythonSignals = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  if (pythonSignals.some(f => existsSync(join(projectPath, f)))) stack.push('Python');

  const dotnetSignals = ['*.csproj', '*.fsproj', '*.sln'];
  if (dotnetSignals.some(f => existsSync(join(projectPath, f)))) stack.push('C#/.NET');

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
