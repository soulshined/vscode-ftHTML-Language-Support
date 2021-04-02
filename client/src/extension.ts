import * as path from 'path';
import { workspace, ExtensionContext, TextDocument, commands, window, env, TextLine, Range, ViewColumn, TextEditorRevealType, ProgressLocation } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { DecorationsProvider } from './providers/decorations/text-decoration';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    console.log('Congratulations, your extension "ftHTML" is now active!');

    // The server is implemented in node
    let serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );

    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: [
            { scheme: 'file', language: 'fthtml' },
            { scheme: 'file', language: 'json', pattern: 'fthtmlconfig.json' }
        ],
        synchronize: {
            fileEvents: [
                workspace.createFileSystemWatcher('**/*.fthtml'),
                workspace.createFileSystemWatcher('**/fthtmlconfig.json')
            ]
        },
        outputChannelName: "ftHTML Language Support",
    };

    // Create the language client and start the client.
    client = new LanguageClient(
        'ftHTMLLanguageServer',
        'ftHTML Language Server',
        serverOptions,
        clientOptions,
    );

    // Start the client. This will also launch the server
    client.start();

    client.onReady().then(async () => {
        await client.sendRequest('extnValues', {
            path: context.extensionPath,
            uri: context.extensionUri
        });

        context.subscriptions.push(commands.registerCommand('fthtml.convert-html-on-paste', async () => {
            let data = await env.clipboard.readText();
            const editor = window.activeTextEditor;
            if (!data || !editor) return;

            data = data.trim();
            if (data.trim().length === 0) return;

            const { document, options, selection } = editor;

            let line = selection.start.line;
            let previousLine: TextLine;
            do previousLine = document.lineAt(line);
            while (--line >= 0 && previousLine.isEmptyOrWhitespace);

            window.withProgress({
                title: "Converting clipboard to ftHTML",
                location: ProgressLocation.Notification,
                cancellable: true
            }, async (progress, token) => {
                token.onCancellationRequested(async () => {
                    await commands.executeCommand('editor.action.clipboardPasteAction')
                })

                await client.sendRequest('pasted', {
                    doc: document,
                    options: options,
                    indent: previousLine.firstNonWhitespaceCharacterIndex,
                    data
                })
                    .then(async (e: { doc: TextDocument, fthtml: string }) => {
                        if (!e['fthtml'] || e.fthtml.trim().length === 0) {
                            progress.report({ increment: 100 });
                            await commands.executeCommand('editor.action.clipboardPasteAction')
                            return;
                        }

                        window.showTextDocument(e.doc, ViewColumn.Active, false)
                            .then(async editor => {
                                editor.revealRange(new Range(selection.start, selection.start), TextEditorRevealType.InCenter);
                                await editor.edit(eb => {
                                    eb.insert(selection.start, e.fthtml);
                                })
                                progress.report({ increment: 100 });
                            })
                    })
                    .catch(async e => {
                        console.log(e);
                        progress.report({ increment: 100 });
                        await commands.executeCommand('editor.action.clipboardPasteAction')
                    })

                return Promise.resolve();
            })

        }),

            client.onRequest('showOutputChannel', () => client.outputChannel.show(true)),
            client.onRequest('clearOutputChannel', () => {
                client.outputChannel.clear();
                return Promise.resolve();
            }),
            client.onRequest('updateDecorations', () => DecorationsProvider(client))
        )
    })

    window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            DecorationsProvider(client)
        }
    }, null, context.subscriptions)
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}