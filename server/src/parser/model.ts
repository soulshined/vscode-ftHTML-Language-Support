import { DocumentLink, SymbolKind } from "vscode-languageserver";
import { token } from "./token";

export interface ftHTMLElement {
    token: token;
    children: ftHTMLElement[];
    attrs?: Map<String, Set<String>>;
    isParentWithftHTMLBlockBody: boolean;
    symbolKind: SymbolKind;
    link?: DocumentLink
}

export function Token(token: token, children: ftHTMLElement[] = [], attrs?: Map<String, Set<String>>, isParentWithftHTMLBlockBody: boolean = false, symbolKind: SymbolKind = SymbolKind.Null, link?: DocumentLink): ftHTMLElement {
    return {
        token,
        children,
        attrs,
        isParentWithftHTMLBlockBody,
        symbolKind,
        link
    }
}

export function TString(token: token) {
    return Token(token, [], undefined, false, SymbolKind.String);
}

export function TVariable(token: token, children: ftHTMLElement[] = [], isParentWithftHTMLBlockBody: boolean = false) {
    return Token(token, children, undefined, isParentWithftHTMLBlockBody, SymbolKind.Variable);
}

export function TFunction(token: token, children: ftHTMLElement[] = []) {
    return Token(token, children, undefined, false, SymbolKind.Function);
}

export function TConstant(token: token) {
    return Token(token, [], undefined, false, SymbolKind.Constant);
}

export function TProperty(token: token, children: ftHTMLElement[] = [], isParentWithftHTMLBlockBody: boolean = false) {
    return Token(token, children, undefined, isParentWithftHTMLBlockBody, SymbolKind.Property)
}

export function TMethod(token: token, children: ftHTMLElement[] = [], isParentWithftHTMLBlockBody: boolean = false) {
    return Token(token, children, undefined, isParentWithftHTMLBlockBody, SymbolKind.Method);
}

