import { FTHTMLElement } from "fthtml/lib/model/fthtmlelement";
import { Token } from "fthtml/lib/model/token";
import { CompletionItem, CompletionItemKind, CompletionParams, InsertTextMode } from "vscode-languageserver";
import { IScopeContext } from "../../../common/context";
import { getElementForCurrentPosition } from "../../../common/utils/string";

const allowedPipes = {
    "asc" : {
        documentation: 'sort(@this "asc")'
    },
    "alternating" : {
        documentation: 'tcase(@this "alternating")'
    },
    "camel" : {
        documentation: 'tcase(@this "camel")'
    },
    "capital" : {
        documentation: 'tcase(@this "capitalization")'
    },
    "choose" : {
        documentation: 'choose(@this)'
    },
    "desc" : {
        documentation: 'sort(@this "desc")'
    },
    "kebab" : {
        documentation: 'tcase(@this "kebab")'
    },
    "keys" : {
        documentation: 'keys(@this)'
    },
    "len" : {
        documentation: 'len(@this)'
    },
    "lower" : {
        documentation: 'tcase(@this "lower")'
    },
    "pascal" : {
        documentation: 'tcase(@this "pascal")'
    },
    "title" : {
        documentation: 'tcase(@this "title")'
    },
    "trim" : {
        documentation: 'trim(@this)'
    },
    "trimEnd" : {
        documentation: 'trim(@this "trimEnd")'
    },
    "trimStart" : {
        documentation: 'trim(@this "trimStart")'
    },
    "trimLeft" : {
        documentation: 'trim(@this "trimLeft")'
    },
    "trimRight" : {
        documentation: 'trim(@this "trimRight")'
    },
    "reverse" : {
        documentation: 'str_reverse(@this)'
    },
    "upper" : {
        documentation: 'tcase(@this "upper")'
    },
    "values": {
        documentation: 'values(@this)'
    },
};


export async function StringIntepolationPipeCompletionHandler(params: CompletionParams, context: IScopeContext): Promise<CompletionItem[]> {
    if (!params.context.triggerCharacter) return;

    const lineText = context.document.lineAt(params.position.line).text;
    const element: FTHTMLElement = getElementForCurrentPosition(lineText, { start: params.position, end: params.position }, Token.TYPES.STRING, false);

    if (element) {

        const items = [];
        if (/.*\${\s*@?[\w-][^}]*\s*\|/.test(element.token.value)) {
            Object.keys(allowedPipes).forEach(pf => {
                const lambda = allowedPipes[pf];
                items.push(<CompletionItem>{
                    label: `λ ${pf}`,
                    kind: CompletionItemKind.EnumMember,
                    insertText: ` ${pf}`,
                    filterText: pf,
                    detail: `Lambda => ${lambda.documentation}`,
                })
            })

            return items;
        }

    }

    return [];
}