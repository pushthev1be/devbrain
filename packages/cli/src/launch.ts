/**
 * The programs the CLI starts: a file opener, and the command `devbrain run`
 * wraps.
 *
 * A module of its own so the plugin build can leave it out (OMITTED_FROM_PLUGIN
 * in scripts/bundle.mjs). No plugin component opens a file or runs `devbrain
 * run`, and Anthropic's plugin directory holds a plugin whose code starts a
 * program from a path or command put together at run time.
 */
import { execFile, spawn } from 'child_process';

// The target goes to the opener as one argument, never into a shell string: it
// can be an entry's own content, and a quote in it would have ended the string.
export function openPath(target: string): void {
  const opener = process.platform === 'win32' ? 'explorer'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(opener, [target], () => {});
}

/**
 * Run a command line through the shell, handing each chunk of its output to
 * `onOutput` as it arrives. Resolves to the exit code, 127 if it never started.
 */
export function runCommand(
  argv: string[],
  onOutput: (chunk: Buffer, to: NodeJS.WriteStream) => void,
): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(argv.join(' '), {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', c => onOutput(c, process.stdout));
    child.stderr?.on('data', c => onOutput(c, process.stderr));
    child.on('error', () => resolve(127));
    child.on('close', c => resolve(c ?? 0));
  });
}
