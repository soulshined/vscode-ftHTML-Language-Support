import { TOKEN_TYPE as TT } from "fthtml/lib/lexer/token";
import { ftHTMLParser } from "fthtml/lib/parser/fthtml-parser";
import { IFTHTMLElement } from "fthtml/lib/parser/types";
import { StackTrace } from "fthtml/lib/utils/exceptions";
import { isExpectedType, isOneOfExpectedTypes } from "fthtml/lib/utils/functions";
import { DocumentSymbol, DocumentSymbolParams, SymbolKind } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../../common/context";
import { getFTHTMLTokenValue } from "../../common/utils/token";

export default function FTHTMLDocumentSymbolProviderHandler(params: DocumentSymbolParams, context: IBaseContext): DocumentSymbol[] {

    try {
        StackTrace.clear();
        return FTHTMLDocumentSymbolFilter(URI.parse(params.textDocument.uri), context);
    } catch (error) {
        console.log("Error rendering file for document symbols", error);
        return [];
    }

}

const DEFAULT_ALLOWED_SYMBOLS = [
    SymbolKind.Constant,
    SymbolKind.Function,
    SymbolKind.Method,
    SymbolKind.Variable,
    SymbolKind.Property,
    SymbolKind.Struct,
    SymbolKind.Null
]

export function FTHTMLDocumentSymbolFilter(uri: URI, context: IBaseContext, allowedSymbols: SymbolKind[] = DEFAULT_ALLOWED_SYMBOLS) {

    try {
        let filename = uri.fsPath;
        if (!filename.endsWith('.fthtml')) return;

        filename = filename.substring(0, filename.length - 7);

        StackTrace.clear();

        return _getSymbols(new ftHTMLParser().parseFile(filename), context.settings.includeTagNamesInSymbols, allowedSymbols);
    } catch (error) {
        console.log("Error rendering file for document symbols", error);
        return [];
    }
}

function _isSymbolType(element: IFTHTMLElement) {
    return isOneOfExpectedTypes(element.token, ['Keyword_import', TT.VARIABLE, TT.FUNCTION, TT.MACRO, 'Word_json']);
}

function _isSymbolTypeForProperties(element: IFTHTMLElement) {
    return isOneOfExpectedTypes(element.token, ['Keyword_import', 'Pragma_templates', 'Pragma_tinytemplates', 'Pragma_vars']);
}

function _getSymbolKind(element: IFTHTMLElement): SymbolKind {
    if (isOneOfExpectedTypes(element.token, [TT.VARIABLE, TT.ATTR_CLASS_VAR]))
        return SymbolKind.Variable;
    if (isExpectedType(element.token, TT.MACRO))
        return SymbolKind.Constant;
    if (isExpectedType(element.token, TT.FUNCTION))
        return SymbolKind.Function;
    if (isExpectedType(element.token, 'Keyword_import'))
        return SymbolKind.Method;
    if (isOneOfExpectedTypes(element.token, ['Pragma_vars', 'Pragma_tinytemplates', 'Pragma_templates']))
        return SymbolKind.Struct;

    return SymbolKind.Null;
}

const NewDocumentSymbol = function (element: IFTHTMLElement): DocumentSymbol {
    const kind = _getSymbolKind(element);

    let detail;
    if (kind === SymbolKind.Struct) {
        if (isExpectedType(element.token, 'Pragma_vars')) {
            detail = 'variables directive';
        }
        else {
            detail = 'tinytemplates directive';
        }
    }

    return {
        kind,
        detail,
        name: element.token.value,
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
        children: []
    }
}

function _getFlatListOfSymbols(symbols: DocumentSymbol[], allowedSymbols: SymbolKind[]): DocumentSymbol[] {
    const links = [];

    symbols.forEach(sym => {
        if (allowedSymbols.includes(sym.kind))
            links.push(sym);

        links.push(..._getFlatListOfSymbols(sym.children, allowedSymbols));
    })

    return links
}

