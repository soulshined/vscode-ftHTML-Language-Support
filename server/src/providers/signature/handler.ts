import { ParameterInformation, Range, SignatureHelp, SignatureInformation } from "vscode-languageserver";
import { IScopeContext } from "../../common/context";
import functions, { paramsToString } from "../../common/documentation/functions";
import { PATTERNS } from "../../common/patterns";
import { getLastElement } from "../../common/utils/array";
import { getAllMatches, isempty } from "../../common/utils/string";

export default function SignatureHelpHandler(context: IScopeContext): SignatureHelp | undefined {

    const funcMatch = _parseForFunction(context);

    if (!funcMatch) return;

    const { name, func, index } = funcMatch;
    let activeParameter = index;

    const paramInfoList: ParameterInformation[] = [];

    func.parameters.forEach((param: any) => {
        paramInfoList.push({
            label: param.name,
            documentation: param.documentation ?? ''
        });
    })

    const sigInfo: SignatureInformation = {
        label: `${name}(${paramsToString(func.parameters)}) -> ${func.returnType}`
    };
    sigInfo.parameters = paramInfoList;

    // @ts-ignore
    if ((index > func.parameters.length - 1 && getLastElement(func.parameters).isRestParameter))
        activeParameter = func.parameters.length - 1;

    sigInfo.activeParameter = activeParameter;

    return {
        signatures: [sigInfo],
        activeSignature: 0,
        activeParameter
    }

}

function _parseForFunction({ document, position }: IScopeContext): { name: string, index: number, func: any } | undefined {
    let funcName: string = '';
    let paramIndex: number = 0;
    const text: string = document.getText(Range.create(position.line, 0, position.line, position.character));

    const symmetrical = new RegExp(`(^|\\s+)${PATTERNS.FUNCTIONS}\\(`, "g");
    let matches = getAllMatches(text, symmetrical);
    if (matches.length === getAllMatches(text, /\)/g).length)
        return;

    const regexp = new RegExp(`(^|\\s+)${PATTERNS.FUNCTIONS}\\((.*)$`, "gm");

    matches = getAllMatches(text, regexp);
    if (isempty(matches)) return;

    matches.forEach(match => {
        funcName = match[2];

        let isString = false;
        let isFunction = false;
        let prevIndex = 0;
        let stringDelimiter = `'`;
        let prevFuncName = '';
        let word = '';
        for (let i = 0; i < match[3].length; i++) {
            const e = match[3][i];
            if (isString) {
                if (e === stringDelimiter)
                    isString = false;
            }
            else if ([`'`, `"`].includes(e)) {
                isString = true;
                stringDelimiter = e;
            }
            else if (e === ' ') {
                if ((paramIndex === 0 && word.trim().length > 0) ||
                    (paramIndex > 0 && word.trim().length > 0)) {
                    paramIndex++
                    word = '';
                }
            }
            else if (isFunction && e === ')') {
                funcName = prevFuncName;
                paramIndex = prevIndex;
            }
            else if (Object.keys(functions).map(fn => `${fn}(`).includes(word + e)) {
                prevFuncName = funcName;
                prevIndex = paramIndex;
                paramIndex = 0;
                funcName = word;
                isFunction = true;
                word = '';
            }
            else {
                word += e;
            }
        }
    })

    return {
        name: funcName,
        func: functions[funcName],
        index: paramIndex
    }
}