import { DocumentOnTypeFormattingParams, Range, TextEdit } from "vscode-languageserver";
import { IScopeContext } from "../../common/context";
import { repeat } from "../../common/utils/string";

export default function FTHTMLOnTypeProviderHandler(params: DocumentOnTypeFormattingParams, context: IScopeContext) {
    const result: TextEdit[] = [];

    switch (params.ch) {
        case '\n':
            const { format } = context.settings;
            const lineAt = context.document.lineAt(params.position.line - 1);

            if ((format.braces.newLineAfterEmbeddedLangs && lineAt.text.match(/^\s*(?:js|css)\s*{\s*$/) !== null) ||
                (format.braces.newLineAfterElement && lineAt.text.match(/^\s*[\w-]+(?<!css|js)\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*{\s*$/) !== null) ||
                (format.braces.newLineAfterAttributes && lineAt.text.match(/^\s*[\w-]+\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*\([^\)]*.*\)\s*{\s*$/) !== null)) {

                const newText = lineAt.text.substring(0, lineAt.text.lastIndexOf('{')) +
                    '\n' +
                    lineAt.text.substring(0, lineAt.firstNonWhitespaceCharacterIndex) +
                    '{\n' +
                    repeat(params.options.insertSpaces ? ' ' : '\t', params.options.tabSize + 1);

                result.push({
                    range: Range.create(params.position.line - 1, 0, params.position.line, lineAt.firstNonWhitespaceCharacterIndex),
                    newText
                });
            }
            break;
        default:
            break;
    }
    return Promise.resolve(result);
}