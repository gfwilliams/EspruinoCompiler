// Simple webserver that takes requests for compilation and sends back the result
var acorn = require("acorn");
var qs = require('querystring');
compileFunction = require("./compile.js").compileFunction;

var exports = { "jsvLock": 14545, "jsvLockAgainSafe": 14533, "jsvUnLock": 14509, "jsvSkipName": 43285,
    "jsvMathsOp": 82821, "jsvMathsOpSkipNames": 163963, "jsvNewFromFloat": 174517, "jsvNewFromInteger": 174559, "jsvNewFromString": 174989,
    "jsvNewFromBool": 174537, "jsvGetFloat": 76897, "jsvGetInteger": 173429, "jsvGetBool": 77173, "jspeiFindInScopes": 37173,
    "jspReplaceWith": 96345, "jspeFunctionCall": 127017, "jspGetNamedVariable": 93377, "jspGetNamedField": 93233, "jspGetVarNamedField": 92833,
    "jsvNewWithFlags": 174313 };


function compile(js, exports, callback) {
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
  console.log("POST ",post);
  if (post.js && post.exports) {
    compile(post.js, JSON.parse(post.exports), function(code) {
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