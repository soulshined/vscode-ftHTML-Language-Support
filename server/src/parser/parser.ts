import * as fs from 'fs';
import * as path from "path";
import { default as InputStream } from "fthtml/lib/lexer/input-stream";
import grammar from "fthtml/lib/lexer/grammar";
import {
    ftHTMLIllegalArgumentTypeError,
    ftHTMLImportError,
    ftHTMLIncompleteElementError,
    ftHTMLInvalidElementNameError,
    ftHTMLInvalidKeywordError,
    ftHTMLInvalidTinyTemplateNameError,
    ftHTMLInvalidTinyTemplatePlaceholderError,
    ftHTMLInvalidTypeError,
    ftHTMLInvalidVariableNameError,
    ftHTMLNotEnoughArgumentsError,
    ftHTMLParserError,
} from "fthtml/lib/utils/exceptions";
import * as _ from "fthtml/lib/utils/functions";
import StackTrace from "./stacktrace";
import { SELF_CLOSING_TAGS } from "fthtml/lib/utils/self-closing-tags";
import { TinyTemplate } from "fthtml/lib/parser/models";
import { TokenStream, TOKEN_TYPE as TT, Tokenable, token } from './token';
import { ftHTMLLSLexer } from './lexer';
import { ftHTMLElement, TConstant, TFunction, TMethod, Token, TProperty, TString, TVariable } from './model';
import { FTHTMLConfigs } from '../config/settings';
import { SymbolKind } from 'vscode-languageserver-types';


function ParserVariables(vars) {
    let variables = vars || {};
    variables.import = variables.import || {};

    let __dir = '';
    let __filename = '';
    if (variables._$) {
        __dir = variables._$.__dir || '';
        __filename = variables._$.__filename || '';
    }
    variables._$ = Object.seal({ __dir, __filename });

    return variables;
}

export class FTHTMLLSParser {
    private input: TokenStream;
    private vars;
    private tinytemplates = {};
    private config;
    constructor(config: FTHTMLConfigs, vars?) {
        this.config = config;
        this.vars = ParserVariables(vars);
    }

    compile(src: string) {
        return new FTHTMLLSParser(this.config).parse(ftHTMLLSLexer.TokenStream(InputStream(src)));
    }

    renderFile(file: string) {
        if (file.startsWith('https:') || file.startsWith('http:'))
            throw new ftHTMLImportError(`Files must be local, can not access '${file}'`);

        try {
            file = path.resolve(`${file}.fthtml`);

            if (!fs.existsSync(file))
                throw new ftHTMLImportError(`Can not find file '${file}' to parse`);

            this.vars._$.__dir = path.dirname(file);
            this.vars._$.__filename = file;
            StackTrace.add(file);

            const tokenstream = ftHTMLLSLexer.TokenStream(InputStream(fs.readFileSync(file, 'utf8')));

            let tokens = this.parse(tokenstream);
            StackTrace.remove(1);
            return tokens;
        } catch (error) {
            throw error;
        }
    }

    private compileTinyTemplate(src: string) {
        const parser = new FTHTMLLSParser(this.config);
        parser.parse(ftHTMLLSLexer.TokenStream(InputStream(src)));
        return parser.tinytemplates;
    }

    private parse(input: TokenStream): ftHTMLElement[] {
        this.input = input;

        let tokens: ftHTMLElement[] = [];
        const token = this.parseIfOne(TT.KEYWORD_DOCTYPE);
        if (token) tokens.push(token);

        tokens = tokens.concat(this.parseWhileType([
            TT.COMMENT,
            TT.COMMENTB,
            TT.WORD,
            TT.ELANG,
            TT.FUNCTION,
            TT.MACRO,
            TT.PRAGMA,
            TT.KEYWORD,
            TT.VARIABLE
        ]));

        return tokens;
    }

