import { CompletionItem, CompletionItemKind, MarkupKind, Range, TextEdit } from "vscode-languageserver";
import { IFileCompletionItemInfo } from "./file/completion-model";

abstract class AbstractCompletionItem {
    protected label: string;
    protected range: Range;

    constructor(label: string, { range }: IFileCompletionItemInfo) {
        this.label = label;
        this.range = range;
    }

    abstract build(): CompletionItem;
}

export class FolderCompletionItem extends AbstractCompletionItem {

    build() {
        return {
            label: this.label,
            kind: CompletionItemKind.Folder,
            sortText: `a_${this.label}`,
            textEdit: TextEdit.replace(this.range, this.label),
        }
    }

}

export class FileCompletionItem extends AbstractCompletionItem {

    build() {
        const fragments = this.label.split(".");
        const extn = fragments[fragments.length - 1];

        const index = extn && ['fthtml', 'json'].includes(extn) ? this.label.lastIndexOf(`.${extn}`) : -1;
        const newText =
            index !== -1 ? this.label.substring(0, index) : this.label;

        return {
            label: this.label,
            kind: CompletionItemKind.File,
            sortText: `b_${this.label}`,
            textEdit: TextEdit.replace(this.range, newText)
        }

    }

}

export function KeywordCompletionItem(label: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Keyword
    }
}

export function MethodCompletionItem(label: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Method
    }
}

export function FunctionCompletionItem(label: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Function
    }
}

export function ConstantCompletionItem(label: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Constant
    }
}

export function SnippetCompletionItem(label: string, insertText: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Snippet,
        insertText
    }
}

export function MarkdownDocumentation(value: string) {
    return {
        kind: MarkupKind.Markdown,
        value
    }
}