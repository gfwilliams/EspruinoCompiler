// Simple webserver that takes requests for compilation and sends back the result
var acorn = require("acorn");
var qs = require('querystring');
compileFunction = require("./compile.js").compileFunction;

var exports = [
               "jsvLock,jsvLockAgainSafe,jsvUnLock,jsvSkipName,jsvMathsOp,jsvMathsOpSkipNames,jsvNewFromFloat,jsvNewFromInteger,jsvNewFromString,jsvNewFromBool,jsvGetFloat,jsvGetInteger,jsvGetBool,jspeiFindInScopes,jspReplaceWith,jspeFunctionCall,jspGetNamedVariable,jspGetNamedField,jspGetVarNamedField,jsvNewWithFlags,",
               //console.log(peek32(process.env.EXPORT[1], process.env.EXPORT[0].split(",").length).join(","))
               [14545,14533,14509,43285,82821,163963,174517,174559,174989,174537,76897,173429,77173,37173,96345,127017,93377,93233,92833,174313,195138],
               536871160 ];


function compile(js, callback) {
  var ast = acorn.parse(js, { ecmaVersion : 6 });
  console.log(ast);
  var node = ast.body[0];
  if (node.type=="FunctionDeclaration" && 
      node.body.type=="BlockStatement" &&
      node.body.body.length>0 &&
      node.body.body[0].type=="ExpressionStatement" &&
      node.body.body[0].expression.type=="Literal" && 
      node.body.body[0].expression.value=="compiled") {
    compileFunction(node, exports, callback);      
  } else {
    throw new Error("Not Valid code");
  }
}

function handlePost(post, response) {
  if (post.js) {
    compile(post.js, function(code) {
      console.log("----------------------------------------");
      console.log(code);
      console.log("----------------------------------------");
      response.end(code);
    });
  } else {
    response.end("Unknown command");
  }
}

var server = require("http").createServer(function (request, response) {
  if (request.method=="POST") {
    var body = '';
    request.on('data', function (data) {
        body += data;

        // Too much POST data, kill the connection!
        if (body.length > 1e6)
            request.connection.destroy();
    });
    request.on('end', function () {
      var post = qs.parse(body);
      handlePost(post, response);
    });
    
    
  } else {
    response.end("Espruino compilation server");
  }
});

server.listen(8000, function() {
  address = server.address();
  console.log("Opened server on %j", address);
});