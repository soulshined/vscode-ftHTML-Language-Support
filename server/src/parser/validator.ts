import { FTHTMLParser } from "fthtml/lib/parser/fthtml-parser";
import { FTHTMLExceptions } from "fthtml/lib/model/exceptions/fthtml-exceptions";
import StackTrace from "fthtml/lib/model/exceptions/fthtml-stacktrace";
import { Diagnostic, DiagnosticSeverity, Location, Range, _Connection } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../common/context";

export default class FTHTMLValidator {

    constructor(context: IBaseContext) {
        console.log('validating...');

        let diagnostics: Diagnostic[] = [];

        let uri = context.document.uri;
        try {
            StackTrace.clear();

            const file = URI.parse(context.document.uri).fsPath;
            new FTHTMLParser(context.config.json).parseSrc(context.document.getText(), file.substring(0, file.length - 7));
        } catch (error) {
            if (error instanceof FTHTMLExceptions.Parser ||
                error instanceof FTHTMLExceptions.Lexer ||
                error instanceof FTHTMLExceptions.Import) {
                const at = error.stack.match(/^[ ]{4}at\s(import|template)?\s*\(/m);
                const files = error.stack.substring(at.index).split("\n").map(m => {
                    let fname = m.substring(m.indexOf('(') + 1, m.lastIndexOf(')'));
                    fname = fname.substring(0, fname.lastIndexOf('.fthtml') + 7);
                    const [line, col] = m.substring(m.lastIndexOf('.fthtml:') + 8).split(':');

                    let start: number = parseInt(line) - 1;
                    let end: number = parseInt(col.trim().substring(0,col.trim().length - 1)) - 1;
                    const fend = /^[ ]{4}at\s(import|template)/.test(m) ? end + 6 : end + 1;

                    return {
                        location: Location.create(URI.file(fname).path, Range.create(start, end, start, fend)),
                        message: error.stack
                    }
                });

                const first = files.pop();
                uri = first.location.uri;

                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range : first.location.range,
                    message: error.message,
                    source: "fthtml",
                    relatedInformation: !error.stack ? undefined : files
                })
            }
        }
        finally {
            context.connection.sendDiagnostics({ uri, diagnostics })
        }

    }
}