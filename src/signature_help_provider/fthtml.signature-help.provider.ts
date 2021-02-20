import { SignatureHelpProvider, TextDocument, Position, CancellationToken, SignatureHelpContext, ProviderResult, SignatureHelp, ParameterInformation, SignatureInformation, Range } from "vscode";
import { default as functions, paramsToString } from "../consts/functions";
import { PATTERNS } from "../consts/patterns";
import { getAllMatches, getLastElement, isempty } from "../utils/common";

export default class FTHTMLSignatureHelpProvider implements SignatureHelpProvider {

    provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken, context: SignatureHelpContext): ProviderResult<SignatureHelp> {

        const funcMatch = this.parseFunction(document, position);
        if (!funcMatch) return;

        const { name, func, index } = funcMatch;

        let signatureHelp = new SignatureHelp();

        let paramInfoList: ParameterInformation[] = [];

        func.parameters.forEach((param: any) => {
            paramInfoList.push(new ParameterInformation(param.name, param.documentation ?? ''));
        })

        const sigLabel = `${name}(${paramsToString(func.parameters)}) -> ${func.returnType}`;
        const sigInfo = new SignatureInformation(sigLabel);
        sigInfo.parameters = paramInfoList;

        signatureHelp.activeParameter = index;

        // @ts-ignore
        if (index > func.parameters.length - 1 && getLastElement(func.parameters).isRestParameter)
            signatureHelp.activeParameter = func.parameters.length - 1;

        signatureHelp.signatures = [sigInfo];


        return signatureHelp;

    }

    parseFunction(document: TextDocument, position: Position): { name: string, index: number, func: any } | undefined {
        let funcName: string = '';
        let paramIndex: number = 0;
        const text: string = document.getText(new Range(new Position(position.line, 0), position));

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
                    paramIndex++
                    word = '';
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


}