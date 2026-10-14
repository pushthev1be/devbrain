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

/**
 * The one spelling of a git remote, used as a project's identity across clones.
 *
 * A path names one checkout, so every clone and every worktree of a repository
 * registered as a new, empty project: its own history then read as another
 * project's, and the same entry "seen in" two of them counted as seen in two
 * projects. The remote names the repository. Every way of writing the same one
 * reduces to host/owner/repo:
 *
 *   https://github.com/Owner/Repo.git      -> github.com/owner/repo
 *   git@github.com:Owner/Repo.git          -> github.com/owner/repo
 *   ssh://git@github.com:22/Owner/Repo     -> github.com/owner/repo
 *
 * Lower-cased whole, since the hosts people use are case-insensitive about
 * owner and name. Returns null for an empty string.
 */
export function normalizeRemote(url: string): string | null {
  let s = url.trim();
  if (!s) return null;
  // scp-like form: user@host:owner/repo (no scheme, colon before the path)
  const scp = /^[^/@\s]+@([^:/\s]+):(.+)$/.exec(s);
  if (scp) s = `${scp[1]}/${scp[2]}`;
  else s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');   // scheme
  s = s
    .replace(/^[^/@]*@/, '')           // user or user:token
    .replace(/^([^/:]+):\d+\//, '$1/') // port
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  return s ? s.toLowerCase() : null;
}
