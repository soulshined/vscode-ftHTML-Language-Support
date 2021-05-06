import { Hover } from "vscode-languageserver";
import { IScopeContext } from "../../common/context";
import functions, { fthtmlfunc, misc_methods } from "../../common/documentation/functions";
import macros, { fthtmlmacro } from "../../common/documentation/macros";
import operators from "../../common/documentation/operators";
import { PATTERNS } from "../../common/patterns";
import { getWordRangeAtPosition } from "../../common/utils/document";

export function HoverHandler({ document, position }: IScopeContext): Hover | undefined {

    let wrange = getWordRangeAtPosition(document.lines, position, new RegExp(`${PATTERNS.FUNCTIONS}\\(|each`));

    let name = document.getText(wrange);
    if (name === 'each') {
        return {
            contents: misc_methods['each'].documentation
        }
    }

    name = name.substring(0, name.length - 1);

    if (!wrange) {
        wrange = getWordRangeAtPosition(document.lines, position, new RegExp(PATTERNS.MACROS));

        if (!wrange) {
            wrange = getWordRangeAtPosition(document.lines, position, new RegExp(PATTERNS.OPERATORS));

            if (wrange) {
                return {
                    contents: operators[document.getText(wrange)].documentation
                }
            }

            return;
        };

        name = document.getText(wrange);
        name = name.substring(2, name.length - 2);
    };

    const obj: fthtmlfunc | fthtmlmacro =
        functions[name] ? functions[name] : macros[name];

    return {
        contents: obj.documentation
    };

}