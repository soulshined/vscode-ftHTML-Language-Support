
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