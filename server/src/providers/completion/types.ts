import { CompletionItem, CompletionItemKind, MarkupKind, Position, Range, TextEdit } from "vscode-languageserver";
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

export function SnippetCompletionItem(label: string, insertText: string, description?: string) : CompletionItem {
    return {
        label,
        kind: CompletionItemKind.Snippet,
        insertText,
        detail: description
    }
}

export function VariableCompletionItem(label: string, detail: string): CompletionItem {
    return {
        label: `@${label}`,
        kind: CompletionItemKind.Variable,
        detail,
        insertText: `@${label}`,
        filterText: label
    }
}

export function LiteralVariableMemberCompletionItem(label: string, position: Position, detail?: string): CompletionItem {
    let _label = label;
    const additionalEdits = [];
    if (/^[_0-9]+$/.test(label) || !/^[\w-]+$/.test(label)) {
        _label = `['${label}']`;
        additionalEdits.push(<TextEdit>{
            newText: '',
            range: {
                start: {
                    line: position.line,
                    character: position.character - 1
                },
                end: {
                    line: position.line,
                    character: position.character
                }
            }
        })
    }

    return {
        label,
        kind: CompletionItemKind.Property,
        insertText: _label,
        additionalTextEdits: additionalEdits,
        detail
    }
}

export function MarkdownDocumentation(value: string) {
    return {
        kind: MarkupKind.Markdown,
        value
    }
}