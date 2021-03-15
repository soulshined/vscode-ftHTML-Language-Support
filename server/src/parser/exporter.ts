import { resolve } from "path";
import { Diagnostic, DiagnosticSeverity, Location, MessageActionItem, Position, Range } from "vscode-languageserver";
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
        let position = undefined;
        let stack = [];
        if (error.stderr) {
            if (error.stderr.match(/\s*ftHTML.*Error:[ ].*/) !== null) {
                let _stack = error.stderr.split(/[\r\n]/);
                if (_stack) {
                    _stack = _stack.filter((s: string) => s.trim() !== '');
                    _stack.splice(0, 3);
                    for (let i of _stack) {
                        stack.push(i);
                        console.log(i);
                        if (i.trim().startsWith("position")) {
                            let [line, column] = i.split(",");

                            line = +line.substring(line.lastIndexOf(" ") + 1);
                            column = +column.substring(column.lastIndexOf(" ") + 1);
                            position = Position.create(line - 1, column - 1);
                        }
                    }
                }

                if (position === undefined && _stack[0].startsWith("[ftHTMLImportError:")) {
                    let pos = _stack[1].substring(_stack[1].lastIndexOf('.fthtml:') + 8, _stack[1].length - 1).split(':')
                    position = Position.create(pos[0] - 1, pos[1].substring(0, pos[1].length - 1) - 1);
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
            const pos = position ?? Position.create(0,0);

            const diagnostic: Diagnostic = {
                severity: DiagnosticSeverity.Error,
                range: Range.create(pos, pos),
                message: 'Error on Export',
                source: "fthtml"
            }

            if (hasDiagnosticRelatedInformationCapability) {
                diagnostic.relatedInformation = [
                    {
                        message: '\n' + stack.join("\n").substring(1, stack.join("\n").lastIndexOf(']')),
                        location: Location.create(document.uri, Range.create(pos,pos))
                    }
                ]
            }
            connection.sendDiagnostics({ uri: document.uri, diagnostics: [diagnostic] })
        }
        else console.log(error);
    }
}