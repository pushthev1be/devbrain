/**
 * In the Claude Code plugin, take every setting from the plugin's own options
 * and from nothing else on the machine.
 *
 * Both the hooks and the MCP server receive an option `foo` as
 * CLAUDE_PLUGIN_OPTION_FOO: Claude Code exports that name to hooks itself, and
 * plugin.json sets the same name for the MCP server from `${user_config.foo}`.
 * That one naming convention is also what Anthropic's plugin directory checks
 * for: a server that reads some other variable looks as though it is reading a
 * credential off the user's machine.
 *
 * The internal names (MONGODB_URI, DEVBRAIN_TOKEN) are then overwritten, not
 * merely defaulted. A MONGODB_URI the user's shell carries is usually for their
 * own app, and read, it would have put DevBrain's memory in that app's database.
 *
 * Kept apart from globalEnv.ts, the ~/.devbrain/.env loader, so the plugin
 * build can leave that module out entirely and still have this.
 *
 * An unset or empty option means the default: local storage, and a dashboard
 * on localhost only.
 */
export function usePluginSettings(env: NodeJS.ProcessEnv = process.env): void {
  env.MONGODB_URI = env.CLAUDE_PLUGIN_OPTION_MONGODB_URI ?? '';
  env.DEVBRAIN_TOKEN = env.CLAUDE_PLUGIN_OPTION_DASHBOARD_TOKEN ?? '';
}
