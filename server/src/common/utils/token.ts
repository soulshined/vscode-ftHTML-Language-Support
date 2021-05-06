import { FTHTMLElement } from "fthtml/lib/model/fthtmlelement";
import { Token } from "fthtml/lib/model/token";

export function getFTHTMLTokenValue(element: FTHTMLElement) {
    if (Token.isExpectedType(element.token, Token.TYPES.ATTR_CLASS))
        return `.${element.token.value}`;
    if (Token.isOneOfExpectedTypes(element.token, Token.Sequences.VARIABLE))
        return `@${element.token.value}`;
    if (Token.isExpectedType(element.token, Token.TYPES.ATTR_CLASS_VAR))
        return `.@${element.token.value}`;
    if (Token.isOneOfExpectedTypes(element.token, [Token.TYPES.ATTR_ID, Token.TYPES.PRAGMA]))
        return `#${element.token.value}`;
    if (Token.isExpectedType(element.token, Token.TYPES.STRING))
        return `${element.token.delimiter}${element.token.value}${element.token.delimiter}`;

    return element.token.value;
}