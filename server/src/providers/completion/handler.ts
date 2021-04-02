import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
    SymbolKind,
    TextDocumentPositionParams
} from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IBaseContext } from "../../common/context";
import elangs from "../../common/documentation/elangs";
import functions, { getFunctionConstructor, misc_methods } from "../../common/documentation/functions";
import operators from "../../common/documentation/operators";
import { clamp } from "../../common/utils/number";
import { getTokenValuesInReverse } from "../../common/utils/string";
import { FTHTMLDocumentSymbolFilter } from "../symbol/document";
import fthtml_snippets from "./snippets/fthtml";
import { KeywordCompletionItem, MarkdownDocumentation, MethodCompletionItem, SnippetCompletionItem } from "./types";
import { getElangCompletionItems, getFunctionCompletionItems, getMacroCompletionItems, getVariableCompletionItems } from "./utils/helper";

export async function OnCompletionHandler(positionParams: TextDocumentPositionParams, context: IBaseContext): Promise<CompletionItem[]> {
    const { settings: { format }, document } = context;
    const snippets: CompletionItem[] = [];
    const lineText = document.lineAt(positionParams.position).text.substring(0, positionParams.position.character);

    const vars: { globals: string[], local: string[] } = {
        'globals': [],
        'local': []
    }
    const tinyts: CompletionItem[] = [];

    if (context.config) {
        for (const [key, value] of Object.entries(context.config.json.globalvars))
            vars.globals[key] = value;
    }

    FTHTMLDocumentSymbolFilter(URI.parse(positionParams.textDocument.uri),
        context,
        [SymbolKind.Struct, SymbolKind.Property]
    ).forEach(sym => {
        if (sym.detail === 'variables directive')
            vars.local.push(...sym.children.map(child => child.name))
        else if (sym.detail === 'tinytemplates directive')
            sym.children.forEach(child => {
                const snip = SnippetCompletionItem(child.name, child.name);
                snip.detail = "Local Tiny Template";
                tinyts.push(snip);
            })
    });

    const funcMatch = getPreviousWordIfFunction(lineText);
    if (funcMatch) {
        const [funcName, argIndex] = funcMatch;
        const param = functions[funcName].parameters[clamp(argIndex, 0, functions[funcName].parameters.length - 1)];

        if (param.datatype.includes('Variable'))
            snippets.push(...getVariableCompletionItems(vars));

        if (param.datatype.includes('Function'))
            snippets.push(...getFunctionCompletionItems());

        if (param.datatype.includes('Macro'))
            snippets.push(...getMacroCompletionItems());

        return snippets;
    }

    const ifElseExpressionTokens: string[] | undefined = getIfElseExpression(lineText);

    if (ifElseExpressionTokens !== undefined) {
        const prevChar = lineText.substring(positionParams.position.character - 1, positionParams.position.character);
        if (ifElseExpressionTokens.length === 1 && /\s/.test(prevChar) ||
            ifElseExpressionTokens.length === 2 && !/\s/.test(prevChar)) {
            Object.keys(operators).forEach(op => {
                const element = operators[op];
                snippets.push({
                    label: op,
                    documentation: element.documentation,
                    kind: CompletionItemKind.Operator
                })
            })
        }
        else {
            snippets.push(...getVariableCompletionItems(vars));
            snippets.push(...getFunctionCompletionItems());
            snippets.push(...getMacroCompletionItems());
        }
        return snippets;
    }

    const child = SnippetCompletionItem("child", `\${1:div} ${format.braces.newLineAfterElement ? '\n{' : ' {'}\n\t$0\n}`);

    const childWithAttrs = SnippetCompletionItem("childWithAttributes", `\${1:div}($2) ${format.braces.newLineAfterAttributes ? '\n{' : ' {'}\n\t$0\n}`)

    snippets.push(...[
        KeywordCompletionItem("comment"),
        MethodCompletionItem("import"),
        MethodCompletionItem("template"),
        child,
        childWithAttrs
    ])

    if (positionParams.position.line === 0)
        snippets.push(KeywordCompletionItem('doctype'))

    snippets.push(...getFunctionCompletionItems());
    snippets.push(...getMacroCompletionItems());
    snippets.push(...getElangCompletionItems(format));
    snippets.push(...getVariableCompletionItems(vars));

    //add fthtml snippets
    Object.keys(fthtml_snippets).forEach(key => {
        const element = fthtml_snippets[key];
        snippets.push(SnippetCompletionItem(element.prefix, element.body.join("\n"), element.description));
    })

    //region GLOBAL TINYTS
    if (context.config) {
        Object.keys(context.config.json.tinytemplates).forEach(tinyt => {
            const match = tinyts.find(t => t.label === tinyt);
            if (match) return;

            const alias = context.config.json.tinytemplates[tinyt];
            const snip = SnippetCompletionItem(tinyt, tinyt);
            snip.detail = "Global Tiny Template";
            snip.documentation = MarkdownDocumentation(`Alias for: ${alias.value.value}`);
            tinyts.push(snip);
        })
    }
    //END REGION GLOBAL TINY TS

    snippets.push(...tinyts);
    return snippets;
}

