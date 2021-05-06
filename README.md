# ftHTML

This extensions provides language support for [ftHTML preprocesser](https://fthtml.com)

Support includes, but not limited to:

* [Icon Theme](#icon-theme)
* [Convert HTML On Paste](#convert-html-on-paste)
* [Formatting](#formatting)
* [Syntax Validation](#syntax-validation)
* [Code Actions](#code-actions)
* [Snippets](#snippets)
* [Go To Definitions](#go-to-definitions)
* [Documentation](#documentation)
* [Symbol Support](#symbol-support)
* [Document Linking](#document-linking)
* [Exporting](#exporting)

## Icon Theme
[[top]](#fthtml)

An icon does not show up in the solution explorer treeview for any `.fthtml` files because its not a natively recognized language extension yet. If you would like to enable a file icon for .ftHTML files and are already using the Seti theme (that's enabled by default when using visual studio code), I extended the vs-seti-icon theme. I didn't change anything but add an icon for `.fthtml` files.

To enable this type this in your command palette:

> \>Preferences: File Icon Theme

And select *Seti (Visual Studio Code & ftHTML)*

## Formatting
[[top]](#fthtml)

To review the comprehensive formatting configurations please [see here](./format.md)

## Syntax Validation
[[top]](#fthtml)

Your fthtml markup is validated on every save or everytime you open an `.fthtml` file or make changes. This is to not be confused with a linter. The difference is this will stop validating on the first error found and report it to the 'Problems' Panel. The important thing to address here is this does not also validate imported files/templates when expressed in the syntax

## Code Actions
[[top]](#fthtml)

* Quickly convert a 'simple' element to a parent element.
The following examples will all match as eligible for this code action

```fthtml
div <string | macro>

div (...atrs) <string | macro>
```

## Snippets
[[top]](#fthtml)

In addition to snippets this extension supports all language specific macros, functions, keywords and embedded code block code completions, the following snippets can be used to quickly insert text:

* `vars` - Produces a vars directive environment for defining variables (includes closing)
* `html` - Produces a complete HTML5 equivalent template
* `comment` - comment "$"
* `doctype` - doctype "$" (only works on the first line of a document)
* `import` - import "$"
* `template` - Produces a template block for binding property values to an import statement
* `child` - Produces a snippet for an element with children
* `childWithAttributes` - Produces a snippet for an element with attributes and children

## Go To Definitions
[[top]](#fthtml)

Quickly peek or go to definitions for import files, template files or user defined variables.

For variables, global vars defined in the `fthtmlconfig.json` file are also included

## Documentation
[[top]](#fthtml)

All language specific functions, macros and keywords are documented for on-hover events and shortcut previews. For functions, all arguments are documented as well and can be seen using the parameter hints functionality

## Symbol Support
[[top]](#fthtml)

Symbols are identified for imports and user defined variables

## Document Linking
[[top]](#fthtml)

Document linking is natively supported now. The important thing to note here is that it honors relative paths, paths respective of your fthtmlconfig `importDir` setting, or by reference paths.

![document link example](.github/images/document-link.png)

## Convert HTML on paste
[[top]](#fthtml)

Now when you paste anything into an ftHTML document, it will try and detect if it's HTML or not. If it is HTML it will automatically be converted to ftHTML and formatted according to your personal format settings, otherwise it will be pasted as-is. You can use `ctrl+shift+p` at anytime to paste without converting.

To specify the quotation style for conversions you can use: `fthtml.format.onPasteHTML.quotationMark`

If you copy the below HTML
```
<nav>
    <a href="https://google.com">Google</a>
    <a href="https://www.yahoo.com">Yahoo!</a>
    <a href="https://www.bing.com">Bing</a>
</nav>
```
And paste it into an ftHTML file, it will automatically be converted to ftHTML syntax:
```
nav
{
    a (href='https://google.com') 'Google'
    a (href='https://www.yahoo.com') 'Yahoo!'
    a (href='https://www.bing.com') 'Bing'
}
```

You can use `ctrl+shift+v` at any time to paste without formatting

## Exporting
[[top]](#fthtml)

Easily export all ftHTML file in your workspace to HTML on save

**Enjoy!**
