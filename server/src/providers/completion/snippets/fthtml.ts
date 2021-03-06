const fthtml_snippets = {
    "Pragma - Variable": {
        "prefix": "vars",
        "body": [
            "#vars",
            "\t${1:varName} \"${2:value}\"$3",
            "#end",
            "$0"
        ],
        "description": "Vars Pragma for defining variables"
    },
    "Pragma - TinyTemplates": {
        "prefix": "tinytemplates",
        "body": [
            "#tinytemplates",
            "\t${1:tinyTemplateName} \"${2:value} \\${val}\"$3",
            "#end",
            "$0"
        ],
        "description": "Tiny Templates Pragma for defining tiny templates"
    },
    "HTML template": {
        "prefix": "html",
        "body": [
            "doctype \"html\"",
            "html (lang=en)",
            "{",
            "\thead",
            "\t{",
            "\t\tmeta(charset=utf-8)",
            "\t\tmeta(http-equiv=X-UA-Compatible content=\"IE=edge\")",
            "\t\tmeta(name=viewport content=\"width=device-width, initial-scale=1\")",
            "\t\ttitle \"${1:Page Title}\"",
            "\t\tlink(rel=stylesheet type=\"text/css\" media=screen href=${2:main.css})",
            "\t\t${3:script(src=${4:main.js})}",
            "\t}",
            "\tbody",
            "\t{",
            "\t\t$0",
            "\t}",
            "}"
        ],
        "description": "HTML5 template starting point"
    },
    "json block": {
        "prefix": "json-block",
        "body": [
            "#vars",
            "\t${1:varName} json(\"${2:fileName}\")",
            "#end",
            "$0"
        ],
        "description": "includes the vars pragma"
    }
}

export default fthtml_snippets;