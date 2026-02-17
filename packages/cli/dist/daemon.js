"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDaemon = startDaemon;
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
function startDaemon(watchPath) {
    console.log(chalk_1.default.blue(`[DevBrain Daemon] Watching ${watchPath}...`));
    const watcher = chokidar_1.default.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });
    watcher.on('change', (filePath) => {
        console.log(chalk_1.default.gray(`[FS_EVENT] File changed: ${path_1.default.basename(filePath)}`));
        // Trigger analysis if it's a code file
        if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx')) {
            // TODO: Automatic background analysis
        }
    });
    return watcher;
}
