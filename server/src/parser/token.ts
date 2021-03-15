import { tokenposition } from "fthtml/lib/lexer/types";
import { default as ftHTMLGrammar } from "fthtml/lib/lexer/grammar/index";

export const enum TOKEN_TYPE {
    ATTR_CLASS = 'Attr_Class',
    ATTR_CLASS_VAR = 'Attr_Class_Var',
    ATTR_ID = 'Attr_Id',
    COMMENT = 'Comment',
    COMMENTB = 'Block Comment',
    ELANG = 'ELang',
    ELANGB = 'ElangB',
    FUNCTION = 'Function',
    MACRO = 'Macro',
    KEYWORD = 'Keyword',
    KEYWORD_DOCTYPE = 'Keyword_Doctype',
    PRAGMA = 'Pragma',
    STRING = 'String',
    SYMBOL = 'Symbol',
    VARIABLE = 'Variable',
    WORD = 'Word',
};

export type token = {
    type: TOKEN_TYPE,
    value: string,
    position: tokenposition
}

export type Tokenable = token | null;

export type TokenStream = {
    next: () => Tokenable;
    peek: () => Tokenable;
    eof: () => boolean;
};

export default function Token(type: TOKEN_TYPE, value: string, position: tokenposition) {
    return {
        type,
        value,
        position
    }
}

export function getTokenTypeForIdentifier(identifier: string):
    TOKEN_TYPE.KEYWORD_DOCTYPE |
    TOKEN_TYPE.KEYWORD |
    TOKEN_TYPE.ELANG |
    TOKEN_TYPE.FUNCTION |
    TOKEN_TYPE.MACRO |
    TOKEN_TYPE.PRAGMA |
    TOKEN_TYPE.WORD |
    TOKEN_TYPE.ATTR_ID {
    if (~ftHTMLGrammar.keywords.indexOf(identifier)) {
        if (identifier == 'doctype') return TOKEN_TYPE.KEYWORD_DOCTYPE;
        return TOKEN_TYPE.KEYWORD;
    }
    // @ts-ignore
    else if (ftHTMLGrammar.elangs[identifier]) return TOKEN_TYPE.ELANG;
    else if (~ftHTMLGrammar.pragmas.indexOf(identifier)) return TOKEN_TYPE.PRAGMA;
    else if (ftHTMLGrammar.functions[identifier]) return TOKEN_TYPE.FUNCTION;
    // @ts-ignore
    else if (ftHTMLGrammar.macros[identifier]) return TOKEN_TYPE.MACRO;
    else return TOKEN_TYPE.WORD;
}