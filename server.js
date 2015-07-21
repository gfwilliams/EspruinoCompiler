// Simple webserver that takes requests for compilation and sends back the result
var acorn = require("acorn");
var qs = require('querystring');
compileFunction = require("./compile.js").compileFunction;

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
    try {
      compile(post.js, JSON.parse(post.exports), function(code) {
        console.log("----------------------------------------");
        console.log(code);
        console.log("----------------------------------------");
        response.end(code);
      });
    } catch (ex) {
      console.log("===============================================");
      console.log(post.js);
      console.log("----------------------------------------");
      console.log(ex.toString());
      console.log("===============================================");
      response.end("console.log("+JSON.stringify(
          "---------------------------------------------------\n"+
          "                                 COMPILER MESSAGE\n"+
          "---------------------------------------------------\n"+
          ex.toString()+"\n"+
          "---------------------------------------------------")+")");
    }
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

server.listen(32766, function() {
  address = server.address();
  console.log("Opened server on %j", address);
});
