import chokidar from 'chokidar';
import path from 'path';
import { storage } from '@devbrain/core';
import chalk from 'chalk';

export function startDaemon(watchPath: string) {
    console.log(chalk.blue(`[DevBrain Daemon] Watching ${watchPath}...`));

    const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });

    watcher.on('change', (filePath) => {
        console.log(chalk.gray(`[FS_EVENT] File changed: ${path.basename(filePath)}`));
        // Trigger analysis if it's a code file
        if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.tsx')) {
            // TODO: Automatic background analysis
        }
    });

    return watcher;
}
