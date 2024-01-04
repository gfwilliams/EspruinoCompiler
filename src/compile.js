var utils = require("./utils.js");
var infer = require("./infer.js").infer;
var acorn_walk = require("acorn/dist/walk");

var locals;
var cCodeIndent = 0;
var cCode = "";
var cTempVar = 0;

function getType(node) {
  if (!node.varType) return "JsVar";
  return node.varType;
}

function getCType(t) {
  if (t=="JsVar") return "SV";
  return t;
}

function getField(object, field, computed, wantName) {
  if (field.type=="Identifier" && !computed) {
    return callSV("jspGetNamedField", object, JSON.stringify(field.name), wantName ? 1 : 0);
  } else {
    return callSV("jspGetVarNamedField", object, handleAsJsVarSkipName(field), wantName ? 1 : 0);
  }
}

function isLocal(name) {
  return name in locals;
}

function isNodeZero(node) {
  return node.type=="Literal" && node.value==0;
}

var nodeHandlers = {

    "Literal" : function(node) {
      if (getType(node)=="int" && utils.isInt(node.value))
        return node.value;
      if (getType(node)=="bool" && utils.isBool(node.value))
        return node.value;

      if (typeof node.value == "string")
        return callSV("jsvNewFromString", JSON.stringify(node.value));
      else if (utils.isBool(node.value))
        return callSV("jsvNewFromBool", node.value);
      else if (utils.isFloat(node.value))
          return callSV("jsvNewFromFloat", node.value);
      else if (utils.isInt(node.value))
          return callSV("jsvNewFromInteger", node.value);
      else throw new Error("Unknown literal type "+typeof node.value);
    },
    "Identifier" : function(node) {
      if (isLocal(node.name)) {
        if (getType(node)=="JsVar" && !locals[node.name].isSV)
          return "SV::notOwned("+node.name+")";
        return node.name;
      }
      return callSV("jspGetNamedVariable", JSON.stringify(node.name));
    },

    "VariableDeclaration" : function (node) {
      var c = "";
      node.declarations.forEach(function (node) {
        var typ = locals[node.id.name].type;
        c += getCType(typ)+" "+node.id.name+(node.init?(" = "+handleAsType(node.init, typ)):"")+";\n";
      });
      return c;
    },

    "MemberExpression" : function(node) {
      var obj = handleAsJsVarSkipName(node.object);
      return getField(obj, node.property, node.computed, true);
    },
    "UnaryExpression" : function(node) {
      if (node.operator=="!") {
        return "!"+handleAsBool(node.argument);
      } else if (node.operator=="~") {
        return "~"+handleAsInt(node.argument);
      } else if (node.operator=="-" || node.operator=="+") {
        var expr = {
              type : "BinaryExpression",
              operator : node.operator,
              left : { type : "Literal", value : 0, varType : "int" },
              right : node.argument,
              varType : node.argument.varType
        };
        return handle(expr, node.argument.varType);
      } else {
        throw new Error("Only '!', '~', '-', and '+' are implemented as a unary expression");
      }
    },
    "BinaryExpression" : function(node) {
      // These 2 nodes have no effect with one argument as 0 - optimise
      if (["|","^"].indexOf(node.operator)>=0) {
        if (isNodeZero(node.left)) return handleAsInt(node.right);
        if (isNodeZero(node.right)) return handleAsInt(node.left);
      }
      // otherwise do the full expr
      if ((getType(node)=="int" || getType(node)=="bool") &&
          (getType(node.left)=="int" || getType(node.left)=="bool") &&
          (getType(node.right)=="int" || getType(node.right)=="bool")) {
        return "(" + handleAsInt(node.left) + " " + node.operator + " " + handleAsInt(node.right) + ")";
      } else {
        return convertJsVarToType(
            callSV("jsvMathsOp",handleAsJsVarSkipName(node.left),handleAsJsVarSkipName(node.right),utils.getMathsOpOperator(node.operator)),
            getType(node));
      }
    },
    "LogicalExpression" : function(node) {
      if (getType(node)=="bool") {
        return "(" + handleAsBool(node.left) + " " + node.operator + " " + handleAsBool(node.right) + ")";
      } else
        throw new Error("Unhandled non-boolean LogicalExpression "+node.operator);
    },
    "CallExpression" : function(node) {
      if (node.varType="int" &&
          node.callee.type == "Identifier" &&
          ["peek8","peek16","peek32"].indexOf(node.callee.name)>=0 &&
          node.arguments.length==1) {
        var type = "int"+node.callee.name.substr(4)+"_t";
        return "(*(volatile "+type+"*)(void*)"+handleAsInt(node.arguments[0])+")";
      }
      if (node.varType="int" &&
          node.callee.type == "Identifier" &&
          ["poke8","poke16","poke32"].indexOf(node.callee.name)>=0 &&
          node.arguments.length==2 &&
          ["int","bool"].indexOf(getType(node.arguments[1]))>=0) {
        var type = "int"+node.callee.name.substr(4)+"_t";
        return "((*(volatile "+type+"*)(void*)"+handleAsInt(node.arguments[0])+") = ("+handleAsInt(node.arguments[1])+"))";
      }

      // TODO: check for simple peek and poke, and implement them directly
      var initCode = "";
      var args = node.arguments.map(function(node) {
        var tv = getTempVar();
        initCode += "SV "+tv+"="+handleAsJsVarSkipName(node)+";";
        return tv;
      });

      // slightly odd arrangement needed to ensure vars don't unlock until later
      initCode += "JsVar *args["+node.arguments.length+"] = {"+args.join(", ")+"};";
      // luckily GCC lets us package a block inside an expression `({...})`
      // otherwise we'd have to do some really strange stuff

      if (node.callee.object != undefined /*&& callee.type == "MemberExpression"*/) {
        var thisVar = getTempVar();
        initCode += "SV "+thisVar+"="+handleAsJsVarSkipName(node.callee.object)+";";
        var methodVar = getField(thisVar, node.callee.property, node.computed, false);

        return "({"+initCode+
                 callSV("jspeFunctionCall",methodVar, 0/*funcName*/, thisVar/*this*/, 0/*isParsing*/, node.arguments.length/*argCount*/, "args"/* argPtr */)+";})";
      } else {
        // Simple function call (not method)
        return "({"+initCode+
        callSV("jspeFunctionCall",handleAsJsVarSkipName(node.callee), 0/*funcName*/, 0/*this*/, 0/*isParsing*/, node.arguments.length/*argCount*/, "args"/* argPtr */)+";})";
      }
    },

    "ConditionalExpression" : function(node) {
      var t = getType(node);
      return "("+handleAsBool(node.test)+"?"+handleAsType(node.consequent,t)+":"+handleAsType(node.alternate,t)+")";
    },
    "AssignmentExpression" : function(node, needsResult) {
      if (getType(node.left)=="JsVar") {
        var rhs;
        if (node.operator=="=") {
          rhs = handleAsJsVar(node.right);
        } else {
          var op, postinc = false;
          if (node.operator == "+=") op = "+";
          if (node.operator == "-=") op = "-";
          if (node.operator == "*=") op = "*";
          if (node.operator == "/=") op = "/";
          if (node.operator == "%=") op = "%";
          if (node.operator == "&=") op = "&";
          if (node.operator == "^=") op = "^";
          if (node.operator == "|=") op = "|";
          if (op===undefined) throw new Error("Unhandled AssignmentExpression "+node.operator);
          var expr = {
              type : "BinaryExpression",
              operator : op,
              left : node.left,
              right : node.right,
          };
          rhs = handleAsJsVar(expr);
        }
        if (node.left.type=="Identifier" && isLocal(node.left.name))
          return handleAsJsVar(node.left) +" = "+ rhs;
        else {
          // replaceWith doesn't return anything, so we must store the value ourselves
          if (needsResult) {
            var tv = getTempVar();
            return "({SV "+tv+"="+handleAsJsVar(node.left)+";"+call("jsvReplaceWith", tv, rhs)+";"+tv+";})";
          } else
            return call("jsvReplaceWith", handleAsJsVar(node.left), rhs);
        }
      } else {
        return handle(node.left, true) + " "+ node.operator + " " + handle(node.right, true);
      }
    },
    "UpdateExpression" : function(node, needsResult) {
      var op = {
          "++" : "+=",
          "--" : "-="
      }[node.operator];
      if (op===undefined) throw new Error("Unhandled UpdateExpression "+node.operator);
      var expr = {
          type : "AssignmentExpression",
          operator : op,
          left : node.argument,
          right : {
            type : "Literal",
            value : 1,
            varType : node.argument.varType
          },
          varType : node.argument.varType
      };
      if (node.prefix || !needsResult) {
        // all great - we just treat it like += 1
        return handle(expr, needsResult);
      } else {
       // it's postfix - we must store the value first, and return that
        // this isn't great - as we search for the variable by name twice
        var tv = getTempVar();
        return "({SV "+tv+"="+handleAsJsVarSkipName(node.argument)+";"+handle(expr, true)+";"+tv+";})";
      }
    },
    "EmptyStatement" : function(node) {
    },
    "ExpressionStatement" : function(node) {
      out(handle(node.expression, false/* no result needed */)+";\n");
    },
    "BlockStatement" : function(node) {
      node.body.forEach(function(s) {
        out(handle(s, false/* no result needed */));
      });
    },
    "ReturnStatement" : function(node) {
      out("return "+handleAsJsVar(node.argument)+".give();\n");
    },
    "IfStatement" : function(node) {
      out("if ("+handleAsBool(node.test)+") {\n");
      setIndent(1);
      out(handle(node.consequent, false/* no result needed */));
      if (!node.alternate) {
        setIndent(-1);
        out("}\n");
      } else {
        setIndent(-1);
        out("} else {\n");
        setIndent(1);
        out(handle(node.alternate, false/* no result needed */));
        setIndent(-1);
        out("}\n");
      }
    },
    "ForStatement" : function(node) {
      var initCode = handle(node.init, false/* no result needed */).trim();
      if (initCode.substr(-1)!=";") initCode += ";";
      out("for ("+initCode+""+handleAsBool(node.test)+";"+handle(node.update, false/* no result needed */)+") {\n");
      setIndent(1);
      out(handle(node.body, false/* no result needed */));
      setIndent(-1);
      out("}\n");
    },
    "WhileStatement" : function(node) {
      out("while ("+handleAsBool(node.test)+") {\n");
      setIndent(1);
      out(handle(node.body, false/* no result needed */));
      setIndent(-1);
      out("}\n");
    },
};

