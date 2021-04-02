export enum ParentModes {
    IMPORT,
    WORD,
    VARS,
    UNDEFINED,
    IFDEF,
    TINY_TEMPLATES
}

export class ParentMode {
    public mode: ParentModes;
    private _indent: number = 0;

    constructor(indent: number, mode: ParentModes) {
        this._indent = indent + 1;
        this.mode = mode;
    }

    public get indent(): number {
        return this._indent;
    }
}

export class ImportMode extends ParentMode {
    constructor(indent: number) {
        super(indent, ParentModes.IMPORT);
    }
}

export class VarsMode extends ParentMode {
    constructor(indent: number) {
        super(indent, ParentModes.VARS);
    }
}

export class WordMode extends ParentMode {
    constructor(indent: number) {
        super(indent, ParentModes.WORD);
    }
}