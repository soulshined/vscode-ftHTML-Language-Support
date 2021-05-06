import { Token } from "fthtml/lib/model/token";
import { Utils } from "fthtml/lib/utils";
import { CompletionItem, CompletionItemKind, CompletionParams, SymbolKind } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IScopeContext } from "../../../common/context";
import { getElementsInReverse, isNullOrWhitespace } from "../../../common/utils/string";
import { FTHTMLDocumentSymbolFilter } from "../../symbol/document";
import { LiteralVariableMemberCompletionItem, VariableCompletionItem } from "../types";

const cachedVariables = {};
export async function VariableCompletionHandler(params: CompletionParams, context: IScopeContext): Promise<CompletionItem[]> {
    if (!params.context.triggerCharacter) return;

    const vars: { globals: {}, local: string[] } = {
        'globals': {},
        'local': []
    }

    if (context.config) {
        for (const [key, value] of Object.entries(context.config.json.globalvars))
            vars.globals[key] = value;
    }

    FTHTMLDocumentSymbolFilter(URI.parse(params.textDocument.uri),
        context,
        [SymbolKind.Struct, SymbolKind.Property, SymbolKind.Function]
    ).forEach(sym => {
        if (sym.detail === 'variables directive') {
            sym.children.forEach(child => {
                vars.local.push(child.name);
                if (cachedVariables[child.name] === undefined) {
                    const val = child.children[0];
                    if (Utils.Types.isObject(val)) {
                        // @ts-ignore
                        cachedVariables[child.name] = child.children[0].value;
                    }
                }
            })
        }
    });

    const locals = [...new Set(vars.local)];
    const items = [];

    Object.entries(vars.globals).forEach(([k, v]) => {
        items.push({
            label: `@${k}`,
            kind: CompletionItemKind.Variable,
            detail: `Global Variable => ${v}`,
            insertText: k,
            filterText: k
        })
    });
    items.push(...locals.map(e => {
        const item = VariableCompletionItem(e, 'Local Variable');
        item.label = e;
        item.insertText = e;
        item.filterText = e;
        return item;
    }));

    return items;
}

export async function LiteralVariableCompletionHandler(params: CompletionParams, context: IScopeContext): Promise<CompletionItem[]> {
    if (!params.context.triggerCharacter) return;

    const lineText = context.document.lineAt(params.position).text.substring(0, params.position.character);

    const elements = getElementsInReverse(lineText, 1, true);
    if (elements.length < 1) return [];

    let token = elements[0].token;

    if (!Token.isExpectedType(token, Token.TYPES.LITERAL_VARIABLE)) return [];

    const segments = getDotNotationSegments(token.value.substring(1));
    const varName = segments.shift();
    let variable = cachedVariables[varName];

    if (variable === undefined) return [];

    for (let i = 0; i < segments.length; i++) {
        const element = segments[i];
        variable = variable[element];

        if (variable === undefined) return [];
        if (!Utils.Types.isObject(variable)) return;
    }

    if (!Utils.Types.isObject(variable)) return;
    return Object.keys(variable).map(key => LiteralVariableMemberCompletionItem(key, params.position));
}

function getDotNotationSegments(text: string): string[] {
    const segments = [];

    let segment = '';
    let isGroup = false;
    let isString = false;
    for (let i = 0; i < text.length; i++) {
        const chr = text[i];
        if (['"', "'"].includes(chr) && !isString) {
            isString = true;
        }
        else if (['"', "'"].includes(chr) && isString) {
            if (!`${segment}${chr}`.endsWith('\\' + chr)) {
                isString = false;
                segments.push(segment);
                segment = '';
            }
            else segment += chr;
            continue;
        }
        else if (chr === '.' && !isString) {
            segments.push(segment);
            segment = '';
        }
        else if (chr === '[' && !isGroup && !isString) {
            segments.push(segment);
            segment = '';
            isGroup = true;
        }
        else if (chr === ']' && isGroup && !isString) {
            isGroup = false;
            segments.push(segment);
            segment = '';
        }
        else segment += chr;
    }

    if (isString || isGroup) return [];

    if (segment.trim().length !== 0)
        segments.push(segment);

    return segments.filter(e => !isNullOrWhitespace(e));
}