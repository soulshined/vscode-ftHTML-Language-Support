import { FTHTMLElement } from "fthtml/lib/model/fthtmlelement";
import { Token } from "fthtml/lib/model/token";
import { Range } from "vscode-languageserver-types";
import functions from "../../common/documentation/functions";
import { clamp } from "./number";
import ftHTMLGrammar from "fthtml/lib/lexer/grammar/index";

export function repeat(value: string, count: number) {
    let s = '';
    while (count > 0) {
        if ((count & 1) === 1) {
            s += value;
        }
        value += value;
        count = count >>> 1;
    }
    return s;
}

export function isWhitespaceOnly(str: string) {
    return /^\s*$/.test(str);
}

export function isNullOrWhitespace(str: string) {
    return str === null || str === undefined || isWhitespaceOnly(str);
}

export function isEOL(content: string, offset: number) {
    return isNewlineCharacter(content.charCodeAt(offset));
}

const CR = '\r'.charCodeAt(0);
const NL = '\n'.charCodeAt(0);
export function isNewlineCharacter(charCode: number) {
    return charCode === CR || charCode === NL;
}


/**
 * requires 'g' flag at minimum or else the pointer will not progress
 */
export function getAllMatches(str: string, regexp: RegExp): RegExpExecArray[] {
    let match: RegExpExecArray | null;
    let matches: RegExpExecArray[] = [];
    while ((match = regexp.exec(str)) !== null) {
        matches.push(match);
    }

    return matches;
}

export function isempty(obj: any): boolean | undefined {
    if (Array.isArray(obj))
        return obj.length === 0;
    if (typeof obj === 'string')
        return /^\s*$/.test(obj);
}


function parseWhileString(val, start, delim) {
    let str = '';
    for (start; start < val.length; start++) {
        const chr = val[start];
        str += chr;
        if (chr === delim && !str.endsWith('\\' + chr))
            return [str, start];
    }

    return [str, val.length];
}

function parseWhitespace(val, start) {
    for (start; start < val.length; start++)
        if (isWhitespaceOnly(val[start])) continue;
        else break;

    return start;
}

function parseWhileFunction(prefix: string, val: string, start = 0, offset = 0): [FTHTMLElement, number] {
    const t = new FTHTMLElement(new Token(Token.TYPES.FUNCTION, prefix, Token.Position.create(0, start - prefix.length + offset)));
    start = parseWhitespace(val, start) + 1;
    const children = parseWhileType(val, offset, start, ')');
    children[0].map(m => {
        if (m.token.type === 'String') {
            if (m.token.value === '')
                m.token.position.end = m.token.position.end + 1;
            if (m.token.value.endsWith('"') || m.token.value.endsWith("'")) {
                m.token.position.column = m.token.position.column + 1;
                m.token.position.end = m.token.position.end + 1;
            }
        }

        return m;
    })
    t.children.push(...children[0]);
    start = parseWhitespace(val, children[1]);
    return [t, start];
}

function parseWhileType(val, offset = 0, start = 0, ending?): [FTHTMLElement[], number] {
    const ts : FTHTMLElement[] = [];

    let prefix = '';
    for (start; start < val.length; start++) {
        const chr = val[start];
        if (ending && chr === ending) {
            if (prefix.length > 0)
                ts.push(new FTHTMLElement(TokenFromString(prefix, Token.Position.create(0, start + offset - prefix.length))));
            return [ts, start];
        }

        if ([`'`, `"`].includes(chr)) {
            const t = TokenFromString(chr, Token.Position.create(0, start + offset));
            const [str, end] = parseWhileString(val, start + 1, chr);
            t.value += str;
            t.position.end = end + offset;
            ts.push(new FTHTMLElement(t));
            start = end;
        }
        else if (Object.keys(functions).some(f => prefix.startsWith(f))) {
            const func = parseWhileFunction(prefix, val, start, offset);
            ts.push(func[0]);
            start = func[1];
            prefix = '';
        }
        else if (/\s/.test(chr)) {
            if (prefix !== '') {
                ts.push(new FTHTMLElement(TokenFromString(prefix, Token.Position.create(0, start + offset - prefix.length))));
            }
            prefix = '';
        }
        else {
            prefix += chr;
        }

    }

    if (prefix.length > 0)
        ts.push(new FTHTMLElement(TokenFromString(prefix, Token.Position.create(0, start - prefix.length + offset))));

    return [ts, start];
}

function flattenElements(elements: FTHTMLElement[]) {
    const result = [];
    elements.forEach(e => {
        result.push(e);
        if (e.children.length > 0)
            result.push(...flattenElements(e.children));
    });
    return result;
}

function getFlatTokenValues(val, offset) {
    const result = [];
    const tokens = parseWhileType(val, offset)[0];
    tokens.forEach(t => {
        result.push(t);
        if (t.children.length > 0)
            result.push(...flattenElements(t.children));
    })

    return result;
}

export function getTokenTypeForString(val: string) {
    val = val.trim();
    if ([`'`, `"`].includes(val.charAt(0))) return Token.TYPES.STRING;
    if (ftHTMLGrammar.rules.isValidSymbol(val)) return Token.TYPES.SYMBOL;
    if (val.startsWith('//')) return Token.TYPES.COMMENT;
    if (val.startsWith('/*')) return Token.TYPES.COMMENTB;
    if (val.startsWith('@')) {
        if (~val.indexOf('.') || ~val.indexOf('['))
            return Token.TYPES.LITERAL_VARIABLE;

        return Token.TYPES.VARIABLE;
    }
    if (val.startsWith('.')) {
        if (val.charAt(1) === '@') {
            if (~val.indexOf('.') || ~val.indexOf('['))
                return Token.TYPES.ATTR_CLASS_LITERAL_VAR;

            return Token.TYPES.ATTR_CLASS_VAR;
        }

        return Token.TYPES.ATTR_CLASS;
    }

    return Token.getTypeForIdentifier(val);
}

