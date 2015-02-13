var utils = require("./utils.js");
var infer = require("./infer.js").infer;
var acorn_walk = require("acorn/util/walk");

function getType(node) {
  if (!node.varType) return "JsVar";
  return node.varType;
}

function getCType(node) {
  var t = getType(node);
  if (t=="JsVar") return "SV";
  return t;
}

var locals = [];
function isLocal(name) { return locals.indexOf(name)>=0; }

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
        if (getType(node)=="JsVar")
          return "SV::notOwned("+node.name+")";
        return node.name;
      }
      return callSV("jspGetNamedVariable", JSON.stringify(node.name));
    },    
    
    "VariableDeclaration" : function (node) {
      var c = "";
      node.declarations.forEach(function (node) {
        c += getCType(node.id)+" "+node.id.name+(node.init?(" = "+handleAsType(node.init, getType(node.id))):"")+";\n";
      });    
      return c;
    },
    
    "MemberExpression" : function(node) {
      var obj = handleAsJsVarSkipName(node.object);
      if (node.property.type=="Identifier") {
        return callSV("jspGetNamedField", obj, JSON.stringify(node.property.name), 1);
      } else {
        return callSV("jspGetVarNamedField", obj, handleAsJsVar(node.property), 1);
      }
    },    
    
    "BinaryExpression" : function(node) {
      if (getType(node)=="int" || getType(node)=="bool") {
        return handleAsInt(node.left) + " " + node.operator + " " + handleAsInt(node.right);
      } else {
        return convertJsVarToType(
            callSV("jsvMathsOp",handleAsJsVarSkipName(node.left),handleAsJsVarSkipName(node.right),utils.getMathsOpOperator(node.operator)),
            getType(node));
      }
    },    
    "LogicalExpression" : function(node) {
      if (getType(node)=="bool") {
        return handleAsBool(node.left) + " " + node.operator + " " + handleAsBool(node.right);
      } else
        throw new Error("Unhandled LogicalExpression "+node.operator);            
    },        
    "CallExpression" : function(node) {
      // TODO: check for simple peek and poke, and implement them directly
      var initCode = "";
      var args = node.arguments.map(function(node) {
        var tv = getTempVar();
        initCode += "SV "+tv+"="+handleAsJsVar(node)+";";
        return tv;
      });      
      // slightly odd arrangement needed to ensure vars don't unlock until later
      return "({"+initCode+"JsVar *args["+node.arguments.length+"] = {"+args.join(", ")+"};"+ // thank you GCC!      
               callSV("jspeFunctionCall",handleAsJsVar(node.callee), 0/*funcName*/, 0/*this*/, 0/*isParsing*/, node.arguments.length/*argCount*/, "args"/* argPtr */)+";})";
    },       

    "ConditionalExpression" : function(node) {
      var t = getType(node);
      return handleAsBool(node.test)+"?"+handleAsType(node.consequent,t)+":"+handleAsType(node.alternate,t);
    },
    "AssignmentExpression" : function(node) {
      if (getType(node.left)=="JsVar") {
        var rhs;
        if (node.operator=="=") {
          rhs = handleAsJsVar(node.right);
        } else {
          var op;
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
        return call("jspReplaceWith", handleAsJsVar(node.left), rhs);
      } else {
        return handle(node.left) + " "+ node.operator + " " + handle(node.right);
      }
    },       
    "UpdateExpression" : function(node) {
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
      return handle(expr);
    },    
    "EmptyStatement" : function(node) {
    },
    "ExpressionStatement" : function(node) {
      out(handle(node.expression)+";\n");
    },    
    "BlockStatement" : function(node) {
      node.body.forEach(function(s) {
        out(handle(s));
      });
    },    
    "ReturnStatement" : function(node) {
      out("return "+handleAsJsVar(node.argument)+".give();\n");
    },     
    "IfStatement" : function(node) {
      out("if ("+handleAsBool(node.test)+") {\n");
      setIndent(1);
      out(handle(node.consequent));
      if (!node.alternate) {
        setIndent(-1);
        out("}\n");        
      } else {
        setIndent(-1);
        out("} else {\n");
        setIndent(1);
        out(handle(node.alternate));
        setIndent(-1);
        out("}\n");
      }      
    }, 
    "ForStatement" : function(node) {
      out("for ("+handle(node.init)+""+handleAsBool(node.test)+";"+handle(node.update)+") {\n");
      setIndent(1);
      out(handle(node.body));
      setIndent(-1);
      out("}\n");
    },  
    "WhileStatement" : function(node) {
      out("while ("+handleAsBool(node.test)+") {\n");
      setIndent(1);
      out(handle(node.body));
      setIndent(-1);
      out("}\n");
    },  
};

