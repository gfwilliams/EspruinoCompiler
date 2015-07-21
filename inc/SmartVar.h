/* very dodgy reference holding implementation, that allows
 us to pass most of the locking/unlocking to GCC.

Mostly this gets collapsed down to virtually nothing, but
assignments create a jsvLockAgainSafe. */
class SV {
  JsVar *v;
  bool owned;
public:
  inline __attribute__((always_inline)) SV( const SV& o ) {
    owned = true;
    v = jsvLockAgainSafe(o.v);
  }
  inline __attribute__((always_inline)) SV &operator=(const SV &o) {
    if (owned) jsvUnLock(v);
    owned = true;
    v = jsvLockAgainSafe(o.v);
    return *this;
  }
  inline __attribute__((always_inline)) SV(JsVar *value) {
    owned = true;
    v=value;
  }
  inline __attribute__((always_inline)) SV() {
    owned = false;
    v=0;
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
    if (!owned) v = jsvLockAgainSafe(v);
    owned = false;
    return v;
  }
};

