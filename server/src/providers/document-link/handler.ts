import { dirname, join, resolve } from "path";
import { DocumentLink, DocumentLinkParams, DocumentSymbol, SymbolKind } from "vscode-languageserver-protocol";
import { URI } from "vscode-uri";
import { IBaseContext } from "../../common/context";
import FTHTMLDocumentSymbolProviderHandler from "../symbol/document";

export function OnDocumentLinkProvider(params: DocumentLinkParams, context: IBaseContext): DocumentLink[] {
    let syms = _getFlatLinks(FTHTMLDocumentSymbolProviderHandler(params, context));
    const links : DocumentLink[] = [];

    if (!context.workspace) {
        console.log('workspace not found for document linking');
        return links;
    }

    syms.forEach((sym: DocumentSymbol) => {
        const { range: { start, end }, name } = sym;
        let val = name.split(" ", 2)[1];

        const range = {
            start: {
                line: start.line,
                character: start.character + "import ".length
            },
            end: {
                line: end.line,
                character: start.character + "import ".length + val.length - 2
            }
        }

        val = val.substring(1, val.length - 1); //remove quotes

        const isByReference = val.startsWith('&');
        if (isByReference) val = val.substring(1);

        if (!val.startsWith('./') && !val.startsWith('/')) val = './' + val;
        else if (val.startsWith('/')) val = '.' + val;

        val += '.fthtml';

        let dir = dirname(URI.parse(context.document.uri).fsPath);
        if (context.config && context.config.json.importDir && !isByReference)
            dir = join(URI.parse(context.workspace.uri).fsPath, context.config.json.importDir);

        links.push({
            range,
            target: URI.file(resolve(dir, val)).path
        })
    })

    return links;
}

function _getFlatLinks(symbols: DocumentSymbol[]) : DocumentSymbol[] {
    const links = [];

    symbols.forEach(sym => {
        if (sym.kind === SymbolKind.Method && sym.name.startsWith('import'))
            links.push(sym);

        links.push(..._getFlatLinks(sym.children));
    })

    return links
}