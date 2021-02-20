import { PATTERNS } from "../consts/patterns";

interface FTHTMLSymbol {
    name: string | undefined;
    type: string | undefined;
    index: number;
    startLine: number;
    endLine?: number;
}

export default class FileParser {
    private fileText: string = '';
    private lines: string[] = [];

    constructor(fileText: string) {
        this.fileText = fileText;
        this.lines = this.fileText.split("\n");
    }

    symbolInformation(): FTHTMLSymbol[] {
        let blocks: FTHTMLSymbol[] = [];
        this.lines.forEach((line, index) => {
            let lineParse = new LineParse(line);
            let blockType = lineParse.getBlockType();

            const match = lineParse.getMatch(blockType);
            if (match)
                blocks.push({
                    name: match.name,
                    type: blockType,
                    startLine: index,
                    index: match.index,
                    endLine: index
                })
        })
        return blocks.filter(block => block.type !== undefined && block.name !== undefined);
    }

}

class LineParse {
    private line: string = '';

    constructor(line: string) {
        this.line = line;
    }

    isBlock() {
        return false;
    }

    isFunction() {
        return this.line.match(`(^|\\s+)${PATTERNS.FUNCTIONS}\\(`);
    }

    isImportLine() {
        return this.line.match(PATTERNS.IMPORT_LINE);
    }

    isImportBlockLine() {
        return this.line.match(PATTERNS.IMPORT_BLOCK_BEGIN);
    }

    isEndBlock() {
        return false;
    }

    getBlockType(): string | undefined {
        if (this.line.match(PATTERNS.VARIABLE)) {
            return "variable";
        }
        if (this.isImportLine() || this.isImportBlockLine()) {
            return 'method';
        }
        if (this.isFunction())
            return 'function';

        return undefined;
    }

    getMatch(blockType: string | undefined) {
        let result;
        if (blockType === 'variable') {
            const match: RegExpExecArray | null = new RegExp(PATTERNS.VARIABLE).exec(this.line);
            if (match)
                result = {
                    name: match[1],
                    index: match.index
                }
        }
        else if (blockType === 'method') {
            const match: RegExpExecArray | null = new RegExp(`${PATTERNS.IMPORT_BLOCK_BEGIN}?`).exec(this.line);

            if (match)
                result = {
                    name: `import ${match[2]}`,
                    index: match.index
                }
        }
        else if (blockType === 'function') {
            const match: RegExpExecArray | null = new RegExp(`${PATTERNS.FUNCTIONS}\\(`).exec(this.line);

            if (match)
                result = {
                    name: match[1],
                    index: match.index
                }
        }
        return result;
    }


}