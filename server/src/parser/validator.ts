import { ftHTMLParser } from "fthtml/lib/parser/fthtml-parser";
import { ftHTMLexerError, ftHTMLImportError, ftHTMLParserError, StackTrace } from "fthtml/lib/utils/exceptions";
import { Diagnostic, DiagnosticSeverity, Range, _Connection } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../common/context";

export default class FTHTMLValidator {

    constructor(context: IBaseContext) {
        console.log('validating...');

        let diagnostics: Diagnostic[] = [];

        try {
            StackTrace.clear();

            const file = URI.parse(context.document.uri).fsPath;
            new ftHTMLParser().parseSrc(context.document.getText(), file.substring(0, file.length - 7), context.config.json);
        } catch (error) {
            if (error instanceof ftHTMLParserError ||
                error instanceof ftHTMLexerError ||
                error instanceof ftHTMLImportError) {
                const { position } = error;

                const range = Range.create(
                    position.line - 1,
                    position.start - 1,
                    position.line - 1,
                    position.end ? position.end - 1 : position.start - 1
                );

                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range,
                    message: error.message,
                    source: "fthtml",
                    relatedInformation: !error.stack ? undefined :
                        [
                            {
                                location: {
                                    range,
                                    uri: context.document.uri
                                },
                                message: error.stack
                            }
                        ]
                })
            }
        }
        finally {
            context.connection.sendDiagnostics({ uri: context.document.uri, diagnostics })
        }

    }
}