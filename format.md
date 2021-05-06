# Formatting

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

  - `newLineAfterLoop`: `boolean`

    Force a new line after a control flow loop

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
