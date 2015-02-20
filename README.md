Espruino Compiler
===============

This project does the following:

* Turns JavaScript code into C++ (that calls into Espruino library functions for more complicated operations)
* Compiles the code with GCC
* Links and Extracts a relocatable blob of Thumb code
* Formats it into JS that can be run in [Espruino](http://www.espruino.com)

Files
-----

* `utils.js` - general utilities
* `infer.js` - Type inferral on parse tree
* `compile.js` - Parse tree -> C++, and calling of GCC
* `server.js` - server that performs compilation for the Web IDE
* `index.js` - simple command-line test
* `test.js` - test in such a way that the C code is compiled into Espruino - allowing nice easy GDB debug


Setup
-----

You need:

* A new node.js
* [gcc-arm-embedded](https://launchpad.net/gcc-arm-embedded/+download) in your path

Running
-------

* Run `node server.js`
* Go into Web IDE settings and set `Communications / JavaScript Compiler URL` to `http://localhost:32766`
 
