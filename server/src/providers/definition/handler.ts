import { existsSync } from "fs";
import * as path from "path";
import { DefinitionParams, Location, Range } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IScopeContext } from "../../common/context";
import { getWordRangeAtPosition } from "../../common/utils/document";
import { getAllMatches } from "../../common/utils/string";

export default async function FTHTMLDefinitionProviderHandler(params: DefinitionParams, context: IScopeContext): Promise<Location[]> {

    const text = context.document.getText(context.document.lineAt(params.position.line).range);
    const importMatch = text.match(/import\s+(['"])([^\1]*)\1(\s+\{)?/);
    const varRange = getWordRangeAtPosition(context.document.lines, params.position, /(^|[\s\(\{\.])@[\w-]+([\s\)\}]|$)/);

    if (importMatch) return [await _getImportDefinitions(importMatch, context)];
    else if (varRange) return await _getVariableDefinitions(varRange, context);

    return
}

async function _getImportDefinitions(match, { document, workspace, config }: IScopeContext): Promise<Location> {
    const [, , filename] = match;

    let tld = path.dirname(URI.parse(workspace.uri).fsPath);
    if (config.json.importDir && workspace) {
        tld = path.resolve(URI.parse(workspace.uri).fsPath, config.json.importDir);
    }
    let filePath = path.resolve(tld, `${filename}.fthtml`);

    if (filename.startsWith('&')) {
        filePath = path.resolve(path.dirname(URI.parse(document.uri).fsPath), `${filename.substring(1)}.fthtml`);
    }

    if (existsSync(filePath)) {
        return {
            uri: URI.file(filePath).path,
            range: Range.create(0, 0, 0, 0)
        }
    }
}

async function _getVariableDefinitions(range: Range, { document, config }: IScopeContext): Promise<Location[]> {
    const varName = document.getText(range).trim().substring(1);

    let locations: Location[] = [];
    if (config) {
        const fthtmlconfigLines = config.content.split("\n");

        if (config.json.globalvars && config.json.globalvars[varName]) {
            const indx = config.content.indexOf(`"${varName}"`);

            let chars = 0;
            let line = 0;
            while ((chars += fthtmlconfigLines[line++].length + "\n".length) <= indx + varName.length) { }

            line = Math.max(line - 1, 0);
            locations.push({
                uri: URI.file(config.path).path,
                range: Range.create(line, fthtmlconfigLines[line].indexOf(varName), line, fthtmlconfigLines[line].indexOf(varName) + varName.length)
            })
        }
    }

    const regexp = new RegExp("#vars(.*?)#end", 'gms');
    const matches = getAllMatches(document.getText(), regexp);

    for (const match of matches) {
        const thisregexp = new RegExp("(^\\s*)" + varName, 'gm');

        const thismatches = getAllMatches(match[1], thisregexp)
        for (const thismatch of thismatches) {
            locations.push({
                uri: URI.parse(document.uri).path,
                range: Range.create(document.positionAt(match.index + thismatch.index + 5 + thismatch[1].length),
                    document.positionAt(match.index + thismatch.index + 5 + thismatch[1].length + varName.length))
            });
        }

    }

    return locations;

}