import { Hover } from "vscode-languageserver";
import { IScopeContext } from "../../common/context";
import functions, { fthtmlfunc } from "../../common/documentation/functions";
import macros, { fthtmlmacro } from "../../common/documentation/macros";
import { PATTERNS } from "../../common/patterns";
import { getWordRangeAtPosition } from "../../common/utils/document";

export function HoverHandler({ document, position }: IScopeContext): Hover | undefined {

    let wrange = getWordRangeAtPosition(document.lines, position, new RegExp(`${PATTERNS.FUNCTIONS}\\(`));

    let name = document.getText(wrange);
    name = name.substring(0, name.length - 1);

    if (!wrange) {
        wrange = getWordRangeAtPosition(document.lines, position, new RegExp(PATTERNS.MACROS));

        if (!wrange) return;

        name = document.getText(wrange);
        name = name.substring(2, name.length - 2);
    };

    const obj: fthtmlfunc | fthtmlmacro =
        functions[name] ? functions[name] : macros[name];

    return {
        contents: obj.documentation
    };

}