import functions from "fthtml/lib/lexer/grammar/functions";
import macros from "fthtml/lib/lexer/grammar/macros";
import { SELF_CLOSING_TAGS } from "fthtml/lib/utils/self-closing-tags";
import { getLanguageService as HTMLLS, Node as HTMLNode } from "vscode-html-languageservice";
import { FormattingOptions, SymbolKind, TextEdit, _Connection } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { IBaseContext, IScopeContextDocument } from "../../common/context";
import { clamp } from "../../common/utils/number";
import { repeat } from "../../common/utils/string";
import { FTHTMLFormats } from "../../config/settings";
import { ftHTMLElement } from "../../parser/model";
import { FTHTMLLSParser } from "../../parser/parser";
import StackTrace from "../../parser/stacktrace";
import { TOKEN_TYPE, TOKEN_TYPE as TT } from "../../parser/token";

export interface HTMLFormattingOptions extends FormattingOptions {
    indent: number;
}

export class FTHTMLDocumentFormatProvider {
    private last_element: ftHTMLElement = null;
    private document: IScopeContextDocument;
    private formattingOptions: FormattingOptions;
    private formats: FTHTMLFormats;

    constructor(formattingOptions: FormattingOptions, context: IBaseContext) {
        this.document = context.document;
        this.formats = context.settings.format;
        this.formattingOptions = formattingOptions;
    }

