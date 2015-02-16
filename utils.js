exports.isFloat = function(n) {
  return (typeof n == "number") &&
         (n === +n && n !== (n|0));
};

exports.isInt = function(n) {
  return (typeof n == "number") &&
         !(n === +n && n !== (n|0));
};

exports.isBool = function(n) {
  return typeof n == "boolean";
};

// Give two types, find the 'maximum' type
exports.maxType = function(a,b) {
  var typeOrder = ["bool","int","JsVar" ];
  var ai = typeOrder.indexOf(a);  
  var bi = typeOrder.indexOf(b);
  if (ai<0 || bi<0) return undefined;
  return typeOrder[Math.max(ai,bi)];
};

exports.getMathsOpOperator = function(op) {
  if (op.length==1) return "'"+op+"'";
  if (op=="==") return 261; // LEX_EQUAL - see jsutils.h
  if (op=="===") return 262; // LEX_TYPEEQUALL - see jsutils.h
  if (op=="!=") return 263; // LEX_NEQUAL - see jsutils.h
  if (op=="!==") return 264; // LEX_NTYPEEQUALL - see jsutils.h  
  throw new Error("Unknown op '"+op+"'");
};

exports.getFunctionDecls = function(exports) {
  var code = "class JsVar;\n";
 
  var funcDecls = {
  "jsvLockAgainSafe" : "JsVar *(*jsvLockAgainSafe)(JsVar *v) = (JsVar *(*)(JsVar *))",
  "jsvUnLock" : "void (*jsvUnLock)(JsVar *v) = (void(*)(JsVar *))",
  "jsvNewFromString" : "JsVar *(*jsvNewFromString)(const char *s) = (JsVar *(*)(const char *))",
  "jsvNewFromInteger" : "JsVar *(*jsvNewFromInteger)(int i) = (JsVar *(*)(int))",
  "jsvNewFromFloat" : "JsVar *(*jsvNewFromFloat)(double d) = (JsVar *(*)(double))",
  "jsvMathsOp" : "JsVar *(*jsvMathsOp)(JsVar *a, JsVar *b, int op) = (JsVar *(*)(JsVar *,JsVar*,int))",
  "jsvSkipName" : "JsVar *(*jsvSkipName)(JsVar *a) = (JsVar *(*)(JsVar *))",
  "jspGetNamedVariable" : "JsVar *(*jspGetNamedVariable)(const char *n) = (JsVar *(*)(const char *))",
  "jspGetNamedField" : "JsVar *(*jspGetNamedField)(JsVar *o, const char *n, bool returnName) = (JsVar *(*)(JsVar *,const char *, bool))",
  "jsvGetBool" : "bool (*jsvGetBool)(JsVar *v) = (bool(*)(JsVar *))",
  "jsvGetInteger" : "int (*jsvGetInteger)(JsVar *v) = (int(*)(JsVar *))",
  "jspReplaceWith" : "void (*jspReplaceWith)(JsVar *a, JsVar *b) = (void(*)(JsVar *, JsVar *))",
  "jspeFunctionCall" : "JsVar *(*jspeFunctionCall)(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) = (JsVar *(*)(JsVar *, JsVar *, JsVar *, bool, int, JsVar **))",
  };
  
  for (var f in funcDecls) {
    if (!f in exports) throw new Error("Function '"+f+"' not found in exports list!");
    //var addr = baseAddr + idx*4;  addr = "*(unsigned int*)"+addr;
    var addr = exports[f];
    code += funcDecls[f]+addr+";\n";
  }
  return code;
};