function TokenFromString(val: string, pos: Token.Position): Token<Token.TYPES> {
    let type = getTokenTypeForString(val);
    const t = new Token(type, val, pos);
    if (type === 'String' && !val.startsWith(`'`) && !val.startsWith(`"`))
        t.position.end = t.position.column + 1;
    else if (type === 'String') {
        t.position.column += 1;
        t.value = t.value.substring(1);
        let end = val.length - 1;

        const match = val.match(/^\s*(['"])[^\1]*?(['"])?\s*$/)
        if (match) {
            if (match[2]) {
                t.position.column += 1;
                end--;
            }
        }
        t.position.end = clamp(end + t.position.column, t.position.column + 1, Number.MAX_SAFE_INTEGER);
    }
    else if (type === 'Variable' || type === 'Literal Variable')
        t.position.end = t.position.end - 1;

    return t;
}

export function getElementsInReverse(val: string, count: number = Number.MAX_SAFE_INTEGER, flatten: boolean = false): FTHTMLElement[] {
    const elements: FTHTMLElement[] = [];

    let value = "";
    let isFunc = false;
    let isString = false;
    let parenth = 0;
    let index = 0;
    let isComment = false;
    let delimiter = '';
    for (let i = 0; i < val.length; i++) {
        const chr = val[i];
        value += chr;
        if (isString) {
            if (value.endsWith(delimiter) && !value.endsWith(`\\${chr}`)) {
                isString = false;
                elements.push(new FTHTMLElement(TokenFromString(value, Token.Position.create(0, i - value.length))));
                value = '';
            }
            else if (value.startsWith('@') && delimiter === chr && !value.endsWith(`\\${delimiter}`))
                isString = false;
            else continue;
        }
        else if ([`'`, `"`].includes(chr)) {
            isString = true;
            delimiter = chr;
            index = i;
            continue;
        }
        else if (value.startsWith('@') && [`'`, `"`].includes(chr)) {
            isString = true;
            delimiter = chr;
            continue;
        }

        if (value.startsWith('/*') && !isComment) {
            isComment = true;
            continue;
        }
        else if (isComment) {
            if (value.endsWith('*/')) {
                isComment = false;
                elements.push(new FTHTMLElement(TokenFromString(value, Token.Position.create(0, index))));
                value = '';
            }
            continue;
        }
        else if (value.startsWith('//')) {
            continue;
        }
        else if (chr === '(' && !isFunc) {
            if (Object.keys(functions).some(val => value.startsWith(val))) {
                isFunc = true;
                parenth = 1;
                index = i;
            }
            else {
                elements.push(new FTHTMLElement(TokenFromString(value.substring(0, value.length - 1), Token.Position.create(0, index + 1))));
                value = '';
                index = i;
                continue;
            }
        }
        else if (!isFunc && [')', '{', '}', '='].includes(chr)) {
            elements.push(new FTHTMLElement(TokenFromString(value.substring(0, value.length - 1), Token.Position.create(0, index + 1))));
            elements.push(new FTHTMLElement(new Token(Token.TYPES.SYMBOL, chr, Token.Position.create(0, i))));
            value = '';
            index = i;
            continue;
        }
        else if (chr === ' ' && !isFunc) {
            if (value.trim().length > 0) {
                elements.push(new FTHTMLElement(TokenFromString(value.trim(), Token.Position.create(0, Math.max(i - value.trim().length, 0)))));
            }
            index = i;
            value = "";
        }
        else if (isFunc) {
            if (chr === ')') {
                --parenth;
                if (parenth === 0) {
                    elements.push(new FTHTMLElement(TokenFromString(value, Token.Position.create(0, index))));
                    value = '';
                    isFunc = false;
                }
            }
            else if (chr === '(') {
                ++parenth;
            }

            else if (chr === ' ') {
                if (value.trim() + " " === value && !value.trim().endsWith('('))
                    index++;
            }
        }
    }

    if (value.trim().length > 0)
        elements.push(new FTHTMLElement(TokenFromString(value, Token.Position.create(0, val.length - value.length))));

    if (flatten) {
        const result = [];
        elements.forEach(e => {
            if (Object.keys(functions).some(f => e.token.value.startsWith(f))) {
                result.push(...getFlatTokenValues(e.token.value, e.token.position.column));
            }
            else result.push(e);
        })
        return result.slice(-count).reverse();
    }

    return elements.map(m => {
        if (Object.keys(functions).some(f => m.token.value.startsWith(f))) {
            m = parseWhileType(m.token.value, m.token.position.column)[0][0];
            m = new FTHTMLElement(new Token(Token.TYPES.FUNCTION, m.token.value, m.token.position), undefined, m.children);
        }
        return m;
    }).slice(-count).reverse();
}

export function getElementForCurrentPosition(text: string, { start }: Range, type?: Token.TYPES, insideOrNextTo = true): FTHTMLElement {

    text = text.substring(0, start.character);
    const elements = getElementsInReverse(text, 1, true);

    if (elements.length > 0) {
        const { token } = elements[0];

        if (type && !Token.isExpectedType(token, type)) return;

        let lbound = token.position.column;
        let ubound = token.position.end;
        if (insideOrNextTo) {
            lbound -= 1;
            ubound += 1;
        }

        if (process.env.IS_DEBUG)
            console.log(token, 'lbound', lbound, 'ubound', ubound, 'cursor', start);

        if (start.character >= lbound && start.character <= ubound)
            return elements[0];
    }

    return;
}