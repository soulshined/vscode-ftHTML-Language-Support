import { CompletionItem, CompletionItemKind, CompletionParams, SymbolKind } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IScopeContext } from "../../../common/context";
import { FTHTMLDocumentSymbolFilter } from "../../symbol/document";
import { VariableCompletionItem } from "../types";

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
        [SymbolKind.Struct, SymbolKind.Property]
    ).forEach(sym => {
        if (sym.detail === 'variables directive')
            vars.local.push(...sym.children.map(child => child.name))
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
