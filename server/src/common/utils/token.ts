import { IFTHTMLElement } from "fthtml/lib/parser/types";
import { TOKEN_TYPE as TT } from "fthtml/lib/lexer/token";
import { isExpectedType, isOneOfExpectedTypes } from "fthtml/lib/utils/functions";

export function getFTHTMLTokenValue(element: IFTHTMLElement) {
    if (isExpectedType(element.token, TT.ATTR_CLASS))
        return `.${element.token.value}`;
    if (isExpectedType(element.token, TT.VARIABLE))
        return `@${element.token.value}`;
    if (isExpectedType(element.token, TT.ATTR_CLASS_VAR))
        return `.@${element.token.value}`;
    if (isOneOfExpectedTypes(element.token, [TT.ATTR_ID, TT.PRAGMA]))
        return `#${element.token.value}`;
    if (isExpectedType(element.token, TT.STRING))
        return `${element.token.delimiter}${element.token.value}${element.token.delimiter}`;

    return element.token.value;
}