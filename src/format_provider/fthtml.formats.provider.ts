'use strict';

import { OnTypeFormattingEditProvider, TextDocument, Position, FormattingOptions, CancellationToken, TextEdit, Range, workspace, Disposable} from 'vscode';
import { FTHTMLFormattingConfigs } from "./fthtml.formats.configs";

let formats = new FTHTMLFormattingConfigs();

class FTHTMLOnTypeProvider implements OnTypeFormattingEditProvider {
  public provideOnTypeFormattingEdits(document: TextDocument, pos: Position, chars: string, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
    return new Promise((resolve, reject) => {
      let result: TextEdit[] = [];

      switch (chars) {
        case '\n':
          if (!formats.isAutoClosingBraces) break;
          const lineAt = document.lineAt(pos.line-1);
          if ((formats.braces.newLinesOnEnter && lineAt.text.match(/^\s*[\w-]+\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*{$/) !== null) ||
            (formats.braces.newLinesOnEnterAfterAttributes && lineAt.text.match(/^\s*[\w-]+\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*\([^\)]*.*\)\s*{$/) !== null)) {
            result.push(new TextEdit
                          (new Range
                            (pos.line-1, lineAt.text.length-1, pos.line-1, lineAt.text.length - 1), `\n${lineAt.text.substring(0,lineAt.firstNonWhitespaceCharacterIndex)}`
                          )
                       );
          }
          break;
        default:
          break;
      }
      return resolve(result);
    });
  }
}

export class FTHTMLFormattingProvider {
  public activate(subscriptions: Disposable[]) {
    subscriptions.push(workspace.onDidChangeConfiguration(e => formats = new FTHTMLFormattingConfigs())); 
    return new FTHTMLOnTypeProvider();
  }
}


