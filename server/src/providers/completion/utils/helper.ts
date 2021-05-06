import { InsertTextFormat } from "vscode-languageserver/node";
import elangs from "../../../common/documentation/elangs";
import functions from "../../../common/documentation/functions";
import macros from "../../../common/documentation/macros";
import { ConstantCompletionItem, FunctionCompletionItem, KeywordCompletionItem, MarkdownDocumentation, VariableCompletionItem } from "../types";

export function getFunctionCompletionItems(predicate?: (key) => boolean) {
    if (predicate)
        return Object.keys(functions).filter(predicate).map(FunctionCompletionItem);

    return Object.keys(functions).map(FunctionCompletionItem);
}

export function getMacroCompletionItems() {
    return Object.keys(macros).map(macro => {
        const item = ConstantCompletionItem(macro);
        item.insertTextFormat = InsertTextFormat.PlainText;
        item.insertText = `__${macro}__`;
        item.detail = "Macro";
        item.documentation = MarkdownDocumentation(macros[macro].documentation);
        return item;
    })
}

export function getElangCompletionItems(format) {
    return Object.keys(elangs).map(elang => {
        const item = KeywordCompletionItem(elang);
        item.insertText = `${elang} ${format.braces.newLineAfterEmbeddedLangs ? '\n{' : ' {'}\n\t$0\n}`;
        return item;
    })
}

export function getVariableCompletionItems(vars: { globals: {}, local: string[] }) {
    const items = [];

    Object.entries(vars.globals).forEach(([k, v]) => {
        items.push(VariableCompletionItem(k, `Global Variable => ${v}`))
    });

    const locals = [...new Set(vars.local)];
    items.push(...locals.map(e => VariableCompletionItem(e, 'Local Variable')));
    return items;
}