/**
 * The one spelling of a project path, used whenever one is stored or looked up.
 *
 * Projects are found by exact path, and Windows hands the same folder over in
 * more than one spelling: VS Code passes hooks `c:\Users\…` while Node's
 * process.cwd() gives `C:\Users\…`, and git prints `C:/Users/…`. Compared as
 * written, a registered project was "not a DevBrain project" to every hook the
 * editor ran, so session briefings, prompt recall and failure recall all went
 * silent without a single error.
 *
 * Deliberately not path.resolve: a POSIX path must stay as it is on any OS.
 */
export function normalizeProjectPath(p: string): string {
  const drive = /^([a-zA-Z]):[\\/]/.exec(p);
  if (drive) {
    const rest = p.slice(2).replace(/\//g, '\\').replace(/\\+$/, '');
    return `${drive[1].toUpperCase()}:${rest || '\\'}`;
  }
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/** True when two paths name the same project. */
export function sameProjectPath(a: string, b: string): boolean {
  return normalizeProjectPath(a) === normalizeProjectPath(b);
}
