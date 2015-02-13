var utils = require("./utils.js");
var infer = require("./infer.js").infer;

function getType(node) {
  return node.varType;
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
      return node.name;
    },    
    "BinaryExpression" : function(node) {
      if (getType(node)=="int") {
        return handleAsInt(node.left) + node.operator + handleAsInt(node.right);
      } else {
        return callSV("jsvMathsOp",handleAsJsVar(node.left),handleAsJsVar(node.right),utils.getMathsOpOperator(node.operator));
      }
    },    
    "EmptyStatement" : function(node) {
    },
    "ExpressionStatement" : function(node) {
      out(handle(node.expression)+";\n");
    },    
    "BlockStatement" : function(node) {
      node.body.forEach(function(s) {
        out(handle(s)+";\n");
      });
    },    
    "ReturnStatement" : function(node) {
      out("return "+handleAsJsVar(node.argument)+".give();\n");
    },     
};

var cCode = "";

function handle(node) {
  if (node.type in nodeHandlers)
    return nodeHandlers[node.type](node);
  console.warn("Unknown", node);
  throw new Error(node.type+" is not implemented yet");  
}

function handleAsJsVar(node) {
  if (getType(node)=="int") return callSV("jsvNewFromInteger", handle(node));
  if (getType(node)=="bool") return callSV("jsvNewFromBool", handle(node));
  return handle(node);
}

function handleAsInt(node) {
  if (getType(node)=="int" || getType(node)=="bool") handle(node);
  return call("jsvGetInteger",handleAsJsVar(node));
}

function out(txt) {
  cCode += txt;
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


exports.compileFunction = function(node) {
  // Infer types
  infer(node);
  // Now output  
  cCode = require("fs").readFileSync("inc/SmartVar.h").toString();
  var params = node.params.map(function( n ) { 
    return "JsVar *"+n.name; 
  }); 
  out("JsVar *foobar("+params.join(", ")+") {\n");
  // Serialise all statements
  node.body.body.forEach(function(s, idx) {
    if (idx==0) return; // we know this is the 'compiled' string
    var v = handle(s);
    if (v) v.free();
  });  
  out("}\n");
  out("int main() { foobar(_cnt++); return 0; }\n");

  // save to file
  require("fs").writeFileSync("out.cpp", cCode);
  // now run gcc
  var sys = require('sys');
  var exec = require('child_process').exec;
  child = exec("gcc out.cpp  -fno-exceptions -m32 -o out", function (error, stdout, stderr) {
    sys.print('stdout: ' + stdout);
    sys.print('stderr: ' + stderr);
    //if (error !== null) console.warn('exec error: ' + error);
  });
  
  return cCode;
};