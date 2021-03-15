import { CodeAction, CodeActionKind, CodeActionParams, TextEdit, WorkspaceEdit } from "vscode-languageserver";
import { Range, TextDocument } from "vscode-languageserver-textdocument";
import { IBaseContext } from "../../common/context";
import { PATTERNS } from "../../common/patterns";
import { FTHTMLSettings } from "../../config/settings";

export function OnCodeActionHandler(params: CodeActionParams, context: IBaseContext): CodeAction[] | undefined {

    const line = context.document.lineAt(params.range.start.line);
    const convertToChildMatch = _getConvertToChildElementMatch(line.text);

    if (convertToChildMatch)
        return [_getConvertToChildElementAction(context.document, convertToChildMatch, line.rangeIncludingLineBreak, context.settings)]

    return;
}

export function CodeActionResolveHandler(item: CodeAction): CodeAction {
    return item;
}

function _getConvertToChildElementMatch(text: string) {
    //match div (...attrs)? "value" or div (...attrs)? __MACRO__
    let match = text.match(`^(\\s*)([\\w-]+)(?<!import|comment|doctype|${PATTERNS.FUNCTIONS}|${PATTERNS.MACROS})\\s*(\\([^\\)]*\\))?(\\s+)((['\"])([^\\9]*\\9)|${PATTERNS.MACROS})\\s*$`);

    return match;
}

function _getConvertToChildElementAction(document: TextDocument, match: RegExpMatchArray, range: Range, settings: FTHTMLSettings) {
    let brace = '\{';

    if ((match[6] && settings.format.braces.newLineAfterAttributes) || (!match[6] && settings.format.braces.newLineAfterElement)) {
        brace = `\n${match[1]}\{`;
    }

    const tag = match[2];
    const attrs = match[6] ? ` ${match[6]} ` : ' ';
    const child = match[8];

    const changes: { [uri: string]: TextEdit[] } = {};
    changes[document.uri] = [{
        newText: `${match[1]}${tag}${attrs}${brace}\n${match[1]}  ${child}\n${match[1]}}\n`,
        range
    }]

    const fix: CodeAction = {
        title: 'Convert to child element',
        kind: CodeActionKind.RefactorRewrite,
        edit: <WorkspaceEdit>{
            changes
        }
    }

    return fix;
}

