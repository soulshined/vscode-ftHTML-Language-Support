import { dirname, join, resolve } from "path";
import { Range } from "vscode-html-languageservice";
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
        const _sym = _getSymbolByKind(sym, context);

        if (_sym) links.push(_sym);
    })

    return links;
}

function _getSymbolByKind(symbol: DocumentSymbol, context) {
    const { range: { start, end }, name } = symbol;
    const split = name.split(" ", 2);
    let val = split[1];

    const range = {
        start: {
            line: start.line,
            character: start.character + split[0].length + 2
        },
        end: {
            line: end.line,
            character: start.character + split[0].length + val.length
        }
    }
    val = val.substring(1, val.length - 1).trim(); //remove quotes

    if (symbol.kind === SymbolKind.Function && symbol.name.startsWith("json"))
        return _getJsonSymbol(val, range, context);

    return _getImportSymbol(val, range, context);
}

function _getJsonSymbol(val: string, range: Range, context: IBaseContext) {
    if (val.startsWith("$")) return;

    const isByReference = val.startsWith('&');
    if (isByReference) val = val.substring(1);

    if (!val.startsWith('./') && !val.startsWith('/')) val = './' + val;
    else if (val.startsWith('/')) val = '.' + val;

    val += '.json';
    let dir = dirname(URI.parse(context.document.uri).fsPath);
    if (context.config && context.config.json.jsonDir && !isByReference)
        dir = context.config.json.jsonDir;

    return {
        range,
        target: URI.file(resolve(dir, val)).path
    }
}

function _getImportSymbol(val: string, range: Range, context) {
    const isByReference = val.startsWith('&');
    if (isByReference) val = val.substring(1);

    if (!val.startsWith('./') && !val.startsWith('/')) val = './' + val;
    else if (val.startsWith('/')) val = '.' + val;

    val += '.fthtml';
    let dir = dirname(URI.parse(context.document.uri).fsPath);
    if (context.config && context.config.json.importDir && !isByReference)
        dir = context.config.json.importDir;

    return {
        range,
        target: URI.file(resolve(dir, val)).path
    }
}

function _getFlatLinks(symbols: DocumentSymbol[]) : DocumentSymbol[] {
    const links = [];

    symbols.forEach(sym => {
        if (sym.kind === SymbolKind.Method && sym.name.startsWith('import'))
            links.push(sym);
        if (sym.kind === SymbolKind.Function && sym.name.startsWith('json'))
            links.push(sym);

        links.push(..._getFlatLinks(sym.children));
    })

    return links
}