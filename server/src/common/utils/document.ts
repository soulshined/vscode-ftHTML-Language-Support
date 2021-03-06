import { Position, Range } from "vscode-languageserver";
import * as fs from "fs";

/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look like this:
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */

export const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';
function _createWordRegExp(allowInWords: string = ''): RegExp {
    let source = '(-?\\d*\\.\\d\\w*)|([^';
    for (const sep of USUAL_WORD_SEPARATORS) {
        if (allowInWords.indexOf(sep) >= 0) {
            continue;
        }
        source += '\\' + sep;
    }
    source += '\\s]+)';
    return new RegExp(source, 'g');
}

// catches numbers (including floating numbers) in the first group, and alphanum in the second
export const DEFAULT_WORD_REGEXP = _createWordRegExp();

export function getWordRangeAtPosition(lines: string[], position: Position, regexp?: RegExp): Range | undefined {

    if (!regexp) {
        // use default when custom-regexp isn't provided
        regexp = DEFAULT_WORD_REGEXP

    } else if (_regExpLeadsToEndlessLoop(regexp)) {
        // use default when custom-regexp is bad
        throw new Error(`[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`);
    }


    const wordAtText = _getWordAtText(
        position.character + 1,
        _ensureValidWordDefinition(regexp),
        lines[position.line],
        0
    );

    if (wordAtText) {
        return Range.create(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
    }

    return undefined;
}

function _ensureValidWordDefinition(wordDefinition?: RegExp | null): RegExp {
    let result: RegExp = DEFAULT_WORD_REGEXP;

    if (wordDefinition && (wordDefinition instanceof RegExp)) {
        if (!wordDefinition.global) {
            let flags = 'g';
            if (wordDefinition.ignoreCase) {
                flags += 'i';
            }
            if (wordDefinition.multiline) {
                flags += 'm';
            }
            if ((wordDefinition as any).unicode) {
                flags += 'u';
            }
            result = new RegExp(wordDefinition.source, flags);
        } else {
            result = wordDefinition;
        }
    }

    result.lastIndex = 0;

    return result;
}

function _regExpLeadsToEndlessLoop(regexp: RegExp): boolean {
    // Exit early if it's one of these special cases which are meant to match
    // against an empty string
    if (regexp.source === '^' || regexp.source === '^$' || regexp.source === '$' || regexp.source === '^\\s*$') {
        return false;
    }

    // We check against an empty string. If the regular expression doesn't advance
    // (e.g. ends in an endless loop) it will match an empty string.
    const match = regexp.exec('');
    return !!(match && regexp.lastIndex === 0);
}

function _findRegexMatchEnclosingPosition(wordDefinition: RegExp, text: string, pos: number, stopPos: number): RegExpMatchArray | null {
    let match: RegExpMatchArray | null;
    while (match = wordDefinition.exec(text)) {
        const matchIndex = match.index || 0;
        if (matchIndex <= pos && wordDefinition.lastIndex >= pos) {
            return match;
        } else if (stopPos > 0 && matchIndex > stopPos) {
            return null;
        }
    }
    return null;
}

const _defaultConfig = {
    maxLen: 1000,
    windowSize: 15,
    timeBudget: 150
};
function _getWordAtText(column: number, wordDefinition: RegExp, text: string, textOffset: number, config = _defaultConfig): any {

    if (text.length > config.maxLen) {
        // don't throw strings that long at the regexp
        // but use a sub-string in which a word must occur
        let start = column - config.maxLen / 2;
        if (start < 0) {
            start = 0;
        } else {
            textOffset += start;
        }
        text = text.substring(start, column + config.maxLen / 2);
        return _getWordAtText(column, wordDefinition, text, textOffset, config);
    }

    const t1 = Date.now();
    const pos = column - 1 - textOffset;

    let prevRegexIndex = -1;
    let match: RegExpMatchArray | null = null;

    for (let i = 1; ; i++) {
        // check time budget
        if (Date.now() - t1 >= config.timeBudget) {
            break;
        }

        // reset the index at which the regexp should start matching, also know where it
        // should stop so that subsequent search don't repeat previous searches
        const regexIndex = pos - config.windowSize * i;
        wordDefinition.lastIndex = Math.max(0, regexIndex);
        const thisMatch = _findRegexMatchEnclosingPosition(wordDefinition, text, pos, prevRegexIndex);

        if (!thisMatch && match) {
            // stop: we have something
            break;
        }

        match = thisMatch;

        // stop: searched at start
        if (regexIndex <= 0) {
            break;
        }
        prevRegexIndex = regexIndex;
    }

    if (match) {
        let result = {
            word: match[0],
            startColumn: textOffset + 1 + match.index!,
            endColumn: textOffset + 1 + match.index! + match[0].length
        };
        wordDefinition.lastIndex = 0;
        return result;
    }

    return null;
}

export function exists(file: string): Promise<boolean> {
    return new Promise<boolean>((resolve, _reject) => {
        fs.exists(file, (value) => {
            resolve(value);
        });
    });
}

