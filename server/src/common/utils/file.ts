import { TextDocument } from "vscode-languageserver-textdocument";

export function getExtension(document: TextDocument) {
    const fragments = document.uri.split(".");
    const extension = fragments[fragments.length - 1];

    return extension;
}