function handle(node, needsResult) {
  if (node.type in nodeHandlers)
    return nodeHandlers[node.type](node, needsResult);
  console.warn("Unknown", node);
  throw new Error(node.type+" is not implemented yet");
}

function convertJsVarToType(v, type) {
  if (type=="int") return call("jsvGetInteger", v);
  if (type=="bool") return call("jsvGetBool", v);
  if (type=="JsVar") return v;
  throw new Error("convertJsVarToType unhandled type "+JSON.stringify(type));
}

function handleAsJsVar(node) {
  if (getType(node)=="int") return callSV("jsvNewFromInteger", handle(node, true));
  if (getType(node)=="bool") return callSV("jsvNewFromBool", handle(node, true));
  return handle(node, true);
}

function handleAsJsVarSkipName(node) {
  if (node.isNotAName) return handleAsJsVar(node);
  return callSV("jsvSkipName", handleAsJsVar(node));
}

function handleAsInt(node) {
  if (getType(node)=="int" || getType(node)=="bool") return handle(node, true);
  return call("jsvGetInteger", handleAsJsVarSkipName(node));
}

function handleAsBool(node) {
  if (getType(node)=="bool") return handle(node, true);
  if (getType(node)=="int") return "(("+handle(node, true)+")!=0)";
  return call("jsvGetBool", handleAsJsVarSkipName(node));
}

