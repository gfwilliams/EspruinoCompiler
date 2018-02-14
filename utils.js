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
  // see jsutils.h
  if (op=="==") return 138; // LEX_EQUAL
  if (op=="===") return 139; // LEX_TYPEEQUALL
  if (op=="!=") return 140; // LEX_NEQUAL
  if (op=="!==") return 141; // LEX_NTYPEEQUAL
  if (op=="<=") return 142; // LEX_LEQUAL
  if (op=="<<") return 143; // LEX_LSHIFT
  // LEX_LSHIFTEQUAL
  if (op==">=") return 145; //LEX_GEQUAL
  if (op==">>") return 146; // LEX_RSHIFT
  if (op==">>>") return 147; // LEX_RSHIFTUNSIGNED
  // LEX_RSHIFTEQUAL
  // LEX_RSHIFTUNSIGNEDEQUAL
  // LEX_PLUSEQUAL
  // LEX_MINUSEQUAL
  // LEX_PLUSPLUS
  // LEX_MINUSMINUS
  // LEX_MULEQUAL
  // LEX_DIVEQUAL
  // LEX_MODEQUAL
  // LEX_ANDEQUAL
  if (op=="&&") return 158; // LEX_ANDAND
  // LEX_OREQUAL
  if (op=="||") return 160; // LEX_OROR
  // LEX_XOREQUAL
  throw new Error("Unknown op '"+op+"'");
};

exports.getFunctionDecls = function(exports) {
  var code = "class JsVar;\n";
  // the order of these must match jswrap_process.c
  var funcDecls = {
  "jsvLockAgainSafe" : "JsVar *(*jsvLockAgainSafe)(JsVar *v) = (JsVar *(*)(JsVar *))",
  "jsvUnLock" : "void (*jsvUnLock)(JsVar *v) = (void(*)(JsVar *))",
  "jsvSkipName" : "JsVar *(*jsvSkipName)(JsVar *a) = (JsVar *(*)(JsVar *))",
  "jsvMathsOp" : "JsVar *(*jsvMathsOp)(JsVar *a, JsVar *b, int op) = (JsVar *(*)(JsVar *,JsVar*,int))",
  "jsvNewWithFlags" : "JsVar *(*jsvNewWithFlags)(int flags) = (JsVar *(*)(int))",
  "jsvNewFromFloat" : "JsVar *(*jsvNewFromFloat)(double d) = (JsVar *(*)(double))",
  "jsvNewFromInteger" : "JsVar *(*jsvNewFromInteger)(int i) = (JsVar *(*)(int))",
  "jsvNewFromString" : "JsVar *(*jsvNewFromString)(const char *s) = (JsVar *(*)(const char *))",
  "jsvNewFromBool" : "JsVar *(*jsvNewFromBool)(bool b) = (JsVar *(*)(bool))",
  "jsvGetFloat" : "double (*jsvGetFloat)(JsVar *v) = (double(*)(JsVar *))",
  "jsvGetInteger" : "int (*jsvGetInteger)(JsVar *v) = (int(*)(JsVar *))",
  "jsvGetBool" : "bool (*jsvGetBool)(JsVar *v) = (bool(*)(JsVar *))",
  "jspGetNamedVariable" : "JsVar *(*jspGetNamedVariable)(const char *n) = (JsVar *(*)(const char *))",
  "jspGetNamedField" : "JsVar *(*jspGetNamedField)(JsVar *o, const char *n, bool returnName) = (JsVar *(*)(JsVar *,const char *, bool))",
  "jspGetVarNamedField" : "JsVar *(*jspGetVarNamedField)(JsVar *object, JsVar *nameVar, bool returnName) = (JsVar *(*)(JsVar *,JsVar *, bool))",
  "jspReplaceWith" : "void (*jspReplaceWith)(JsVar *a, JsVar *b) = (void(*)(JsVar *, JsVar *))",
  "jspeFunctionCall" : "JsVar *(*jspeFunctionCall)(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) = (JsVar *(*)(JsVar *, JsVar *, JsVar *, bool, int, JsVar **))",
  };

  if ("number"==typeof exports) {
    code += "const void **EXPTR = (const void**)"+exports+";\n";
    // we should probably do this automatically, but lets just write it out
    code += `
JsVar * jsvLockAgainSafe(JsVar *v) {
  return ( (JsVar *(*)(JsVar *))EXPTR[0])(v);
}
void  jsvUnLock(JsVar *v) {
  return ( (void(*)(JsVar *))EXPTR[1])(v);
}
JsVar * jsvSkipName(JsVar *a) {
  return ( (JsVar *(*)(JsVar *))EXPTR[2])(a);
}
JsVar * jsvMathsOp(JsVar *a, JsVar *b, int op) {
  return ( (JsVar *(*)(JsVar *,JsVar*,int))EXPTR[3])(a,b,op);
}
JsVar * jsvNewWithFlags(int flags) {
  return ( (JsVar *(*)(int))EXPTR[4])(flags);
}
JsVar * jsvNewFromFloat(double d) {
  return ( (JsVar *(*)(double))EXPTR[5])(d);
}
JsVar * jsvNewFromInteger(int i) {
  return ( (JsVar *(*)(int))EXPTR[6])(i);
}
JsVar * jsvNewFromString(const char *s) {
  return ( (JsVar *(*)(const char *))EXPTR[7])(s);
}
JsVar * jsvNewFromBool(bool b) {
  return ( (JsVar *(*)(bool))EXPTR[8])(b);
}
double  jsvGetFloat(JsVar *v) {
  return ( (double(*)(JsVar *))EXPTR[9])(v);
}
int  jsvGetInteger(JsVar *v) {
  return ( (int(*)(JsVar *))EXPTR[10])(v);
}
bool  jsvGetBool(JsVar *v) {
  return ( (bool(*)(JsVar *))EXPTR[11])(v);
}
void  jspReplaceWith(JsVar *a, JsVar *b) {
  return ( (void(*)(JsVar *, JsVar *))EXPTR[12])(a,b);
}
JsVar * jspeFunctionCall(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) {
  return ( (JsVar *(*)(JsVar *, JsVar *, JsVar *, bool, int, JsVar **))EXPTR[13])(function,functionName,thisArg,isParsing,argCount,argPtr);
}
JsVar * jspGetNamedVariable(const char *n) {
  return ( (JsVar *(*)(const char *))EXPTR[14])(n);
}
JsVar * jspGetNamedField(JsVar *o, const char *n, bool returnName) {
  return ( (JsVar *(*)(JsVar *,const char *, bool))EXPTR[15])(o,n,returnName);
}
JsVar * jspGetVarNamedField(JsVar *object, JsVar *nameVar, bool returnName) {
  return ( (JsVar *(*)(JsVar *,JsVar *, bool))EXPTR[16])(object,nameVar,returnName);
}

`;
    /*var n = 0; // this mostly generates the above, apart from arg names
    for (var name in funcDecls) {
      var decl = funcDecls[name];
      var match = decl.match(/(.*)\(\*\w*\)(.*)=(.*)/);
      code += match[1]+" "+name+match[2]+"{\n";
      code += "  return ("+match[3]+"EXPTR["+n+"])();\n";
      code += "}\n";
      n++;
    }*/
    return code;
  }


  for (var f in funcDecls) {
    if (!f in exports) throw new Error("Function '"+f+"' not found in exports list!");
    //var addr = baseAddr + idx*4;  addr = "*(unsigned int*)"+addr;
    var addr = exports[f];
    code += funcDecls[f]+addr+";\n";
  }
  return code;
};
