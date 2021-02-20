'use strict';

import * as vscode from 'vscode';
import FTHTMLCodeActionProvider from './codeactions_provider/fthtml.code-actions.provider';
import FTHTMLFormattingProvider from "./format_provider/fthtml.formats.provider";
import FTHTMLHierarchyProvider from './hierarchy_provider/fthtml.hierarchy.provider';
import FTHTMLHoverProvider from './hover_provider/fthtml.hover.provider';
import FTHTMLParserProvider from './parser/fthtml.parser';
import FTHTMLSignatureHelpProvider from './signature_help_provider/fthtml.signature-help.provider';
import FTHTMLCompletionItemProvider from './snippet_provider/fthtml.completionitems.provider';
import FTHTMLDocumentSymbolProvider from './symbol_provider/fthtml.document-symbol.provider';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "ftHTML" is now active!');

    context.subscriptions.push(
        vscode.languages.registerOnTypeFormattingEditProvider('fthtml',
            new FTHTMLFormattingProvider().activate(context.subscriptions),
            "\n"
        ),

        vscode.languages.registerDocumentSymbolProvider('fthtml', new FTHTMLDocumentSymbolProvider),

        vscode.languages.registerSignatureHelpProvider('fthtml', new FTHTMLSignatureHelpProvider, {
            retriggerCharacters: [' '],
            triggerCharacters: ['(']
        }),

        vscode.languages.registerHoverProvider('fthtml', new FTHTMLHoverProvider),

        vscode.languages.registerDefinitionProvider('fthtml', new FTHTMLHierarchyProvider),

        vscode.languages.registerCodeActionsProvider('fthtml', new FTHTMLCodeActionProvider),

        vscode.languages.registerCompletionItemProvider('fthtml', new FTHTMLCompletionItemProvider)
    )

    new FTHTMLParserProvider(context.subscriptions);
}

export function deactivate() { }

