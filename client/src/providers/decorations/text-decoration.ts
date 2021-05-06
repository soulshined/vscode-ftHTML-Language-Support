import { DecorationOptions, DecorationRenderOptions, Range, TextEditorDecorationType, window } from "vscode";

let timeout: NodeJS.Timer | undefined = undefined;
let tinyTDecorationType: TextEditorDecorationType = window.createTextEditorDecorationType({
    cursor: 'help',
    backgroundColor: { id: "fthtml.tinytemplateBackground" },
    textDecoration: '#BDB395 underline',
    fontStyle: 'italic',
    fontWeight: 'normal'
});

export function DecorationsProvider(client) {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    timeout = setTimeout(() => {
        tinyTDecorationType.dispose();
        _update(client);
    }, 1000);
}

function _update(client) {
    if (window.activeTextEditor) {
        client.sendRequest('decorations', { doc: window.activeTextEditor.document })
            .then(({ data, settings }) => {
                tinyTDecorationType = window.createTextEditorDecorationType(<DecorationRenderOptions>{
                    cursor: 'help',
                    backgroundColor: { id: "fthtml.tinytemplateBackground" },
                    textDecoration: settings.textDecoration ?? '#BDB395 underline',
                    fontStyle: settings.fontStyle ?? 'italic',
                    fontWeight: settings.fontWeight ?? 'normal',
                    before: {
                        contentText: settings.beforeContent
                    },
                    after: {
                        contentText: settings.afterContent
                    }
                });

                const text = window.activeTextEditor.document.getText();
                const tinyts: DecorationOptions[] = [];

                if (data)
                Object.keys(data).forEach(tt => {
                    const regEx = new RegExp(`(?<=(^|\\s|\\(|{|}|\\)))${tt}(?=($|\\s|\\(|\\)|}|{))`, 'g');
                    let match;
                    while ((match = regEx.exec(text))) {
                        const startPos = window.activeTextEditor.document.positionAt(match.index);
                        const endPos = window.activeTextEditor.document.positionAt(match.index + match[0].length);
                        const decoration: DecorationOptions = {
                            range: new Range(startPos, endPos),
                            hoverMessage: data[tt] ? `Alias (Global) for: ${data[tt]}` : 'Alias (Local)'
                        };
                        tinyts.push(decoration);
                    }

                })

                window.activeTextEditor.setDecorations(tinyTDecorationType, tinyts);
            })
            .catch(console.log);
    }
}