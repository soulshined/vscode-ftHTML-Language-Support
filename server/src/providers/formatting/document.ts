import functions from "fthtml/lib/lexer/grammar/functions";
import macros from "fthtml/lib/lexer/grammar/macros";
import { FTHTMLComment, token, TOKEN_TYPE as TT } from "fthtml/lib/lexer/types";
import { StackTrace } from "fthtml/lib/utils/exceptions";
import { SELF_CLOSING_TAGS } from "fthtml/lib/utils/self-closing-tags";
import { getLanguageService as HTMLLS, Node as HTMLNode } from "vscode-html-languageservice";
import { FormattingOptions, TextEdit, _Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { IBaseContext, IScopeContextDocument } from "../../common/context";
import { clamp } from "../../common/utils/number";
import { repeat } from "../../common/utils/string";
import { FTHTMLFormats } from "../../config/settings";
import { ftHTMLParser } from "fthtml/lib/parser/fthtml-parser";
import { URI } from "vscode-uri";
import { IFTHTMLElement } from "fthtml/lib/parser/types";
import { isExpectedType, isOneOfExpectedTypes } from "fthtml/lib/utils/functions";
import { ImportMode, ParentMode, ParentModes, WordMode } from "./model/parent-mode";
import { FTHTMLElement } from "fthtml/lib/parser/models";
import { getFTHTMLTokenValue } from "../../common/utils/token";

export interface HTMLFormattingOptions extends FormattingOptions {
    indent: number;
}

export class FTHTMLDocumentFormatProvider {
    private last_element: IFTHTMLElement = null;
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
            if (val.match(/^(['"])[\w-]([\w-\.])*[\w-]\1$/))
                return val.substring(1, val.length - 1);
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
                const { start } = this.getBracesForType({ type: TT.ELANG, value: elang, position: { line: 0, column: 0 } }, null, indentation);
                fthtml += `${elang}${start}`;
            }
        }
        else fthtml += node.tag;

        const element: IFTHTMLElement = {
            token: {
                position: { line: 0, column: 0 },
                type: TT.WORD,
                value: node.tag
            },
            children: [],
            isParentElement: false,
            attrs: undefined
        }

        if (node.attributes) {
            const attrs = new Map();
            attrs.set('classes', new Set);
            attrs.set('misc', new Set);
            attrs.set('kvps', new Set);
            attrs.set('id', new Set);

            if (node.attributes['id'])
                attrs.get('id').add(this.stripAttributeValueStringDelimiter(node.attributes['id']));
            if (node.attributes['class']) {
                let classes = this.stripAttributeValueStringDelimiter(node.attributes['class']);
                if ([`'`, `"`].includes(classes.charAt(0)))
                    classes = classes.substring(1, classes.length - 1);
                attrs.get('classes').add(classes.split(" ").map(m => `.${m}`).join(" "));
            }

            for (const [key, value] of Object.entries(node.attributes)) {
                if (['id', 'class'].includes(key)) continue;

                if (!value) attrs.get('misc').add(key);
                else attrs.get('kvps').add(`${key}=${this.stripAttributeValueStringDelimiter(value)}`);
            }

            element.attrs = attrs;
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
            else if (macros[body]) fthtml += ` ${body}`;
            else
                fthtml += ` ${this.formats.onPasteHTML.quotationMark}${this.escapeString(body)}${this.formats.onPasteHTML.quotationMark}`;
        }

        return fthtml + '\n';

    }

    private escapeString(val: string) {
        return functions['addslashes'].do(val).value;
    }

    public async format(context: IBaseContext): Promise<TextEdit[]> {
        try {
            StackTrace.clear();

            const file = URI.parse(context.document.uri).fsPath;
            const ftHTML = new ftHTMLParser().parseSrc(context.document.getText(), file.substring(0, file.length - 7), context.config.json);
            let formatted = this.prettify(ftHTML).trim();

            if (this.formattingOptions.insertFinalNewline)
                formatted += '\n';

            return Promise.resolve([TextEdit.replace(this.document.totalRange, formatted)]);
        } catch (error) {
            return [];
        }
    }

    private getBracesForType(token: token, attrs: Map<string, IFTHTMLElement[]>, indentation: string) {
        let result = ' ';

        if (token.type === TT.WORD && SELF_CLOSING_TAGS.includes(token.value))
            return { start: '', end: '' }

        if (token.type === TT.ELANG && this.formats.braces.newLineAfterEmbeddedLangs ||
            token.type == TT.WORD && attrs && this.formats.braces.newLineAfterAttributes ||
            token.type == TT.WORD && !attrs && this.formats.braces.newLineAfterElement ||
            token.type === TT.KEYWORD && token.value === 'import' && this.formats.braces.newLineAfterImport) {
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

    private formatAttributes(element: IFTHTMLElement, spacing: string) {

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

    private isOnSameLineAsLastElement(element: IFTHTMLElement) {
        if (!this.last_element) return false;

        return this.last_element.token.position.line === element.token.position.line;
    }

    private isLastElementOfType(types: (TT | string)[]) {
        if (!this.last_element) return false;

        return isOneOfExpectedTypes(this.last_element.token, types);
    }

    private isDistanceGreaterThan(aElement: IFTHTMLElement, bElement: IFTHTMLElement, lines: number) {
        if (!aElement || !bElement) return false;

        return aElement.token.position.line - bElement.token.position.line > lines;
    }

    private getSpacing(elements: IFTHTMLElement[], forElementIndex: number, indent: number, parentMode: ParentMode) {
        const wordsInSameColumn = elements.filter(f => isExpectedType(f.token, TT.WORD)).map(m => m.token.value);
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
            if (isExpectedType(element.token, 'Symbol_{'))
                valueSpacing = valueSpacing.substring(this.last_element.token.value.length - 1);
        }

        return {
            spacing: this.getIndentation(indent),
            valueSpacing
        }
    }

    private canAddEndOfTagComment(elements: IFTHTMLElement[], i) {
        const next = i + 1 >= elements.length ? null : elements[i + 1];

        if (!next) return false;

        const nextIsComment = isOneOfExpectedTypes(next.token, FTHTMLComment);
        const isEnoughDistance = this.isDistanceGreaterThan(this.last_element, elements[i], this.formats.braces.minimumNumberOfLinesToAddIdentifierComment - 1);

        return this.formats.braces.addIdentifierCommentAfterClosingBrace
            && !(nextIsComment && this.isOnSameLineAsLastElement(next))
            && isEnoughDistance
    }

    private getEndOfTagCommentForElement(elements: IFTHTMLElement[], i) {
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

    private canCollapse(element: IFTHTMLElement, valueSpacing: string, spacing: string, parentMode: ParentMode) {
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

        if (element.children.length === 1 && isExpectedType(element.children[0].token, TT.COMMENT))
            return false;

        return this.getCollapsedChild(element, valueSpacing, spacing).count <= this.formats.collapseSingleChildElementsIfLineLengthLessThan
    }

    private getCollapsedChild(element: IFTHTMLElement, valueSpacing: string, spacing: string) {
        let line = '';
        let child = element.children[0];
        line += ` ${valueSpacing}{ ${getFTHTMLTokenValue(child)}`;
        if (child.attrs)
            line += this.formatAttributes(child, spacing);

        this.last_element = child;
        if (child.children.length > 0) {
            if (isExpectedType(child.children[0].token, TT.FUNCTION)) {
                line += ` ${child.children[0].token.value}(${child.children[0].children.map(arg => getFTHTMLTokenValue(arg)).join(" ")})`;
                this.last_element = child.children[0].children[child.children[0].children.length - 1];
            }
            else {
                line += ` ${getFTHTMLTokenValue(child.children[0])}`;
                this.last_element = child.children[0];
            }
        }

        return {
            value: line,
            count: line.length + element.token.value.length + this.formatAttributes(element, spacing).length
        };
    }

    private newlineRules(elements: IFTHTMLElement[], i: number, indent: number) {
        const element: IFTHTMLElement = elements[i];
        let [before, after] = [0, 0];
        if (i !== elements.length - 1 && isOneOfExpectedTypes(element.token, FTHTMLComment))
            return {
                newlines: [before, after]
            }

        if (!isOneOfExpectedTypes(element.token, [...FTHTMLComment, 'Symbol_=', 'Symbol_(', 'Symbol_)', TT.ATTR_CLASS, TT.ATTR_CLASS_VAR, TT.ATTR_ID, TT.OPERATOR])) {
            before++;
            if (this.isDistanceGreaterThan(element, this.last_element, 1)) before++;
        }

        if (i === 0) {
            if (this.formats.newLineBeforeFirstChildElement
                && indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth
                && indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth
                && !isOneOfExpectedTypes(element.token, FTHTMLComment)) before++;

            if (i === elements.length - 1) {
                if (this.formats.newLineAfterLastChildElement &&
                    indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                    indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                    after++;
            }
        }
        else if (i === elements.length - 1 && isExpectedType(element.token, TT.COMMENT)) {
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

    private prettifyTagChildren(element: IFTHTMLElement, indent: number, spacing: string, parentMode: ParentMode) {
        this.last_element = FTHTMLElement({
            type: TT.SYMBOL,
            value: '{',
            position: element.childrenStart
        });
        let fthtml = this.prettify(element.children, indent + 1, parentMode);
        fthtml += `\n${spacing}}`;
        this.last_element = FTHTMLElement({
            type: TT.SYMBOL,
            value: '}',
            position: element.childrenEnd
        });
        return fthtml;
    }

    private prettifyIfElseChildren(element: IFTHTMLElement, indent: number, spacing: string, parentMode: ParentMode) {
        let fthtml = '';
        if (isExpectedType(element.token, 'Pragma_elif'))
            fthtml += '\n';
        fthtml += `${spacing}#${element.token.value} `;

        const [lhs, op, rhs, ...children] = element.children;
        if (isExpectedType(lhs.token, TT.FUNCTION)) fthtml += this.prettifyFunctionInline(lhs);
        else fthtml += getFTHTMLTokenValue(lhs);
        fthtml += ' ';
        fthtml += getFTHTMLTokenValue(op);
        fthtml += ' ';
        if (isExpectedType(rhs.token, TT.FUNCTION)) fthtml += this.prettifyFunctionInline(rhs);
        else fthtml += getFTHTMLTokenValue(rhs);

        this.last_element = element;
        fthtml += this.prettify(children, indent + 1, parentMode);
        return fthtml;
    }
    private prettifyPragmaChildren(element: IFTHTMLElement, indent: number, spacing: string) {
        let fthtml = `${spacing}#${element.token.value}`;
        this.last_element = element
        const pm = new ParentMode(indent, ParentModes.VARS);

        if (element.token.value.endsWith('templates'))
            pm.mode = ParentModes.TINY_TEMPLATES;
        else if (isExpectedType(element.token, 'Pragma_ifdef')) {
            pm.mode = ParentModes.IFDEF;
            fthtml += ` ${element.children.splice(0, 1)[0].token.value}`;
        }

        fthtml += this.prettify(element.children, indent + 1, pm);
        this.last_element = FTHTMLElement({
            type: TT.PRAGMA,
            position: element.childrenEnd,
            value: 'end'
        });
        fthtml += `\n${spacing}#end`;

        return fthtml;
    }

    private prettifyFunctionInline(element: IFTHTMLElement, indent: number = 0) {
        let text = `${element.token.value}(`;
        this.last_element = element.children[element.children.length - 1];
        for (let i = 0; i < element.children.length; ++i) {
            const child = element.children[i];
            if (isExpectedType(child.token, TT.FUNCTION))
                text += this.prettifyFunctionInline(child);
            else text += getFTHTMLTokenValue(child);
            text += ' ';
        }
        return text.trim() + ')';
    }

    private prettify(elements: IFTHTMLElement[], indent: number = 0, parentMode?: ParentMode): string {
        let text = '';
        for (let i = 0; i < elements.length; ++i) {
            const element = elements[i];
            const { spacing, valueSpacing } = this.getSpacing(elements, i, indent, parentMode);
            const rules = this.newlineRules(elements, i, indent);

            text += repeat('\n', rules.newlines[0]);

            if (isExpectedType(element.token, TT.WORD)) {
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
                    this.last_element = FTHTMLElement({
                        type: TT.SYMBOL,
                        value: '}',
                        position: element.childrenEnd
                    })
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
                else if (element.children.length > 0) {
                    const child = element.children[0];
                    if (isExpectedType(child.token, TT.FUNCTION))
                        text += ` ${valueSpacing}${child.token.value}(${child.children.map(arg => getFTHTMLTokenValue(arg)).join(" ")})`;
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
            else if (isOneOfExpectedTypes(element.token, FTHTMLComment)) {
                let val = element.token.value;

                if (this.isOnSameLineAsLastElement(element) && isExpectedType(element.token, TT.COMMENT)) text += ` ${val}`;
                else if (this.formats.newLineBeforeComments || this.isLastElementOfType(FTHTMLComment)) {
                    if (this.isLastElementOfType(['Symbol_}']) || this.isDistanceGreaterThan(element, this.last_element, 1)) text += '\n';

                    text += `\n${val.split("\n").map(line => `${spacing}${line.trim()}`).join("\n")}`
                }
                else text += `${val.split("\n").map(line => `${spacing}${line.trim()}`).join("\n")}`;
            }
            else if (isExpectedType(element.token, TT.PRAGMA)) {
                if (isOneOfExpectedTypes(element.token, ['Pragma_templates', 'Pragma_tinytemplates', 'Pragma_vars', 'Pragma_ifdef'])) {
                    text += this.prettifyPragmaChildren(element, indent, spacing);
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
                else if (isExpectedType(element.token, 'Pragma_debug')) {
                    text += `${spacing}#debug `;
                    if (isExpectedType(element.children[0].token, TT.FUNCTION)) {
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
                else if (isExpectedType(element.token, 'Pragma_if')) {
                    for (let j = 0; j < element.children.length; j++) {
                        const subpragma = element.children[j];
                        if (!isExpectedType(subpragma.token, 'Pragma_else'))
                            text += this.prettifyIfElseChildren(subpragma, indent, spacing, parentMode);
                        else {
                            text += `\n${spacing}#else`;
                            this.last_element = subpragma;
                            text += this.prettify(subpragma.children, indent + 1, parentMode);
                        }
                    }
                    text += `\n${spacing}#end`;
                    this.last_element = FTHTMLElement({
                        type: TT.PRAGMA,
                        value: 'end',
                        position: element.childrenEnd
                    });
                    text += repeat('\n', rules.newlines[1]);
                    continue;
                }
            }
            else if (isOneOfExpectedTypes(element.token, ['Keyword_import'])) {
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
            else if (isOneOfExpectedTypes(element.token, [TT.KEYWORD, TT.KEYWORD_DOCTYPE])) {
                text += `${spacing}${element.token.value} ${getFTHTMLTokenValue(element.children[0])}`;
                this.last_element = element.children[0];
                text += repeat('\n', rules.newlines[1]);
                continue;
            }
            else if (isOneOfExpectedTypes(element.token, [TT.ELANG])) {
                text += `${spacing}${element.token.value}`;
                if (this.formats.braces.newLineAfterEmbeddedLangs)
                    text += `\n${spacing}\{`
                else text += ` \{`;

                const elangb = element.children[0];

                text += `\n\n${this.getIndentation(indent + 1)}${elangb.token.value.trim()}\n\n${spacing}}`;
                this.last_element = FTHTMLElement({
                    type: TT.SYMBOL,
                    value: '}',
                    position: elangb.token.position
                })
                text += repeat('\n', rules.newlines[1]);
                continue;
            }
            else if (isExpectedType(element.token, TT.MACRO)) {
                if (this.isLastElementOfType([TT.WORD, TT.STRING]))
                    text += ` ${valueSpacing}${element.token.value}`;
                else
                    text += `${spacing}${element.token.value}`;
            }
            else if (isExpectedType(element.token, TT.FUNCTION)) {
                if (!this.isLastElementOfType([TT.WORD])) text += '\n';
                if (this.isLastElementOfType([TT.WORD, TT.STRING])) {
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
