import { ftHTMLexerError, ftHTMLParserError } from "fthtml/lib/utils/exceptions";
import { Diagnostic, DiagnosticSeverity, Range, _Connection } from "vscode-languageserver";
import { IBaseContext } from "../common/context";
import { FTHTMLLSParser } from "./parser";

export default class FTHTMLValidator {

    constructor(context: IBaseContext) {
        console.log('validating...');

        let diagnostics: Diagnostic[] = [];

        try {
            new FTHTMLLSParser(context.config).compile(context.document.getText());
        } catch (error) {
            if (error instanceof ftHTMLParserError ||
                error instanceof ftHTMLexerError) {
                let message = error.message.substring(error.message.lastIndexOf('Error:')).trim();

                const { position } = error;

                diagnostics.push({
                    severity: DiagnosticSeverity.Error,
                    range: Range.create(
                        position.line - 1,
                        position.start - 1,
                        position.line - 1,
                        position.end ? position.end - 1 : position.start - 1
                    ),
                    message: message.substring(0, message.indexOf('\n')),
                    source: "fthtml"
                })
            }
            else {
                console.log('error rendering file', error);
            }
        }
        finally {
            context.connection.sendDiagnostics({ uri: context.document.uri, diagnostics })
        }

    }
}