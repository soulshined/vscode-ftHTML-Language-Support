export interface fthtmlfunc {
    documentation: string,
    returnType: string,
    parameters: {
        name: string,
        isOptional: boolean,
        datatype: string[],
        isRestParameter?: boolean,
        documentation?: string
    }[]
}

export const misc_methods: { [key: string]: fthtmlfunc } = {

    comment: {
        documentation: `This keyword is used to ensure given text is displayed in the DOM with the HTML \`<!-- >\` syntax`,
        returnType: 'void',
        parameters: []
    },


    import: {
        documentation: `Imports another ftHTML file and parses it inline at import position.

Supports relative paths only unless an \`fthtmlconfig.json\` file is provided and the \`importDir\` property is set. All import files must be of type 'ftHTML' with the extension omitted:

Example - To import a file named \`header.fthtml\`:

\`\`\`fthtml
import "header"
\`\`\``,
        returnType: 'HTML',
        parameters: []
    },

    template: {
        documentation: `Create a template block where you can import a file while binding values to the import via the properties set in the import file.

Supports relative paths only unless an \`fthtmlconfig.json\` file is provided and the \`importDir\` property is set. All import files must be of type 'ftHTML' and the extension omitted

Example:

\`head.fthtml\`
\`\`\`fthtml
head {
    title "\${ myTitle }"
}
\`\`\`

\`index.fthtml\`
\`\`\`fthtml
html {
    import "head" {
        myTitle "Main Index.html Page"
    }

    body {
        h1 "Hello World"
    }
}
\`\`\``,
        returnType: "HTML",
        parameters: [
            {
                name: "file",
                isOptional: false,
                datatype: ["String"],
                documentation: `A filename should exclude the \`.fthtml\` extension.

If an \`fthtmlconfig.json\` file is being used to set the \`importDir\`, you can explicitly force a relative path by prepending the filename with the 'by reference' symbol \`&\``
            }
        ]
    }
}

