import { FTHTMLFunction } from "fthtml/lib/model/functions";
import { FTHTMLMacros } from "fthtml/lib/model/macros";
import { Token } from "fthtml/lib/model/token";
import StackTrace from "fthtml/lib/model/exceptions/fthtml-stacktrace";
import { SELF_CLOSING_TAGS } from "fthtml/lib/model/self-closing-tags";
import { getLanguageService as HTMLLS, Node as HTMLNode } from "vscode-html-languageservice";
import { FormattingOptions, TextEdit, _Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { IBaseContext, IScopeContextDocument } from "../../common/context";
import { clamp } from "../../common/utils/number";
import { repeat } from "../../common/utils/string";
import { FTHTMLFormats } from "../../config/settings";
import { FTHTMLParser } from "fthtml/lib/parser/fthtml-parser";
import { URI } from "vscode-uri";
import { FTHTMLElement } from "fthtml/lib/model/fthtmlelement";
import { ImportMode, ParentMode, ParentModes, WordMode } from "./model/parent-mode";
import { getFTHTMLTokenValue } from "../../common/utils/token";

export interface HTMLFormattingOptions extends FormattingOptions {
    indent: number;
}

export class FTHTMLDocumentFormatProvider {
    private last_element: FTHTMLElement = null;
    private document: IScopeContextDocument;
    private formattingOptions: FormattingOptions;
    private formats: FTHTMLFormats;
    constructor(formattingOptions: FormattingOptions, context: IBaseContext) {
        this.document = context.document;
        this.formats = context.settings.format;
        this.formattingOptions = formattingOptions;
    }

    public async convertHTML(html: string, indent: number) {
        if (!html.startsWith('<') || !html.endsWith('>')) return;

        const doc = TextDocument.create('', 'html', 1, html);
        const nodes = HTMLLS().parseHTMLDocument(doc);

        if (nodes.roots.length === 0) return;

        let fthtml = '';

        for (let i = 0; i < nodes.roots.length; i++) {
            const result = await this.transformHTMLNode(nodes.roots[i], html, indent);
            fthtml += result;
        }

        return fthtml;
    }

    private stripAttributeValueStringDelimiter(val: string) {
        const { quotationMark } = this.formats.onPasteHTML;
        const quotation = val.charAt(0);
        if ([`'`, `"`].includes(quotation) && val.endsWith(quotation)) {
            if (val.substring(1, val.length - 1).match(/^[\w-]([\w-\.])*[\w-]$/))
                return val.substring(1, val.length - 1);
            else if (val.match(/^(['"])[\w-]([\w-\.])*[\w-]\1$/))
                return val;
            else return quotationMark + this.escapeString(val.substring(1, val.length - 1)) + quotationMark;
        }
        else if (val.match(/^[\w-]([\w-\.])*[\w-]$/))
            return val;
        else return `${quotationMark}${this.escapeString(val)}${quotationMark}`;
    }

    private async transformHTMLNode(node: HTMLNode, html: string, indent: number) {
        const tab = this.formattingOptions.insertSpaces ? ' ' : '\t';
        const indentation = repeat(tab, indent * this.formattingOptions.tabSize);

        let fthtml = indentation;
        const isEmbeddedLang = ['style', 'script'].includes(node.tag);

        if (isEmbeddedLang) {
            if (!node.attributes) {
                const elang = node.tag === 'script' ? 'js' : 'css';
                const { start } = this.getBracesForType(new Token(Token.TYPES.ELANG, elang, { line: 0, column: 0, end: 0 }), null, indentation);
                fthtml += `${elang}${start}`;
            }
        }
        else fthtml += node.tag;

        const element: FTHTMLElement = new FTHTMLElement(new Token(Token.TYPES.WORD, node.tag, { line: 0, column: 0, end: 0 }));

        if (node.attributes) {
            const ftattrs = new FTHTMLElement.Attributes();
            element.attrs = ftattrs.default;

            if (node.attributes['id'])
                element.attrs.get('id').push(
                    new FTHTMLElement(new Token(Token.TYPES.ATTR_ID, this.stripAttributeValueStringDelimiter(node.attributes['id']),
                        Token.Position.create(0, 0))
                    )
                );
            if (node.attributes['class']) {
                let classes = this.stripAttributeValueStringDelimiter(node.attributes['class']);
                if ([`'`, `"`].includes(classes.charAt(0)))
                    classes = classes.substring(1, classes.length - 1);
                element.attrs.get('classes').push(...classes.split(" ").map(m => new FTHTMLElement(new Token(Token.TYPES.ATTR_CLASS, m, Token.Position.create(0, 0)))));
            }

            for (const [key, value] of Object.entries(node.attributes)) {
                if (['id', 'class'].includes(key)) continue;

                if (!value) {
                    element.attrs.get('misc').push(new FTHTMLElement(new Token(Token.TYPES.WORD, key, Token.Position.create(0, 0))));
                }
                else {
                    const k = new FTHTMLElement(new Token(Token.TYPES.WORD, key, Token.Position.create(0, 0)));
                    const v = new FTHTMLElement(new Token(Token.TYPES.WORD, this.stripAttributeValueStringDelimiter(value), Token.Position.create(0, 0)));

                    k.children.push(v);
                    element.attrs.get('kvps').push(k);
                }
            }
            fthtml += this.formatAttributes(element, indentation);
        }

        if (node.children.length > 0) {
            const { start, end } = this.getBracesForType(element.token, element.attrs, indentation);

            fthtml += start;

            for (let i = 0; i < node.children.length; i++) {
                const result = await this.transformHTMLNode(node.children[i], html, indent + 1);
                fthtml += result;
            }

            fthtml += end;
        }
        else if (node.children.length === 0 && !SELF_CLOSING_TAGS.includes(node.tag.toLocaleLowerCase())) {
            const body = html.substring(node.startTagEnd, node.endTagStart);
            if (isEmbeddedLang) fthtml += `${body}\n${indentation}}`
            else if (FTHTMLMacros.ALL[body]) fthtml += ` ${body}`;
            else if (this.escapeString(body).trim().length > 0)
                fthtml += ` ${this.formats.onPasteHTML.quotationMark}${this.escapeString(body)}${this.formats.onPasteHTML.quotationMark}`;
        }

        return fthtml + '\n';

    }

    private escapeString(val: string): string {
        return FTHTMLFunction.ALL['addslashes'].do(val).value;
    }

    public async format(context: IBaseContext): Promise<TextEdit[]> {
        try {
            StackTrace.clear();

            const file = URI.parse(context.document.uri).fsPath;
            const ftHTML = new FTHTMLParser(context.config.json).parseSrc(context.document.getText(), file.substring(0, file.length - 7));
            let formatted = this.prettify(ftHTML).trim();

            if (this.formattingOptions.insertFinalNewline)
                formatted += '\n';

            return Promise.resolve([TextEdit.replace(this.document.totalRange, formatted)]);
        } catch (error) {
            return [];
        }
    }

    private getBracesForType(token: Token<Token.TYPES>, attrs: Map<string, FTHTMLElement[]>, indentation: string) {
        let result = ' ';

        if (token.type === Token.TYPES.WORD && SELF_CLOSING_TAGS.includes(token.value))
            return { start: '', end: '' }

        if (token.type === Token.TYPES.ELANG && this.formats.braces.newLineAfterEmbeddedLangs ||
            token.type == Token.TYPES.WORD && attrs && this.formats.braces.newLineAfterAttributes ||
            token.type == Token.TYPES.WORD && !attrs && this.formats.braces.newLineAfterElement ||
            token.type === Token.TYPES.KEYWORD && token.value === 'import' && this.formats.braces.newLineAfterImport) {
            result += `\n${indentation}`;
        }

        result += `{\n`;
        return {
            start: result,
            end: `${indentation}}`
        }

    }

    private getIndentation(indent: number = 0) {
        const tab = this.formattingOptions.insertSpaces ? ' ' : '\t';

        let result = '';
        for (let i = 0; i < indent; i++) {
            result += repeat(tab, this.formattingOptions.tabSize);
        }
        return result;
    }

    private formatAttributes(element: FTHTMLElement, spacing: string) {

        if (!element.attrs) return '';

        let id;
        if (element.attrs.get('id').length > 0) {
            id = getFTHTMLTokenValue(element.attrs.get('id')[0]);
        }

        let classes = element.attrs.get('classes').map(attr => getFTHTMLTokenValue(attr));
        let misc = element.attrs.get('misc').map(attr => getFTHTMLTokenValue(attr));
        let kvps = element.attrs.get('kvps').map(attr =>
            `${attr.token.value}=${getFTHTMLTokenValue(attr.children[0])}`
        );

        if (this.formats.attributes.sorted) {
            classes = classes.sort();
            misc = misc.sort();
            kvps = kvps.sort();
        }

        const numOfAttrs = (element.attrs.get('id').length + classes.length + misc.length + kvps.length);
        const canWrap = this.formats.attributes.wrapOrderedAttributes && numOfAttrs >= this.formats.attributes.minimumNumberOfAttributesForWrapping;

        let alignment = ' ';
        if (canWrap) {
            alignment = '\n' + spacing + repeat(' ', element.token.value.length + 1 + (this.formats.attributes.padAttributesWithSpace ? 1 : 0) + (this.formats.attributes.addSpaceBeforeAttributeParenthesis ? 1 : 0))
        }

        let attrs = [];

        if (id) attrs.push(id);
        if (classes.length > 0) attrs.push(classes.join(" "))

        if (this.formats.attributes.order !== "id, class, misc, kvp") {
            if (kvps.length > 0) attrs.push(kvps.join(" "));
            if (misc.length > 0) attrs.push(misc.join(" "));
        }
        else {
            if (misc.length > 0) attrs.push(misc.join(" "));
            if (kvps.length > 0) attrs.push(kvps.join(" "));
        }

        let text = this.formats.attributes.addSpaceBeforeAttributeParenthesis ? ' ' : '';
        text += '(';
        text += this.formats.attributes.padAttributesWithSpace ? ' ' : '';
        text += attrs.join(alignment).trim();
        text += this.formats.attributes.padAttributesWithSpace ? ' ' : '';
        text += ')';

        return text;
    }

    private isOnSameLineAsLastElement(element: FTHTMLElement) {
        if (!this.last_element) return false;

        return this.last_element.token.position.line === element.token.position.line;
    }

    private isLastElementOfType(types: (Token.TYPES | string)[]) {
        if (!this.last_element) return false;

        return Token.isOneOfExpectedTypes(this.last_element.token, types);
    }

    private isDistanceGreaterThan(aElement: FTHTMLElement, bElement: FTHTMLElement, lines: number) {
        if (!aElement || !bElement) return false;

        return aElement.token.position.line - bElement.token.position.line > lines;
    }

    private getSpacing(elements: FTHTMLElement[], forElementIndex: number, indent: number, parentMode: ParentMode) {
        const wordsInSameColumn = elements.filter(f => Token.isExpectedType(f.token, Token.TYPES.WORD)).map(m => m.token.value);
        const longestWord = wordsInSameColumn.length > 0
            ? wordsInSameColumn.reduce((c, v) => c.length > v.length ? c : v)
            : undefined;
        const element = elements[forElementIndex];

        let valueSpacing = '';
        if (longestWord && this.formats.alignVariableOrPropertyBindingValues
            && parentMode
            && ![ParentModes.WORD, ParentModes.UNDEFINED].includes(parentMode.mode)
            && parentMode.indent === indent) {
            valueSpacing += repeat(' ', longestWord.length - element.token.value.length);
            if (Token.isExpectedType(element.token, 'Symbol_{'))
                valueSpacing = valueSpacing.substring(this.last_element.token.value.length - 1);
        }

        return {
            spacing: this.getIndentation(indent),
            valueSpacing
        }
    }

    private canAddEndOfTagComment(elements: FTHTMLElement[], i) {
        const next = i + 1 >= elements.length ? null : elements[i + 1];

        if (!next) return false;

        const nextIsComment = Token.isOneOfExpectedTypes(next.token, Token.Sequences.COMMENTS);
        const isEnoughDistance = this.isDistanceGreaterThan(this.last_element, elements[i], this.formats.braces.minimumNumberOfLinesToAddIdentifierComment - 1);

        return this.formats.braces.addIdentifierCommentAfterClosingBrace
            && !(nextIsComment && this.isOnSameLineAsLastElement(next))
            && isEnoughDistance
    }

    private getEndOfTagCommentForElement(elements: FTHTMLElement[], i) {
        const element = elements[i];

        if (this.canAddEndOfTagComment(elements, i)) {
            let selector = element.token.value;
            if (!this.formats.braces.skipTagNamesForCommentAfterClosingBrace.includes(selector)) {
                if (element.attrs) {
                    if (element.attrs.get('id').length > 0) {
                        selector += getFTHTMLTokenValue(element.attrs.get('id')[0]);
                    }
                    else if (element.attrs.get('classes').length > 0) {
                        selector += `${getFTHTMLTokenValue(element.attrs.get('classes')[0])}`
                    }
                    else if (element.attrs.get('kvps').length > 0) {
                        selector += ` ${element.token.value}=${getFTHTMLTokenValue(element.attrs.get('kvps')[0])}`
                    }
                    else if (element.attrs.get('misc').length > 0) {
                        selector += ` ${getFTHTMLTokenValue(element.attrs.get('misc')[0])}`
                    }
                }
                return ` // end of ${selector}`;
            }
        }

        return '';
    }

    private canCollapse(element: FTHTMLElement, valueSpacing: string, spacing: string, parentMode: ParentMode) {
        if (!this.formats.collapseSingleChildElements ||
            this.formats.skipTagNamesForCollapsing.includes(element.token.value) ||
            !element.isParentElement ||
            (parentMode && ![ParentModes.UNDEFINED, ParentModes.WORD].includes(parentMode.mode))) return false;

        if (element.children.length !== 1 ||
            element.children[0].isParentElement ||
            element.children[0].children.length > 1 ||
            this.formats.skipTagNamesForCollapsing.includes(element.children[0].token.value))
            return false;

        if (element.children[0].children.length === 1 && this.formats.skipTagNamesForCollapsing.includes(element.children[0].children[0].token.value))
            return false;

        if (element.children.length === 1 && Token.isExpectedType(element.children[0].token, Token.TYPES.COMMENT))
            return false;

        return this.getCollapsedChild(element, valueSpacing, spacing).count <= this.formats.collapseSingleChildElementsIfLineLengthLessThan
    }

    private getCollapsedChild(element: FTHTMLElement, valueSpacing: string, spacing: string) {
        let line = '';
        let child = element.children[0];
        line += ` ${valueSpacing}{ ${getFTHTMLTokenValue(child)}`;
        if (child.attrs)
            line += this.formatAttributes(child, spacing);

        this.last_element = child;
        if (child.children.length > 0) {
            if (Token.isExpectedType(child.children[0].token, Token.TYPES.FUNCTION))
                line += ` ${this.prettifyFunctionInline(child.children[0])})`;
            else
                line += ` ${getFTHTMLTokenValue(child.children[0])}`;
            this.last_element = child.children[0];
        }

        return {
            value: line,
            count: line.length + element.token.value.length + this.formatAttributes(element, spacing).length
        };
    }

    private newlineRules(elements: FTHTMLElement[], i: number, indent: number) {
        const element: FTHTMLElement = elements[i];
        let [before, after] = [0, 0];
        if (i !== elements.length - 1 && Token.isOneOfExpectedTypes(element.token, Token.Sequences.COMMENTS))
            return {
                newlines: [before, after]
            }

        if (!Token.isOneOfExpectedTypes(element.token, [...Token.Sequences.COMMENTS, 'Symbol_=', 'Symbol_(', 'Symbol_)', Token.TYPES.ATTR_CLASS, Token.TYPES.ATTR_CLASS_VAR, Token.TYPES.ATTR_ID, Token.TYPES.OPERATOR])) {
            before++;
            if (this.isDistanceGreaterThan(element, this.last_element, 1)) before++;
        }

        if (i === 0) {
            if (this.formats.newLineBeforeFirstChildElement
                && indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth
                && indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth
                && !Token.isOneOfExpectedTypes(element.token, Token.Sequences.COMMENTS)) before++;

            if (i === elements.length - 1) {
                if (this.formats.newLineAfterLastChildElement &&
                    indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                    indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                    after++;
            }
        }
        else if (i === elements.length - 1 && Token.isExpectedType(element.token, Token.TYPES.COMMENT)) {
            if (this.formats.newLineAfterLastChildElement &&
                indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                after++;
        }
        else if (i === elements.length - 1) {
            if (this.formats.newLineAfterLastChildElement &&
                indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                after++;
        }

        return {
            newlines: [clamp(before, 0, 2), clamp(after, 0, 2)]
        }
    }

    private prettifyTagChildren(element: FTHTMLElement, indent: number, spacing: string, parentMode: ParentMode) {
        this.last_element = new FTHTMLElement(new Token(Token.TYPES.SYMBOL,
            '{', element.childrenStart));
        let fthtml = this.prettify(element.children, indent + 1, parentMode);
        fthtml += `\n${spacing}}`;
        this.last_element = new FTHTMLElement(new Token(Token.TYPES.SYMBOL,
            '}', element.childrenEnd));
        return fthtml;
    }

    private prettifyIfElseChildren(element: FTHTMLElement, indent: number, spacing: string, parentMode: ParentMode) {
        let fthtml = '';
        if (Token.isExpectedType(element.token, 'Pragma_elif'))
            fthtml += '\n';
        fthtml += `${spacing}#${element.token.value} `;

        const [lhs, op, rhs, ...children] = element.children;
        if (Token.isExpectedType(lhs.token, Token.TYPES.FUNCTION)) fthtml += this.prettifyFunctionInline(lhs);
        else fthtml += getFTHTMLTokenValue(lhs);
        fthtml += ' ';
        fthtml += getFTHTMLTokenValue(op);
        fthtml += ' ';
        if (Token.isExpectedType(rhs.token, Token.TYPES.FUNCTION)) fthtml += this.prettifyFunctionInline(rhs);
        else fthtml += getFTHTMLTokenValue(rhs);

        this.last_element = element;
        fthtml += this.prettify(children, indent + 1, parentMode);
        return fthtml;
    }
    private prettifyPragmaChildren(element: FTHTMLElement, indent: number, spacing: string) {
        let fthtml = `${spacing}#${element.token.value}`;
        this.last_element = element
        const pm = new ParentMode(indent, ParentModes.VARS);

        if (element.token.value.endsWith('templates'))
            pm.mode = ParentModes.TINY_TEMPLATES;
        else if (Token.isExpectedType(element.token, 'Pragma_ifdef')) {
            pm.mode = ParentModes.IFDEF;
            fthtml += ` ${element.children.splice(0, 1)[0].token.value}`;
        }

        fthtml += this.prettify(element.children, indent + 1, pm);
        this.last_element = new FTHTMLElement(new Token(Token.TYPES.PRAGMA,
            'end',
            element.childrenEnd));
        fthtml += `\n${spacing}#end`;

        return fthtml;
    }

    private prettifyFunctionInline(element: FTHTMLElement) {
        let text = `${element.token.value}(`;
        this.last_element = element.children[element.children.length - 1];
        for (let i = 0; i < element.children.length; ++i) {
            const child = element.children[i];
            if (Token.isExpectedType(child.token, Token.TYPES.FUNCTION))
                text += this.prettifyFunctionInline(child);
            else text += getFTHTMLTokenValue(child);
            text += ' ';
        }
        return text.trim() + ')';
    }

    private prettify(elements: FTHTMLElement[], indent: number = 0, parentMode?: ParentMode): string {
        let text = '';
        for (let i = 0; i < elements.length; ++i) {
            const element = elements[i];
            const { spacing, valueSpacing } = this.getSpacing(elements, i, indent, parentMode);
            const rules = this.newlineRules(elements, i, indent);

            text += repeat('\n', rules.newlines[0]);

            if (Token.isExpectedType(element.token, Token.TYPES.WORD)) {
                text += `${spacing}${element.token.value}`;
                text += this.formatAttributes(element, spacing);
                if (this.canCollapse(element, valueSpacing, spacing, parentMode)) {
                    text += this.getCollapsedChild(element, valueSpacing, spacing).value;
                    text += ` }`;
                }
                else if (element.isParentElement && element.children.length > 0) {
                    const pm = new WordMode(indent);

                    if (parentMode && ![ParentModes.WORD, ParentModes.UNDEFINED].includes(parentMode.mode) && indent === parentMode.indent) {
                        text += ` ${valueSpacing}\{`
                    }
                    else if (this.formats.braces.newLineAfterElement && !element.attrs)
                        text += `\n${spacing}\{`
                    else if (this.formats.braces.newLineAfterAttributes && element.attrs) {
                        text += `\n${spacing}\{`;
                    }
                    else text += ` \{`;

                    text += this.prettifyTagChildren(element, indent, spacing, pm);
                    text += this.getEndOfTagCommentForElement(elements, i);
                    text += repeat('\n', rules.newlines[1]);

                    continue;
                }
                else if (element.isParentElement && element.children.length === 0) {
                    if (this.formats.braces.removeBracesForEmptyParents) {
                        text += repeat('\n', rules.newlines[1]);
                        this.last_element = element;
                        continue;
                    }

                    if (parentMode && ![ParentModes.WORD, ParentModes.UNDEFINED].includes(parentMode.mode) && indent === parentMode.indent) {
                        text += ` ${valueSpacing}\{`
                    }
                    else if (this.formats.braces.newLineAfterElement && !element.attrs)
                        text += `\n${spacing}\{`
                    else if (this.formats.braces.newLineAfterAttributes && element.attrs) {
                        text += `\n${spacing}\{`;
                    }
                    else text += ` \{`;

                    text += `\}`;
                    this.last_element = new FTHTMLElement(new Token(Token.TYPES.SYMBOL, '}', element.childrenEnd));
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
                else if (element.children.length > 0) {
                    const child = element.children[0];
                    if (Token.isExpectedType(child.token, Token.TYPES.FUNCTION))
                        text += ` ${valueSpacing}${this.prettifyFunctionInline(child)}`;
                    else if (child.token.value === 'json') {
                        const file = child.children[0];
                        text += ` ${valueSpacing}json(${getFTHTMLTokenValue(file)})`;
                        this.last_element = file;
                        text += repeat('\n', rules.newlines[1]);
                        continue;
                    }
                    else if (parentMode && parentMode.mode === ParentModes.TINY_TEMPLATES) {
                        text += ` ${valueSpacing}${child.token.value}${this.formatAttributes(child, spacing)}`;
                        if (child.children.length > 0)
                            text += ` ${getFTHTMLTokenValue(child.children[0])}`;
                    }
                    else text += ` ${valueSpacing}${getFTHTMLTokenValue(child)}`;
                }
            }
            else if (Token.isOneOfExpectedTypes(element.token, Token.Sequences.COMMENTS)) {
                let val = element.token.value;

                if (this.isOnSameLineAsLastElement(element) && Token.isExpectedType(element.token, Token.TYPES.COMMENT)) text += ` ${val}`;
                else if (this.formats.newLineBeforeComments || this.isLastElementOfType(Token.Sequences.COMMENTS)) {
                    if (this.isLastElementOfType(['Symbol_}']) || this.isDistanceGreaterThan(element, this.last_element, 1)) text += '\n';

                    text += `\n${val.split("\n").map(line => `${spacing}${line.trim()}`).join("\n")}`
                }
                else text += `${val.split("\n").map(line => `${spacing}${line.trim()}`).join("\n")}`;
            }
            else if (Token.isExpectedType(element.token, Token.TYPES.PRAGMA)) {
                if (Token.isOneOfExpectedTypes(element.token, ['Pragma_templates', 'Pragma_tinytemplates', 'Pragma_vars', 'Pragma_ifdef'])) {
                    text += this.prettifyPragmaChildren(element, indent, spacing);
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
                else if (Token.isExpectedType(element.token, 'Pragma_debug')) {
                    text += `${spacing}#debug `;
                    if (Token.isExpectedType(element.children[0].token, Token.TYPES.FUNCTION)) {
                        text += `${element.children[0].token.value}(`;
                        text += `${element.children[0].children.map(arg =>getFTHTMLTokenValue(arg)).join(" ")})`;
                        this.last_element = element.children[0].children[element.children[0].children.length - 1];
                    }
                    else {
                        text += `${getFTHTMLTokenValue(element.children[0])}`;
                        this.last_element = element.children[0];
                    }
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
                else if (Token.isExpectedType(element.token, 'Pragma_if')) {
                    for (let j = 0; j < element.children.length; j++) {
                        const subpragma = element.children[j];
                        if (!Token.isExpectedType(subpragma.token, 'Pragma_else'))
                            text += this.prettifyIfElseChildren(subpragma, indent, spacing, parentMode);
                        else {
                            text += `\n${spacing}#else`;
                            this.last_element = subpragma;
                            text += this.prettify(subpragma.children, indent + 1, parentMode);
                        }
                    }
                    text += `\n${spacing}#end`;
                    this.last_element = new FTHTMLElement(new Token(Token.TYPES.PRAGMA, 'end', element.childrenEnd))
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
            }
            else if (Token.isOneOfExpectedTypes(element.token, ['Keyword_import'])) {
                const file = element.children.shift();
                text += `${spacing}import ${getFTHTMLTokenValue(file)}`;

                this.last_element = file;
                if (element.isParentElement) {
                    text += !this.formats.braces.newLineAfterImport ? ' {' : `\n${spacing}{`;
                    text += this.prettifyTagChildren(element, indent, spacing, new ImportMode(indent));
                    text += this.getEndOfTagCommentForElement(elements, i);
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
            }
            else if (Token.isExpectedType(element.token, 'Keyword_each')) {
                text += `${spacing}${element.token.value} `;
                const iterable = element.children.shift();
                if (Token.isExpectedType(iterable.token, Token.TYPES.FUNCTION)) {
                    text += this.prettifyFunctionInline(iterable);
                }
                else text += getFTHTMLTokenValue(iterable);

                if (this.formats.braces.newLineAfterLoop)
                    text += `\n${spacing}\{`
                else text += ` \{`;

                this.last_element = new FTHTMLElement(new Token(Token.TYPES.SYMBOL, '{',
                Token.Position.create(element.childrenStart.line, element.childrenStart.column)));
                text += this.prettifyTagChildren(element, indent, spacing, new ParentMode(indent, ParentModes.WORD));
                text += this.getEndOfTagCommentForElement(elements, i);
                text += repeat('\n', rules.newlines[1]);
                continue;
            }
            else if (Token.isOneOfExpectedTypes(element.token, [Token.TYPES.KEYWORD, Token.TYPES.KEYWORD_DOCTYPE])) {
                text += `${spacing}${element.token.value} ${getFTHTMLTokenValue(element.children[0])}`;
                this.last_element = element.children[0];
                text += repeat('\n', rules.newlines[1]);
                continue;
            }
            else if (Token.isOneOfExpectedTypes(element.token, [Token.TYPES.ELANG])) {
                text += `${spacing}${element.token.value}`;
                if (this.formats.braces.newLineAfterEmbeddedLangs)
                    text += `\n${spacing}\{`
                else text += ` \{`;

                const elangb = element.children[0];

                text += `\n\n${this.getIndentation(indent + 1)}${elangb.token.value.trim()}\n\n${spacing}}`;
                this.last_element = new FTHTMLElement(new Token(Token.TYPES.SYMBOL, '}', elangb.token.position));
                text += repeat('\n', rules.newlines[1]);
                continue;
            }
            else if (Token.isExpectedType(element.token, Token.TYPES.MACRO)) {
                if (this.isLastElementOfType([Token.TYPES.WORD, Token.TYPES.STRING]))
                    text += ` ${valueSpacing}${element.token.value}`;
                else
                    text += `${spacing}${element.token.value}`;
            }
            else if (Token.isExpectedType(element.token, Token.TYPES.FUNCTION)) {
                // if (!this.isLastElementOfType([Token.TYPES.WORD])) text += '\n';
                if (this.isLastElementOfType([Token.TYPES.WORD, Token.TYPES.STRING])) {
                    text += ` ${valueSpacing}${this.prettifyFunctionInline(element)}`;
                }
                else {
                    text += `${spacing}${this.prettifyFunctionInline(element)}`;
                }
                text += repeat('\n', rules.newlines[1]);
                continue;
            }

            else text += `${spacing}${getFTHTMLTokenValue(element)}`;

            text += repeat('\n', rules.newlines[1]);
            this.last_element = element;
        }

        return text;
    }

}
