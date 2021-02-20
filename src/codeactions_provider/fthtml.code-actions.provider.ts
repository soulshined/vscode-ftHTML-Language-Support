import { CodeActionProvider, CodeActionKind, TextDocument, Range, Selection, CodeActionContext, CancellationToken, ProviderResult, CodeAction, Command, Position, window, WorkspaceEdit } from 'vscode';
import { PATTERNS } from '../consts/patterns';
import { FTHTMLFormattingConfigs } from '../format_provider/fthtml.formats.configs';

const formats = new FTHTMLFormattingConfigs();

export default class FTHTMLCodeActionProvider implements CodeActionProvider {
    public static readonly providedCodeActionKinds = [CodeActionKind.RefactorRewrite];

    provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
        const actions: CodeAction[] = [];
        const line = document.lineAt(range.start.line);
        const convertToChildMatch = this.getConvertToChildElementMatch(line.text);

        const pos = new Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex);
        if (convertToChildMatch) actions.push(this.getConvertToChildElementAction(document, convertToChildMatch, pos));

        return actions;
    }

    private getConvertToChildElementMatch(text: string) {
        //match div (...attrs)? "value" or div (...attrs)? __MACRO__
        let match = text.match(`^\\s*([\\w-]+)(?<!import|comment|doctype|${PATTERNS.FUNCTIONS}|${PATTERNS.MACROS})\\s*(\\([^\\)]*\\))?(\\s+)((['\"])([^\\9]*\\9)|${PATTERNS.MACROS})\\s*$`);

        return match;
    }

    private getConvertToChildElementAction(document: TextDocument, match: RegExpMatchArray, pos: Position) {
        const editor = window.activeTextEditor!;
        const tab = editor?.options.insertSpaces ? ' ' : '\t';

        // @ts-ignore
        const tabSize: number = editor.options.tabSize ?? 0;
        let brace = '\{';

        if ((match[5] && formats.braces.newLinesOnEnterAfterAttributes) || (!match[5] && formats.braces.newLinesOnEnter)) {
            brace = '\n\{';
        }

        const fix = new CodeAction(`Convert to child element`, CodeActionKind.RefactorRewrite);
        fix.edit = new WorkspaceEdit();

        const tag = match[1];
        const attrs = match[5] ? ` ${match[5]} ` : ' ';
        const child = match[7];

        fix.edit.replace(document.uri, new Range(pos, new Position(pos.line, pos.character + match[0].length)), `${tag}${attrs}${brace}\n` + tab.repeat(tabSize + pos.character) + `${child}\n` + tab.repeat(pos.character) + "}");
        return fix
    }
}