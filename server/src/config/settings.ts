import { platform } from "os";

export interface FTHTMLConfigs {
    path: string,
    content: string,
    json: {
        importDir: string,
        jsonDir: string,
        globalvars: { [key: string]: string },
        globalTinyTemplates: { [key: string]: string }
    }
}

export interface FTHTMLFormats {
    enabled: boolean;

    braces: {
        newLineAfterElement: boolean,
        newLineAfterEmbeddedLangs: boolean,
        newLineAfterAttributes: boolean,
        newLineAfterImport: boolean,
        newLineAfterVariableOrPropertyBinding: boolean,
        addIdentifierCommentAfterClosingBrace: boolean,
        skipTagNamesForCommentAfterClosingBrace: string[],
        minimumNumberOfLinesToAddIdentifierComment: number
    };

    attributes: {
        addSpaceBeforeAttributeParenthesis: boolean,
        padAttributesWithSpace: boolean,
        order: string,
        sorted: boolean,
        wrapOrderedAttributes: boolean,
        minimumNumberOfAttributesForWrapping: number
    };

    onPasteHTML: {
        quotationMark: string;
    };

    collapseSingleChildElements: boolean;
    collapseSingleChildElementsIfLineLengthLessThan: number;
    skipTagNamesForCollapsing: string[];
    alignVariableOrPropertyBindingValues: boolean;
    newLineBeforeComments: boolean;
    newLineAfterLastChildElement: boolean;
    newLineBeforeFirstChildElement: boolean;
    newLineBeforeAfterChildElementMinimumDepth: number;
    newLineBeforeAfterChildElementMaximumDepth: number;
}

export interface FTHTMLSettings {
    export: {
        onSave: boolean,
        onErrorOutputMode: string,
        clearOutput: boolean
    }
    documentLinking: {
        enabled: boolean
    },
    validation: {
        enabled: boolean
    },
    includeTagNamesInSymbols: boolean,
    shell: string | undefined,
    format: FTHTMLFormats
}

const DefaultSettings: FTHTMLSettings = {
    export: {
        onSave: true,
        onErrorOutputMode: "prompt",
        clearOutput: false
    },
    validation: {
        enabled: true
    },
    shell: platform() === 'darwin' ? "/usr/local/bin" : undefined,

    documentLinking: {
        enabled: true
    },

    includeTagNamesInSymbols: false,

    format: {
        enabled: true,

        braces: {
            newLineAfterElement: true,
            newLineAfterEmbeddedLangs: false,
            newLineAfterAttributes: false,
            newLineAfterImport: false,
            newLineAfterVariableOrPropertyBinding: false,
            addIdentifierCommentAfterClosingBrace: true,
            minimumNumberOfLinesToAddIdentifierComment: 16,
            skipTagNamesForCommentAfterClosingBrace: ["span", "li", "a", "abbr", "acronym", "audio", "b", "bdi", "bdo", "big", "br", "button", "canvas", "cite", "code", "data", "datalist", "del", "dfn", "em", "embed", "i", "iframe", "img", "input", "ins", "kbd", "label", "map", "mark", "meter", "noscript", "object", "output", "picture", "progress", "q", "ruby", "s", "samp", "script", "select", "slot", "small", "span", "strong", "sub", "sup", "svg", "template", "textarea", "time", "u", "tr", "td", "tt", "var", "video", "wbr"]
        },
        attributes: {
            addSpaceBeforeAttributeParenthesis: true,
            padAttributesWithSpace: false,
            order: "id, class, kvp, misc",
            sorted: true,
            wrapOrderedAttributes: true,
            minimumNumberOfAttributesForWrapping: 6
        },
        onPasteHTML: {
            quotationMark: "'"
        },

        alignVariableOrPropertyBindingValues: true,
        newLineBeforeFirstChildElement: true,
        newLineAfterLastChildElement: true,
        newLineBeforeAfterChildElementMinimumDepth: 1,
        newLineBeforeAfterChildElementMaximumDepth: 1,
        newLineBeforeComments: true,
        collapseSingleChildElements: true,
        collapseSingleChildElementsIfLineLengthLessThan: 80,
        skipTagNamesForCollapsing: ["pre", "code"]
    }
};

export default DefaultSettings;