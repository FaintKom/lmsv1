"""
Replace static SVG illustrations with interactive HTML/JS widgets in lesson theory.
Creates additional HTML blocks with interactive content that renders in sandboxed iframes.

Run on server: cd /opt/lms && python3 fix_interactive.py
"""
import requests
import os
import json
import sys
import uuid

API = "http://localhost:8000/api/v1"

# Login
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
if r.status_code != 200:
    print(f"Login failed: {r.status_code}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in")

# Get course
courses = requests.get(f"{API}/courses", headers=H).json()
courses = courses if isinstance(courses, list) else courses.get("items", [])
sat = [c for c in courses if "SAT" in c.get("title", "")]
if not sat:
    print("SAT Math course not found")
    sys.exit(1)

cid = sat[0]["id"]
detail = requests.get(f"{API}/courses/{cid}", headers=H).json()
print(f"Course: {detail['title']}")

# Interactive widgets for specific lessons
WIDGETS = {}

# ─── Lesson 1.1: Interactive linear equation explorer ────────────
WIDGETS["Solving Linear Equations"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto;padding:20px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Try it: Solve ax + b = c</h4>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
<label style="font-size:14px">a = <input type="range" id="sl_a" min="1" max="10" value="3" style="width:80px"><span id="v_a" style="font-weight:bold;color:#6366f1">3</span></label>
<label style="font-size:14px">b = <input type="range" id="sl_b" min="-10" max="20" value="7" style="width:80px"><span id="v_b" style="font-weight:bold;color:#6366f1">7</span></label>
<label style="font-size:14px">c = <input type="range" id="sl_c" min="0" max="50" value="22" style="width:80px"><span id="v_c" style="font-weight:bold;color:#6366f1">22</span></label>
</div>
<div id="eq_display" style="font-size:20px;font-weight:bold;text-align:center;padding:16px;background:white;border-radius:12px;border:2px solid #c7d2fe;margin-bottom:12px">3x + 7 = 22</div>
<div id="eq_steps" style="font-size:14px;padding:12px;background:#eff6ff;border-radius:8px"></div>
<script>
function upd(){
  var a=+document.getElementById('sl_a').value, b=+document.getElementById('sl_b').value, c=+document.getElementById('sl_c').value;
  document.getElementById('v_a').textContent=a;
  document.getElementById('v_b').textContent=b;
  document.getElementById('v_c').textContent=c;
  document.getElementById('eq_display').innerHTML=a+'x '+(b>=0?'+ ':' ')+b+' = '+c;
  var x=(c-b)/a;
  var xr=Math.round(x*100)/100;
  document.getElementById('eq_steps').innerHTML=
    '<div style="margin:4px 0">Step 1: Subtract '+b+' from both sides: <b>'+a+'x = '+(c-b)+'</b></div>'+
    '<div style="margin:4px 0">Step 2: Divide by '+a+': <b>x = '+(c-b)+'/'+a+' = '+xr+'</b></div>'+
    '<div style="margin:8px 0;color:#059669;font-weight:bold">✅ x = '+xr+'</div>';
}
document.getElementById('sl_a').oninput=upd;
document.getElementById('sl_b').oninput=upd;
document.getElementById('sl_c').oninput=upd;
upd();
</script>
</div>"""

# ─── Lesson 1.4: Interactive slope explorer ───────────────────────
WIDGETS["Linear Functions & Slope"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Interactive: Explore y = mx + b</h4>
<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:12px">
<label style="font-size:14px">Slope m = <input type="range" id="sl_m" min="-30" max="30" value="20" style="width:120px"><span id="v_m" style="font-weight:bold;color:#6366f1">2.0</span></label>
<label style="font-size:14px">Intercept b = <input type="range" id="sl_b2" min="-50" max="50" value="-10" style="width:120px"><span id="v_b2" style="font-weight:bold;color:#6366f1">-1.0</span></label>
</div>
<canvas id="graphCanvas" width="500" height="400" style="width:100%;max-width:500px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto"></canvas>
<div id="eq_label" style="text-align:center;font-size:18px;font-weight:bold;color:#6366f1;margin-top:8px">y = 2.0x + (-1.0)</div>
<script>
var canvas=document.getElementById('graphCanvas'),ctx=canvas.getContext('2d');
function draw(){
  var m=document.getElementById('sl_m').value/10, b=document.getElementById('sl_b2').value/10;
  document.getElementById('v_m').textContent=m.toFixed(1);
  document.getElementById('v_b2').textContent=b.toFixed(1);
  document.getElementById('eq_label').textContent='y = '+m.toFixed(1)+'x + ('+b.toFixed(1)+')';
  ctx.clearRect(0,0,500,400);
  var cx=250,cy=200,sc=30;
  // Grid
  ctx.strokeStyle='#f1f5f9';ctx.lineWidth=1;
  for(var i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(cx+i*sc,0);ctx.lineTo(cx+i*sc,400);ctx.stroke();ctx.beginPath();ctx.moveTo(0,cy+i*sc);ctx.lineTo(500,cy+i*sc);ctx.stroke();}
  // Axes
  ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(500,cy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,400);ctx.stroke();
  // Axis labels
  ctx.fillStyle='#64748b';ctx.font='12px system-ui';
  for(var i=-7;i<=7;i++){if(i!==0){ctx.fillText(i,cx+i*sc-4,cy+15);ctx.fillText(i,cx+8,cy-i*sc+4);}}
  // Line
  ctx.strokeStyle='#6366f1';ctx.lineWidth=3;ctx.beginPath();
  var x1=-8,y1=m*x1+b,x2=8,y2=m*x2+b;
  ctx.moveTo(cx+x1*sc,cy-y1*sc);ctx.lineTo(cx+x2*sc,cy-y2*sc);ctx.stroke();
  // Y-intercept point
  ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(cx,cy-b*sc,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ef4444';ctx.font='bold 12px system-ui';ctx.fillText('(0, '+b.toFixed(1)+')',cx+10,cy-b*sc-8);
  // Rise/Run triangle
  if(Math.abs(m)>0.05){
    var px=1,py1=m*px+b,py2=m*(px+1)+b;
    ctx.strokeStyle='#f59e0b';ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(cx+px*sc,cy-py1*sc);ctx.lineTo(cx+(px+1)*sc,cy-py1*sc);ctx.lineTo(cx+(px+1)*sc,cy-py2*sc);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#f59e0b';ctx.font='11px system-ui';
    ctx.fillText('run=1',cx+px*sc+5,cy-py1*sc+15);
    ctx.fillText('rise='+m.toFixed(1),cx+(px+1)*sc+5,cy-(py1+py2)/2*sc);
  }
}
document.getElementById('sl_m').oninput=draw;
document.getElementById('sl_b2').oninput=draw;
draw();
</script>
</div>"""

# ─── Lesson 1.5: Interactive point plotter ────────────────────────
WIDGETS["Graphing Linear Equations"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Click to Plot: y = x + 2</h4>
<p style="font-size:13px;color:#64748b;margin:0 0 8px">Click on the grid to place points. Green points are on the line y = x + 2.</p>
<canvas id="plotCanvas" width="400" height="400" style="width:100%;max-width:400px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto;cursor:crosshair"></canvas>
<div id="plotInfo" style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">Click the grid!</div>
<script>
var c2=document.getElementById('plotCanvas'),x2=c2.getContext('2d'),pts=[];
function drawGrid(){
  x2.clearRect(0,0,400,400);var cx=200,cy=200,sc=30;
  x2.strokeStyle='#f1f5f9';x2.lineWidth=1;
  for(var i=-6;i<=6;i++){x2.beginPath();x2.moveTo(cx+i*sc,0);x2.lineTo(cx+i*sc,400);x2.stroke();x2.beginPath();x2.moveTo(0,cy+i*sc);x2.lineTo(400,cy+i*sc);x2.stroke();}
  x2.strokeStyle='#94a3b8';x2.lineWidth=2;x2.beginPath();x2.moveTo(0,cy);x2.lineTo(400,cy);x2.stroke();x2.beginPath();x2.moveTo(cx,0);x2.lineTo(cx,400);x2.stroke();
  // Draw y=x+2
  x2.strokeStyle='#c7d2fe';x2.lineWidth=2;x2.setLineDash([6,4]);x2.beginPath();
  x2.moveTo(cx-6*sc,cy-(-6+2)*sc);x2.lineTo(cx+6*sc,cy-(6+2)*sc);x2.stroke();x2.setLineDash([]);
  // Draw points
  pts.forEach(function(p){
    var onLine=Math.abs(p.y-(p.x+2))<0.3;
    x2.fillStyle=onLine?'#22c55e':'#ef4444';x2.beginPath();x2.arc(cx+p.x*sc,cy-p.y*sc,7,0,Math.PI*2);x2.fill();
    x2.fillStyle='#1e293b';x2.font='11px system-ui';x2.fillText('('+p.x+','+p.y+')',cx+p.x*sc+10,cy-p.y*sc-5);
  });
}
c2.onclick=function(e){
  var r=c2.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  var sc=30,cx=200,cy=200;
  var gx=Math.round((sx-cx)/sc),gy=Math.round((cy-sy)/sc);
  pts.push({x:gx,y:gy});
  var onLine=Math.abs(gy-(gx+2))<0.3;
  document.getElementById('plotInfo').innerHTML=onLine?
    '<span style="color:#22c55e;font-weight:bold">✅ ('+gx+', '+gy+') is ON the line y = x + 2</span>':
    '<span style="color:#ef4444;font-weight:bold">❌ ('+gx+', '+gy+') is NOT on the line. y should be '+(gx+2)+'</span>';
  drawGrid();
};
drawGrid();
</script>
</div>"""

# ─── Lesson 3.2: Interactive parabola explorer ────────────────────
WIDGETS["Graphing Quadratics"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Explore: y = a(x - h)² + k</h4>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">
<label style="font-size:14px">a = <input type="range" id="qa" min="-20" max="20" value="10" style="width:100px"><span id="va" style="font-weight:bold;color:#6366f1">1.0</span></label>
<label style="font-size:14px">h = <input type="range" id="qh" min="-40" max="40" value="0" style="width:100px"><span id="vh" style="font-weight:bold;color:#ef4444">0.0</span></label>
<label style="font-size:14px">k = <input type="range" id="qk" min="-40" max="40" value="0" style="width:100px"><span id="vk" style="font-weight:bold;color:#10b981">0.0</span></label>
</div>
<canvas id="qCanvas" width="500" height="400" style="width:100%;max-width:500px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto"></canvas>
<div id="qInfo" style="text-align:center;margin-top:8px;font-size:14px"><span style="color:#6366f1;font-weight:bold">y = 1.0(x)² + 0</span> &nbsp; Vertex: <span style="color:#ef4444;font-weight:bold">(0, 0)</span></div>
<script>
var qc=document.getElementById('qCanvas'),qx=qc.getContext('2d');
function drawQ(){
  var a=document.getElementById('qa').value/10,h=document.getElementById('qh').value/10,k=document.getElementById('qk').value/10;
  document.getElementById('va').textContent=a.toFixed(1);
  document.getElementById('vh').textContent=h.toFixed(1);
  document.getElementById('vk').textContent=k.toFixed(1);
  qx.clearRect(0,0,500,400);var cx=250,cy=200,sc=25;
  // Grid
  qx.strokeStyle='#f1f5f9';qx.lineWidth=1;
  for(var i=-10;i<=10;i++){qx.beginPath();qx.moveTo(cx+i*sc,0);qx.lineTo(cx+i*sc,400);qx.stroke();qx.beginPath();qx.moveTo(0,cy+i*sc);qx.lineTo(500,cy+i*sc);qx.stroke();}
  qx.strokeStyle='#94a3b8';qx.lineWidth=2;qx.beginPath();qx.moveTo(0,cy);qx.lineTo(500,cy);qx.stroke();qx.beginPath();qx.moveTo(cx,0);qx.lineTo(cx,400);qx.stroke();
  // Parabola
  qx.strokeStyle='#6366f1';qx.lineWidth=3;qx.beginPath();
  for(var px=-10;px<=10;px+=0.1){var yv=a*(px-h)*(px-h)+k;var sx=cx+px*sc,sy=cy-yv*sc;if(sy>-50&&sy<450){if(px===-10)qx.moveTo(sx,sy);else qx.lineTo(sx,sy);}}
  qx.stroke();
  // Axis of symmetry
  qx.strokeStyle='#ef4444';qx.lineWidth=1;qx.setLineDash([4,4]);qx.beginPath();qx.moveTo(cx+h*sc,0);qx.lineTo(cx+h*sc,400);qx.stroke();qx.setLineDash([]);
  // Vertex
  qx.fillStyle='#ef4444';qx.beginPath();qx.arc(cx+h*sc,cy-k*sc,7,0,Math.PI*2);qx.fill();
  qx.fillStyle='#ef4444';qx.font='bold 12px system-ui';qx.fillText('vertex ('+h.toFixed(1)+', '+k.toFixed(1)+')',cx+h*sc+12,cy-k*sc-10);
  // Info
  var eq='y = '+a.toFixed(1)+(h!==0?'(x '+(h>0?'- ':'+ ')+Math.abs(h).toFixed(1)+')':'x')+'² '+(k>=0?'+ ':'')+k.toFixed(1);
  document.getElementById('qInfo').innerHTML='<span style="color:#6366f1;font-weight:bold">'+eq+'</span> &nbsp; Opens '+(a>0?'UP ↑':'DOWN ↓')+' &nbsp; Vertex: <span style="color:#ef4444;font-weight:bold">('+h.toFixed(1)+', '+k.toFixed(1)+')</span>';
}
document.getElementById('qa').oninput=drawQ;document.getElementById('qh').oninput=drawQ;document.getElementById('qk').oninput=drawQ;
drawQ();
</script>
</div>"""

# ─── Lesson 3.5: Interactive transformation explorer ──────────────
WIDGETS["Function Transformations"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Transform f(x) = x²</h4>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
<label style="font-size:13px">Horizontal shift: <input type="range" id="th" min="-40" max="40" value="0" style="width:100px"><span id="tvh" style="font-weight:bold;color:#f59e0b">0</span></label>
<label style="font-size:13px">Vertical shift: <input type="range" id="tv" min="-40" max="40" value="0" style="width:100px"><span id="tvv" style="font-weight:bold;color:#10b981">0</span></label>
<label style="font-size:13px">Stretch: <input type="range" id="ta" min="-20" max="20" value="10" style="width:100px"><span id="tva" style="font-weight:bold;color:#6366f1">1.0</span></label>
</div>
<canvas id="tCanvas" width="500" height="400" style="width:100%;max-width:500px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto"></canvas>
<div id="tEq" style="text-align:center;margin-top:8px;font-size:15px;font-weight:bold;color:#6366f1">g(x) = x²</div>
<script>
var tc=document.getElementById('tCanvas'),tx=tc.getContext('2d');
function drawT(){
  var h=document.getElementById('th').value/10,v=document.getElementById('tv').value/10,a=document.getElementById('ta').value/10;
  document.getElementById('tvh').textContent=h.toFixed(1);
  document.getElementById('tvv').textContent=v.toFixed(1);
  document.getElementById('tva').textContent=a.toFixed(1);
  tx.clearRect(0,0,500,400);var cx=250,cy=250,sc=25;
  // Grid
  tx.strokeStyle='#f1f5f9';tx.lineWidth=1;
  for(var i=-10;i<=10;i++){tx.beginPath();tx.moveTo(cx+i*sc,0);tx.lineTo(cx+i*sc,400);tx.stroke();tx.beginPath();tx.moveTo(0,cy+i*sc);tx.lineTo(500,cy+i*sc);tx.stroke();}
  tx.strokeStyle='#94a3b8';tx.lineWidth=1.5;tx.beginPath();tx.moveTo(0,cy);tx.lineTo(500,cy);tx.stroke();tx.beginPath();tx.moveTo(cx,0);tx.lineTo(cx,400);tx.stroke();
  // Parent f(x)=x² (gray dashed)
  tx.strokeStyle='#cbd5e1';tx.lineWidth=2;tx.setLineDash([6,4]);tx.beginPath();
  for(var px=-8;px<=8;px+=0.1){var yv=px*px;var sx=cx+px*sc,sy=cy-yv*sc;if(sy>-50&&sy<450){if(px===-8)tx.moveTo(sx,sy);else tx.lineTo(sx,sy);}}
  tx.stroke();tx.setLineDash([]);
  tx.fillStyle='#94a3b8';tx.font='12px system-ui';tx.fillText('f(x) = x²',cx+5*sc,cy-25*sc+15);
  // Transformed g(x)=a(x-h)²+v
  tx.strokeStyle='#6366f1';tx.lineWidth=3;tx.beginPath();
  for(var px=-8;px<=8;px+=0.1){var yv=a*(px-h)*(px-h)+v;var sx=cx+px*sc,sy=cy-yv*sc;if(sy>-50&&sy<450){if(px===-8)tx.moveTo(sx,sy);else tx.lineTo(sx,sy);}}
  tx.stroke();
  // Vertex
  tx.fillStyle='#ef4444';tx.beginPath();tx.arc(cx+h*sc,cy-v*sc,6,0,Math.PI*2);tx.fill();
  // Equation
  var parts=[];
  if(a!==1)parts.push(a.toFixed(1));
  parts.push(h!==0?'(x '+(h>0?'- ':'+ ')+Math.abs(h).toFixed(1)+')²':'x²');
  if(v!==0)parts.push((v>0?'+ ':'')+v.toFixed(1));
  document.getElementById('tEq').innerHTML='<span style="color:#cbd5e1">f(x) = x²</span> → <span style="color:#6366f1">g(x) = '+parts.join('')+'</span>';
}
document.getElementById('th').oninput=drawT;document.getElementById('tv').oninput=drawT;document.getElementById('ta').oninput=drawT;
drawT();
</script>
</div>"""

# ─── Lesson 2.4: Interactive scatter plot ─────────────────────────
WIDGETS["Scatter Plots & Lines of Best Fit"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Draw a Line of Best Fit</h4>
<p style="font-size:13px;color:#64748b;margin:0 0 8px">Drag the orange endpoints to match the data trend.</p>
<canvas id="scCanvas" width="500" height="400" style="width:100%;max-width:500px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto;cursor:grab"></canvas>
<div id="scInfo" style="text-align:center;font-size:13px;color:#64748b;margin-top:8px">Slope: — &nbsp; Intercept: —</div>
<script>
var sc=document.getElementById('scCanvas'),sx=sc.getContext('2d');
var data=[{x:1,y:25},{x:2,y:35},{x:2.5,y:32},{x:3,y:48},{x:4,y:52},{x:4.5,y:60},{x:5,y:65},{x:6,y:72},{x:7,y:85}];
var ep1={x:0.5,y:20},ep2={x:7.5,y:88},drag=null;
function toSx(x){return 60+x*55;}function toSy(y){return 370-y*3.5;}
function fromSx(sx){return (sx-60)/55;}function fromSy(sy){return (370-sy)/3.5;}
function drawSc(){
  sx.clearRect(0,0,500,400);
  // Grid
  sx.strokeStyle='#f1f5f9';sx.lineWidth=1;
  for(var i=0;i<=8;i++){var x=toSx(i);sx.beginPath();sx.moveTo(x,20);sx.lineTo(x,380);sx.stroke();}
  for(var i=0;i<=100;i+=20){var y=toSy(i);sx.beginPath();sx.moveTo(50,y);sx.lineTo(490,y);sx.stroke();sx.fillStyle='#94a3b8';sx.font='11px system-ui';sx.fillText(i,30,y+4);}
  // Axes
  sx.strokeStyle='#94a3b8';sx.lineWidth=2;sx.beginPath();sx.moveTo(50,380);sx.lineTo(490,380);sx.stroke();sx.beginPath();sx.moveTo(50,20);sx.lineTo(50,380);sx.stroke();
  sx.fillStyle='#64748b';sx.font='12px system-ui';for(var i=1;i<=8;i++)sx.fillText(i,toSx(i)-3,395);
  // Data points
  data.forEach(function(p){sx.fillStyle='#6366f1';sx.beginPath();sx.arc(toSx(p.x),toSy(p.y),6,0,Math.PI*2);sx.fill();});
  // Best-fit line
  sx.strokeStyle='#f59e0b';sx.lineWidth=2.5;sx.beginPath();sx.moveTo(toSx(ep1.x),toSy(ep1.y));sx.lineTo(toSx(ep2.x),toSy(ep2.y));sx.stroke();
  // Endpoints
  [ep1,ep2].forEach(function(p){sx.fillStyle='#f59e0b';sx.beginPath();sx.arc(toSx(p.x),toSy(p.y),8,0,Math.PI*2);sx.fill();sx.strokeStyle='white';sx.lineWidth=2;sx.stroke();});
  // Info
  var slope=(ep2.y-ep1.y)/(ep2.x-ep1.x);var intercept=ep1.y-slope*ep1.x;
  document.getElementById('scInfo').innerHTML='Slope: <b>'+slope.toFixed(1)+'</b> &nbsp; Intercept: <b>'+intercept.toFixed(1)+'</b> &nbsp; Line: y = '+slope.toFixed(1)+'x + '+intercept.toFixed(1);
}
sc.onpointerdown=function(e){
  var r=sc.getBoundingClientRect(),mx=(e.clientX-r.left)*(500/r.width),my=(e.clientY-r.top)*(400/r.height);
  var d1=Math.hypot(toSx(ep1.x)-mx,toSy(ep1.y)-my),d2=Math.hypot(toSx(ep2.x)-mx,toSy(ep2.y)-my);
  if(d1<20)drag=ep1;else if(d2<20)drag=ep2;
  sc.setPointerCapture(e.pointerId);
};
sc.onpointermove=function(e){
  if(!drag)return;
  var r=sc.getBoundingClientRect(),mx=(e.clientX-r.left)*(500/r.width),my=(e.clientY-r.top)*(400/r.height);
  drag.x=Math.max(0,Math.min(8,fromSx(mx)));drag.y=Math.max(0,Math.min(100,fromSy(my)));
  drawSc();
};
sc.onpointerup=function(){drag=null;};
drawSc();
</script>
</div>"""

# ─── Lesson 3.4: Exponential growth explorer ─────────────────────
WIDGETS["Exponential Functions"] = """<div style="font-family:system-ui;max-width:600px;margin:16px auto">
<h4 style="margin:0 0 12px;color:#4f46e5">🎮 Explore: y = a · b^x</h4>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">
<label style="font-size:14px">a = <input type="range" id="ea" min="5" max="30" value="10" style="width:100px"><span id="vea" style="font-weight:bold;color:#6366f1">1.0</span></label>
<label style="font-size:14px">base b = <input type="range" id="eb" min="5" max="30" value="20" style="width:100px"><span id="veb" style="font-weight:bold;color:#10b981">2.0</span></label>
</div>
<canvas id="eCanvas" width="500" height="350" style="width:100%;max-width:500px;background:white;border:1px solid #e2e8f0;border-radius:12px;display:block;margin:0 auto"></canvas>
<div id="eInfo" style="text-align:center;margin-top:8px;font-size:14px;font-weight:bold"><span style="color:#6366f1">y = 1.0 · 2.0^x</span> — <span style="color:#10b981">Growth</span></div>
<script>
var ec=document.getElementById('eCanvas'),ex=ec.getContext('2d');
function drawE(){
  var a=document.getElementById('ea').value/10,b=document.getElementById('eb').value/10;
  document.getElementById('vea').textContent=a.toFixed(1);
  document.getElementById('veb').textContent=b.toFixed(1);
  ex.clearRect(0,0,500,350);var cx=80,cy=300,scx=50,scy=25;
  // Grid
  ex.strokeStyle='#f1f5f9';ex.lineWidth=1;
  for(var i=0;i<=8;i++){var x=cx+i*scx;ex.beginPath();ex.moveTo(x,20);ex.lineTo(x,320);ex.stroke();ex.fillStyle='#94a3b8';ex.font='11px system-ui';ex.fillText(i,x-3,335);}
  for(var i=0;i<=12;i++){var y=cy-i*scy;if(y>10){ex.beginPath();ex.moveTo(70,y);ex.lineTo(490,y);ex.stroke();ex.fillText(i,50,y+4);}}
  // Axes
  ex.strokeStyle='#94a3b8';ex.lineWidth=2;ex.beginPath();ex.moveTo(70,cy);ex.lineTo(490,cy);ex.stroke();ex.beginPath();ex.moveTo(cx,10);ex.lineTo(cx,320);ex.stroke();
  // Curve
  ex.strokeStyle=b>1?'#10b981':'#ef4444';ex.lineWidth=3;ex.beginPath();
  for(var px=0;px<=8;px+=0.05){var yv=a*Math.pow(b,px);var sx=cx+px*scx,sy=cy-yv*scy;if(sy>10&&sy<320){if(px===0)ex.moveTo(sx,sy);else ex.lineTo(sx,sy);}}
  ex.stroke();
  // Y-intercept
  ex.fillStyle='#ef4444';ex.beginPath();ex.arc(cx,cy-a*scy,5,0,Math.PI*2);ex.fill();
  ex.fillStyle='#ef4444';ex.font='bold 11px system-ui';ex.fillText('(0, '+a.toFixed(1)+')',cx+8,cy-a*scy-8);
  // Info
  var type=b>1?'Growth ↑':b<1?'Decay ↓':'Constant —';
  var color=b>1?'#10b981':b<1?'#ef4444':'#94a3b8';
  document.getElementById('eInfo').innerHTML='<span style="color:#6366f1">y = '+a.toFixed(1)+' · '+b.toFixed(1)+'^x</span> — <span style="color:'+color+'">'+type+'</span>';
}
document.getElementById('ea').oninput=drawE;document.getElementById('eb').oninput=drawE;
drawE();
</script>
</div>"""

# ─── Now inject widgets into lessons ──────────────────────────────
injected = 0
for mod in detail.get("modules", []):
    mid = mod["id"]
    for lesson in mod.get("lessons", []):
        ltitle = lesson["title"]
        if ltitle not in WIDGETS:
            continue

        lid = lesson["id"]
        # Get current lesson content
        lr = requests.get(f"{API}/courses/{cid}/lessons/{lid}", headers=H)
        if lr.status_code != 200:
            continue
        ldata = lr.json()
        content = ldata.get("content", {})
        blocks = content.get("blocks", [])

        # Check if already has an interactive block
        has_interactive = any("<script" in (b.get("body", "") or "") for b in blocks)
        if has_interactive:
            print(f"  SKIP {ltitle} (already has interactive)")
            continue

        # Find position: after the first text block, before exercises
        insert_idx = 1  # after theory block
        for i, b in enumerate(blocks):
            if b.get("type") == "exercise":
                insert_idx = i
                break
            insert_idx = i + 1

        # Insert new HTML block with the interactive widget
        new_block = {
            "id": f"b{uuid.uuid4().hex[:6]}",
            "type": "html",
            "sort_order": insert_idx,
            "page": 1,
            "body": WIDGETS[ltitle],
            "format": "html",
        }
        blocks.insert(insert_idx, new_block)

        # Re-number sort_orders
        for i, b in enumerate(blocks):
            b["sort_order"] = i

        # Update lesson
        new_content = {"version": 2, "blocks": blocks}
        ur = requests.put(
            f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}",
            json={"content": new_content},
            headers=H,
        )
        if ur.status_code == 200:
            print(f"  ✅ {ltitle} - interactive widget added")
            injected += 1
        else:
            print(f"  ❌ {ltitle} - failed: {ur.status_code}")

print(f"\nDone! Injected {injected} interactive widgets into lessons.")
