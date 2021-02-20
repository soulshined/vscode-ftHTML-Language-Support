# ftHTML

This extensions provides language support for [ftHTML preprocesser](https://www.npmjs.com/package/fthtml)

Support includes, but not limited to:

* [Configurations](#configurations)
* [UI Themes](#ui-themes)
* [Icon Theme](#icon-theme)
* [Syntax Validation](#syntax-validation)
* [Code Actions](#code-actions)
* [Snippets](#snippets)
* [Go To Definitions](#go-to-definitions)
* [Documentation](#documentation)
* [Symbol Support](#symbol-support)

## Configurations
[[top]](#fthtml)

This extension contributes the following settings (prefix them with `fthtml`):

* `format.braces.newLinesOnEnter`:
  > Specify if you want your braces to go to a new line after pressing 'Enter' directly after curly braces auto-completion (à la C#)

  ![newLinesOnEnter](.github/images/newlines.gif)
* `format.braces.newLinesOnEnterAfterAttributes`:
  > Specify if you want your braces to go to a new line after pressing 'Enter' directly after curly braces auto-complemention when the ftHTML element has an attributes group (à la C#)

  ![newLinesOnEnterWithAttributes](.github/images/newlines2.gif)
* `validateOnSave`:
  > Everytime you save a ftHTML file it will be validated by the ftHTML parser. The first found issue will be reported in the 'Problems' panel for each file validated.

  > Please note this happens any time you open an ftHTML file as well, which can not be disabled at this time.

## Icon Theme
[[top]](#fthtml)

An icon does not show up in the solution explorer treeview for any `.fthtml` files because its not a natively recognized language extension yet. If you would like to enable a file icon for .ftHTML files and are already using the Seti theme (that's enabled by default when using visual studio code), I extended the vs-seti-icon theme. I didn't change anything but add an icon for `.fthtml` files.

To enable this type this in your command palette:

> \>Preferences: File Icon Theme

And select *Seti (Visual Studio Code & ftHTML)*

## Syntax Validation
[[top]](#fthtml)

Your fthtml markup is validated on every save ([configurable](#configurations)) or everytime you open an `.fthtml` file. This is to not be confused with a linter. The difference is this will stop validating on the first error found and report it to the 'Problems' Panel. The import thing to address here is this does not also validate imported files/templates when expressed in the syntax:

```
 div "hello world"

 import "imports/footer"
```

The *"imports/footer"* file's syntax gets omitted when validating

Example output:

![validation example](.github/images/validation.PNG)

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

In addition to snippets this extension supports all language specific macros, functions, keywords and embedded code block code completions.

The following snippets can be used to quickly insert text:

* `vars` - Produces a vars directive environment for defining variables (includes closing)
* `html` - Produces a complete HTML5 equivalent template
* `comment` - comment "$"
* `doctype` - doctype "$"
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

**Enjoy!**