    private parseWhileType(types: TT[], endingtype?: TT | string, onendingtype?: (tokens: ftHTMLElement[], err: boolean) => ftHTMLElement[], and_only_n_times: number = Number.POSITIVE_INFINITY) {
        let tokens: ftHTMLElement[] = [];
        let iterations = 0;

        while (!this.input.eof() && iterations++ < and_only_n_times) {
            const t = this.peek();

            if (endingtype && this.isExpectedType(t, endingtype)) return onendingtype(tokens, false);
            // @ts-ignore
            if (!types.includes(t.type)) throw new ftHTMLInvalidTypeError(t, '');

            if (this.isExpectedType(t, TT.WORD) && (this.tinytemplates[t.value] !== undefined || (this.config && this.config.tinytemplates[t.value] !== undefined)))
                tokens.push(...this.parseTinyTemplate());
            else if (t.type == TT.WORD) tokens.push(...this.parseTag());
            else if (t.type == TT.STRING) tokens.push(TString(this.consume()))
            else if (t.type == TT.VARIABLE) tokens.push(TVariable(this.consume()));
            else if (t.type == TT.ELANG) tokens.push(this.parseElang());
            else if (t.type == TT.KEYWORD) tokens.push(...this.parseKeyword());
            else if (t.type == TT.PRAGMA) tokens.push(this.parseMaybePragma());
            else if (t.type == TT.KEYWORD_DOCTYPE) tokens.push(...this.parseKeyword());
            else if (t.type == TT.FUNCTION) tokens.push(this.parseFunction());
            else if (t.type == TT.MACRO) {
                this.parseMacro();
                tokens.push(TConstant(t));
            }
            else if (t.type == TT.COMMENT || t.type == TT.COMMENTB) tokens.push(Token(this.consume()))
            // @ts-ignore
            else throw new ftHTMLInvalidTypeError(t, '');
        }

        if (endingtype) onendingtype(null, true);
        return tokens;
    }

    private parseWhileTypeForTokens(types: TT[], endingtype?: TT | string, onendingtype?: (token: ftHTMLElement[], err: boolean) => ftHTMLElement[]): ftHTMLElement[] {
        let tokens: ftHTMLElement[] = [];

        while (!this.input.eof()) {
            const t = this.peek();

            if (endingtype && this.isExpectedType(t, endingtype)) return onendingtype(tokens, false);
            // @ts-ignore
            if (!types.includes(t.type)) throw new ftHTMLInvalidTypeError(t, '');

            if (t.type == TT.WORD) {
                tokens.push(Token(this.consume()));
            }
            else if (t.type == TT.STRING) tokens.push(TString(this.consume()))
            else if (t.type == TT.VARIABLE) tokens.push(TVariable(this.consume()))
            else if (t.type == TT.MACRO) {
                this.parseMacro();
                tokens.push(TConstant(t));
            }
            else if (t.type == TT.FUNCTION) tokens.push(TFunction(t, this.parseWhileType([t.type], null, null, 1)))
            else if ([TT.ELANG, TT.KEYWORD, TT.PRAGMA, TT.COMMENT, TT.COMMENTB].includes(t.type))
                tokens.push(Token(t, this.parseWhileType([t.type], null, null, 1)));
            // @ts-ignore
            else throw new ftHTMLInvalidTypeError(t, '');
        }

        if (endingtype) onendingtype(null, true);
        return tokens;
    }

    private parseTypesInOrderForTokens(types: (TT | string)[][], initiator: token): ftHTMLElement[] {
        let tokens: ftHTMLElement[] = [];

        types.forEach(subtypes => {
            if (this.isEOF())
                // @ts-ignore
                throw new ftHTMLIncompleteElementError(initiator, subtypes.join(', '));

            let last = this.peek();
            if (!this.isOneOfExpectedTypes(last, subtypes))
                // @ts-ignore
                throw new ftHTMLInvalidTypeError(last, subtypes.join(', '));

            if (last.type == TT.STRING)
                tokens.push(TString(this.consume()));
            else if (last.type == TT.MACRO) {
                this.parseMacro();
                tokens.push(TConstant(last));
            }
            else
                tokens.push(Token(this.consume()));
        });

        return tokens;
    }

    private parseIfOne(type: TT): ftHTMLElement {
        const t = this.peek();
        if (this.isExpectedType(t, type)) {
            return this.parseWhileType([type], null, null, 1)[0]
        }
    }