function _getSymbols(elements: IFTHTMLElement[], includeTagNamesInSymbols: boolean, allowedSymbols: SymbolKind[], isPropertyLevel: boolean = false): DocumentSymbol[] {
    const syms: DocumentSymbol[] = [];
    elements.forEach(element => {
        if (isExpectedType(element.token, TT.STRING)) return;
        if (!_isSymbolType(element) && element.children.length === 0 && !element.attrs) return;
        const sym: DocumentSymbol = NewDocumentSymbol(element);
        if (isPropertyLevel && isExpectedType(element.token, TT.WORD)) sym.kind = SymbolKind.Property;

        if (element.attrs) {
            element.attrs.get('classes').forEach(attr => {
                if (isOneOfExpectedTypes(attr.token, [TT.ATTR_CLASS_VAR]) && allowedSymbols.includes(SymbolKind.Variable)) {
                    if (includeTagNamesInSymbols)
                        sym.children.push(NewDocumentSymbol(attr));
                    else
                        syms.push(NewDocumentSymbol(attr));
                }
            })

            element.attrs.get('kvps').forEach(attr => {
                if (isOneOfExpectedTypes(attr.children[0].token, [TT.MACRO, TT.VARIABLE])) {
                    const val = NewDocumentSymbol(attr.children[0]);
                    if (allowedSymbols.includes(val.kind)) {
                        if (includeTagNamesInSymbols) sym.children.push(val);
                        else syms.push(val)
                    }
                }
            })

            element.attrs.get('misc').forEach(attr => {
                if (isOneOfExpectedTypes(attr.token, [TT.MACRO, TT.VARIABLE])) {
                    const val = NewDocumentSymbol(attr);
                    if (allowedSymbols.includes(val.kind)) {
                        if (includeTagNamesInSymbols) sym.children.push(val);
                        else syms.push(val)
                    }
                }
            })

        }

        if (!_isSymbolType(element) && _isSymbolTypeForProperties(element)) {
            const children = _getSymbols(element.children, includeTagNamesInSymbols, allowedSymbols, true);
            sym.children.push(...children);
            if (allowedSymbols.includes(sym.kind))
                syms.push(sym);
            else syms.push(..._getFlatListOfSymbols(children, allowedSymbols));
            return;
        }
        else if (!_isSymbolType(element) && (!element.attrs || !includeTagNamesInSymbols) && !isPropertyLevel)
            syms.push(..._getSymbols(element.children, includeTagNamesInSymbols, allowedSymbols));
        else {

            if (isExpectedType(element.token, 'Keyword_import')) {
                sym.name = `import ${getFTHTMLTokenValue(element.children[0])}`;
                let children;
                if (element.isParentElement) {
                    children = _getSymbols(element.children.slice(1), includeTagNamesInSymbols, allowedSymbols, true);
                    sym.children = children;
                }
                if (allowedSymbols.includes(sym.kind))
                    syms.push(sym);
                else if (children) syms.push(..._getFlatListOfSymbols(children, allowedSymbols));
                return;
            }
            else if (isExpectedType(element.token, TT.FUNCTION)) {
                sym.name = `${element.token.value}(${element.children.map(arg => getFTHTMLTokenValue(arg)).join(" ")})`;
            }
            else if (isExpectedType(element.token, 'Word_json')) {
                sym.name = `json ${getFTHTMLTokenValue(element.children[0])}`;
                sym.kind = SymbolKind.Function;
            }
            else if (isExpectedType(element.token, TT.WORD) && element.attrs) {
                if (element.attrs.get('id').length === 1)
                    sym.name = `${element.token.value}#${element.attrs.get('id')[0].token.value}`;
                else if (element.attrs.get('classes').length > 0)
                    sym.name = `${element.token.value}.${element.attrs.get('classes')[0].token.value}`;
            }

            const children = element.children.length > 0 ? _getSymbols(element.children, includeTagNamesInSymbols, allowedSymbols) : [];
            sym.children.push(...children);
            if (allowedSymbols.includes(sym.kind)) syms.push(sym);
            else if (children.length > 0) syms.push(..._getFlatListOfSymbols(children, allowedSymbols));
        }

    });

    return syms;
}