function handleAsType(node, type) {
  if (type=="bool") return handleAsBool(node);
  if (type=="int") return handleAsInt(node);
  if (type=="JsVar") return handleAsJsVarSkipName(node);
  throw new Error("handleAsType unhandled type "+JSON.stringify(type));
}



function getTempVar() {
  return "_v"+cTempVar++;
}

function getIndent() {
  return "                      ".substr(0,cCodeIndent);
}

function setIndent(i) {
  cCodeIndent+=i;
  var n = cCode.length-1;
  while (cCode[n]===" ") n--;
  while (cCode[n]==="\n") n--;
  cCode = cCode.substr(0,n+1)+"\n"+getIndent();
}

function out(txt) {
  if (txt===undefined) return;
  cCode += txt.replace("\n","\n"+getIndent());
}

function call(funcName) {
  var c = funcName+"(";
  var args = Array.prototype.slice.call(arguments, 1);
  c += args.join(", ");
  c += ")";
  return c;
}

function callSV(funcName) {
  return "SV("+call.apply(this,arguments)+")";
}

exports.jsToC = function(node) {
  // Initialise
  locals = [];
  cCode = "";
  cCodeIndent = 0;
  cTempVar = 0;
  // Infer types
  infer(node);
  // Look at parameters
  var paramSpecs = [];
  var params = node.params.map(function( node ) {
    node.isNotAName = true;
    paramSpecs.push(getType(node));
    locals[node.name] = {
        type : getType(node),
        isSV: false
    };
    return "JsVar *"+node.name;
  });
  // Look at locals
  var localWalker = {
    "VariableDeclaration" : function (node) {
      node.declarations.forEach(function (node) {
        locals[node.id.name] = {
            type : getType(node.id),
            isSV: getType(node.id)=="JsVar", // not an SV if it's not a JsVar
        };
        // walked doesn't handle VariableDeclarator.init
        if (node.init) acorn_walk.simple(node.init, localWalker);
      });
    },
    "Identifier" : function(node) {
      if (isLocal(node.name)) {
        node.isNotAName = true;
      }
    }
  };
  acorn_walk.simple(node, localWalker);
  console.log("Locals: ",locals);

  // Get header stuff
  cCode += require("fs").readFileSync("inc/SmartVar.h").toString();
  // Now output
  out('extern "C" {\n');
  setIndent(1);
  var functionName = "entryPoint";
  var cArgSpec = "__attribute__ ((section (\".entrypoint\"))) JsVar *"+functionName+"("+params.join(", ")+")";
  out(cArgSpec + " {\n");
  setIndent(1);
  // Serialise all statements
  node.body.body.forEach(function(s, idx) {
    if (idx==0) return; // we know this is the 'compiled' string
    out(handle(s, false/* no result needed*/));
  });
  out("return 0; // just in case\n");
  setIndent(-1);
  out("}\n");
  setIndent(-1);
  out("}\n");
  //out("int main() { foobar(_cnt++); return 0; }\n");

  return {
    code : cCode,
    functionName : functionName,
    cArgSpec : cArgSpec,
    jsArgSpec : "JsVar("+paramSpecs.join(",")+")"
  };
};