export function CompletionResolveHandler(item: CompletionItem): CompletionItem {
    item.insertTextFormat = InsertTextFormat.Snippet;

    switch (item.label) {
        case 'comment':
            item.insertText = 'comment "$0"';
            item.detail = getFunctionConstructor('comment');
            item.documentation = MarkdownDocumentation(misc_methods['comment'].documentation);
            break;
        case 'import':
            item.insertText = 'import "$0"';
            item.detail = getFunctionConstructor('import');
            item.documentation = MarkdownDocumentation(misc_methods['import'].documentation);
            break;
        case 'template':
            item.insertText = 'import "$1" {\n\t${2:bindingProperty} "${3:value}"$4\n}';
            item.detail = getFunctionConstructor('template');
            item.documentation = MarkdownDocumentation(misc_methods['template'].documentation);
            break;
        case 'doctype':
            item.insertText = 'doctype "${0:html}"';
            break;
        default:
            if (elangs[item.label]) {
                item.detail = 'Embedded Language';
                item.documentation = MarkdownDocumentation(elangs[item.label].documentation);
            }
            else if (functions[item.label]) {
                item.detail = getFunctionConstructor(item.label);
                item.documentation = MarkdownDocumentation(functions[item.label].documentation);
                item.insertText = item.label + "($0)";
                item.command = {
                    command: 'editor.action.triggerParameterHints',
                    title: 'Trigger Parameter Hints'
                }
            }
            break;
    }
    return item;
}

function getIfElseExpression(lineText: string): string[] | undefined {
    const nearestWords = getTokenValuesInReverse(lineText, 4);

    let pragma = nearestWords.pop();
    while (pragma !== undefined && pragma !== '#if')
        pragma = nearestWords.pop();

    if (!pragma || nearestWords.length > 2) return;

    return nearestWords;
}

function getPreviousWordIfFunction(lineText: string): [func: string, argIndex: number] | undefined {
    let func = undefined;

    let word = '';
    let isFunc = false;
    let currentFuncName = null;
    let prevFuncName = null;
    let isString = false;
    let isComment = false;
    let argIndex = 0;
    let prevArgIndex = 0;
    let parenth = 0;
    for (let i = 0; i < lineText.length; i++) {
        const chr = lineText[i];
        if ([`'`, `"`].includes(chr)) {
            word += chr;
            if (isString) {
                if (word.startsWith(chr) && !word.endsWith(`\\${chr}`)) {
                    isString = false;
                }
            }
            else if (!isString) {
                isString = true;
                word = chr;
            }

            continue;
        }
        else if (isString) {
            word += chr;
            continue;
        }

        if (word.startsWith('/*') && !isComment) {
            isComment = true;
            continue;
        }
        else if (isComment) {
            word += chr;
            if (word.endsWith('*/') && !(word.endsWith(`\\*/`) || word.endsWith(`*\\/`))) {
                isComment = false;
                word = '';
            }
            continue;
        }
        else if (word.startsWith('//')) {
            word += chr;
            continue;
        }
        else if (chr === '(' && !isFunc) {
            if (Object.keys(functions).some(val => word.trim().startsWith(val))) {
                isFunc = true;
                currentFuncName = word.trim();
                word = '';
                argIndex = 0;
                parenth++;
            }
            else word += chr;

        }
        else if (chr === '(' && isFunc) {
            if (Object.keys(functions).some(val => word.trim().startsWith(val))) {
                parenth++;
                prevArgIndex = argIndex;
                argIndex = 0;
                prevFuncName = currentFuncName;
                currentFuncName = word.trim();
                word = '';
            }
            else word += chr;
        }
        else if (chr === ')' && isFunc) {
            if (--parenth === 0) {
                func = undefined;
                isFunc = false;
                currentFuncName = null;
                prevFuncName = null;
                argIndex = 0;
                prevArgIndex = 0;
                parenth = 0;
            }
            else {
                argIndex = prevArgIndex;
                prevArgIndex = argIndex;
                func = [prevFuncName, argIndex];
                currentFuncName = prevFuncName;
                prevFuncName = null;
            }
        }
        else if (chr === ' ' && isFunc) {
            word += chr;
            if (word.trim() + " " !== ' ')
                argIndex++;
            word = '';
        }
        else if (chr === ' ') {
            word = '';
            argIndex++;
        }
        else {
            word += chr;
        }
    }

    return isFunc ? [currentFuncName, argIndex] : func;
}