exports.isFloat = function(n) {
  return (typeof n == "number") &&
         (n === +n && n !== (n|0));
};

exports.isInt = function(n) {
  return (typeof n == "number") &&
         !(n === +n && n !== (n|0));
};

exports.isBool = function(n) {
  return typeof n == "boolean";
};

// Give two types, find the 'maximum' type
exports.maxType = function(a,b) {
  var typeOrder = ["bool","int","JsVar" ];
  var ai = typeOrder.indexOf(a);
  if (ai<0) ai = typeOrder.indexOf("JsVar");
  var bi = typeOrder.indexOf(b);
  if (bi<0) bi = typeOrder.indexOf("JsVar");
  return typeOrder[Math.max(ai,bi)];
};

exports.getMathsOpOperator = function(op) {
  if (op.length==1) return "'"+op+"'";
  if (op=="==") return 261; // LEX_EQUAL - see jsutils.h
  if (op=="===") return 262; // LEX_TYPEEQUALL - see jsutils.h
  if (op=="!=") return 263; // LEX_NEQUAL - see jsutils.h
  if (op=="!==") return 264; // LEX_NTYPEEQUALL - see jsutils.h  
  throw new Error("Unknown op '"+op+"'");
};