    private parseTag(): ftHTMLElement[] {
        const token = this.consume();
        const tag = this.evaluateENForToken(token);

        let peek = this.peek();
        if (SELF_CLOSING_TAGS.includes(tag)) {
            if (this.isExpectedType(peek, 'Symbol_(')) return this.initElementWithAttrs(token);
            return [Token(token)]
        }
        if (this.isExpectedType(peek, TT.STRING)) {
            return [Token(token, [TString(this.consume())])];
        }
        else if (this.isExpectedType(peek, TT.VARIABLE)) {
            return [Token(token, [TVariable(this.consume())])]
        }
        else if (this.isExpectedType(peek, 'Symbol_(')) return this.initElementWithAttrs(token);
        else if (this.isExpectedType(peek, 'Symbol_{')) {
            let children = this.initElementWithChildren(token);
            const brace = children.children.shift();
            const endBrace = children.children.pop();
            return [children, brace, endBrace];
        }
        else if (this.isExpectedType(peek, TT.FUNCTION)) return [Token(token, [this.parseFunction()])];
        else if (this.isExpectedType(peek, TT.MACRO)) {
            this.parseMacro();
            return [Token(token, [TConstant(peek)])];
        }
        else return [Token(token)];
    }

    private parseMaybePragma(): ftHTMLElement {
        const pragma = this.consume();
        // @ts-ignore
        if (this.input.eof()) throw new ftHTMLIncompleteElementError(pragma, `a value body, value definition and possibly an '#end' keyword`);

        let token = Token(pragma);

        if (pragma.value === 'vars') {
            do {
                const t = this.consume();

                if (t.type == TT.PRAGMA && t.value == 'end') return token;
                // @ts-ignore
                if (t.type != TT.WORD) throw new ftHTMLInvalidVariableNameError(t, '[\w-]+');

                // @ts-ignore
                if (this.input.eof()) throw new ftHTMLIncompleteElementError(t, 'a string or ftHTML block values for variables');

                const peek = this.input.peek();
                if (peek.type == TT.STRING) {
                    token.children.push(Token(t, [TString(this.consume())]));
                }
                else if (this.isExpectedType(peek, 'Symbol_{')) {
                    const prop = Token(t, this.parseBindingPropertyValueAsFTHTML(), null, true);
                    const brace = prop.children.shift();
                    const endBrace = prop.children.pop();
                    token.children.push(prop);
                    token.children.push(brace);
                    token.children.push(endBrace);
                }
                else if (this.isExpectedType(peek, TT.FUNCTION)) token.children.push(Token(t, [this.parseFunction()]));
                else if (this.isExpectedType(peek, TT.MACRO)) {
                    this.parseMacro();
                    token.children.push(Token(t, [TConstant(peek)]));
                }
                else if (this.isExpectedType(peek, 'Word_json')) {
                    const json = TFunction(this.consume());
                    json.token.type = TT.FUNCTION;
                    const parsed = this.parseTypesInOrderForTokens([['Symbol_('], [TT.STRING], ['Symbol_)']], peek);
                    const [, json_file] = parsed;
                    json.children.push(json_file);

                    token.children.push(Token(t, [json]));
                }
                // @ts-ignore
                else throw new ftHTMLInvalidTypeError(peek, 'string or ftHTML block values');
            } while (!this.input.eof());

            // @ts-ignore
            throw new ftHTMLIncompleteElementError(pragma, `Expecting '#end' pragma keyword for starting pragma '${pragma.value}' but none found`, pragma);
        }
        else if (pragma.value.endsWith('templates')) {
            do {
                const tinytempl = this.consume();
                if (this.isExpectedType(tinytempl, 'Pragma_end')) return token;
                if (tinytempl.type !== TT.WORD)
                    // @ts-ignore
                    throw new ftHTMLInvalidTinyTemplateNameError(tinytempl, "[\w-]+", this.vars._$.__filename);

                if (this.isEOF())
                    // @ts-ignore
                    throw new ftHTMLIncompleteElementError(tinytempl, 'a string or single ftHTML element');

                const element = this.consume();
                if (!this.isOneOfExpectedTypes(element, [TT.WORD, TT.STRING]))
                    // @ts-ignore
                    throw new ftHTMLInvalidTypeError(element, 'a string or single ftHTML element');

                if (this.isExpectedType(element, TT.STRING)) {
                    // @ts-ignore
                    this.tinytemplates[tinytempl.value] = TinyTemplate(element, this.vars._$.__filename);
                    token.children.push(Token(tinytempl, [TString(element)]));
                    continue;
                }

                if (this.isEOF())
                    // @ts-ignore
                    throw new ftHTMLIncompleteElementError(pragma, `an '#end' pragma keyword for starting pragma '${pragma.value}' but none found`);

                const peek = this.peek();
                if (this.isExpectedType(peek, 'Pragma_end')) {
                    this.tinytemplates[tinytempl.value] = TinyTemplate({
                        // @ts-ignore
                        type: TT.STRING,
                        value: '${val}',
                        position: element.position
                    }, this.vars._$.__filename, element);
                    token.children.push(Token(tinytempl, [Token(element)]));
                    continue;
                }

                if (this.isExpectedType(peek, TT.STRING)) {
                    // @ts-ignore
                    this.tinytemplates[tinytempl.value] = TinyTemplate(this.consume(), this.vars._$.__filename, element);
                    token.children.push(Token(tinytempl, [Token(element, [TString(this.consume())])]));
                }
                else if (this.isExpectedType(peek, 'Symbol_(')) {
                    this.consume();
                    if (this.isEOF())
                        // @ts-ignore
                        throw new ftHTMLIncompleteElementError(element, 'closing and opening parenthesis');

                    const attrs = this.parseAttributes();

                    let value;
                    if (this.isExpectedType(this.peek(), TT.STRING)) {
                        const val = this.consume();
                        value = val.value;
                        token.children.push(Token(tinytempl, [Token(element, [TString(val)], attrs)]));
                    }
                    else if (!this.isExpectedType(this.peek(), TT.WORD) && !this.isExpectedType(this.peek(), 'Pragma_end'))
                        // @ts-ignore
                        throw new ftHTMLInvalidTypeError(element, 'a string or single ftHTML element');

                    this.tinytemplates[tinytempl.value] = TinyTemplate(value ?? {
                        type: TT.STRING,
                        value: '${val}',
                        position: element.position
                        // @ts-ignore
                    }, this.vars._$.__filename, element, attrs);
                    token.children.push(Token(tinytempl, [Token(element, [], attrs)]));
                }
                else if (this.isExpectedType(peek, TT.WORD)) {
                    // @ts-ignore
                    this.tinytemplates[tinytempl.value] = TinyTemplate(element, this.vars._$.__filename);
                    token.children.push(Token(tinytempl, [Token(this.consume())]));
                }
                else
                    // @ts-ignore
                    throw new ftHTMLInvalidTypeError(element, 'a string or single ftHTML element');
            } while (!this.isEOF());

            // @ts-ignore
            throw new ftHTMLIncompleteElementError(pragma, `an '#end' pragma keyword for starting pragma '${pragma.value}' but none found`);
        }
        // @ts-ignore
        else throw new ftHTMLInvalidKeywordError(pragma);
    }

