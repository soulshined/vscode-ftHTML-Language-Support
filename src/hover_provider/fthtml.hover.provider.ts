import { HoverProvider, TextDocument, Position, CancellationToken, ProviderResult, Hover } from "vscode";
import functions, { fthtmlfunc } from "../consts/functions"
import macros, { fthtmlmacro } from "../consts/macros";
import { PATTERNS } from "../consts/patterns";

export default class FTHTMLHoverProvider implements HoverProvider {

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {

        let wrange = document.getWordRangeAtPosition(position, new RegExp(`${PATTERNS.FUNCTIONS}\\(`));
        let name = document.getText(wrange);
        name = name.substring(0, name.length - 1);

        if (!wrange) {
            wrange = document.getWordRangeAtPosition(position, new RegExp(PATTERNS.MACROS));

            if (!wrange) return;

            name = document.getText(wrange);
            name = name.substring(2, name.length - 2);
        };

        const obj: fthtmlfunc | fthtmlmacro =
            functions[name] ? functions[name] : macros[name];

        return new Hover(obj.documentation);
    }

}