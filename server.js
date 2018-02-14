// Simple webserver that takes requests for compilation and sends back the result
var acorn = require("acorn");
var qs = require('querystring');
compileFunction = require("./compile.js").compileFunction;
compileCFunction = require("./compile.js").compileCFunction;

function compile_js(js, exports, callback) {
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

function respondWithCompilerMessage(response, message) {
  response.end("console.log("+JSON.stringify(
      "---------------------------------------------------\n"+
      "                                 COMPILER MESSAGE\n"+
      "---------------------------------------------------\n"+
      message+"\n"+
      "---------------------------------------------------")+")");
}

function handlePost(post, response) {
  console.log("POST ",post);

  var SUPPORTED_BOARDS = [
    "ESPRUINOBOARD","PICO_R1_3","ESPRUINOWIFI",
    "PUCKJS","PIXLJS","WIO_LTE","THINGY52","NRF52832DK"
  ];
  if (post.board && SUPPORTED_BOARDS.indexOf(post.board)==-1) {
    respondWithCompilerMessage(response, "Only offical Espruino boards are supported by the Compiler Service");
  }

  var exports;
  if (post.exptr) {
    exports = parseInt(post.exptr);
  } else {
    try {
      exports = JSON.parse(post.exports);
    } catch (ex) {
      respondWithCompilerMessage(response, "Unable to parse EXPORTS");
      return;
    }
  }


  if (post.js) {
    try {
      compile_js(post.js, exports, function(err, code) {
        if (err) return respondWithCompilerMessage(response,err);
        console.log("----------------------------------------");
        console.log(code);
        console.log("----------------------------------------");
        response.end(code);
      });
    } catch (ex) {
      console.log("===============================================");
      console.log(post.js);
      console.log("----------------------------------------");
      if ("object"==typeof ex && ex.stack)console.log(ex.stack);
      else console.log(ex.toString());
      console.log("===============================================");
      respondWithCompilerMessage(response, ex.toString());
    }
  } else if (post.c) {
    try {
      compileCFunction(post.c, exports, function(err, code) {
        if (err) return respondWithCompilerMessage(response,err);
        console.log("----------------------------------------");
        console.log(code);
        console.log("----------------------------------------");
        response.end(code);
      });
    } catch (ex) {
      console.log("===============================================");
      console.log(post.c);
      console.log("----------------------------------------");
      if ("object"==typeof ex && ex.stack)console.log(ex.stack);
      else console.log(ex.toString());
      console.log("===============================================");
      respondWithCompilerMessage(response, ex.toString());
    }
  } else {
    respondWithCompilerMessage(response, "Unknown compilation arguments");
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
