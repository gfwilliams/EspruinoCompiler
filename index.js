var acorn = require("acorn");
compileFunction = require("./compile.js").compileFunction;

var exports = [
               "jsvLock,jsvLockAgainSafe,jsvUnLock,jsvSkipName,jsvMathsOp,jsvMathsOpSkipNames,jsvNewFromFloat,jsvNewFromInteger,jsvNewFromString,jsvNewFromBool,jsvGetFloat,jsvGetInteger,jsvGetBool,jspeiFindInScopes,jspReplaceWith,jspeFunctionCall,jspGetNamedVariable,jspGetNamedField,jspGetVarNamedField,jsvNewWithFlags,",
               //console.log(peek32(process.env.EXPORT[1], process.env.EXPORT[0].split(",").length).join(","))
               [14545,14533,14509,43285,82821,163963,174517,174559,174989,174537,76897,173429,77173,37173,96345,127017,93377,93233,92833,174313,195138],
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
  if (tasks==0)
    callback(code);
}


compileCode(require("fs").readFileSync("tests/test.js").toString(), function(d) {
  console.log("========================================================== FINAL:");
  console.log(d);
});