    public async convertHTML(html: string, indent: number) {
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
                const { start } = this.getBracesForType({ token: { type: TT.ELANG, value: elang, position: { line: 0, column: 0 } }, symbolKind: SymbolKind.Null, isParentWithftHTMLBlockBody: false, children: [] }, indentation);
                fthtml += `${elang}${start}`;
            }
        }
        else fthtml += node.tag;


        const element: ftHTMLElement = {
            token: {
                position: { line: 0, column: 0 },
                type: TOKEN_TYPE.WORD,
                value: node.tag
            },
            children: [],
            symbolKind: SymbolKind.Null,
            isParentWithftHTMLBlockBody: false,
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
            const { start, end } = this.getBracesForType(element, indentation);

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

    public async format(): Promise<TextEdit[]> {
        try {
            StackTrace.clear();

            const ftHTML = new FTHTMLLSParser().compile(this.document.getText());
            let formatted = this.prettify(ftHTML).trim();

            if (this.formattingOptions.insertFinalNewline)
                formatted += '\n';

            return Promise.resolve([TextEdit.replace(this.document.totalRange, formatted)]);
        } catch (error) {
            console.log(error);
            return [];
        }
    }

    private getBracesForType({ token, attrs }: ftHTMLElement, indentation: string) {
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

    private formatAttributes(element: ftHTMLElement, spacing: string) {

        if (!element.attrs) return '';

        let id;
        if (element.attrs.get('id').size > 0) {
            const val = element.attrs.get('id').values().next().value;
            id = val.startsWith('@') ? `id=${val}` : `#${val}`;
        }

        let classes = Array.from(element.attrs.get('classes'));
        let misc = Array.from(element.attrs.get('misc'));
        let kvps = Array.from(element.attrs.get('kvps'));

        if (this.formats.attributes.sorted) {
            classes = classes.sort();
            misc = misc.sort();
            kvps = kvps.sort();
        }

        const numOfAttrs = (element.attrs.get('id').size + element.attrs.get('classes').size + element.attrs.get('misc').size + element.attrs.get('kvps').size);
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

    private isOnSameLineAsLastElement(element: ftHTMLElement) {
        if (!this.last_element) return false;

        return this.last_element.token.position.line === element.token.position.line;
    }

    private isOnSameLineAsLastElementTargetTypes(types: TT[], element: ftHTMLElement) {
        if (!this.last_element) return false;

        return types.includes(this.last_element.token.type) && this.isOnSameLineAsLastElement(element);
    }

    private isOfType(types: (TT | string)[], element: ftHTMLElement) {
        return types.includes(element.token.type) || types.includes(`${element.token.type}_${element.token.value}`);
    }

    private isLastElementOfType(types: (TT | string)[]) {
        if (!this.last_element) return false;

        return this.isOfType(types, this.last_element);
    }

    private isDistanceGreaterThan(aElement: ftHTMLElement, bElement: ftHTMLElement, lines: number) {
        if (!aElement || !bElement) return false;

        return aElement.token.position.line - this.last_element.token.position.line > lines;
    }

    private getSpacing(elements: ftHTMLElement[], forElementIndex: number, indent: number, braces: any) {
        const wordsInSameColumn = elements.filter(f => this.isOfType([TT.WORD], f)).map(m => m.token.value);
        const longestWord = wordsInSameColumn.length > 0
            ? wordsInSameColumn.reduce((c, v) => c.length > v.length ? c : v)
            : undefined;
        const element = elements[forElementIndex];

        let valueSpacing = '';
        if (longestWord && this.formats.alignVariableOrPropertyBindingValues
            && braces
            && braces.indent_level === indent) {
            valueSpacing += repeat(' ', longestWord.length - element.token.value.length);
            if (this.isOfType(['Symbol_{'], element))
                valueSpacing = valueSpacing.substring(this.last_element.token.value.length - 1);
        }

        return {
            spacing: this.getIndentation(indent),
            valueSpacing
        }
    }

    private getEndOfTagCommentForElement(element: ftHTMLElement) {
        let selector = element.token.value;
        if (!this.formats.braces.skipTagNamesForCommentAfterClosingBrace.includes(selector)) {
            if (element.attrs) {
                if (element.attrs.get('id').size > 0) {
                    selector += `#${element.attrs.get('id').values().next().value}`;
                }
                else if (element.attrs.get('classes').size > 0) {
                    selector += `${element.attrs.get('classes').values().next().value}`
                }
                else if (element.attrs.get('kvps').size > 0) {
                    selector += ` ${element.attrs.get('kvps').values().next().value}`
                }
                else if (element.attrs.get('misc').size > 0) {
                    selector += ` ${element.attrs.get('misc').values().next().value}`
                }
            }
            return ` // end of ${selector}`;
        }

        return '';
    }

    private canCollapse(element: ftHTMLElement, valueSpacing, spacing) {
        if (!this.formats.collapseSingleChildElements ||
            this.formats.skipTagNamesForCollapsing.includes(element.token.value) ||
            !element.isParentWithftHTMLBlockBody) return false;

        if (element.children.length !== 1 ||
            element.children[0].isParentWithftHTMLBlockBody ||
            element.children[0].children.length > 1 ||
            this.formats.skipTagNamesForCollapsing.includes(element.children[0].token.value))
            return false;

        if (element.children[0].children.length === 1 && this.formats.skipTagNamesForCollapsing.includes(element.children[0].children[0].token.value))
            return false;

        return this.getCollapsedChild(this.last_element, valueSpacing, spacing).count <= this.formats.collapseSingleChildElementsIfLineLengthLessThan
    }

    private getCollapsedChild(element: ftHTMLElement, valueSpacing, spacing) {
        let line = '';
        let child = element.children[0];
        line += ` ${valueSpacing}{ ${child.token.value}`;
        if (child.attrs)
            line += this.formatAttributes(child, spacing);

        if (child.children.length > 0) {
            if (this.isOfType([TT.FUNCTION], child.children[0]))
                line += ` ${child.children[0].token.value}(${child.children[0].children.map(arg => arg.token.value).join(" ")})`;
            else
                line += ` ${child.children[0].token.value}`;
        }

        return {
            value: line,
            count: line.length + element.token.value.length + this.formatAttributes(element, spacing).length
        };
    }

    private prettify(elements: ftHTMLElement[], indent: number = 0, braces?: { mode: string, indent_level: number }): string {
        let text = '';
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const { spacing, valueSpacing } = this.getSpacing(elements, i, indent, braces);

            let newlines = 1;

            //add new line before first child
            if (this.formats.newLineBeforeFirstChildElement && i === 0
                && indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth
                && indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth
                && element.token.position.line - this.last_element.token.position.line < 2
                && !this.isOfType([TT.COMMENT, TT.COMMENTB], element))
                newlines++;

            //add new element to every element that isn't a symbol
            if (!this.isOfType([TT.SYMBOL], element) && this.isDistanceGreaterThan(element, this.last_element, 1)) newlines++

            if (this.isOfType([TT.WORD], element)) {
                text += repeat('\n', clamp(newlines, 1, 2));
                text += `${spacing}${element.token.value}`;
                text += this.formatAttributes(element, spacing);
                if (element.children.length > 0 && !element.isParentWithftHTMLBlockBody) {
                    const child = element.children[0];
                    if (this.isOfType([TT.FUNCTION], child))
                        text += ` ${valueSpacing}${child.token.value}(${child.children.map(arg => arg.token.value).join(" ")})`;
                    else
                        text += ` ${valueSpacing}${child.token.value}`;
                }
            }
            else if (this.isOfType(['Symbol_{'], element)) {
                let _braces = undefined;

                if (this.isLastElementOfType(['Keyword_import'])) {
                    if (this.formats.braces.newLineAfterImport) text += `\n${spacing}{`;
                    else text += ` ${valueSpacing}\{`;
                    _braces = {
                        mode: "import",
                        indent_level: indent + 1
                    }
                }
                else if (braces) {
                    if (this.isLastElementOfType([TT.WORD]) && this.formats.braces.newLineAfterVariableOrPropertyBinding && ["import", "vars"].includes(braces.mode) && indent === braces.indent_level) {
                        text += `\n${this.getIndentation(braces.indent_level)}\{`;
                    }
                    else text += ` ${valueSpacing}\{`;
                }
                else if (this.canCollapse(this.last_element, valueSpacing, spacing)) {
                    text += this.getCollapsedChild(this.last_element, valueSpacing, spacing).value;
                    text += ` }`;
                    this.last_element = elements[i + 1];
                    i++;

                    if (this.formats.newLineAfterLastChildElement && i === elements.length - 1 &&
                        indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                        indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                        text += '\n';
                    continue;
                }
                else if (this.formats.braces.newLineAfterElement && !this.last_element.attrs)
                    text += `\n${spacing}\{`
                else if (this.formats.braces.newLineAfterAttributes && this.last_element.attrs) {
                    text += `\n${spacing}\{`;
                }
                else text += ` ${valueSpacing}\{`;

                if (this.last_element?.isParentWithftHTMLBlockBody) {
                    const prev = this.last_element
                    this.last_element = element
                    text += this.prettify(prev.children, indent + 1, _braces);
                }
            }
            else if (this.isOfType(['Symbol_}'], element)) {
                const elem = i - 2 < 0 ? null : elements[i - 2];
                const next = i + 1 >= elements.length ? null : elements[i + 1];

                text += `\n${spacing}}`;
                if (this.formats.braces.addIdentifierCommentAfterClosingBrace
                    && (!next || (next && !(['Comment', 'CommentB'].includes(next.token.type)
                        && next.token.position.line === element.token.position.line)))
                    && elem
                    && this.isDistanceGreaterThan(element, this.last_element, this.formats.braces.minimumNumberOfLinesToAddIdentifierComment - 1) ) {
                    text += this.getEndOfTagCommentForElement(elem);
                }
            }
            else if (this.isOfType([TT.PRAGMA], element)) {
                text += repeat('\n', clamp(newlines, 1, 2));
                text += `${spacing}#vars`;
                this.last_element = element
                const _braces = {
                    mode: 'vars',
                    indent_level: indent + 1
                };
                text += this.prettify(element.children, indent + 1, _braces);
                text += `\n${spacing}#end`
            }
            else if (this.isOfType([TT.COMMENT, TT.COMMENTB], element)) {
                let val = element.token.value;

                if (this.isOnSameLineAsLastElement(element) && !this.isLastElementOfType([TT.COMMENT, TT.COMMENTB])) text += ` ${val}`;
                else if (this.formats.newLineBeforeComments || this.isLastElementOfType([TT.COMMENT, TT.COMMENTB])) {
                    const sym = i - 2 < 0 ? undefined : elements[i - 2];
                    if (sym && this.isOfType(['Symbol_}'], sym) || this.isDistanceGreaterThan(element, this.last_element, 1)) text += '\n';
                    text += `\n${val.split("\n").map(line => `${spacing}${line}`).join("\n")}`
                }
                else text += `${val.split("\n").map(line => `${spacing}${line}`).join("\n")}`;
            }
            else if (this.isOfType([TT.FUNCTION], element)) {
                if (!this.isLastElementOfType([TT.WORD])) text += '\n';
                if (this.isLastElementOfType([TT.WORD, TT.STRING])) {
                    text += ` ${valueSpacing}${element.token.value}(${element.children.map(arg => arg.token.value).join(" ")})`;
                }
                else {
                    text += `${spacing}${element.token.value}(${element.children.map(arg => arg.token.value).join(" ")})`;
                }
            }
            else if (this.isOfType([TT.MACRO], element)) {
                text += repeat('\n', clamp(newlines, 0, 2));
                if (this.isLastElementOfType([TT.WORD, TT.STRING]))
                    text += ` ${valueSpacing}${element.token.value}`;
                else
                    text += `${spacing}${element.token.value}`;
            }
            else if (this.isOfType([TT.ELANG], element)) {
                text += repeat('\n', clamp(newlines, 0, 2));
                text += `${spacing}${element.token.value} `;
                if (this.formats.braces.newLineAfterEmbeddedLangs)
                    text += `\n${spacing}\{`
                else text += `\{`;

                text += `\n\n${this.getIndentation(indent + 1)}${element.children[0].token.value.trim()}\n\n${spacing}}`;
            }
            else if (this.isOfType(['Keyword_import'], element)) {
                text += repeat('\n', clamp(newlines, 0, 2));
                text += `${spacing}import ${element.children.shift().token.value}`;
            }
            else if (this.isOfType([TT.KEYWORD, TT.KEYWORD_DOCTYPE], element)) {
                text += `\n${spacing}${element.token.value} ${element.children[0].token.value}`;
            }
            else {
                text += repeat('\n', clamp(newlines, 0, 2));
                text += `${spacing}${element.token.value}`;
                if (element.children.length > 0) {
                    this.last_element = element
                    text += this.prettify(element.children, indent + 1);
                }
            }

            this.last_element = element;

            if (this.formats.newLineAfterLastChildElement && i === elements.length - 1 &&
                indent >= this.formats.newLineBeforeAfterChildElementMinimumDepth &&
                indent <= this.formats.newLineBeforeAfterChildElementMaximumDepth)
                text += '\n';
        };

        return text
    }

}
