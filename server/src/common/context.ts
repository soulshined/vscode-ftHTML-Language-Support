import { CodeActionParams, DocumentFormattingParams, DocumentLinkParams, DocumentSymbolParams, Position, Range, TextDocumentPositionParams, TextDocuments, WorkspaceFolder, _Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { FTHTMLConfigs, FTHTMLSettings } from "../config/settings";

interface ScopeContextDocumentLine {
    text: string,
    range: Range,
    rangeIncludingLineBreak: Range,
    isLastLine: boolean,
    firstNonWhitespaceCharacterIndex: number,
    isEmptyOrWhitespace: boolean
}

export interface IScopeContextDocument extends TextDocument {
    lines: string[],
    lineAt: (lineOrPos: number | Position) => ScopeContextDocumentLine,
    totalRange: Range
}

export interface IBaseContext {
    document: IScopeContextDocument,
    settings: FTHTMLSettings,
    connection: _Connection,
    workspace?: WorkspaceFolder,
    config?: FTHTMLConfigs
}

export interface IScopeContext extends IBaseContext {
    position: Position
}

export async function BaseContext(params: CodeActionParams | DocumentFormattingParams | DocumentSymbolParams, documents: TextDocuments<TextDocument>, settings: FTHTMLSettings, connection: _Connection): Promise<IBaseContext> {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return;

    const ws = await connection.workspace.getWorkspaceFolders();

    return {
        document: Document(doc),
        settings,
        connection,
        workspace: ws.length > 0 ? ws[0] : undefined
    }
}

export async function TextDocumentEventContext(document: TextDocument, documents: TextDocuments<TextDocument>, settings: FTHTMLSettings, connection: _Connection): Promise<IBaseContext> {
    const doc = documents.get(document.uri);
    if (!doc) return;

    const ws = await connection.workspace.getWorkspaceFolders();

    return {
        document: Document(doc),
        settings,
        connection,
        workspace: ws.length > 0 ? ws[0] : undefined
    }
}

export default async function ScopeContext(params: TextDocumentPositionParams | DocumentLinkParams, documents: TextDocuments<TextDocument>, settings: FTHTMLSettings, connection: _Connection): Promise<IScopeContext> {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return;

    const ws = await connection.workspace.getWorkspaceFolders();

    return {
        document: Document(doc),
        settings,
        position: params['position'] ?? undefined,
        connection,
        workspace: ws.length > 0 ? ws[0] : undefined
    }
}

function Document(document: TextDocument): IScopeContextDocument {
    const lines = document.getText().split("\n");

    return {
        lineCount: document.lineCount,
        version: document.version,
        uri: document.uri,
        languageId: document.languageId,
        totalRange: Range.create(0, 0, document.lineCount, document.lineCount === 0 ? 0 : lines[document.lineCount - 1].length),
        positionAt: (offset: number): Position => {
            return document.positionAt(offset);
        },
        offsetAt: (position: Position): number => {
            return document.offsetAt(position);
        },
        getText: (range?: Range): string => {
            return document.getText(range);
        },
        lines,
        lineAt: (lineOrPos: number | Position) => {
            let line: number | undefined;
            if (typeof lineOrPos === 'number') {
                line = lineOrPos;
            }
            else line = lineOrPos.line;

            let text = '';
            if (typeof line !== 'number' || line < 0 || line >= lines.length || Math.floor(line) !== line) {
                text = '';
            }
            else text = lines[line];

            const lineRange: Range = Range.create(line, 0, line, text.length);
            const firstNonWhitespaceCharacterIndex = /^(\s*)/.exec(text)![1].length;

            return {
                text,
                isLastLine: line >= document.lineCount,
                range: lineRange,
                firstNonWhitespaceCharacterIndex,
                rangeIncludingLineBreak: (line >= document.lineCount) ? lineRange : Range.create(line, 0, line + 1, 0),
                isEmptyOrWhitespace: firstNonWhitespaceCharacterIndex === text.length
            }
        }
    }
}