function gcc(code, options, callback) {
  var crypto = require('crypto');
  var filename = "tmp/out"+crypto.randomBytes(4).readUInt32LE(0);

  // save to file
  require("fs").writeFileSync(filename+".cpp", code);
  // now run gcc
  var exec = require('child_process').exec;
  /*child = exec("gcc "+filename+".cpp  -fno-exceptions -m32 -o "+filename+"", function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    //if (error !== null) console.warn('exec error: ' + error);
  });*/



  var cflags =  "-mlittle-endian -mthumb  -mthumb-interwork ";
  switch (options.boardInfo.cpu) {
    case "cortexm3" : cflags += "-mcpu=cortex-m3  -mfix-cortex-m3-ldrd "; break;
    case "cortexm4" : cflags += "-mcpu=cortex-m4 "; break;
    default:
    console.warn('Unknown CPU! ' + options.boardInfo.cpu);
  }
//  if (options.boardInfo.nrf52) // on nRF52 use hardware floating point unit
//    cflags += "-mfloat-abi=hard -mfpu=fpv4-sp-d16 -fsingle-precision-constant -Wdouble-promotion -Wfloat-conversion ";
//  else
  // now all devices use softfp
  cflags += "-mfloat-abi=soft  -mfpu=fpv4-sp-d16 ";
  cflags += "-nostdinc -nostdlib ";
  cflags += "-fno-common -fno-exceptions -fdata-sections -ffunction-sections ";
  cflags += "-flto -fno-fat-lto-objects -Wl,--allow-multiple-definition ";
  cflags += "-fpic -fpie ";
  cflags += "-fpermissive "; // for (int i=0;...);return i;
  cflags += "-fpreprocessed "; // disable preprocessing
  cflags += "-Os ";
  cflags += "-Tinc/linker.ld ";

  exec("arm-none-eabi-gcc "+cflags+" "+filename+".cpp -o "+filename+".elf", function (error, stdout, stderr) {
    require("fs").unlinkSync(filename+".cpp");
    if (stdout) console.log('gcc stdout: ' + stdout+"\n");
    if (stderr) console.log('gcc stderr: ' + stderr+"\n");
    if (error !== null) {
      console.warn('exec error: ' + error);
      var e = error.toString();
      callback(e.substr(e.indexOf("\n")+1));
    } else {
      // -x = symbol table
      // -D = all sections
      exec("arm-none-eabi-objdump -S -D "+filename+".elf", function (error, stdout, stderr) {
        if (stdout) console.log('objdump stdout: ' + stdout+"\n");
        if (stderr) console.log('objdump stderr: ' + stderr+"\n");
      });
      exec("arm-none-eabi-objcopy -O binary "+filename+".elf "+filename+".bin", function (error, stdout, stderr) {
        if (stdout) console.log('objcopy stdout: ' + stdout+"\n");
        if (stderr) console.log('objcopy stderr: ' + stderr+"\n");
        var bin = require("fs").readFileSync(filename+".bin");
        require("fs").unlinkSync(filename+".bin");
        require("fs").unlinkSync(filename+".elf");

        callback(null, { binary : bin });
      });
    }
  });

  return cCode;
};

