import { join } from "path";
import { CompletionItem, CompletionParams } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IScopeContext } from "../../../common/context";
import { FileCompletionItemInfo, IFileCompletionItemInfo } from "./completion-model";
import { createPathCompletionItem, getChildrenOfPath, getPathOfFolderToLookupFiles } from "./util";

export async function OnFileCompletionHandler(params: CompletionParams, context: IScopeContext): Promise<CompletionItem[]> {
    if (!params.context.triggerCharacter) return;
    const info: IFileCompletionItemInfo = FileCompletionItemInfo(context.document, params.position);
    if (info.stringAutocompleteValue === undefined) return;

    return Promise.resolve(provide(context, info));
}

async function provide(context: IScopeContext, info: IFileCompletionItemInfo): Promise<CompletionItem[]> {
    const workspace = context.workspace;

    let root = URI.parse(workspace.uri).fsPath;

    if (!info.isByReference) {
        if (context.config && info.isForImport && context.config.json['importDir'])
            root = join(root, context.config.json.importDir)
        else if (context.config && info.isForJson && context.config.json['jsonDir'])
            root = join(root, context.config.json.jsonDir)
    }

    const path = getPathOfFolderToLookupFiles(
        URI.parse(context.document.uri).fsPath,
        info.stringAutocompleteValue,
        root
    );

    const childrenOfPath = await getChildrenOfPath(path);

    return [
        ...childrenOfPath.map((child) =>
            createPathCompletionItem(child, info)
        ),
    ];
}