    private parseKeyword(): ftHTMLElement[] {
        const keyword = this.consume();

        if (this.input.eof() || !this.isExpectedType(this.peek(), TT.STRING))
            // @ts-ignore
            throw new ftHTMLIncompleteElementError(keyword, 'string values');

        const token = this.consume();
        switch (keyword.value) {
            case 'comment': return [Token(keyword, [TString(token)])];
            case 'doctype': return [Token(keyword, [TString(token)])];
            case 'import':
                if (this.isExpectedType(this.peek(), 'Symbol_{')) {
                    let children = this.parseTemplate();
                    const brace = children.shift();
                    const endBrace = children.pop();
                    return [TMethod(keyword, [TString(token), ...children], true), brace, endBrace];
                }

                return [TMethod(keyword, [TString(token)], false)];
            default:
                // @ts-ignore
                throw new ftHTMLInvalidKeywordError(keyword);
        }
    }

    private parseTemplate(): ftHTMLElement[] {
        const brace = Token(this.consume());

        let tokens: ftHTMLElement[] = [brace];

        do {
            const t = this.consume();

            if (this.isExpectedType(t, 'Symbol_}')) {
                tokens.push(Token(t));
                return tokens;
            }

            if (t.type === TT.COMMENT || t.type === TT.COMMENTB) {
                tokens.push(Token(t));
                continue;
            }
            // @ts-ignore
            if (t.type != TT.WORD) throw new ftHTMLInvalidVariableNameError(t, '[\w-]+');
            // @ts-ignore
            if (this.input.eof()) throw new ftHTMLIncompleteElementError(t, 'string, macro, function or ftHTML block values');

            const peek = this.input.peek();
            if (peek.type == TT.STRING) tokens.push(TProperty(t, [TString(this.consume())]))
            else if ([TT.VARIABLE].includes(peek.type)) tokens.push(TProperty(t, [TVariable(this.consume())]));
            else if (this.isExpectedType(peek, TT.FUNCTION)) tokens.push(TProperty(t, [this.parseFunction()]));
            else if (this.isExpectedType(peek, TT.MACRO)) {
                this.parseMacro();
                tokens.push(TProperty(t, [TConstant(peek)]));
            }
            else if (this.isExpectedType(peek, 'Symbol_{')) {
                const token = TProperty(t, this.parseBindingPropertyValueAsFTHTML(), true);
                const brace = token.children.shift();
                const endBrace = token.children.pop();
                tokens.push(token);
                tokens.push(brace);
                tokens.push(endBrace);
            }
            else if (this.isExpectedType(peek, TT.COMMENT) || this.isExpectedType(peek, TT.COMMENTB)) {
                tokens.push(Token(t));
            }
            // @ts-ignore
            else throw new ftHTMLInvalidTypeError(peek, 'string, macro, function or ftHTML block values');
        } while (!this.input.eof())

        // @ts-ignore
        throw new ftHTMLInvalidTypeError(brace, `an opening and closing braces for template imports`);
    }

