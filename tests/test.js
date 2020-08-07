// Start
function fa() {  
  "compiled";
  var x = 1;
  for (var i=0;i<8;i++) {
    x = x * 1.5;
  }
  return x;
}

function fb() {
 "compiled";
 for (var y=0;y<32;y++) {
  line="";
  for (var x=0;x<32;x++) {
    var Xr=0;
    var Xi=0;
    var Cr=(4.0*x/32)-2.0;
    var Ci=(4.0*y/32)-2.0;
    var i=0;
    while ((i<8) && ((Xr*Xr+Xi*Xi)<4)) {
      var t=Xr*Xr - Xi*Xi + Cr;
      Xi=2*Xr*Xi+Ci;
      Xr=t;
      i++;
    }
    if (i&1)
	line += "*";
    else
        line += " ";
   }
   print(line);
 }
}

function fc(a,b,c) {
  "compiled";
  var i="";
  i+=a;
  i+=b;
  i+=c;
  return i;
}


// End
