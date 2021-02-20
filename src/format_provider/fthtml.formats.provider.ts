'use strict';

import { OnTypeFormattingEditProvider, TextDocument, Position, FormattingOptions, CancellationToken, TextEdit, Range, workspace, Disposable, DocumentFormattingEditProvider, ProviderResult, DocumentRangeFormattingEditProvider, languages } from 'vscode';
import { FTHTMLFormattingConfigs } from "./fthtml.formats.configs";

let formats = new FTHTMLFormattingConfigs();

class FTHTMLOnTypeProvider implements OnTypeFormattingEditProvider {
  public provideOnTypeFormattingEdits(document: TextDocument, pos: Position, chars: string, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
    return new Promise((resolve, reject) => {
      let result: TextEdit[] = [];

      switch (chars) {
        case '\n':
          if (!formats.isAutoClosingBraces) break;
          const lineAt = document.lineAt(pos.line - 1);
          if ((formats.braces.newLinesOnEnterAfterEmbeddedLangs && lineAt.text.match(/^\s*(?:js|css)\s*{$/) !== null) ||
            (formats.braces.newLinesOnEnter && lineAt.text.match(/^\s*[\w-]+(?<!css|js)\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*{$/) !== null) ||
            (formats.braces.newLinesOnEnterAfterAttributes && lineAt.text.match(/^\s*[\w-]+\s*(\/\*(?:\s*(?=\s|(?:\*\/)))?.*?\*\/)*\s*\([^\)]*.*\)\s*{$/) !== null)) {
            result.push(new TextEdit
              (new Range
                (pos.line - 1, lineAt.text.length - 1, pos.line - 1, lineAt.text.length - 1), `\n${lineAt.text.substring(0, lineAt.firstNonWhitespaceCharacterIndex)}`
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

class FTHTMLDocumentFormatProvider implements DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider {

  provideDocumentRangeFormattingEdits(document: TextDocument, range: Range, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]> {
    return this.provideEdits(document, options);
  }

  provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]> {
    return this.provideEdits(document, options);
  }

  private provideEdits = async (
    document: TextDocument,
    options?: FormattingOptions
  ): Promise<TextEdit[]> => {
    const result = await this.format(document.getText(), document, options);
    if (!result) {
      // No edits happened, return never so VS Code can try other formatters
      return [];
    }
    return [TextEdit.replace(this.fullDocumentRange(document), result)];
  };

  private async format(
    text: string,
    { fileName, languageId, uri, isUntitled }: TextDocument,
    rangeFormattingOptions?: FormattingOptions
  ): Promise<string | undefined> {
    const formats = new FTHTMLFormattingConfigs();

    const lines = text.split("\n");
    let isPragma = false;
    lines.forEach(line => {
      //matches div (...attrs)? {
      let match = line.match(/^(\s*)([\w-]+)\s*(\(.*\))?\s*\{\s*$/);
      if (line.match('#vars'))
        isPragma = true;
      if (line.match('#end'))
        isPragma = false;
      if (match && !isPragma) {
        const attrs = match[3] ? `${match[3]}` : '';
        let spacing = ' ';
        if (match[3] && formats.braces.newLinesOnEnterAfterAttributes)
          spacing = `\n${match[1]}`;
        else if (!match[3] && formats.braces.newLinesOnEnter)
          spacing = `\n${match[1]}`

        text = text.replace(match[0], match[1] + match[2] + ` ${attrs}` + `${spacing}\{`)
      }

    })

    return text;
  }

  private fullDocumentRange(document: TextDocument): Range {
    const lastLineId = document.lineCount - 1;
    return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
  }

}

export default class FTHTMLFormattingProvider {
  public activate(subscriptions: Disposable[]) {
    subscriptions.push(workspace.onDidChangeConfiguration(() => formats = new FTHTMLFormattingConfigs()));
    subscriptions.push(languages.registerDocumentFormattingEditProvider({
      language: 'fthtml'
    }, new FTHTMLDocumentFormatProvider))
    subscriptions.push(languages.registerDocumentRangeFormattingEditProvider({
      language: 'fthtml'
    }, new FTHTMLDocumentFormatProvider))

    return new FTHTMLOnTypeProvider();
  }
}


