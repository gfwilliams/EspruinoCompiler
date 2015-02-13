var utils = require("./utils.js");
var acorn_walk = require("acorn/util/walk");

function infer(node) {
  var modified = undefined;
  
  function setType(node, type) {
    if (node.varType !== type) {      
      if (!modified) modified = [];
      modified.push([ node.varType + " -> " + type, node]);
      node.varType = type;
    }
  }
  function getType(node) {
    return node.varType;
  }
  
  var varTypes = {};
  function updateVarType(name, type, node) {
    if (type===undefined) return;    
    if (varTypes[name]===undefined) {
      varTypes[name] = type;
    } else {
      varTypes[name] = utils.maxType(varTypes[name], type);
    }
    if (name=="i" && type=="JsVar") {
      console.log("-----------");
      console.log(node);
      throw new Error("Whoa.");
    }
  }
  
  acorn_walk.simple(node, {
    "AssignmentExpression" : function (node) {
      if (node.operator == "=") {
        if (node.left.type == "Identifier")
          updateVarType(node.left.name, getType(node.right), node);
      }
    },
    "VariableDeclaration" : function (node) {
      node.declarations.forEach(function(node) {
        if (node.init)
          updateVarType(node.id.name, getType(node.init), node);
      });
    }
  });  
  
  acorn_walk.simple(node, {
    "Identifier" : function(node) {
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
    },
    "WhileStatement" : function(node) {
    },
    "ForStatement" : function(node) {
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
        if (varTypes[node.id.name]!==undefined)
          setType(node.id, varTypes[node.id.name]);
      });
    }
  });
  if (modified) {
   // console.log("Modified "+JSON.stringify(modified,null,2));
  } else {
    console.log("Variable types: "+JSON.stringify(varTypes,null,2));
  }
  
  return modified!==undefined;
}
    
exports.infer = function(node) {
  // while modified, keep going
  tries = 100;
  while (infer(node) && tries--);
  if (tries<=0) throw new Error("Infer kept changing stuff");
  // now output
  //console.log(JSON.stringify(node,null,2));
}