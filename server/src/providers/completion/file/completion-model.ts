import { statSync } from "fs";
import { join } from "path";
import { Position, Range } from "vscode-languageserver";
import { IScopeContextDocument } from "../../../common/context";
import { getExtension } from "../../../common/utils/file";

export interface IFileCompletionItemInfo {
    lineText: string;
    stringAutocompleteValue?: string;
    range: Range;
    isForImport: boolean;
    isForJson: boolean;
    isByReference: boolean;
    document: IScopeContextDocument;
    documentExtension: string | undefined;
}

export class ChildData {
    file: string;
    isFile: boolean;

    constructor(path: string, file: string) {
        this.file = file;
        this.isFile = statSync(join(path, file)).isFile();
    }
}

export function FileCompletionItemInfo(document: IScopeContextDocument, position: Position): IFileCompletionItemInfo {
    const extn = getExtension(document);
    const lineText = document.lineAt(position).text;
    const textUntilPosition = lineText.substring(0, position.character);
    const isForImport = lineText.indexOf('import') >= 0;
    const isForJson = lineText.indexOf('json(') >= 0;

    let stringAutocompleteValue = textUntilPosition;

    const quoatationPosition = Math.max(
        textUntilPosition.lastIndexOf('"'),
        textUntilPosition.lastIndexOf("'")
        );
        stringAutocompleteValue = quoatationPosition !== -1
        ? textUntilPosition.substring(quoatationPosition + 1, textUntilPosition.length)
        : undefined;

    const slashPosition = textUntilPosition.lastIndexOf("/");
    let startPosition = Position.create(position.line, slashPosition + 1);

    if (isForImport || isForJson && stringAutocompleteValue.length === 0)
        startPosition = position;

    return {
        lineText: document.lineAt(position).text,
        stringAutocompleteValue,
        range: Range.create(startPosition, position),
        document,
        documentExtension: !extn || extn === 'fthtml' ? undefined : extn,
        isForImport,
        isForJson,
        isByReference: stringAutocompleteValue ? stringAutocompleteValue.charAt(0) === '&' : false
    };
}

