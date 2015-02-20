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
* `index.js` - command-line test
* `server.js` - server that performs compilation for the Web IDE

Setup
-----

You need:

* A new node.js
* [gcc-arm-embedded](https://launchpad.net/gcc-arm-embedded/+download) in your path
