# ftHTML

This extensions provides language support for [ftHTML preprocesser](https://www.npmjs.com/package/fthtml)

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
The following configurations are provided to the end user to customize their personal code formatting style:

All are using the prefix `fthtml.format.`
- `enabled`: `boolean`
- `collapseSingleChildElements`: `boolean`

  This will collapse any elements that only have 1 child

  For example:

  ```
  li {
    a (href=main.html target=_blank) "Home"
  }
  ```

  Becomes when enabled:

  ```
  li { a (href=main.html target=_blank) "Home" }
  ```

- `collapseSingleChildElementsIfLineLengthLessThan`: `integer`

  Specify the maximum number of characters a line can contain to be eligible for collapsing

- `skipTagNamesForCollapsing`: `string[]`

  Specify which tags will be omitted from collapsing regardless of other settings.

  Default is `["pre", "code"]`

- `alignVariableOrPropertyBindingValues`: `boolean`

  This property aligns the values of variable declarations and import property binding.

  For example:

  ```
  #vars
    author "David Freer"
    foo "bar"
    githubLink "https://github.com/soulshined"
  #end
  ```

  Becomes when enabled:

  ```
  #vars
    author     "David Freer"
    foo        "bar"
    githubLink "https://github.com/soulshined"
  #end
  ```

  Same for import property binding


- `newLineBeforeComments`: `boolean`

  Force a new line before comments

- `newLineBeforeFirstChildElement`: `boolean`

  Force a new line on the first child of a parent element

  For example:

  ```
  div
  {
    div(#child1) "a"
    div(#child2) "b"
    div(#child3) "c"
  }
  ```

  Becomes when enabled:

  ```
  div
  {

    div(#child1) "a"
    div(#child2) "b"
    div(#child3) "c"
  }
  ```

- `newLineAfterLastChildElement`: `boolean`


  Force a new line after the last child of a parent element

  For example:

  ```
  div
  {
    div(#child1) "a"
    div(#child2) "b"
    div(#child3) "c"
  }
  ```

  Becomes when enabled:

  ```
  div
  {
    div(#child1) "a"
    div(#child2) "b"
    div(#child3) "c"

  }
  ```

- `newLineBeforeAfterChildElementMinimumDepth`

  Specifies the minimum child depth before new lines are forced before first and after last child element.

  For example, if the minimum depth was 2:

  ```
  html
  {
    body
    {

      h1 "Hello World"
      p "Foo bar"

    }
    footer
    {

      @sitelink

    }
  }
  ```

- `newLineBeforeAfterChildElementMaximumDepth`

  Specifies the maximum child depth before new lines are forced before first and after last child element.

  For example, if the minimum depth was 1 and the maximum is 1:

  ```
  html
  {

    body
    {
      h1 "Hello World"
      p "Foo bar"
    }
    footer
    {
      @sitelink
    }

  }
  ```

- `braces`

  - `newLineAfterElement`: `boolean`

    Add a new line after an element

    ```
    div
    {

    }
    ```

  - `newLineAfterAttributes`: `boolean`

    Add a new line after an element with attributes

    ```
    div (#myId .class1 .class2)
    {

    }
    ```

  - `newLineAfterEmbeddedLangs`: `boolean`

    ```
    js
    {
      const myVar = "foobar";
      console.log(myVar);
    }
    ```

  - `newLineAfterImport`: `boolean`

    Add a new line after an import statement

    ```
    import "somefile"
    {
      prop1 "some val"
      prop2 "some val"
    }
    ```

  - `newLineAfterVariableOrPropertyBinding`: `boolean`

    Add a new line after a variable fthtml block or an import property binding fthtml block value

    ```
    import "somefile"
    {
      prop1 "some val"
      prop2 "some val"
      prop3
      {
        a (href=example.com target=_blank) "foobar"
      }
    }
    ```

  <br>

  - `addIdentifierCommentAfterClosingBrace`: `boolean`

    Automatically add a line comment after the closing brace. This dynamically generates depending on the attributes provided

    ```
    div (#overlay)
    {
      ......
    } // end of div#overlay
    ```

    Note: This does not regenerate if attributes change

  - `minimumNumberOfLinesToAddIdentifierComment`: `integer`

    Specifies how many number of lines must be between the braces of a parent element before adding the identifier comment

    For example, if the minimum number of lines is 4:

    ```
    div {
      h1 "Hello World"
    }

    div (#myDiv)
    {
      h1 "Hello World"
      p "Foo bar"
      p "Foo"
      p "Bar"
      p "Baz"
    } // end of div#myDiv
    ```

  - `skipTagNamesForCommentAfterClosingBrace`: `string[]`

    Specifies which elements to skip for adding an identifier comment, regardless of other settings

    Default is mostly all of the inline elements

- `attributes`
  - `addSpaceBeforeAttributeParenthesis`: `boolean`

    Force a space after an element before attributes:

    ```
    div (#myDiv)
    ```

  - `padAttributesWithSpace`: `boolean`

    Pad attributes with spaces:

    ```
    div( #myDiv )
    ```

  - `order`: `enum`

    Specifies the order of attributes. Default : `"id, class, kvp, misc"`

    This means attributes will re-arrange to the specified order if they are not already in that order

  - `sorted`: `boolean`

    Alphabetically sort attribute groups (meaning classes are sorted by classes and key-value pairs are sorted accordingly to similar kvps)

    ```
    div (#myDiv .fooClass .barClass src=example.com data-tag=foobar)
    ```

    Becomes, when enabled:

    ```
    div (#myDiv .barClass .fooClass data-tag=foobar src=example.com)
    ```

  - `wrapOrderedAttributes`: `boolean`

    Force attributes to wrap to new lines according to their grouping


    ```
    div (#myDiv .fooClass .barClass src=example.com data-tag=foobar)
    ```

    Becomes, when enabled

    ```
    div (#myDiv
         .fooClass .barClass
         src=example.com data-tag=foobar)
    ```

  - `minimumNumberOfAttributesForWrapping`: 6

    Specifies the minimum number of attributes needed before forcing them to wrap

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
