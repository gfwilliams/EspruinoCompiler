var acorn = require("acorn");

compileFunction = require("./compile.js").compileFunction;

function compileCode(code, callback) {
  var offset = 0;
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
            var asm = compileFunction(node);
          } catch (err) {
            console.warn(err.stack);
            console.warn("In 'compiled' function: "+err.toString());
          }
          if (asm) {                
            console.log(asm);
            //console.log(node);
            code = code.substr(0,node.start+offset) + asm + code.substr(node.end+offset);
            offset += asm.length - (node.end-node.start); // offset for future code snippets
          }
        }
      }
    });
  } catch (err) {
    console.log(err);
    console.warn("Acorn parse for plugins/compiler.js failed. Your code is probably broken.");
  }
  //console.log(code);
  callback(code);
}


compileCode(require("fs").readFileSync("tests/test.js").toString(), function(d) {
  console.log("========================================================== FINAL:");
  console.log(d);
});