import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../../common/context";
import { ftHTMLElement } from "../../parser/model";
import { FTHTMLLSParser } from "../../parser/parser";
import StackTrace from "../../parser/stacktrace";

export default function FTHTMLDocumentSymbolProviderHandler(params: DocumentSymbolParams, context: IBaseContext): DocumentSymbol[] {

    try {
        let filename = URI.parse(params.textDocument.uri).fsPath;
        const extn = filename.endsWith('.fthtml');
        if (extn) filename = filename.substring(0, filename.length - 7);

        StackTrace.clear();

        return _getSymbols(new FTHTMLLSParser(context.config).renderFile(filename), context.settings.includeTagNamesInSymbols);
    } catch (error) {
        console.log("Error rendering file for document symbols");
        return [];
    }

}

function _getSymbols(elements: ftHTMLElement[], includeTagNamesInSymbols: boolean): DocumentSymbol[] {
    const syms: DocumentSymbol[] = [];
    elements.forEach(element => {
        if (element.symbolKind === SymbolKind.String) return;
        if (element.symbolKind === SymbolKind.Null && element.children.length === 0) return;


        if (element.symbolKind === SymbolKind.Null && (!element.attrs || !includeTagNamesInSymbols))
            syms.push(..._getSymbols(element.children, includeTagNamesInSymbols));
        else {
            let name = element.token.value;
            if (element.symbolKind === SymbolKind.Method && element.token.value === 'import')
                name = `import ${element.children[0].token.value}`

            if (element.symbolKind === SymbolKind.Null && element.attrs && element.attrs.get('id').size === 1)
                name = `${element.token.value}#${element.attrs.get('id').values().next().value}`;
            else if (element.symbolKind === SymbolKind.Null && element.attrs) {
                const classes = element.attrs.get('classes');
                if (classes.size > 0)
                    name = `${element.token.value}${classes.values().next().value}`;
            }

            syms.push({
                kind: element.symbolKind,
                name,
                range: {
                    start: {
                        line: element.token.position.line - 1,
                        character: element.token.position.column - 1
                    },
                    end: {
                        line: element.token.position.line - 1,
                        character: element.token.position.column + element.token.value.length - 1
                    }
                },
                selectionRange: {
                    start: {
                        line: Math.max(element.token.position.line - 1, 0),
                        character: Math.max(element.token.position.column - 1, 0)
                    },
                    end: {
                        line: Math.max(element.token.position.line - 1, 0),
                        character: Math.max(element.token.position.column - 1 + element.token.value.length, 0)
                    }
                },
                children: element.children.length > 0 ? _getSymbols(element.children, includeTagNamesInSymbols) : []
            })
        }

    });

    return syms;
}