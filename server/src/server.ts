import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    InitializeResult,
    HoverParams,
    Hover,
    TextDocumentPositionParams,
    SignatureHelpParams,
    SignatureHelp,
    CodeActionParams,
    CodeAction,
    DocumentSymbolParams,
    DocumentSymbol,
    DefinitionParams,
    Location,
    DidChangeWatchedFilesParams,
    FileEvent,
    FileChangeType,
    TextDocumentWillSaveEvent,
    WillSaveTextDocumentWaitUntilRequest,
    TextDocumentChangeEvent,
    DidSaveTextDocumentNotification,
    CompletionParams,
    CompletionItem,
    DocumentOnTypeFormattingParams,
    CompletionTriggerKind,
    FormattingOptions,
    DocumentLinkParams,
    DocumentLink
} from 'vscode-languageserver/node';
import { join } from "path";
import {
    TextDocument,
    TextEdit
} from 'vscode-languageserver-textdocument';
import { CompletionResolveHandler, OnCompletionHandler } from './providers/completion/handler';
import DefaultSettings, { FTHTMLConfigs, FTHTMLSettings } from './config/settings';
import { HoverHandler } from './providers/hover/handler';
import ScopeContext, { BaseContext, IScopeContext, TextDocumentEventContext } from './common/context';
import FTHTMLServerCapabilities from './config/capabilities';
import SignatureHelpHandler from './providers/signature/handler';
import { OnCodeActionHandler } from './providers/code-actions/handler';
import { FTHTMLDocumentFormatProvider } from './providers/formatting/document';
import FTHTMLDocumentSymbolProviderHandler from './providers/symbol/document';
import FTHTMLDefinitionProviderHandler from './providers/definition/handler';
import { URI } from 'vscode-uri';
import { existsSync, readFileSync } from 'fs';
import FTHTMLValidator from './parser/validator';
import FTHTMLOnTypeProviderHandler from './providers/formatting/ontype';
import { SELECTOR } from './common/constants';
import { OnFileCompletionHandler } from './providers/completion/file/handler';
import { OnDocumentLinkProvider } from './providers/document-link/handler';
import FTHTMLExport from './parser/exporter';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let fthtmlconfig: FTHTMLConfigs = undefined;

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: FTHTMLServerCapabilities
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized((e: InitializeParams) => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
        connection.client.register(DidSaveTextDocumentNotification.type, {
            documentSelector: SELECTOR
        })
        connection.client.register(WillSaveTextDocumentWaitUntilRequest.type, {
            documentSelector: SELECTOR
        });
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
let globalSettings: FTHTMLSettings = DefaultSettings;
let extn: { path: string, uri: URI };

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<FTHTMLSettings>> = new Map();

const Context = async (params: TextDocumentPositionParams | DocumentLinkParams): Promise<IScopeContext | undefined> => {
    const ctx = await ScopeContext(params, documents, await getDocumentSettings(params.textDocument.uri), connection);

    if (ctx.workspace) {
        if (!fthtmlconfig) updateFTHTMLConfig(join(URI.parse(ctx.workspace.uri).fsPath, 'fthtmlconfig.json'));
        ctx.config = fthtmlconfig;
    }

    return ctx;
}

connection.onRequest('extnValues', data => extn = data);

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <FTHTMLSettings>(
            (change.settings.fthtml || DefaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(async doc => await validateTextDocument(doc));
});

function getDocumentSettings(resource: string): Thenable<FTHTMLSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'fthtml'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

function updateFTHTMLConfig(path) {
    fthtmlconfig = undefined;
    console.log('updating fthtmlconfig');


    if (existsSync(path)) {
        try {
            const content = readFileSync(path, 'utf-8');
            fthtmlconfig = {
                path,
                json: JSON.parse(content),
                content
            }
        } catch (error) {
            console.log(error);
        }
    }
}

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async (e: TextDocumentChangeEvent<TextDocument>) => {
    await validateTextDocument(e.document);
});

async function validateTextDocument(document: TextDocument): Promise<void> {
    const scope = await TextDocumentEventContext(document, documents, await getDocumentSettings(document.uri), connection);

    if (!scope || !scope.settings.validation.enabled) {
        connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
        return;
    }

    new FTHTMLValidator(scope);
}

