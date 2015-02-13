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
        return call("jsvNewFromString", node.value);
      else if (utils.isBool(node.value))
        return call("jsvNewFromBool", node.value); 
      else if (utils.isFloat(node.value))
          return call("jsvNewFromFloat", node.value);
      else if (utils.isInt(node.value)) 
          return call("jsvNewFromInteger", node.value);
      else throw new Error("Unknown literal type "+typeof node.value);
    },        
    "Identifier" : function(node) {
      return node.name;
    },    
    "BinaryExpression" : function(node) {
      if (getType(node)=="int") {
        return handle(node.left) + node.operator + handle(node.right);
      } else {
        return call("jsvMathsOp", handle(node.left), handle(node.right), utils.getMathsOpOperator(node.operator));
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
      out("return "+handle(node.argument)+";\n");
    },     
};

var cCode = "";

function handle(node) {
  if (node.type in nodeHandlers)
    return nodeHandlers[node.type](node);
  console.warn("Unknown", node);
  throw new Error(node.type+" is not implemented yet");  
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


exports.compileFunction = function(node) {
  // Infer types
  infer(node);
  // Now output  
  cCode = "";
  out("JsVar *foobar() {\n");
  // Serialise all statements
  node.body.body.forEach(function(s, idx) {
    if (idx==0) return; // we know this is the 'compiled' string
    var v = handle(s);
    if (v) v.free();
  });  
  out("}\n");
  return cCode;
};