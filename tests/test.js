// Start
/*function f() {  
  "compiled";
  var x = 1;
  for (var i=0;i<8;i++) {
    x = x * 1.5;
  }
  return x;
}*/
function f() {  
  "compiled";
  var Xr = 0;
  var Xi = 0;
  var i = 0;
  var Cr=(4*x/32)-2;
  var Ci=(4*y/32)-2;  
  while ((i<8) & ((Xr*Xr+Xi*Xi)<4)) {
    var t=Xr*Xr - Xi*Xi + Cr;
    Xi=2*Xr*Xi+Ci;
    Xr=t;
    i=i+1;
  }
  return i;
}

// End