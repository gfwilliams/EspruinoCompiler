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
JsVar *jsvMathsOp(JsVar *a, JsVar *b, char op) { printf("Maths %d\n", (int)_cnt); return _cnt++; }

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
