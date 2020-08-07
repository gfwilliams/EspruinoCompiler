Espruino Compiler
===============

See [the Espruino Compilation Page](http://www.espruino.com/Compilation)

This project does the following:

* Turns JavaScript code into C++ (that calls into Espruino library functions for more complicated operations)
* Compiles the code with GCC
* Links and Extracts a relocatable blob of Thumb code
* Formats it into JS that can be run in [Espruino](http://www.espruino.com)

Files
-----

* `src/utils.js` - general utilities
* `src/infer.js` - Type inferral on parse tree
* `src/compile.js` - Parse tree -> C++, and calling of GCC
* `server.js` - server that performs compilation for the Web IDE
* `test.js` - simple command-line test
* `test_espruino.js` - test in such a way that the C code is compiled into Espruino - allowing nice easy GDB debug


Setup
-----

You need:

* A new node.js
* [gcc-arm-embedded](https://launchpad.net/gcc-arm-embedded/+download) in your path

Running
-------

* Run `node server.js`
* Go into Web IDE settings and set `Communications / JavaScript Compiler URL` to `http://localhost:32766`
