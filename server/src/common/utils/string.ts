import functions from "../../common/documentation/functions";

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

export function getTokenValuesInReverse(val: string, count: number = Number.MAX_SAFE_INTEGER): string[] {
    const tokens: string[] = [];

    let value = "";
    let isFunc = false;
    let isString = false;
    let parenth = 0;
    let index = 0;
    let prevIndex = 0;
    let isComment = false;
    for (let i = 0; i < val.length; i++) {
        const chr = val[i];
        value += chr;
        if (isString) {
            if (value.endsWith(value.charAt(0)) && !value.endsWith(`\\${chr}`)) {
                isString = false;
            }
            else continue;
        }
        else if ([`'`, `"`].includes(chr)) {
            isString = true;
            continue;
        }


        if (value.startsWith('/*') && !isComment) {
            isComment = true;
            continue;
        }
        else if (isComment) {
            if (value.endsWith('*/')) {
                isComment = false;
                tokens.push(value);
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
            }
        }
        else if (chr === ' ' && !isFunc) {
            if (value.trim().length > 0)
                tokens.push(value.trim());
            value = "";
        }
        else if (isFunc) {
            if (chr === ')') {
                --parenth;
                index = prevIndex;
                if (parenth === 0) {
                    tokens.push(value);
                    value = '';
                    isFunc = false;
                }
            }
            else if (chr === '(') {
                prevIndex = index;
                index = 0;
                ++parenth;
            }

            else if (chr === ' ') {
                if (value.trim() + " " === value && !value.trim().endsWith('('))
                    index++;
            }
        }
    }

    if (value.trim().length > 0)
        tokens.push(value);

    return tokens.slice(-count).reverse();
}