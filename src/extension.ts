'use strict';

import * as vscode from 'vscode';
import { FTHTMLFormattingProvider } from "./format_provider/fthtml.formats.provider";
import FTHTMLParserProvider from './parser/fthtml.parser';

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "ftHTML" is now active!');
    
    context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider({language:"fthtml",scheme:"file"},
                                                                                    new FTHTMLFormattingProvider().activate(context.subscriptions),
                                                                                    "\n"));
    new FTHTMLParserProvider(context.subscriptions);
}

export function deactivate() {
}

