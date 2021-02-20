import * as vscode from "vscode";
import { FTHTMLFormattingConfigs } from "../format_provider/fthtml.formats.configs";
import functions, { getConstructor, misc_methods } from "../consts/functions";
import macros from "../consts/macros";

const formats = new FTHTMLFormattingConfigs();

export default class FTHTMLCompletionItemProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
        // a completion item that inserts its text as snippet,
        // the `insertText`-property is a `SnippetString` which will be
        // honored by the editor.
        let snippets: vscode.CompletionItem[] = [];

        /* region MISC */
        const comment = new vscode.CompletionItem('comment');
        comment.kind = vscode.CompletionItemKind.Keyword;
        comment.insertText = new vscode.SnippetString('comment "$0"')
        comment.detail = getConstructor('comment');
        comment.documentation = misc_methods['comment'].documentation;
        snippets.push(comment);

        if (position.line === 0) {
            const doctype = new vscode.CompletionItem('doctype');
            doctype.kind = vscode.CompletionItemKind.Keyword;
            doctype.insertText = new vscode.SnippetString('doctype "${0:html}"')
            snippets.push(doctype);
        }

        const imp = new vscode.CompletionItem('import');
        imp.detail = getConstructor('import');
        imp.kind = vscode.CompletionItemKind.Method;
        imp.insertText = new vscode.SnippetString('import "$0"');
        imp.documentation = misc_methods['import'].documentation;
        snippets.push(imp);

        const template = new vscode.CompletionItem('template');
        template.detail = getConstructor('template');
        template.kind = vscode.CompletionItemKind.Method;
        template.insertText = new vscode.SnippetString('import "$1" {\n\t${2:bindingProperty} "${3:value}"$4\n}');
        template.documentation = misc_methods['template'].documentation;
        snippets.push(template);

        const child = new vscode.CompletionItem('child');
        child.kind = vscode.CompletionItemKind.Snippet;
        const childBraces = formats.braces.newLinesOnEnter ? "\n{" : " {";
        child.insertText = new vscode.SnippetString("${1:div} " + childBraces + '\n\t$0\n}');
        snippets.push(child);

        const childWithAttributes = new vscode.CompletionItem('childWithAttributes');
        childWithAttributes.kind = vscode.CompletionItemKind.Snippet;
        const childWithAttributesBraces = formats.braces.newLinesOnEnterAfterAttributes ? "\n{" : " {";
        childWithAttributes.insertText = new vscode.SnippetString("${1:div} ($2)" + childWithAttributesBraces + '\n\t$0\n}');
        snippets.push(childWithAttributes);
        /* endregion MISC */

        /* region MACROS */
        const thismacros = Object.assign({}, macros);
        Object.keys(macros).filter(macro => macros[macro].isJavaScriptInsertable).forEach(macro => {
            thismacros[`JS_${macro}`] = macros[macro];
        })

        Object.keys(thismacros).forEach(macro => {
            const snippet = new vscode.CompletionItem(`__${macro}__`);
            snippet.kind = vscode.CompletionItemKind.Constant;
            snippet.detail = "Macro";
            snippet.documentation = thismacros[macro].documentation;
            snippets.push(snippet);
        })
        /* endregion MACROS */

        /* region ELANGS */
        let elangs: { [key: string]: any } = {
            css: {
                documentation: "Creates a css specific tag. Raw css is allowed here and doesn't need quotes to start or end the tags value"
            },
            js: {
                documentation: "Creates a javascript specific tag. Raw javascript is allowed here and doesn't need quotes to start or end the tags value"
            }
        }

        Object.keys(elangs).forEach(elang => {
            const snippet = new vscode.CompletionItem(elang);
            snippet.kind = vscode.CompletionItemKind.Keyword;
            snippet.detail = "Embedded Language";
            snippet.documentation = elangs[elang].documentation;

            const braces = formats.braces.newLinesOnEnterAfterEmbeddedLangs ? "\n{" : " {";

            snippet.insertText = new vscode.SnippetString(elang + braces + '\n\t$0\n}');
            snippets.push(snippet);
        })
        /* endregion ELANGS */

        /* region FUNCTIONS */
        Object.keys(functions).forEach(func => {
            const snippet = new vscode.CompletionItem(func);
            snippet.kind = vscode.CompletionItemKind.Function;
            snippet.detail = getConstructor(func);
            snippet.documentation = functions[func].documentation;
            snippet.insertText = new vscode.SnippetString(func + "($0)");
            snippet.command = { command: 'editor.action.triggerParameterHints', title: 'Trigger Parameter Hints' }
            snippets.push(snippet);
        })
        /* endregion FUNCTIONS */

        return snippets;
    }

}