import { MarkdownString } from "vscode";

export interface fthtmlmacro {
    documentation: string | MarkdownString,
    isJavaScriptInsertable: boolean
}

const macros: { [key: string]: fthtmlmacro } = {
    DATE: {
        documentation: new MarkdownString(`Return a UTC date in dd Month YYYY format

Example:

\`\`\`
__DATE__ //10 Nov 2020
\`\`\`

\`\`\`
__JS_DATE__
\`\`\`

\`\`\`html
<script>(function() {

    const [day, date, month, year, ..._] = new Date().toUTCString().split(' ');
    document.write(\`\${ date } \${ month } \${ year }\`);

})();</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    DATETIME: {
        documentation: new MarkdownString(`Return a UTC date with 24h time in dd Month YYYY HH:mm:ss format

Example:

\`\`\`
__DATETIME__ //10 Nov 2020 00:00:00
\`\`\`

\`\`\`
__JS_DATETIME__
\`\`\`

\`\`\`html
<script>(function() {

    const [day, date, month, year, time] = new Date().toUTCString().split(' ');
    document.write(\`\${ date } \${ month } \${ year } \${ time }\`);

})();</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    ISO_DATE: {
        documentation: new MarkdownString(`Return an ISO date value

Example:

\`\`\`
__ISO_DATE__ //2021-02-13T22:56:51.826Z
\`\`\`

\`\`\`
__JS_ISO_DATE__
\`\`\`

\`\`\`html
<script>document.write(new Date().toISOString());</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    LOCAL_DATE: {
        documentation: new MarkdownString(`Return a users local date in dd Month YYYY format

Example:

\`\`\`
__LOCAL_DATE__ //10 Nov 2020
\`\`\`

\`\`\`
__JS_LOCAL_DATE__
\`\`\`

\`\`\`html
<script>(function() {

    const [day, month, date, year] = new Date().toDateString().split(' ');
    document.write(\`\${ date } \${ month } \${ year }\`);

})();</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    LOCAL_DATETIME: {
        documentation: new MarkdownString(`Return a users local date with 24hr time in dd Month YYYY HH:mm:ss format

Example:

\`\`\`
__LOCAL_DATETIME__ //10 Nov 2020 00:00:00
\`\`\`

\`\`\`
__JS_LOCAL_DATETIME__
\`\`\`

\`\`\`html
<script>(function() {

    const [day, month, date, year, time] = new Date().toString().split(' ');
    document.write(\`\${ date } \${ month } \${ year } \${ time }\`);

})();</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    NOW: {
        documentation: new MarkdownString(`Return number of millesconds since Unix Epoch of user

Example:

\`\`\`
__NOW__ //1613257805987
\`\`\`

\`\`\`
__JS_NOW__
\`\`\`

\`\`\`html
<script>document.write(new Date().getTime());</script>
\`\`\``),
        isJavaScriptInsertable: true
    },
    UUID: {
        documentation: new MarkdownString(`Return a crpytographically well-built psuedo-random data of 16 bytes using nodejs [crypto#randomBytes](https://nodejs.org/api/crypto.html#crypto_crypto_randombytes_size_callback)

Example:

\`\`\`
__UUID__ //ffe4c5e88bc7fd4ee84cd8570a5c5576
\`\`\``),
        isJavaScriptInsertable: false
    },
    JS_AGENT: {
        documentation: new MarkdownString(`Return the user agent of client

Example:
\`\`\`
__JS_AGENT__
\`\`\`

\`\`\`html
<script>document.write(window.navigator.userAgent);</script>
\`\`\``),
        isJavaScriptInsertable: false
    },
    JS_URI: {
        documentation: new MarkdownString(`Return entire uri of client

*@return* - \`<script>document.write(window.location.href);</script>\`

Example: (The bold portion of the uri is the portion returned)

**https**://**www**.**example**.**com**/**video**/**12345-67890**/**?autoplay=true**#**target**`),
        isJavaScriptInsertable: false
    },
    JS_URI_HASH: {
        documentation: new MarkdownString(`Return uri hash of client

*@return* - \`<script>document.write(window.location.href);</script>\`

Example: (The bold portion of the uri is the portion returned)

*https*://*www*.*example*.*com*/*video*/*12345-67890*/?autoplay=true **#target**`),
        isJavaScriptInsertable: false
    },
    JS_URI_HOSTNAME: {
        documentation: new MarkdownString(`Return the hostname portion of the uri

*@return* - \`<script>document.write(window.location.hostname);</script>\`

Example: (The bold portion of the uri is the portion returned)

*https*://**www**.**example**.**com**/*video/12345-67890/?autoplay=true#target*`),
        isJavaScriptInsertable: false
    },
    JS_URI_HOST: {
        documentation: new MarkdownString(`Return the host portion of the uri

*@return* - \`<script>document.write(window.location.host);</script>\`

Example: (The bold portion of the uri is the portion returned)

*https*://**www**.**example**.**com**/*video/12345-67890/?autoplay=true#target*`),
        isJavaScriptInsertable: false
    },
    JS_URI_PORT: {
        documentation: new MarkdownString(`Return the port number of the uri

*@return* - \`<script>document.write(window.location.port);</script>\``),
        isJavaScriptInsertable: false
    },
    JS_URI_PATH: {
        documentation: new MarkdownString(`Return the context path of the uri

*@return* - \`<script>document.write(window.location.pathname);</script>\`

Example: (The bold portion of the uri is the portion returned)

*https*://*www*.*example*.*com*/**video/12345-67890**/*?autoplay=true#target*`),
        isJavaScriptInsertable: false
    },
    JS_URI_PROTOCOL: {
        documentation: new MarkdownString(`Return the protocol portion of the uri

*@return* - \`<script>document.write(window.location.protocol);</script>\`

Example: (The bold portion of the uri is the portion returned)

**https:**//*www*.*example*.*com*/*video/12345-67890/?autoplay=true#target*`),
        isJavaScriptInsertable: false
    },
    JS_URI_SEARCH: {
        documentation: new MarkdownString(`Return the search portion of the uri

*@return* - \`<script>document.write(window.location.search);</script>\`

Example: (The bold portion of the uri is the portion returned)

*https:*//*www*.*example*.*com*/*video/12345-67890/**?autoplay=true**#*target*`),
        isJavaScriptInsertable: false
    }
}

export default macros;