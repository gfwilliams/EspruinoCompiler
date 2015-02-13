var utils = require("./utils.js");
var acorn_walk = require("acorn/util/walk");

function infer(node) {
  var modified = false;
  function setType(node, type) {
    if (node.varType!==type) {
      node.varType = type;
      modified = true;
    }
  }
  function getType(node) {
    return node.varType;
  }
  
  var varTypes = {};
  
  acorn_walk.simple(node, {
    "Identifier" : function(node) {
      //console.log("Identifier "+node.name, varTypes, node);
      if (varTypes[node.name]!==undefined)
        setType(node, varTypes[node.name]);
    },
    "Literal" : function(node) {
      node.isNotAName = true;
      if (utils.isInt(node.value)) setType(node, "int"); 
      else if (utils.isBool(node.value)) setType(node, "bool");
      else setType(node, "JsVar");
    },
    "BinaryExpression" : function(node) {
      node.isNotAName = true;
      var boolExprs = ["==","===","!=","!==","<","<=",">",">="];
      var intExprs = ["&","|","^"];
      var floatExprs = ["/"];
      if (boolExprs.indexOf(node.operator)>=0) setType(node, "bool");
      else if (intExprs.indexOf(node.operator)>=0) setType(node, "int");
      else if (floatExprs.indexOf(node.operator)>=0) setType(node, "JsVar");
      else { // normal operator - do type promotion
        setType(node, utils.maxType(getType(node.left), getType(node.right)));
      }
    },
    "LogicalExpression" : function(node) {
      // propogate backwards
      if (getType(node)=="bool") {
        setType(node.left, "bool");
        setType(node.right, "bool");
      }
    },
    "ConditionalExpression" : function(node) {
      node.isNotAName = true;
      setType(node.test, "bool");
      setType(node, utils.maxType(getType(node.consequent), getType(node.alternate)));
    },    
    "IfStatement" : function(node) {
      setType(node.test, "bool");
    },
    "WhileStatement" : function(node) {
      setType(node.test, "bool");
    },
    "ForStatement" : function(node) {
      setType(node.test, "bool");
    },
    "AssignmentExpression" : function (node) {
      if (node.operator == "=") {
        //console.log("Assign", node.left, getType(node.right));
        setType(node.left, getType(node.right));
        if (node.left.type == "Identifier")
          varTypes[node.left.name] = getType(node.right);
      }
    },
    "VariableDeclaration" : function (node) {
      node.declarations.forEach(function(node) {
        setType(node.id, getType(node.init));
        varTypes[node.id.name] = getType(node.init);
      });
    }
  });
  //console.log("Modified "+modified);
  
  return modified;
}
    
exports.infer = function(node) {
  // while modified, keep going
  tries = 100;
  while (infer(node) && tries--);
  if (!tries) throw new Error("Infer kept changing stuff");
  // now output
  //console.log(JSON.stringify(node,null,2));
}