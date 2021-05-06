import { resolve } from "path";
import { Diagnostic, DiagnosticSeverity, Location, MessageActionItem, Range } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../common/context";
import { exec } from "../common/utils/cmd";

export default async function FTHTMLExport(context: IBaseContext, extn: { path: string, uri: URI }, hasDiagnosticRelatedInformationCapability: boolean) {
    const { connection, settings, document, workspace } = context;

    if (settings.export.clearOutput) await connection.sendRequest('clearOutputChannel')
    if (settings.export.onErrorOutputMode === "problem-panel")
        connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });

    console.log(`-----------------------------------------${new Date().toLocaleString()}`)

    const viewAction: MessageActionItem = {
        title: "View"
    }

    try {
        const path = resolve(extn.uri.fsPath, './server/node_modules/fthtml/cli/bin/fthtml');

        let options = {
            cwd: URI.parse(workspace.uri).fsPath
        }
        if (settings.shell.trim() !== '')
            options['shell'] = settings.shell

        const { stdout } = await exec(`node "${path}" convert`, options);
        console.log(stdout ?? '');
        console.log(`-----------------------------------------`);
    } catch (error) {
        console.log('Attempting to convert ftHTML failed.\n');
        let message;
        let stack = [];
        if (error.stderr) {
            if (error.stderr.match(/\s*FTHTML.*Error[\]]?:[ ].*/) !== null) {
                let _stack = error.stderr.split(/[\r\n]/);
                if (_stack) {
                    _stack = _stack.filter((s: string) => s.trim() !== '');
                    for (let i = 0; i < _stack.length; i++) {
                        console.log(_stack[i]);
                        if (message === undefined && /\s*FTHTML.*Error[\]]?:[ ].*/.test(_stack[i]))
                            message = _stack[i].substring(_stack[i].indexOf(':') + 1).trim();
                        else if (/^at\s(import|template)?\s*\(/.test(_stack[i].trim())) {
                            let fname = _stack[i].substring(_stack[i].indexOf('(') + 1, _stack[i].lastIndexOf(')'));
                            const [line, col] = fname.substring(fname.lastIndexOf('.fthtml:') + 8).split(':');

                            fname = fname.substring(0, fname.lastIndexOf('.fthtml') + 7);
                            const end = /^at\s(import|template)/.test(_stack[i].trim()) ? +col + 6 : +col;
                            stack.push({
                                location: Location.create(URI.file(fname).path, Range.create(+line - 1, +col - 1, +line - 1, end - 1)),
                                message: stack.length > 0 ? '\n  at ' + stack.map(m => m.location.uri).join("\n  at ") : ''
                            })
                        }
                        else if (message !== undefined && stack.length === 0) message += `\n${_stack[i]}`;
                    }
                }
            }
            else {
                console.log(error.stderr);
            }
        }

        console.log(`-----------------------------------------`);

        if (settings.export.onErrorOutputMode === 'prompt')
            connection.window.showErrorMessage("Error converting ftHTML", viewAction)
                .then((val: MessageActionItem) => {
                    if (val && val.title == 'View') connection.sendRequest('showOutputChannel');
                });
        else if (settings.export.onErrorOutputMode === 'show') {
            connection.sendRequest('showOutputChannel');
        }
        else if (settings.export.onErrorOutputMode === "problem-panel") {
            const first = stack.shift();
            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: first.location.range,
                message: message ?? 'Error on Export',
                source: "fthtml"
            }

            if (hasDiagnosticRelatedInformationCapability) {
                diagnostic.relatedInformation = stack;
            }
            connection.sendDiagnostics({ uri: first.location.uri, diagnostics: [diagnostic] })
        }
        else console.log(error);
    }
}