// Test by compiling the code into Espruino itself
var acorn = require("acorn");
var fs = require("fs");
var jsToC = require("./compile.js").jsToC;

var filename = "tests/test.js";

var js = fs.readFileSync(filename).toString();
var ast = acorn.parse(js, { ecmaVersion : 6 });
ast.body.forEach(function(node) {
  if (node.type=="FunctionDeclaration") {
    if (node.body.type=="BlockStatement" &&
        node.body.body.length>0 &&
        node.body.body[0].type=="ExpressionStatement" &&
        node.body.body[0].expression.type=="Literal" && 
        node.body.body[0].expression.value=="compiled") {
      
      var compiled = jsToC(node);
      
      fs.writeFileSync(filename+".h", compiled.cArgSpec+";\n");
      fs.writeFileSync(filename+".c",
          '/*JSON{\n'+
          ' "type" : "function",\n'+
          ' "name" : "'+compiled.functionName+'",\n'+
          ' "generate" : "'+compiled.functionName+'",\n'+
          ' "params" : [\n'+
          '  ["a","JsVar",""]\n'+
          ' ],\n'+
          ' "return" : ["JsVar",""]\n'+
          '}\n'+
          '*/\n');      
      fs.writeFileSync(filename+"c.cpp",
          'extern "C" {\n'+
          '#include "src/jsvar.h"\n'+
          '#include "src/jsparse.h"\n'+
          "#include "+JSON.stringify("../"+filename+".h")+"\n"+
          "}\n"+
          "\n"+
          compiled.code+"\n");
      
      var exec = require('child_process').exec;
      var sys = require('sys');
      var cmd = "DEBUG=1 CFILE=../EspruinoCompiler/"+filename+".c CPPFILE=../EspruinoCompiler/"+filename+"c.cpp make";
      exec(cmd, { cwd : "../Espruino" }, function (error, stdout, stderr) { 
        if (stdout) sys.print('stdout: ' + stdout+"\n");
        if (stderr) sys.print('stderr: ' + stderr+"\n");
      });
    }
  }
});