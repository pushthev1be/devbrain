/**
 * In the Claude Code plugin, take the database from the plugin's own settings
 * and from nothing else on the machine.
 *
 * Claude Code hands the `mongodb_uri` option to hooks as
 * CLAUDE_PLUGIN_OPTION_MONGODB_URI and to the MCP server as DEVBRAIN_MONGODB_URI,
 * which plugin.json sets from `${user_config.mongodb_uri}`. A MONGODB_URI the
 * user's shell or project happens to carry is theirs, usually for their own app,
 * and is overwritten here: read, it would have put DevBrain's memory in that
 * app's database. Anthropic's plugin directory holds a plugin that reads a
 * credential from the machine rather than from a value the user chose to share.
 *
 * Kept apart from globalEnv.ts, the ~/.devbrain/.env loader, so the plugin
 * build can leave that module out entirely and still have this.
 *
 * Unset in both means local storage, the same as an empty option.
 */
export function usePluginSettings(env: NodeJS.ProcessEnv = process.env): void {
  env.MONGODB_URI = env.CLAUDE_PLUGIN_OPTION_MONGODB_URI ?? env.DEVBRAIN_MONGODB_URI ?? '';
}
