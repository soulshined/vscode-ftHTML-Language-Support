import { existsSync } from "fs";
import * as path from "path";
import { DefinitionParams, Location, Range } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { IScopeContext } from "../../common/context";
import { getWordRangeAtPosition } from "../../common/utils/document";
import { getAllMatches } from "../../common/utils/string";

export default async function FTHTMLDefinitionProviderHandler(params: DefinitionParams, context: IScopeContext): Promise<Location[]> {

    try {
        const text = context.document.getText(context.document.lineAt(params.position.line).range);
        const importMatch = text.match(/import\s+(['"])([^\1]*)\1(\s+\{)?/);
        const jsonMatch = text.match(/json[ ]*\((['"])([^\1]*)\1[ ]*\)/);

        if (importMatch) return [await _getImportDefinitions(importMatch, context)];
        else if (jsonMatch) return [await _getJsonDefinition(jsonMatch, context)];
        else {
            const varRange = getWordRangeAtPosition(context.document.lines, params.position, /@?[\w-]+/);

            return await _getVariableDefinitions(varRange, context);
        }
    } catch (error) {
        console.log(error);
    }

    return
}

async function _getJsonDefinition(match, { document, workspace, config }: IScopeContext) : Promise<Location> {
    const [, , filename] = match;

    let tld = path.dirname(URI.parse(workspace.uri).fsPath);
    if (config.json.jsonDir && workspace) {
        tld = path.resolve(URI.parse(workspace.uri).fsPath, config.json.jsonDir);
    }
    let filePath = path.resolve(tld, `${filename}.json`);

    if (filename.startsWith('&')) {
        filePath = path.resolve(path.dirname(URI.parse(document.uri).fsPath), `${filename.substring(1)}.json`);
    }

    console.log(filePath);
    if (existsSync(filePath)) {
        return {
            uri: URI.file(filePath).path,
            range: Range.create(0, 0, 0, 0)
        }
    }
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
    let mode = 'templates';
    const fullWord = document.getText(range).trim();
    let word = fullWord;
    if (word.startsWith('@')) {
        mode = 'vars';
        word = word.substring(1);
    }

    let locations: Location[] = [];
    if (config) {
        const fthtmlconfigLines = config.content.split("\n");

        if (config.json.globalvars && config.json.globalvars[word] ||
            config.json.tinytemplates && config.json.tinytemplates[word]) {
            let indx = config.content.indexOf(`"${word}"`);

            if (indx === -1) {
                word = "extend";
                indx = config.content.indexOf(`"${word}"`);
            }

            if (indx >= 0) {
                let chars = 0;
                let line = 0;
                while ((chars += fthtmlconfigLines[line++].length + "\n".length) <= indx + word.length) { }

                line = Math.max(line - 1, 0);
                locations.push({
                    uri: URI.file(config.path).path,
                    range: Range.create(line, fthtmlconfigLines[line].indexOf(word), line, fthtmlconfigLines[line].indexOf(word) + word.length)
                })
            }
        }
    }

    let regexp = new RegExp('#((?:tiny)?templates)(.*?)#end', 'gms');
    if (mode === 'vars')
        regexp = new RegExp("(#vars)(.*?)#end", 'gms');
    const matches = getAllMatches(document.getText(), regexp);

    for (const match of matches) {
        const { index: pragmastart } = match;
        const [ all, pragmaName ] = match;
        const thisregexp = new RegExp("\\b" + word + "(\\s|$)", 'gm');

        const thismatches = getAllMatches(match[2], thisregexp)
        for (const thismatch of thismatches) {
            const pos = pragmastart + pragmaName.length + thismatch.index + +!!!fullWord.startsWith(('@'));
            locations.push({
                uri: URI.parse(document.uri).path,
                range: Range.create(document.positionAt(pos), document.positionAt(pos + word.length))
            });
        }

    }

    return locations;

}