import * as path from "path";
import { existsSync, readFileSync } from "fs";
import { getAllMatches } from "../utils/common";
import { DefinitionProvider, TextDocument, Position, CancellationToken, ProviderResult, Location, LocationLink, workspace, Uri, EndOfLine } from "vscode";

export default class FTHTMLHierarchyProvider implements DefinitionProvider {
    private configs: any = {}

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Location | Location[] | LocationLink[]> {
        const { text: currentLineText } = document.lineAt(position.line);
        const importMatch = currentLineText.match(/import\s+(['"])([^\1]*)\1(\s+\{)?/);
        if (importMatch) {
            const [, , filename] = importMatch;

            let tld = path.dirname(document.uri.fsPath);
            if (this.configs.importDir && workspace.workspaceFolders) {
                tld = path.resolve(workspace.workspaceFolders[0].uri.fsPath, this.configs.importDir);
            }
            let filePath = path.resolve(tld, `${filename}.fthtml`);
            if (filename.startsWith('&')) {
                filePath = path.resolve(path.dirname(document.uri.fsPath), `${filename.substring(1)}.fthtml`);
            }

            if (existsSync(filePath)) {
                return new Location(Uri.file(filePath), new Position(0, 0))
            }

        }

        const varRange = document.getWordRangeAtPosition(position, /(^|[\s\(\{\.])@[\w-]+([\s\)\}]|$)/);
        if (varRange) {
            const varName = document.getText(varRange).trim().substring(1);

            let locations = [];
            const eol = document.eol === EndOfLine.LF ? '\n' : '\r\n';

            if (workspace.workspaceFolders) {
                const jsonConfigPath = path.join(workspace.workspaceFolders[0].uri.fsPath, 'fthtmlconfig.json');
                if (existsSync(jsonConfigPath)) {
                    const content = readFileSync(jsonConfigPath, 'utf-8');
                    const fthtmlconfigLines = content.split(eol);
                    const configs = JSON.parse(content);
                    if (configs.globalvars && configs.globalvars[varName]) {
                        const indx = content.indexOf(`"${varName}"`);

                        let chars = 0;
                        let line = 0;
                        while ((chars += fthtmlconfigLines[line++].length + eol.length) <= indx + varName.length) { }

                        line = Math.max(line - 1, 0);
                        locations.push(new Location(Uri.file(jsonConfigPath), new Position(line, fthtmlconfigLines[line].indexOf(varName))))
                    }
                }
            }

            const regexp = new RegExp("#vars(.*?)#end", 'gms');
            const matches = getAllMatches(document.getText(), regexp);

            for (const match of matches) {
                const thisregexp = new RegExp("(^\\s*)" + varName, 'gm');

                const thismatches = getAllMatches(match[1], thisregexp)
                for (const thismatch of thismatches) {
                    locations.push(new Location(document.uri, document.positionAt(match.index + thismatch.index + 5 + thismatch[1].length)));
                }

            }

            return locations;

        }

    }

}