    private parseBindingPropertyValueAsFTHTML(): ftHTMLElement[] {
        const brace = Token(this.consume());
        let endBrace;
        const kvps = this.parseWhileType([TT.WORD, TT.ELANG, TT.STRING, TT.KEYWORD, TT.VARIABLE, TT.FUNCTION, TT.MACRO,
        TT.COMMENT,
        TT.COMMENTB], 'Symbol_}', (tokens: ftHTMLElement[], error: boolean) => {
            // @ts-ignore
            if (error) throw new ftHTMLInvalidTypeError(brace, 'Symbol_}');
            endBrace = Token(this.consume());
            return tokens;
        });

        return [brace, ...kvps, endBrace]
    }

    private parseElang(): ftHTMLElement {
        const elang = this.input.next();
        const peek = this.peek();
        // @ts-ignore
        if (this.input.eof() || peek.type != TT.ELANGB) throw new ftHTMLIncompleteElementError(elang, 'opening and closing braces', peek);

        const next = this.input.next();
        switch (elang.value) {
            case 'js':
                return Token(elang, [Token(next)]);
            case 'css':
                return Token(elang, [Token(next)]);
            default:
                // @ts-ignore
                throw new ftHTMLInvalidTypeError(elang, "'css','js'");
        }
    }

    private parseFunction(): ftHTMLElement {
        const func = this.consume();

        if (!this.isExpectedType(this.peek(), 'Symbol_('))
            // @ts-ignore
            throw new ftHTMLInvalidTypeError(this.peek(), 'opening and closing parenthesis');
        this.consume();

        const funcrules = grammar.functions[func.value],
            params = Object.values(funcrules.argPatterns);

        let args: ftHTMLElement[] = [];
        if (funcrules.argsSequenceStrict) {
            args = this.parseFunctionArgsInOrder(params.filter(param => param.isRestParameter === undefined), func);
            const restParameters = params.filter(param => param.isRestParameter !== undefined);
            if (restParameters.length === 1) {
                // @ts-ignore
                args.push(...this.parseWhileTypeForTokens(restParameters[0].type, 'Symbol_)', (tokens: ftHTMLElement[], error: boolean) => {
                    // @ts-ignore
                    if (error) throw new ftHTMLIncompleteElementError(func, "opening and closing parenthesis")
                    this.consume();
                    return tokens;
                }))
            }
            else if (this.isEOF()) {
                // @ts-ignore
                throw new ftHTMLIncompleteElementError(func, 'opening and closing parenthesis');
            }
            else if (!this.isExpectedType(this.peek(), 'Symbol_)')) {
                // @ts-ignore
                throw new ftHTMLInvalidTypeError(this.peek(), 'a closing parenthesis for functions');
            }
            else {
                this.consume();
            }
        }
        else {
            // @ts-ignore
            args = this.parseWhileTypeForTokens([...new Set(params.map(param => param.type).flat())], 'Symbol_)', (tokens: ftHTMLElement[], error: boolean) => {
                // @ts-ignore
                if (error) throw new ftHTMLIncompleteElementError(func, "opening and closing parenthesis")
                this.consume();
                return tokens;
            });
        }

        if (args.length < params.filter(m => !m.isOptional).length)
            // @ts-ignore
            throw new ftHTMLNotEnoughArgumentsError(func, params.filter(m => !m.isOptional).length, args.length);

        return TFunction(func, args);
    }

