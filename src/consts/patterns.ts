import functions from "./functions";
import macros from "./macros";

const reg_macros = Object.keys(macros).filter(key => !macros[key].isJavaScriptInsertable);
const js_macros = Object.keys(macros).filter(key => macros[key].isJavaScriptInsertable);

export const PATTERNS = {

    FUNCTIONS: `(${Object.keys(functions).join("|")})`,

    MACROS: `__(${reg_macros.join("|")}|((?:JS_)?(?:${js_macros.join("|")})))__`,

    VARIABLE: "@([\\w-]+)",

    IMPORT_LINE: `(^|\\s+)import\\s+((['"])([^\\3]*)\\3)`,

    IMPORT_BLOCK_BEGIN: `(^|\\s+)import\\s+((['"])([^\\3]*)\\3)(\\s+\\{)`,

}