/*

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
JsVar *jspeFunctionCall(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) { printf("FunctionCall -> %d\n", (int)_cnt); return _cnt++; }*/


class JsVar;

JsVar *(*jsvLockAgainSafe)(JsVar *v) = (JsVar *(*)(JsVar *))1;
void (*jsvUnLock)(JsVar *v) = (void(*)(JsVar *))2;
JsVar *(*jsvNewFromString)(const char *s) = (JsVar *(*)(const char *))3;
JsVar *(*jsvNewFromInteger)(int i) = (JsVar *(*)(int))4;
JsVar *(*jsvNewFromFloat)(double d) = (JsVar *(*)(double))5;
JsVar *(*jsvMathsOp)(JsVar *a, JsVar *b, int op) = (JsVar *(*)(JsVar *,JsVar*,int))6;
JsVar *(*jsvSkipName)(JsVar *a) = (JsVar *(*)(JsVar *))7;
JsVar *(*jspGetNamedVariable)(const char *n) = (JsVar *(*)(const char *))8;
JsVar *(*jspGetNamedField)(JsVar *o, const char *n, bool returnName) = (JsVar *(*)(JsVar *,const char *, bool))9;
bool (*jsvGetBool)(JsVar *v) = (bool(*)(JsVar *))10;
int (*jsvGetInteger)(JsVar *v) = (int(*)(JsVar *))11;
void (*jspReplaceWith)(JsVar *a, JsVar *b) = (void(*)(JsVar *, JsVar *))12;
JsVar *(*jspeFunctionCall)(JsVar *function, JsVar *functionName, JsVar *thisArg, bool isParsing, int argCount, JsVar **argPtr) = (JsVar *(*)(JsVar *, JsVar *, JsVar *, bool, int, JsVar **))13;

class SV {
  JsVar *v;
  bool owned;
public:
  inline __attribute__((always_inline)) SV(JsVar *value) {
    owned = true;
    v=value;
  }
  inline __attribute__((always_inline)) ~SV() {
    if (owned) jsvUnLock(v);
  }
  inline __attribute__((always_inline)) operator JsVar*() const { return v; }
  static inline __attribute__((always_inline)) SV notOwned(JsVar *value) {
    SV s = SV(value);
    s.owned = false;
    return s;
  }
  inline __attribute__((always_inline)) JsVar *give() {
    owned = false;
    return v;
  }
};