documents.onWillSaveWaitUntil(async (params: TextDocumentWillSaveEvent<TextDocument>): Promise<TextEdit[]> => {
    const scope = await TextDocumentEventContext(params.document, documents, await getDocumentSettings(params.document.uri), connection);
    if (!scope || !scope.settings.format.enabled) return [];

    const formatOpts: FormattingOptions = {
        insertSpaces: await connection.workspace.getConfiguration("editor.insertSpaces"),
        tabSize: await connection.workspace.getConfiguration("editor.tabSize"),
        insertFinalNewline: await connection.workspace.getConfiguration("editor.insertFinalNewline")
    }

    const formatter = new FTHTMLDocumentFormatProvider(formatOpts, scope);
    return Promise.resolve(formatter.format(scope));
})

documents.onDidSave(async (e: TextDocumentChangeEvent<TextDocument>) => {
    const scope = await TextDocumentEventContext(e.document, documents, await getDocumentSettings(e.document.uri), connection);

    if (!scope || !scope.settings.export.onSave || !scope.workspace) return;

    return FTHTMLExport(scope, extn, hasDiagnosticRelatedInformationCapability);
})

connection.onDidChangeWatchedFiles((params: DidChangeWatchedFilesParams) => {
    connection.console.log('We received a file change event');
    params.changes.forEach((e: FileEvent) => {
        if (e.uri.endsWith(".fthtml")) return;

        if (e.type === FileChangeType.Deleted) fthtmlconfig = undefined;
        else updateFTHTMLConfig(URI.file(e.uri).path);
    });
});

// This handler provides the initial list of the completion items.
connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
    const scope = await Context(params);
    if (!scope) return [];

    if (params.context.triggerKind === CompletionTriggerKind.TriggerCharacter)
        return await OnFileCompletionHandler(params, scope);

    return OnCompletionHandler(params, scope);
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(CompletionResolveHandler);

// ontype formatter
connection.onDocumentOnTypeFormatting(async (params: DocumentOnTypeFormattingParams): Promise<TextEdit[]> => {
    const scope = await Context(params);
    if (!scope) return [];

    return FTHTMLOnTypeProviderHandler(params, scope);
})

// hover provider
connection.onHover(async (params: HoverParams): Promise<Hover | undefined> => {
    const scope = await Context(params);
    if (!scope) return;

    return HoverHandler(scope);
});

// signature provider
connection.onSignatureHelp(async (params: SignatureHelpParams): Promise<SignatureHelp | undefined> => {
    const scope = await Context(params);
    if (!scope) return;

    return SignatureHelpHandler(scope);
});

// code completion handler
connection.onCodeAction(async (params: CodeActionParams): Promise<CodeAction[] | undefined> => {
    const scope = await BaseContext(params, documents, await getDocumentSettings(params.textDocument.uri), connection);
    if (!scope) return [];

    return OnCodeActionHandler(params, scope);
});

// symbol provider
connection.onDocumentSymbol(async (params: DocumentSymbolParams): Promise<DocumentSymbol[]> => {
    const scope = await BaseContext(params, documents, await getDocumentSettings(params.textDocument.uri), connection);
    if (!scope) return [];

    return FTHTMLDocumentSymbolProviderHandler(params, scope);
})

// definition provider
connection.onDefinition(async (params: DefinitionParams): Promise<Location[]> => {
    const scope = await Context(params);
    if (!scope) return [];

    return FTHTMLDefinitionProviderHandler(params, scope);
})

// on paste
connection.onRequest('pasted', async (e) => {
    const settings = await getDocumentSettings(e.doc);

    const ctx = {
        document: e.doc,
        settings,
        connection,
        workspace: undefined
    }

    const formatter = new FTHTMLDocumentFormatProvider(e.options, ctx);
    const fthtml = await formatter.convertHTML(e.data, e.indent);
    return {
        doc: e.doc,
        fthtml
    }
})

// document link
connection.onDocumentLinks(async (params: DocumentLinkParams): Promise<DocumentLink[]>  => {
    const scope = await Context(params);
    if (!scope || !scope.settings.documentLinking.enabled) return [];

    return OnDocumentLinkProvider(params, scope);
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();