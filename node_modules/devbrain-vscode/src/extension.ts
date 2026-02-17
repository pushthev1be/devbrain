import * as vscode from 'vscode';
import { storage } from '@devbrain/core';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevBrain extension is active');

    let disposable = vscode.commands.registerCommand('devbrain.openDashboard', () => {
        vscode.window.showInformationMessage('Opening DevBrain Dashboard...');
        // TODO: Open the React dashboard in a Webview
    });

    context.subscriptions.push(disposable);

    // Register the TreeView
    vscode.window.registerTreeDataProvider('devbrain-wisdom', new WisdomProvider());
}

class WisdomProvider implements vscode.TreeDataProvider<WisdomItem> {
    getTreeItem(element: WisdomItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: WisdomItem): Promise<WisdomItem[]> {
        if (element) return [];

        // Fetch from actual SQLite storage
        const fixes = await storage.getFixes();
        return fixes.map(f => new WisdomItem(f.errorMessage.split('\n')[0], f.mentalModel));
    }
}

class WisdomItem extends vscode.TreeItem {
    constructor(label: string, public readonly description: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = this.description;
    }
}

export function deactivate() { }
