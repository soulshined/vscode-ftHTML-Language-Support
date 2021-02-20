import {
    SymbolInformation,
    SymbolKind,
    Range,
    Position,
    DocumentSymbolProvider,
    Location,
    TextDocument,
    CancellationToken
} from "vscode";
import FileParser from "./file-parser";

export default class FTHTMLDocumentSymbolProvider
    implements DocumentSymbolProvider {
    provideDocumentSymbols(document: TextDocument, token: CancellationToken) {
        let fileText = document.getText();
        let symbolInformations = new FileParser(
            fileText
        ).symbolInformation();

        return symbolInformations.map(symbolInformation => {
            const { name, type, startLine, endLine, index } = symbolInformation;

            const symbolKinds = {
                class: SymbolKind.Class,
                def: SymbolKind.Method,
                variable: SymbolKind.Variable
            };
            var rage = new Range(
                new Position(startLine, index),
                new Position(endLine ?? startLine, index)
            );

            // @ts-ignore
            return new SymbolInformation(name ?? '', symbolKinds[type], '', new Location(document.uri, rage));
        });
    }
}