const functions: { [key: string]: fthtmlfunc } = {

    addslashes: {
        documentation: `Returns a string with backslashes added before characters that need to be escaped. These characters are:

- single quote (')
- double quote (")
- backslash (\)

Example:

\`\`\`
addslashes("Foo bar isn't bazz")
//Foo bar isn\'t bazz
\`\`\`
`,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            }
        ]
    },
    choose: {
        documentation: `Choose a random item from a given list of items. The number of items you can provide is not restricted.

*This is randomly generated each time the file is rendered*

Examples:

\`\`\`fthtml
div choose(foo bar 123)
//<div>bar</div>
\`\`\`

\`\`\`fthtml
div choose(foo __UUID__ random(1 10))
//<div>5</div>
\`\`\``,
        returnType: 'any',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                isRestParameter: true,
                datatype: ["String", "Variable", "Word", "Function", "Macro"],
                documentation: "Unrestricted quantity of choices. 'Word' datatype implies you can use unquoted values"
            }
        ]
    },
    html_encode: {
        documentation: `Convert applicable characters to HTML entities

Example:

\`\`\`fthtml
pre {
  code html_encode("<div>foo</div>")
}
// <pre><code>&#x3C;div&#x3E;foo&#x3C;/div&#x3E;</code></pre>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function"]
            }
        ]
    },
    html_decode: {
        documentation: `Convert applicable HTML entities to human readable symbols

Example:

\`\`\`fthtml
pre {
  code html_decode("&#x3C;div&#x3E;foo&#x3C;/div&#x3E;")
}
// <pre><code><div>foo</div></code></pre>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function"]
            }
        ]
    },
    join: {
        documentation: `Return a joined iterable object by a given delimiter. You must only pass variables as the value argument. Throws if the object in the variable is not an array or object. When an object is provided, the keys will be joined

Examples:

\`\`\`fthtml
#vars
   date str_split("01 01 1999" " ")
#end

join(@date "/")
//01/01/1999
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: "value",
                isOptional: false,
                datatype: ["Variable"]
            },
            {
                name: "delimiter",
                isOptional: true,
                datatype: ["String", "Variable"],
                documentation: `Defaults to a comma delimiter: ','`
            }
        ]
    },
    json: {
        documentation: `Imports a json file and parses it into an object that can be referenced using dot notation.

Supports relative paths only unless an \`fthtmlconfig.json\` file is provided and the \`jsonDir\` property is set. All json files must be of type 'json' with the extension omitted:

- json files can only be called and assigned to a variable, via the vars pragma, and only by using the 'json' keyword
- Imports will always assume and try to parse the file given, therefore an import files syntax should only be json syntax.
- All import statements must exclude the '.json' extension name
- Filenames can not be remote url links
- You can only reference a variable holding a json object using [string interpolation](https://www.fthtml.com/documentation/#language-string-interpolation)

Example - To import a file named \`foo.json\`:

\`\`\`fthtml
myJson json("foo")
\`\`\`

[documentation](https://www.fthtml.com/documentation#language-json)`,
        returnType: 'json',
        parameters: [
            {
                name: 'file',
                isOptional: false,
                datatype: ["String"],
                documentation: `A filename should exclude the \`.json\` extension.

If an \`fthtmlconfig.json\` file is being used to set the \`jsonDir\`, you can explicitly force a relative path by prepending the filename with the 'by reference' symbol \`&\``
            }
        ]
    },
    len: {
        documentation: `Returns the length of a given string, object or array dynamically.

When passing a variable as the value argument:
- If the variable holds an array, the number of elements in the array will be returned
- If the variable holds an object, the number of __keys__ in the object will be returned

Otherwise, the length of the value will be returned via it's 'toString()' method

Examples:
\`\`\`fthtml
#vars
  cars json("foo")

  bmws json("\${ @cars.bmw.models }") //get only the bmws of the cars json file

  m3Values json("\${ @bmws.m3 | values }")
#end

len(@bmws)
//returns the number of keys in the object

len(@m3Values)
//only the values of the m3 model

len(str_split("01/01/1999" "/"))
//10 because it's split into an array of: [01, 01, 1999] but not assigned to a variable, so it uses the arrays toString() method

#vars
  date str_split("01/01/1999" "/")
#end

len(@date)
//3 because it's assigned to a variable therefore the raw type is maintained (an array)
\`\`\``,
        returnType: 'int',
        parameters: [
            {
                name: "value",
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Word"]
            }
        ]
    },
    random: {
        documentation: `Generate a random number between a min and max value (inclusive). The value returned will always be resolved to an integer.

All datatypes used for min/max values must resolve to a number. For example, when using a variable for *min*, the value of the variable should be of number datatype.

Negative values are permitted.

*This is randomly generated each time the file is rendered*

Examples:

\`\`\`fthtml
div random(1 10)
//<div>5</div>
\`\`\`

\`\`\`fthtml
div random(-10 -5)
//<div>-8</div>
\`\`\`

\`\`\`fthtml
div random(-10 10)
//<div>-6</div>
\`\`\``,
        returnType: 'int',
        parameters: [
            {
                name: 'min',
                isOptional: false,
                datatype: ["String", "Variable", "Word", "Function"],
                documentation: `Min can not be greater than max.

'Word' datatype implies you can use unquoted values.

Negative values are permitted.`
            },
            {
                name: 'max',
                isOptional: false,
                datatype: ["String", "Variable", "Word", "Function"],
                documentation: `Max can not be less than min.

'Word' datatype implies you can use unquoted strings.

Negative values are permitted.`
            }
        ]
    },
    replace: {
        documentation: `Replace a pattern of values with a given replacement value.

Requires to escape characters per usual literal regex rules. For example whitespace only requires \`\s\`

Pattern uses regular javascript flavor rules.

Example:

\`\`\`fthtml
div replace("Telephone: 515.987.6543" "\." "-")
//<div>Telephone: 515-987-6543</div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: 'pattern',
                isOptional: false,
                datatype: ["String"],
                documentation: `Requires to escape characters per usual literal regex rules. For example whitespace only requires \`\s\`

Pattern uses regular javascript flavor rules.`,

            },
            {
                name: 'replace value',
                isOptional: false,
                datatype: ["String", "Variable", "Function"]
            }
        ]
    },
    str_split: {
        documentation: `Split a resolved string by a given delimeter

Example:

\`\`\`fthtml
#vars
   date str_split("01 01 1999" " ")
#end

div join(@date "/")
//<div>01/01/1999</div>
\`\`\``,
        returnType: 'object[]',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: 'delimiter',
                isOptional: false,
                datatype: ["String", "Variable"]
            }
        ]
    },
    str_repeat: {
        documentation: `Repeat a string or value a given number of times

Example:

\`\`\`fthtml
div str_repeat("Hello. World. " 1)
//<div>Hello. World. Hello. World. </div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: 'quantity',
                isOptional: false,
                datatype: ["String", "Word"],
                documentation: "'Word' datatype implies you can use unquoted values. Values must resolve to an integer. For example, when using a variable for *quantity*, the value of the variable should be of int datatype."
            }
        ]
    },
    str_reverse: {
        documentation: `Reverse a string

Example:

\`\`\`fthtml
div str_reverse("Hello. World.")
//<div>.dlroW .olleH</div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            }
        ]
    },
    str_format: {
        documentation: `Format a number to currency, units, percents etc, or a date.

This uses the javascript \`Intl.FormatNumber\` module for numbers:

See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat

This uses the javascript \`Intl.DateTimeFormat\` module for dates:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat

Examples:

\`\`\`fthtml
div str_format("12345.0" "currency")
//<div>$12,345.00</div>
\`\`\`
<br>
\`\`\`fthtml
div str_format("12345.0" "currency" "currency: JPY, maximumSignificantDigits: 3")
//<div>¥12,000</div>
\`\`\`
<br>

\`\`\`fthtml
div str_format("123.0" "unit" "unit: mile-per-hour")
//<div>123 mph</div>
\`\`\`
<br>

\`\`\`fthtml
div str_format("March 19 2000" "date" "dateStyle: full, timeStyle: long")
//<div>Sunday, March 19, 2000 at 12:00:00 AM PST</div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function"],
                documentation: `Value must resolve to a number of any kind`
            },
            {
                name: 'style',
                isOptional: false,
                datatype: ["enum => 'currency', 'number', 'unit', 'percent', 'date', 'decimal'"]
            },
            {
                name: 'options',
                isOptional: true,
                datatype: ["String"],
                documentation: `[Optional]

A comma delimited string of key/value pairs of \`(Intl.FormatNumber)[] options\`

See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/resolvedOptions.

or \`Intl.DateTimeFormat options\` for 'date' formatting see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat.

Example:

"unit: megabyte, maximumSignificantDigits: 2"`
            }
        ]
    },
    substring: {
        documentation: `Return a substring from a given start and end index

Indices are 1 based

Negative values are permitted

Examples:

\`\`\`fthtml
div substring("Hello. World" 7)
//<div>World</div>
div substring("Hello. World" -5)
//<div>World</div>
div substring("Hello. World" -5 -3)
//<div>Wo</div>
div substring("Hello. World" 3 -3)
//<div>lo. Wo</div>
\`\`\`
`,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: "start",
                isOptional: false,
                datatype: ["String", "Variable", "Word"],
                documentation: `Index is 1 based

Negative values are permitted.

'Word' datatype implies you can use unquoted values.

Value must resolve to a valid integer`
            },
            {
                name: "end",
                isOptional: true,
                datatype: ["String", "Variable", "Word"],
                documentation: `[Optional]

Index is 1 based

Negative values are permitted.

'Word' datatype implies you can use unquoted values.

Value must resolve to a valid integer`
            }
        ]
    },
    tcase: {
        documentation: `Transform a given value to a specificed text case.

**Note:** This does not convert cases, only transforms

Examples:

\`\`\`fthtml
div tcase("Hello. World" "upper")
//<div>HELLO. WORLD</div>
div tcase("Hello. World" "lower")
//<div>hello. world</div>
div tcase("Hello. World" "alternating")
//<div>HeLlO. wOrLd</div>
div tcase("hello. world" "title")
//<div>Hello. World</div>
div tcase("Hello. World" "snake")
//<div>Hello_World</div>
div tcase("Hello. World" "kebab")
//<div>Hello-World</div>
div tcase("Hello. World" "camel")
//<div>hello.World</div>
div tcase("Hello. World" "pascal")
//<div>Hello.World</div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: "text case",
                isOptional: false,
                datatype: ["enum => 'capitalization' | 'upper' | 'lower' | 'alternating' | 'title' | 'snake' | 'kebab' | 'camel' | 'pascal"],

            }
        ]
    },
    trim: {
        documentation: `Trim whitespace dictated by a specific style

Examples:

\`\`\`fthtml
div trim("   Hello. World.   ")
//<div>Hello. World.</div>
div trim("   Hello. World.   " "left")
//<div>Hello. World.   </div>
div trim("   Hello. World.   " "right")
//<div>   Hello. World.</div>
div trim("   Hello. World.   " "end")
//<div>   Hello. World.</div>
div trim("   Hello. World.   " "start")
//<div>Hello. World.   </div>
\`\`\``,
        returnType: 'string',
        parameters: [
            {
                name: 'value',
                isOptional: false,
                datatype: ["String", "Variable", "Function", "Macro"]
            },
            {
                name: 'trim style',
                isOptional: true,
                datatype: ["enum => 'left', 'right', 'start', 'end', 'trim' = 'trim'"]
            }
        ]
    }
}


export function paramsToString(params: any): string {
    let result: string[] = [];
    params.forEach((param: any) => {
        const name = `${param.isRestParameter ? '...' : ''}${param.name}`;
        const optional = param.isOptional ? '?' : '';
        const types = param.datatype.map((type: any) => param.isRestParameter ? `${type}[]` : type).join(' | ')
        result.push(`${name}${optional}: ${types}`)
    })

    return result.join(", ");
}

export function getFunctionConstructor(funcName: string): string {
    const func = functions[funcName];

    if ("import" === funcName) {
        return `${funcName} <file : String>`;
    }
    else if ("template" === funcName) {
        return `${funcName} <file : String> { [property] : String, Variable, Function, Macro, ftHTMLBlock }`;
    }
    else if ("comment" === funcName) {
        return `${funcName} <value: String>`;
    }
    else {
        return `${funcName}(${paramsToString(func.parameters)})`;
    }

}

export default functions;