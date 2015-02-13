#include <stdio.h>



class JsVar {
};

static JsVar *_cnt=(JsVar*)1;

JsVar *jsvLockAgainSafe(JsVar *v) {
  printf("Lock %d\n", (int)v);
  return v;
}

void jsvUnLock(JsVar *v) {
  printf("Unlock %d\n", (int)v);
}

JsVar *jsvNewFromString(const char *s) {  printf("NewStr %d\n", (int)_cnt); return _cnt++; }
JsVar *jsvNewFromInteger(int i) {  printf("NewInt %d\n", (int)_cnt); return _cnt++; }
JsVar *jsvNewFromFloat(double d) {  printf("NewFloat %d\n", (int)_cnt); return _cnt++; }
JsVar *jsvMathsOp(JsVar *a, JsVar *b, int op) { printf("Maths %d, %d -> %d\n", (int)a, (int)b, (int)_cnt); return _cnt++; }
JsVar *jsvSkipName(JsVar *a) { printf("Skip %d\n", (int)_cnt); return _cnt++; }
JsVar *jspGetNamedVariable(const char *n) { printf("GetNamedVar '%s' -> %d\n", n, (int)_cnt); return _cnt++; }
JsVar *jspGetNamedField(JsVar *o, const char *n, bool returnName) { printf("jspGetNamedField %d,'%s' -> %d\n", (int)o, n, (int)_cnt); return _cnt++; }
bool jsvGetBool(JsVar *v) { return 0; }
int jsvGetInteger(JsVar *v) { return 0; }
void jspReplaceWith(JsVar *a, JsVar *b) { printf("Replace %d = %d\n", (int)a, (int)b); }
JsVar *jspeFunctionCall(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) { printf("FunctionCall -> %d\n", (int)_cnt); return _cnt++; }

class SV {
  JsVar *v;
  bool owned;
public:
  SV(JsVar *value) {
    owned = true;
    v=value;
  }
  ~SV() {
    if (owned) jsvUnLock(v);
  }
  operator JsVar*() const { return v; }
  static SV lock(JsVar *value) {
    return SV(jsvLockAgainSafe(value));
  }
  JsVar *give() {
    owned = false;
    return v;
  }
};