    private parseFunctionArgsInOrder(argPatterns, initiator: token) {
        let tokens: ftHTMLElement[] = [];

        argPatterns.forEach((arg, index) => {
            if (this.isEOF()) {
                const args: TT[] = arg.type;
                const lastarg = args.pop();
                // @ts-ignore
                throw new ftHTMLIncompleteElementError(initiator, `a ${args.join(', ')} or ${lastarg} arg for argument '${arg.name}' at position ${index + 1}`);
            }

            let peek = this.peek();

            if (!this.isOneOfExpectedTypes(peek, arg.type))
                if (arg.isOptional === true) return;
                // @ts-ignore
                else throw new ftHTMLIllegalArgumentTypeError(arg, initiator, peek);

            if (this.isExpectedType(peek, TT.FUNCTION)) {
                tokens.push(TFunction(peek, [this.parseFunction()]))
                return;
            }
            else if (this.isExpectedType(peek, TT.MACRO)) {
                this.parseMacro();
                tokens.push(TConstant(peek));
                return;
            }
            else if (this.isExpectedType(peek, TT.STRING)) {
                tokens.push(TString(this.consume()));
                return;
            }

            tokens.push(Token(this.consume()));
        });

        return tokens;
    }

    private parseMacro() {
        return grammar.macros[this.consume().value].apply();
    }

    private evaluateENForToken(token: token) {
        if (!/^[\w-]+$/.test(token.value))
            // @ts-ignore
            throw new ftHTMLInvalidElementNameError(token, `the following pattern: [\w-]+`);

        return token.value;
    }

    private parseTinyTemplate() : ftHTMLElement[] {
        const token = TVariable(this.consume())
        const uconfigtt = this.config?.tinytemplates[token.token.value];
        const tt = this.tinytemplates[token.token.value] || uconfigtt;

        let { element, attrs, value } = tt;

        if (uconfigtt !== undefined) {
            try {
                const tts = this.compileTinyTemplate(`#templates ${token.token.value} ${value.value} #end`);

                value = tts[token.token.value].value;
                element = tts[token.token.value].element;
                attrs = tts[token.token.value].attrs;
            }
            catch (error) { }
        }

        let result = value.value;
        const placeholders = _.getAllMatches(result, /(?<!\\)(\${[ ]*val[ ]*})/g);
        if (placeholders.length === 0)
            // @ts-ignore
            throw new ftHTMLInvalidTinyTemplatePlaceholderError(token.token, this.vars._$.__filename);

        if (this.isExpectedType(this.peek(), 'Symbol_{')) {
            const props = this.parseBindingPropertyValueAsFTHTML();
            const brace = props.shift();
            const endBrace = props.pop();
            token.children.push(...props);
            token.isParentWithftHTMLBlockBody = true;
            token.symbolKind = SymbolKind.Variable;
            return [token, brace, endBrace];
        }
        else if (this.peek().type == TT.STRING) {
            token.children.push(TString(this.consume()));
        }
        else if (this.isExpectedType(this.peek(), TT.FUNCTION))
            token.children.push(this.parseFunction());
        else if (this.isExpectedType(this.peek(), TT.MACRO)) {
            token.children.push(TConstant(this.peek()));
            this.parseMacro();
        }
        else if (this.isExpectedType(this.peek(), TT.VARIABLE)) {
            token.children.push(...this.parseWhileType([TT.VARIABLE], null, null, 1));
        }

        return [token];
    }