var cCodeIndent = 0;
var cCode = "";
var cTempVar = 0;

function handle(node) {
  if (node.type in nodeHandlers)
    return nodeHandlers[node.type](node);
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
  if (getType(node)=="int") return callSV("jsvNewFromInteger", handle(node));
  if (getType(node)=="bool") return callSV("jsvNewFromBool", handle(node));
  return handle(node);
}

function handleAsJsVarSkipName(node) {
  if (node.isNotAName) return handleAsJsVar(node);
  return callSV("jsvSkipName", handleAsJsVar(node));
}

function handleAsInt(node) {
  if (getType(node)=="int" || getType(node)=="bool") return handle(node);
  return call("jsvGetInteger", handleAsJsVarSkipName(node));
}

function handleAsBool(node) {
  if (getType(node)=="bool") return handle(node);
  if (getType(node)=="int") return "(("+handle(node)+")!=0)";
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


exports.compileFunction = function(node, exports, callback) {
  
  // Infer types
  infer(node);
  // Look at parameters
  var paramSpecs = [];
  var params = node.params.map(function( node ) { 
    node.isNotAName = true;
    paramSpecs.push(getType(node));
    locals.push(node.name);
    return "JsVar *"+node.name; 
  }); 
  // Look at locals
  acorn_walk.simple(node, {
    "VariableDeclaration" : function (node) {
      node.declarations.forEach(function (node) {
        locals.push(node.id.name);
      });
    },
    "Identifier" : function(node) {
      if (isLocal(node.name)) {
        node.isNotAName = true;
      }
    }    
  });  
  console.log("Locals: "+locals);
  
  // Get header stuff
  cCode = utils.getFunctionDecls(exports);
  cCode += require("fs").readFileSync("inc/SmartVar.h").toString();
  // Now output    
  out('extern "C" {\n');
  setIndent(1);
  out("JsVar *myFunction("+params.join(", ")+") {\n");
  setIndent(1);
  // Serialise all statements
  node.body.body.forEach(function(s, idx) {
    if (idx==0) return; // we know this is the 'compiled' string
    out(handle(s));    
  });
  out("return 0; // just in case\n");
  setIndent(-1);
  out("}\n");
  setIndent(-1);
  out("}\n");
  //out("int main() { foobar(_cnt++); return 0; }\n");

  // save to file
  require("fs").writeFileSync("out.cpp", cCode);
  // now run gcc
  var sys = require('sys');
  var exec = require('child_process').exec;
  /*child = exec("gcc out.cpp  -fno-exceptions -m32 -o out", function (error, stdout, stderr) {
    sys.print('stdout: ' + stdout);
    sys.print('stderr: ' + stderr);
    //if (error !== null) console.warn('exec error: ' + error);
  });*/
  
  
  
  var cflags =  "-mlittle-endian -mthumb -mcpu=cortex-m3  -mfix-cortex-m3-ldrd  -mthumb-interwork -mfloat-abi=soft ";
  cflags += "-nostdinc -nostdlib ";
  cflags += "-fno-common -fno-exceptions -fdata-sections -ffunction-sections ";
  cflags += "-flto -fno-fat-lto-objects -Wl,--allow-multiple-definition "
  cflags += "-fpic -fpie ";
  cflags += "-Os ";
  cflags += "-Tinc/linker.ld ";
  
  exec("arm-none-eabi-gcc "+cflags+" out.cpp -o out.elf", function (error, stdout, stderr) {
    if (stdout) sys.print('gcc stdout: ' + stdout+"\n");
    if (stderr) sys.print('gcc stderr: ' + stderr+"\n");
    if (error !== null) {
      console.warn('exec error: ' + error);
      callback();
    } else {
      // -x = symbol table
      // -D = all sections
      exec("arm-none-eabi-objdump -S out.elf", function (error, stdout, stderr) { 
        if (stdout) sys.print('objdump stdout: ' + stdout+"\n");
        if (stderr) sys.print('objdump stderr: ' + stderr+"\n");
      });
      exec("arm-none-eabi-objcopy -O binary out.elf out.bin", function (error, stdout, stderr) { 
        if (stdout) sys.print('objcopy stdout: ' + stdout+"\n");
        if (stderr) sys.print('objcopy stderr: ' + stderr+"\n");
        var b64 = require("fs").readFileSync("out.bin").toString('base64');
        var argSpec = "JsVar("+paramSpecs.join(",")+")";
        var func = "E.nativeCall(0, "+JSON.stringify(argSpec)+", atob("+JSON.stringify(b64)+"))";
        
        callback("var "+node.id.name+" = "+func+";");
      });
    }
  });
  
  
  
  return cCode;
};