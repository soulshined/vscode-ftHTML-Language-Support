import { Token } from "fthtml/lib/model/token";
import { CodeAction, CodeActionKind, CodeActionParams, TextEdit, WorkspaceEdit } from "vscode-languageserver";
import { Range, TextDocument } from "vscode-languageserver-textdocument";
import { IBaseContext } from "../../common/context";
import { PATTERNS } from "../../common/patterns";
import { getElementForCurrentPosition } from "../../common/utils/string";
import { FTHTMLSettings } from "../../config/settings";

export function OnCodeActionHandler(params: CodeActionParams, context: IBaseContext): CodeAction[] | undefined {
    const actions: CodeAction[] = [];

    const line = context.document.lineAt(params.range.start.line);
    const convertToChildMatch = _getConvertToChildElementMatch(line.text);

    if (convertToChildMatch)
        actions.push(_getConvertToChildElementAction(context.document, convertToChildMatch, line.rangeIncludingLineBreak, context.settings));

    if (!context.settings.codeactions.refactor.omit.includes('interpolate')) {
        const element = getElementForCurrentPosition(line.text, params.range, Token.TYPES.STRING, false);

        if (element)
            actions.push(_getInterpolationAction(context.document, params));
    }

    if (!context.settings.codeactions.refactor.omit.includes('html_encode')) {
        const encoderMatch = _getHTMLEncoderMatch(line.text);
        if (encoderMatch)
            actions.push(..._getHTMLEncoderActions(context.document, encoderMatch, line.rangeIncludingLineBreak));
    }

    return actions;
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

function _getInterpolationAction(document: TextDocument, params: CodeActionParams) {
    const changes: { [uri: string]: TextEdit[] } = {};
    changes[document.uri] = [{
        newText: `\${}`,
        range: params.range
    }]

    return<CodeAction> {
        title: `Interpolate`,
        kind: CodeActionKind.RefactorInline,
        edit: <WorkspaceEdit>{
            changes,
        },
        command: {
            command: "cursorLeft",
            title: "cursorLeft"
        }
    }
}

function _getHTMLEncoderMatch(text: string) {
    let match = text.match(`^(\\s*)([\\w-]+)(?<!import|comment|doctype|${PATTERNS.FUNCTIONS}|${PATTERNS.MACROS})\\s*(\\([^\\)]*\\))?(\\s+)((['\"])([^\\9]*\\9))\\s*$`);

    return match;
}

function _getHTMLEncoderActions(document: TextDocument, match: RegExpMatchArray, range: Range) {
    const tag = match[2];
    const attrs = match[6] ? ` ${match[6]} ` : ' ';
    const child = match[8];

    const getChanges = (type) => {
        const changes: { [uri: string]: TextEdit[] } = {};
        changes[document.uri] = [{
            newText: `${match[1]}${tag}${attrs}html_${type.toLowerCase()}(${child})\n`,
            range
        }]
        return changes;
    }

    return [
        {
            title: `HTML Encode`,
            kind: CodeActionKind.RefactorRewrite,
            edit: <WorkspaceEdit>{
                    changes: getChanges('Encode')
                }
        },
        {
            title: `HTML Decode`,
            kind: CodeActionKind.RefactorRewrite,
            edit: <WorkspaceEdit>{
                changes: getChanges('Decode')
            }
        }
    ]
}