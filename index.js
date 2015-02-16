var acorn = require("acorn");
compileFunction = require("./compile.js").compileFunction;

var exports = { "jsvLock": 14545, "jsvLockAgainSafe": 14533, "jsvUnLock": 14509, "jsvSkipName": 43285,
    "jsvMathsOp": 82821, "jsvMathsOpSkipNames": 163963, "jsvNewFromFloat": 174517, "jsvNewFromInteger": 174559, "jsvNewFromString": 174989,
    "jsvNewFromBool": 174537, "jsvGetFloat": 76897, "jsvGetInteger": 173429, "jsvGetBool": 77173, "jspeiFindInScopes": 37173,
    "jspReplaceWith": 96345, "jspeFunctionCall": 127017, "jspGetNamedVariable": 93377, "jspGetNamedField": 93233, "jspGetVarNamedField": 92833,
    "jsvNewWithFlags": 174313 };

function compileCode(code, callback) {
  var offset = 0;
  var tasks = 0;
  try {
    var ast = acorn.parse(code, { ecmaVersion : 6 });
    ast.body.forEach(function(node) {
      if (node.type=="FunctionDeclaration") {
        if (node.body.type=="BlockStatement" &&
            node.body.body.length>0 &&
            node.body.body[0].type=="ExpressionStatement" &&
            node.body.body[0].expression.type=="Literal" && 
            node.body.body[0].expression.value=="compiled") {
          try {
            tasks++;
            compileFunction(node, exports, function(newCode) {
              if (newCode) {                
                //console.log(asm);
                //console.log(node);
                code = code.substr(0,node.start+offset) + newCode + code.substr(node.end+offset);
                offset += newCode.length - (node.end-node.start); // offset for future code snippets
              }
              tasks--;
              if (tasks==0)
                callback(code);
            });
          } catch (err) {
            console.warn(err.stack);
            console.warn("In 'compiled' function: "+err.toString());
          }
          
          /**/
        }
      }
    });
  } catch (err) {
    console.log(err);
    console.warn("Acorn parse for plugins/compiler.js failed. Your code is probably broken.");
    callback();
  }
  if (tasks==0)
    callback(code);
}


compileCode(require("fs").readFileSync("tests/test.js").toString(), function(d) {
  console.log("========================================================== FINAL:");
  console.log(d);
});