    private parseAttributes() {
        const attrs: Map<String, Set<String>> = new Map;
        attrs.set('classes', new Set);
        attrs.set('misc', new Set);
        attrs.set('kvps', new Set);
        attrs.set('id', new Set);

        do {
            const t = this.consume();
            let peek = this.peek();

            if (t.type == TT.SYMBOL && t.value == ')') return attrs;

            // @ts-ignore
            if (![TT.WORD, TT.ATTR_CLASS, TT.ATTR_CLASS_VAR, TT.ATTR_ID, TT.VARIABLE].includes(t.type)) throw new ftHTMLInvalidTypeError(t, 'an attribute selector, identifier or word');

            if (t.type == TT.ATTR_CLASS || t.type === TT.ATTR_CLASS_VAR) attrs.get('classes').add(`.${t.value}`);
            else if (t.type == TT.ATTR_ID) {
                // @ts-ignore
                if (attrs.get('id').size > 0) throw new ftHTMLParserError('An id has already been assigned to this element', t);
                attrs.get('id').add(t.value);
            }
            else if (t.type == TT.VARIABLE) attrs.get('misc').add(t.value);
            else {
                if (this.isExpectedType(peek, 'Symbol_=')) {
                    this.consume();
                    peek = this.peek();
                    if (![TT.STRING, TT.WORD, TT.VARIABLE, TT.MACRO].includes(peek.type))
                        // @ts-ignore
                        throw new ftHTMLInvalidTypeError(peek, 'a key value pair');

                    if (peek.type === TT.MACRO)
                        attrs.get('kvps').add(`${t.value}=${this.parseMacro()}`);
                    else
                        attrs.get('kvps').add(`${t.value}=${this.consume().value}`);
                }
                else attrs.get('misc').add(t.value);
            }
        } while (!this.input.eof());

        // @ts-ignore
        throw new ftHTMLIncompleteElementError(t, 'opening and closing braces');
    }

    private initElementWithAttrs(token: token): ftHTMLElement[] {
        const t = this.consume();
        // @ts-ignore
        if (this.input.eof()) throw new ftHTMLIncompleteElementError(t, 'opening and closing braces');

        const attrs = this.parseAttributes();
        const _token = Token(token, [], attrs);

        if (this.isEOF() || SELF_CLOSING_TAGS.includes(token.value))
            return [_token];

        const peek = this.peek();
        if (this.isExpectedType(peek, 'Symbol_{')) {
            const children = this.initElementWithChildren(token, attrs);
            const brace = children.children.shift();
            const endBrace = children.children.pop();
            return [children, brace, endBrace];
        }
        else if (this.isExpectedType(peek, TT.STRING)) {
            _token.children = [TString(this.consume())]
            return [_token];
        }
        else if (this.isExpectedType(peek, TT.VARIABLE)) {
            _token.children = [TVariable(this.consume())]
            return [_token];
        }
        else if (this.isExpectedType(peek, TT.FUNCTION)) {
            _token.children = [this.parseFunction()]
            return [_token];
        }
        else if (this.isExpectedType(peek, TT.MACRO)) {
            this.parseMacro();
            _token.children = [TConstant(peek)];
            return [_token];
        }
        else return [_token];

    }

    private initElementWithChildren(token: token, attrs?: Map<String, Set<String>>): ftHTMLElement {
        const sym = Token(this.consume());
        let endSym = null;
        let _token = Token(token, this.parseWhileType([TT.WORD, TT.ELANG, TT.PRAGMA, TT.STRING, TT.KEYWORD, TT.VARIABLE, TT.FUNCTION, TT.MACRO,
        TT.COMMENT,
        TT.COMMENTB], 'Symbol_}', (tokens: ftHTMLElement[], error: boolean) => {
            // @ts-ignore
            if (error) throw new ftHTMLInvalidTypeError(sym, 'Symbol_}');
            endSym = Token(this.consume());
            return tokens;
        }), attrs, true);

        _token.children.unshift(sym);
        _token.children.push(endSym);
        return _token;
    }

    private isExpectedType(actual: token, expected: TT | string): boolean {
        // NOTE [02-Jan-2020]: assumes eof is irrelevant
        return actual && (actual.type === expected || `${actual.type}_${actual.value}` === expected);
    }

    private isOneOfExpectedTypes(actual: token, expected: (TT | string)[]): boolean {
        return actual && (expected.includes(actual.type) || expected.includes(`${actual.type}_${actual.value}`));
    }

    private peek(): Tokenable {
        return this.input.peek();
    }
    private consume(): Tokenable {
        return this.input.next();
    }
    private isEOF(): boolean {
        return this.input.eof();
    }
}