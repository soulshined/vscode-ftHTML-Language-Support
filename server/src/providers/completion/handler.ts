import {
    CompletionItem,
    InsertTextFormat,
    TextDocumentPositionParams
} from "vscode-languageserver";
import { IBaseContext } from "../../common/context";
import elangs from "../../common/documentation/elangs";
import functions, { getFunctionConstructor, misc_methods } from "../../common/documentation/functions";
import macros from "../../common/documentation/macros";
import { ConstantCompletionItem, FunctionCompletionItem, KeywordCompletionItem, MarkdownDocumentation, MethodCompletionItem, SnippetCompletionItem } from "./types";

export function OnCompletionHandler(positionParams: TextDocumentPositionParams, context: IBaseContext): CompletionItem[] {
    const { settings: { format } } = context;

    const child = SnippetCompletionItem("child", `\${1:div} ${format.braces.newLineAfterElement ? '\n{' : ' {'}\n\t$0\n}`);

    const childWithAttrs = SnippetCompletionItem("childWithAttributes", `\${1:div} ${format.braces.newLineAfterAttributes ? '\n{' : ' {'}\n\t$0\n}`)

    let snippets  = [
        KeywordCompletionItem("comment"),
        MethodCompletionItem("import"),
        MethodCompletionItem("template"),
        child,
        childWithAttrs
    ]

    if (positionParams.position.line === 0)
        snippets.push(KeywordCompletionItem('doctype'))

    // region MACROS
    Object.keys(macros).forEach(macro => {
        const item = ConstantCompletionItem(macro);
        item.insertTextFormat = InsertTextFormat.PlainText;
        item.insertText =  `__${macro}__`;
        item.detail = "Macro";
        item.documentation = MarkdownDocumentation(macros[macro].documentation),
        snippets.push(item);
    })
    // endregion MACROS

    // region ELANGS
    Object.keys(elangs).forEach(elang => {
        const item = KeywordCompletionItem(elang);
        item.insertText = `${elang} ${format.braces.newLineAfterEmbeddedLangs ? '\n{' : ' {'}\n\t$0\n}`;
        snippets.push(item);
    })
    // endregion ELANGS

    // region FUNCTIONS
    Object.keys(functions).forEach(func =>
        snippets.push(FunctionCompletionItem(func)
    ))
    // endregion FUNCTIONS

    return snippets;
}

export function CompletionResolveHandler(item: CompletionItem): CompletionItem {
    item.insertTextFormat = InsertTextFormat.Snippet;

    switch (item.label) {
        case 'comment':
            item.insertText = 'comment "$0"';
            item.detail = getFunctionConstructor('comment');
            item.documentation = MarkdownDocumentation(misc_methods['comment'].documentation);
            break;
        case 'import':
            item.insertText = 'import "$0"';
            item.detail = getFunctionConstructor('import');
            item.documentation = MarkdownDocumentation(misc_methods['import'].documentation);
            break;
        case 'template':
            item.insertText = 'import "$1" {\n\t${2:bindingProperty} "${3:value}"$4\n}';
            item.detail = getFunctionConstructor('template');
            item.documentation = MarkdownDocumentation(misc_methods['template'].documentation);
            break;
        case 'doctype':
            item.insertText = 'doctype "${0:html}"';
            break;
        default:
            if (elangs[item.label]) {
                item.detail = 'Embedded Language';
                item.documentation = MarkdownDocumentation(elangs[item.label].documentation);
            }
            else if (functions[item.label]) {
                item.detail = getFunctionConstructor(item.label);
                item.documentation = MarkdownDocumentation(functions[item.label].documentation);
                item.insertText = item.label + "($0)";
                item.command = {
                    command: 'editor.action.triggerParameterHints',
                    title: 'Trigger Parameter Hints'
                }
            }
            break;
    }
    return item;
}
