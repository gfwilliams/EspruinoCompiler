var acorn = require("acorn");
compileFunction = require("./compile.js").compileFunction;

var exports = [
               "jsvLock,jsvLockAgainSafe,jsvUnLock,jsvSkipName,jsvMathsOp,jsvMathsOpSkipNames,jsvNewFromFloat,jsvNewFromInteger,jsvNewFromString,jsvNewFromBool,jsvGetFloat,jsvGetInteger,jsvGetBool,jspeiFindInScopes,jspReplaceWith,jspeFunctionCall,jspGetNamedVariable,jspGetNamedField,jspGetVarNamedField,jsvNewWithFlags,",
               [37873, 37861, 37837, 62789, 89841, 164039, 58621, 58663, 177905, 58641, 65337, 176609, 65613, 52597, 77929, 140857, 166177, 74817, 74417, 177493, 198591],
               536871160 ];

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
}


compileCode(require("fs").readFileSync("tests/test.js").toString(), function(d) {
  console.log("========================================================== FINAL:");
  console.log(d);
});