import { CodeActionKind, ServerCapabilities, TextDocumentSyncKind } from "vscode-languageserver";

const FTHTMLServerCapabilities: ServerCapabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['/', '"', "'", "@", '.', '|']
    },
    hoverProvider: true,
    signatureHelpProvider: {
        retriggerCharacters: [' '],
        triggerCharacters: ['(']
    },
    codeActionProvider: {
        codeActionKinds: [
            CodeActionKind.RefactorRewrite
        ],
        resolveProvider: false
    },
    documentSymbolProvider: true,
    definitionProvider: true,
    documentFormattingProvider: true,
    documentOnTypeFormattingProvider: {
        firstTriggerCharacter: "\n"
    },
    documentLinkProvider: {
        resolveProvider: false
    }
}

export default FTHTMLServerCapabilities;