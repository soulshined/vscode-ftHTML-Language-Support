import { dirname, join, normalize, sep } from "path";
import { readdir } from "fs";
import { promisify } from 'util';
import { ChildData, IFileCompletionItemInfo } from "./completion-model";
import { CompletionItem } from "vscode-languageserver";
import { FileCompletionItem, FolderCompletionItem } from "../types";
const readdirAsync = promisify(readdir);

export function getPathOfFolderToLookupFiles(fileName: string, text: string | undefined, rootPath?: string): string {
    text = text.startsWith('&') ? text.substring(1) : text;
    const normalized = normalize(text || "");
    const isPathAbsolute = normalized.startsWith(sep);

    let rootFolder = dirname(fileName);
    if (isPathAbsolute || rootPath) {
        rootFolder = rootPath || '';
    }

    return join(rootFolder, normalized);
}

export async function getChildrenOfPath(path: string) {
    try {
        const files: string[] = await readdirAsync(path);
        return files.map(f => new ChildData(path, f));
    } catch (error) {
        return [];
    }
}

export function createPathCompletionItem(childData: ChildData, info: IFileCompletionItemInfo): CompletionItem {
    return childData.isFile
        ? new FileCompletionItem(childData.file, info).build()
        : new FolderCompletionItem(childData.file, info).build();
}