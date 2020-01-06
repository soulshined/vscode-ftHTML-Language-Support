'user strict';

import * as fthtml from "fthtml"
import * as vscode from "vscode";
import { FTHTMLConfigs } from "../fthtml.configs";
import { exists } from "../utils/common";
import { exec } from "../utils/cmd";
import * as path from 'path';

let _channel: vscode.OutputChannel;
export default class FTHTMLParserProvider implements vscode.Disposable {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private configs: FTHTMLConfigs;

    constructor(subscriptions: vscode.Disposable[]) {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('fthtml');
        this.configs = new FTHTMLConfigs();

        subscriptions.push(this);
        vscode.workspace.onDidChangeConfiguration(e => {
            this.configs = new FTHTMLConfigs();
        }, this, subscriptions);

        vscode.workspace.onDidSaveTextDocument((doc) => {
            if (this.configs.exportOnSave === true) {
                if (doc.languageId !== 'fthtml') return;

                this.exportftHTML();
                return;
            }

            if (this.configs.validateOnSave) this.renderDocSync(doc);
        }, this, subscriptions);

        vscode.workspace.onDidOpenTextDocument((doc) => {
            this.renderDocSync(doc);
        }, this, subscriptions);

        vscode.workspace.onDidCloseTextDocument((doc) => {
            this.diagnosticCollection.delete(doc.uri);
        }, this, subscriptions);
    }

    public dispose(): void {
        this.diagnosticCollection.clear();
        this.diagnosticCollection.dispose();
    }

    private getOutputChannel(): vscode.OutputChannel {
        if (!_channel) {
            _channel = vscode.window.createOutputChannel('ftHTML');
        }
        return _channel;
    }

    private async exportftHTML() {
        let ws = vscode.workspace.workspaceFolders;
        if (ws) {
            if (this.configs.clearOutputOnSave) this.getOutputChannel().clear();
            this.getOutputChannel().appendLine(`-----------------------------------------${new Date().toLocaleString()}`);
            if (!await exists(path.join(ws[0].uri.fsPath, 'fthtmlconfig.json'))) {
                this.getOutputChannel().appendLine('fthtmlconfig.json file not found. Please add one to the workspaces root directory to use this feature (currently in beta)');
                return;
            }

            this.getOutputChannel().appendLine(`fthtmlconfig.json file found...attemping to convert ftHTML ⊷ HTML\n`);

            try {
                let { stdout, stderr } = await exec('fthtml convert', { cwd: ws[0].uri.fsPath });
                if (stderr && stderr.length > 0) {
                    this.getOutputChannel().appendLine(stderr);
                    vscode.window.showErrorMessage("Error converting ftHTML", "View")
                        .then((val) => {
                            if (val == 'View') this.getOutputChannel().show(true);
                        });
                }

                if (stdout) {
                    let channel = this.getOutputChannel();
                    channel.appendLine(stdout);
                }
            } catch (error) {
                console.log(error);
                let channel = this.getOutputChannel();
                channel.appendLine('Attempting to convert ftHTML failed.\n');
                if (error.stderr) {
                    if (error.stderr.match(/\s*ftHTML.*Error:[ ].*/) !== null) {
                        let stack = error.stderr.split(/[\r\n]/);
                        if (stack) {
                            stack = stack.filter((s: string) => s.trim() !== '');
                            stack.splice(0, 3);
                            for (let line of stack) {
                                channel.appendLine(line);
                            }
                        }
                    }
                    else {
                        channel.appendLine(error.stderr);
                    }
                }
                channel.appendLine('');
                vscode.window.showErrorMessage("Error converting ftHTML", "View")
                    .then((val) => {
                        if (val == 'View') channel.show(true);
                    });
            }
        }
    }

    private renderDocSync(doc: vscode.TextDocument): void {
        if (doc.uri.scheme === 'file' && doc.languageId === 'fthtml') {
            let rel = doc.uri.path.substring(1, doc.uri.path.lastIndexOf('.fthtml'));
            this.diagnosticCollection.set(doc.uri, []);
            try {
                fthtml.renderFile(rel);
            } catch (error) {
                error = error.toString().substring(error.toString().lastIndexOf('Error:') + 6).trim();
                let match: RegExpExecArray | null;
                const diagnostics: vscode.Diagnostic[] = [];

                if ((match = /\s\@ (\d+)\:(\d+)\-(\d+)/.exec(error)) !== null) {
                    const [line, col, eCol] = [match[1], match[2], match[3]].map((m) => { return parseInt(m) - 1 });
                    diagnostics.push(new vscode.Diagnostic(new vscode.Range(line, col, line, eCol), error.substring(0, error.indexOf('@')), vscode.DiagnosticSeverity.Error));
                }
                this.diagnosticCollection.set(doc.uri, diagnostics);
            }
        }
    }
}