exports.compileCFunction = function(code, options, callback) {
  // handle entrypoints
  var entryPoints = [];
  var entrySpecs = [];
  var lines = code.trim().split("\n");
  for (var i=0;i<lines.length;i++) {
    var l = lines[i].trim();
    if (l.substr(0,2)!="//") break;
    var match = /\/\/\s*(\w+)\s+(\w+)\(([^)]*)\)/.exec(l);
    if (match===null) throw new Error(JSON.stringify(l.substr(2).trim())+" isn't a valid argspec")
    entryPoints.push(match[2]);
    entrySpecs.push(match[1]+"("+match[3]+")");
  }

  // add all our built-in functions
  code = utils.getFunctionDecls(options.exports) + code;
  // add exports
  code += "\nextern \"C\" { void *entryPoint[]  __attribute__ ((section (\".entrypoint\"))) = {(void*)"+entryPoints.join(",(void*)")+"};}";

  console.log("----------------------------------------");
  console.log(code);
  console.log("----------------------------------------");

  gcc(code, options, function(err, result) {
    if (err) return callback(err);
    var offset = entryPoints.length*4;
    var binary = result.binary.slice(offset);
    var id = "id"+(0|(Math.random()*1576858));
    var src = "(function(){\n";
    src += "  var bin=atob("+JSON.stringify(binary.toString('base64'))+");\n";
    src += "  return {\n";
    for (var i=0;i<entryPoints.length;i++) {
      var addr = result.binary.readInt32LE(i*4) - offset;
      src += "    "+entryPoints[i]+":E.nativeCall("+addr+", "+JSON.stringify(entrySpecs[i])+", bin),\n";
    }
    src += "  };\n";
    src += "})()";
    callback(null,src);
  });
  return code;
}

exports.compileFunction = function(node, options, callback) {
  var compiled = exports.jsToC(node);

  console.log("----------------------------------------");
  console.log(compiled.code);
  console.log("----------------------------------------");
  // add all our built-in functions
  var code = utils.getFunctionDecls(options.exports) + compiled.code;

  gcc(code, options, function(err, result) {
    if (err) return callback(err);
    var str = "atob("+JSON.stringify(result.binary.toString('base64'))+")";
    var func = "E.nativeCall(1, "+JSON.stringify(compiled.jsArgSpec)+", "+str+")";
    callback(null,"var "+node.id.name+" = "+func+";");
  });
  return code;
};
