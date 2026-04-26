#!/usr/bin/env python3
"""
Generate sat_math_pro_course_html.json from sat_math_pro_course_4cid.json.
Each lesson's theory field is replaced with rich HTML including:
  - Styled math theory with proper formatting
  - Interactive canvas-based widgets where relevant
  - Visually distinct 4C/ID section cards
"""

import json
import re
import sys
import copy

sys.stdout.reconfigure(encoding='utf-8')

# ─── Widget Templates ────────────────────────────────────────────────────────

WIDGET_SLOPE = '''<div style="margin:20px 0;font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">&#x1F4CA; Interactive Slope Visualizer</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Drag the point inputs to see how slope = rise/run changes.</p>
  <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;font-family:monospace;font-size:13px">
    <div>Point A: (<input id="sw-x1" type="number" value="1" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fbbf24;text-align:center;font-family:monospace" onchange="drawSW()">,<input id="sw-y1" type="number" value="2" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fbbf24;text-align:center;font-family:monospace" onchange="drawSW()">)</div>
    <div>Point B: (<input id="sw-x2" type="number" value="5" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#22d3ee;text-align:center;font-family:monospace" onchange="drawSW()">,<input id="sw-y2" type="number" value="6" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#22d3ee;text-align:center;font-family:monospace" onchange="drawSW()">)</div>
  </div>
  <canvas id="sw-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a;cursor:crosshair"></canvas>
  <div id="sw-info" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;background:#1e293b;border-radius:10px"></div>
  <script>
    (function(){
      var cv=document.getElementById('sw-cv'),ctx=cv.getContext('2d');
      var W=400,H=300,ox=W/2,oy=H/2,scale=25;
      window.drawSW=function(){
        var x1=+document.getElementById('sw-x1').value,y1=+document.getElementById('sw-y1').value;
        var x2=+document.getElementById('sw-x2').value,y2=+document.getElementById('sw-y2').value;
        ctx.clearRect(0,0,W,H);
        ctx.strokeStyle='#1e3a5f';ctx.lineWidth=0.5;
        for(var i=-10;i<=10;i++){var px=ox+i*scale;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,H);ctx.stroke();var py=oy-i*scale;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(W,py);ctx.stroke()}
        ctx.strokeStyle='#475569';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
        var px1=ox+x1*scale,py1=oy-y1*scale,px2=ox+x2*scale,py2=oy-y2*scale;
        var rise=y2-y1,run=x2-x1;
        if(run!==0){
          ctx.setLineDash([5,5]);ctx.strokeStyle='#ef444488';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(px1,py1);ctx.lineTo(px2,py1);ctx.stroke();
          ctx.strokeStyle='#22c55e88';
          ctx.beginPath();ctx.moveTo(px2,py1);ctx.lineTo(px2,py2);ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle='#ef4444';ctx.font='bold 12px monospace';ctx.fillText('run='+run,(px1+px2)/2,py1+15);
          ctx.fillStyle='#22c55e';ctx.fillText('rise='+rise,px2+5,(py1+py2)/2);
        }
        if(run!==0){
          var m=rise/run;var b=y1-m*x1;
          ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(ox+(-10)*scale,oy-(m*(-10)+b)*scale);ctx.lineTo(ox+10*scale,oy-(m*10+b)*scale);ctx.stroke();
        }
        ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(px1,py1,7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#22d3ee';ctx.beginPath();ctx.arc(px2,py2,7,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fbbf24';ctx.font='bold 12px monospace';ctx.fillText('A('+x1+','+y1+')',px1+10,py1-8);
        ctx.fillStyle='#22d3ee';ctx.fillText('B('+x2+','+y2+')',px2+10,py2-8);
        var info='';
        if(run===0)info='<span style="color:#ef4444">Slope is undefined (vertical line)</span>';
        else{var m=(rise/run);info='slope = rise/run = '+rise+'/'+run+' = <strong style="color:#38bdf8">'+m.toFixed(2)+'</strong>'}
        document.getElementById('sw-info').innerHTML=info;
      };
      drawSW();
    })();
  </script>
</div>'''

WIDGET_QUADRATIC = '''<div style="margin:20px 0;font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">&#x1F4C8; Parabola Explorer</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Adjust a, b, c sliders to see how the parabola y = ax&sup2; + bx + c changes.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;font-size:13px">
    <div style="text-align:center"><label>a = <span id="qw-a-v">1</span></label><br/><input id="qw-a" type="range" min="-3" max="3" step="0.5" value="1" oninput="drawQW()" style="width:100%;accent-color:#ef4444"/></div>
    <div style="text-align:center"><label>b = <span id="qw-b-v">0</span></label><br/><input id="qw-b" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawQW()" style="width:100%;accent-color:#22c55e"/></div>
    <div style="text-align:center"><label>c = <span id="qw-c-v">0</span></label><br/><input id="qw-c" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawQW()" style="width:100%;accent-color:#3b82f6"/></div>
  </div>
  <canvas id="qw-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
  <div id="qw-info" style="text-align:center;font-family:monospace;font-size:13px;margin-top:8px;padding:8px;background:#1e293b;border-radius:10px"></div>
  <script>
    (function(){
      var cv=document.getElementById('qw-cv'),ctx=cv.getContext('2d');
      var W=400,H=300,ox=W/2,oy=H*0.65,scale=25;
      window.drawQW=function(){
        var a=+document.getElementById('qw-a').value,b=+document.getElementById('qw-b').value,c=+document.getElementById('qw-c').value;
        document.getElementById('qw-a-v').textContent=a;document.getElementById('qw-b-v').textContent=b;document.getElementById('qw-c-v').textContent=c;
        ctx.clearRect(0,0,W,H);
        ctx.strokeStyle='#1e3a5f';ctx.lineWidth=0.5;
        for(var i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(ox+i*scale,0);ctx.lineTo(ox+i*scale,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,oy-i*scale);ctx.lineTo(W,oy-i*scale);ctx.stroke()}
        ctx.strokeStyle='#475569';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
        if(a!==0){
          ctx.strokeStyle='#f472b6';ctx.lineWidth=2.5;ctx.beginPath();
          for(var px=0;px<=W;px++){var x=(px-ox)/scale;var y=a*x*x+b*x+c;var py=oy-y*scale;if(px===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
          ctx.stroke();
          var vx=-b/(2*a),vy=a*vx*vx+b*vx+c;
          var vpx=ox+vx*scale,vpy=oy-vy*scale;
          ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(vpx,vpy,6,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fbbf24';ctx.font='bold 11px monospace';ctx.fillText('vertex('+vx.toFixed(1)+','+vy.toFixed(1)+')',vpx+8,vpy-8);
          ctx.setLineDash([4,4]);ctx.strokeStyle='#fbbf2466';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(vpx,0);ctx.lineTo(vpx,H);ctx.stroke();ctx.setLineDash([]);
          // discriminant
          var disc=b*b-4*a*c;
          var roots='';
          if(disc>0){var r1=(-b+Math.sqrt(disc))/(2*a),r2=(-b-Math.sqrt(disc))/(2*a);roots=' | roots: '+r1.toFixed(2)+', '+r2.toFixed(2);ctx.fillStyle='#22c55e';ctx.beginPath();ctx.arc(ox+r1*scale,oy,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ox+r2*scale,oy,5,0,Math.PI*2);ctx.fill()}
          else if(disc===0){var r1=-b/(2*a);roots=' | root: '+r1.toFixed(2);ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(ox+r1*scale,oy,5,0,Math.PI*2);ctx.fill()}
          else roots=' | no real roots';
        }
        var eq='y = '+a+'x\\u00B2 '+(b>=0?'+ ':'')+b+'x '+(c>=0?'+ ':'')+c;
        document.getElementById('qw-info').innerHTML='<span style="color:#f472b6">'+eq+'</span>'+(a!==0?' | vertex: <span style="color:#fbbf24">('+(-b/(2*a)).toFixed(1)+', '+(a*(-b/(2*a))*(-b/(2*a))+b*(-b/(2*a))+c).toFixed(1)+')</span>'+(roots||''):'');
      };
      drawQW();
    })();
  </script>
</div>'''

WIDGET_SYSTEM = '''<div style="margin:20px 0;font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">&#x1F50D; System of Equations Visualizer</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Adjust slopes and intercepts to see where two lines intersect.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:12px;font-family:monospace">
    <div style="background:#0f172a;padding:10px;border-radius:10px;border:1.5px solid #ef4444">
      <div style="color:#ef4444;margin-bottom:6px">Line 1: y = m&#8321;x + b&#8321;</div>
      m&#8321;=<span id="sw-m1v">1</span> <input id="sw-m1" type="range" min="-3" max="3" step="0.25" value="1" oninput="drawSysW()" style="width:80%;accent-color:#ef4444"/><br/>
      b&#8321;=<span id="sw-b1v">0</span> <input id="sw-b1" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawSysW()" style="width:80%;accent-color:#ef4444"/>
    </div>
    <div style="background:#0f172a;padding:10px;border-radius:10px;border:1.5px solid #3b82f6">
      <div style="color:#3b82f6;margin-bottom:6px">Line 2: y = m&#8322;x + b&#8322;</div>
      m&#8322;=<span id="sw-m2v">-0.5</span> <input id="sw-m2" type="range" min="-3" max="3" step="0.25" value="-0.5" oninput="drawSysW()" style="width:80%;accent-color:#3b82f6"/><br/>
      b&#8322;=<span id="sw-b2v">3</span> <input id="sw-b2" type="range" min="-5" max="5" step="0.5" value="3" oninput="drawSysW()" style="width:80%;accent-color:#3b82f6"/>
    </div>
  </div>
  <canvas id="sw-sys-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
  <div id="sw-sys-info" style="text-align:center;font-family:monospace;font-size:13px;margin-top:8px;padding:8px;background:#1e293b;border-radius:10px"></div>
  <script>
    (function(){
      var cv=document.getElementById('sw-sys-cv'),ctx=cv.getContext('2d');
      var W=400,H=300,ox=W/2,oy=H/2,sc=25;
      window.drawSysW=function(){
        var m1=+document.getElementById('sw-m1').value,b1=+document.getElementById('sw-b1').value;
        var m2=+document.getElementById('sw-m2').value,b2=+document.getElementById('sw-b2').value;
        document.getElementById('sw-m1v').textContent=m1;document.getElementById('sw-b1v').textContent=b1;
        document.getElementById('sw-m2v').textContent=m2;document.getElementById('sw-b2v').textContent=b2;
        ctx.clearRect(0,0,W,H);
        ctx.strokeStyle='#1e3a5f';ctx.lineWidth=0.5;
        for(var i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(ox+i*sc,0);ctx.lineTo(ox+i*sc,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,oy-i*sc);ctx.lineTo(W,oy-i*sc);ctx.stroke()}
        ctx.strokeStyle='#475569';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
        function drawLine(m,b,color){ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,oy-(-ox/sc*m+b)*sc);ctx.lineTo(W,oy-((W-ox)/sc*m+b)*sc);ctx.stroke()}
        drawLine(m1,b1,'#ef4444');drawLine(m2,b2,'#3b82f6');
        var info='';
        if(m1===m2){info=b1===b2?'<span style="color:#fbbf24">Infinite solutions (same line)</span>':'<span style="color:#94a3b8">No solution (parallel lines)</span>'}
        else{
          var ix=(b2-b1)/(m1-m2),iy=m1*ix+b1;
          var px=ox+ix*sc,py=oy-iy*sc;
          ctx.fillStyle='#22c55e';ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#22c55e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,14,0,Math.PI*2);ctx.stroke();
          ctx.fillStyle='#22c55e';ctx.font='bold 12px monospace';ctx.fillText('('+ix.toFixed(1)+','+iy.toFixed(1)+')',px+12,py-10);
          info='Solution: <span style="color:#22c55e">('+ix.toFixed(2)+', '+iy.toFixed(2)+')</span>';
        }
        document.getElementById('sw-sys-info').innerHTML=info;
      };
      drawSysW();
    })();
  </script>
</div>'''

WIDGET_PYTHAGOREAN = '''<div style="margin:20px 0;font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">&#x1F4D0; Pythagorean Theorem Explorer</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Adjust sides a and b to see how a&sup2; + b&sup2; = c&sup2; works visually.</p>
  <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;flex-wrap:wrap">
    <div>a = <input id="pw-a" type="range" min="1" max="8" value="3" oninput="drawPW()" style="width:80px;accent-color:#ef4444"/> <span id="pw-a-v" style="color:#ef4444;font-family:monospace">3</span></div>
    <div>b = <input id="pw-b" type="range" min="1" max="8" value="4" oninput="drawPW()" style="width:80px;accent-color:#3b82f6"/> <span id="pw-b-v" style="color:#3b82f6;font-family:monospace">4</span></div>
  </div>
  <canvas id="pw-cv" width="400" height="340" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
  <div id="pw-info" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;background:#1e293b;border-radius:10px"></div>
  <script>
    (function(){
      var cv=document.getElementById('pw-cv'),ctx=cv.getContext('2d');
      window.drawPW=function(){
        var a=+document.getElementById('pw-a').value,b=+document.getElementById('pw-b').value;
        document.getElementById('pw-a-v').textContent=a;document.getElementById('pw-b-v').textContent=b;
        var c=Math.sqrt(a*a+b*b);
        ctx.clearRect(0,0,400,340);
        var sc=28,offx=140,offy=80;
        var Ax=offx,Ay=offy+a*sc;var Bx=offx+b*sc,By=offy+a*sc;var Cx=offx,Cy=offy;
        ctx.fillStyle='#ffffff10';ctx.beginPath();ctx.moveTo(Ax,Ay);ctx.lineTo(Bx,By);ctx.lineTo(Cx,Cy);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#e0e0e0';ctx.lineWidth=2;ctx.stroke();
        var s=10;ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(Ax+s,Ay);ctx.lineTo(Ax+s,Ay-s);ctx.lineTo(Ax,Ay-s);ctx.stroke();
        ctx.fillStyle='#ef444466';ctx.fillRect(Cx-a*sc,Cy,a*sc,a*sc);ctx.strokeStyle='#ef4444';ctx.lineWidth=1;ctx.strokeRect(Cx-a*sc,Cy,a*sc,a*sc);
        ctx.fillStyle='#ef4444';ctx.font='bold 14px monospace';ctx.fillText('a\\u00B2='+a*a,Cx-a*sc+4,Cy+a*sc/2+5);
        ctx.fillStyle='#3b82f666';ctx.fillRect(Ax,Ay,b*sc,b*sc);ctx.strokeStyle='#3b82f6';ctx.lineWidth=1;ctx.strokeRect(Ax,Ay,b*sc,b*sc);
        ctx.fillStyle='#3b82f6';ctx.font='bold 14px monospace';ctx.fillText('b\\u00B2='+b*b,Ax+4,Ay+b*sc/2+5);
        ctx.fillStyle='#ef4444';ctx.font='bold 15px monospace';ctx.fillText('a='+a,Ax-30,(Ay+Cy)/2+5);
        ctx.fillStyle='#3b82f6';ctx.fillText('b='+b,(Ax+Bx)/2-12,By+18);
        ctx.fillStyle='#22c55e';ctx.fillText('c='+c.toFixed(2),(Cx+Bx)/2+10,(Cy+By)/2-8);
        document.getElementById('pw-info').innerHTML=
          '<span style="color:#ef4444">'+a+'\\u00B2</span> + <span style="color:#3b82f6">'+b+'\\u00B2</span> = <span style="color:#ef4444">'+a*a+'</span> + <span style="color:#3b82f6">'+b*b+'</span> = <span style="color:#22c55e">'+(a*a+b*b)+'</span><br/>c = \\u221A'+(a*a+b*b)+' = <strong style="color:#22c55e">'+c.toFixed(4)+'</strong>';
      };
      drawPW();
    })();
  </script>
</div>'''

WIDGET_UNIT_CIRCLE = '''<div style="margin:20px 0;font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">&#x1F3AF; Unit Circle Interactive</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 8px">Drag the angle slider to explore sin, cos, and tan values.</p>
  <div style="text-align:center;margin-bottom:8px">
    <label style="font-size:13px">&#x03B8; = <span id="ucw-deg" style="color:#fbbf24;font-family:monospace">45</span>&#xB0; (<span id="ucw-rad" style="color:#94a3b8;font-family:monospace">0.79</span> rad)</label><br/>
    <input id="ucw-angle" type="range" min="0" max="360" value="45" oninput="drawUCW()" style="width:80%;accent-color:#7c3aed;margin-top:4px" />
  </div>
  <canvas id="ucw-cv" width="360" height="360" style="width:100%;max-width:360px;display:block;margin:0 auto;border-radius:10px;background:#0f172a"></canvas>
  <div id="ucw-vals" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;font-family:monospace;font-size:14px;text-align:center">
    <div style="padding:8px;background:#ef444422;border-radius:8px;border:1px solid #ef4444"><div style="font-size:11px;color:#fca5a5">sin &#x03B8;</div><div id="ucw-sin" style="color:#ef4444;font-weight:700">0.71</div></div>
    <div style="padding:8px;background:#3b82f622;border-radius:8px;border:1px solid #3b82f6"><div style="font-size:11px;color:#93c5fd">cos &#x03B8;</div><div id="ucw-cos" style="color:#3b82f6;font-weight:700">0.71</div></div>
    <div style="padding:8px;background:#22c55e22;border-radius:8px;border:1px solid #22c55e"><div style="font-size:11px;color:#86efac">tan &#x03B8;</div><div id="ucw-tan" style="color:#22c55e;font-weight:700">1.00</div></div>
  </div>
  <script>
    (function(){
      var cv=document.getElementById('ucw-cv'),ctx=cv.getContext('2d');
      var W=360,cx=W/2,cy=W/2,R=130;
      window.drawUCW=function(){
        var deg=+document.getElementById('ucw-angle').value;
        var rad=deg*Math.PI/180;
        document.getElementById('ucw-deg').textContent=deg;
        document.getElementById('ucw-rad').textContent=rad.toFixed(2);
        ctx.clearRect(0,0,W,W);
        ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,W);ctx.stroke();
        ctx.strokeStyle='#475569';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
        var px=cx+R*Math.cos(rad),py=cy-R*Math.sin(rad);
        ctx.strokeStyle='#fbbf24';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,30,0,-rad,true);ctx.stroke();
        ctx.fillStyle='#fbbf24';ctx.font='12px monospace';ctx.fillText(deg+'\\u00B0',cx+34,cy-8);
        ctx.strokeStyle='#3b82f6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,cy);ctx.stroke();
        ctx.strokeStyle='#ef4444';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,cy);ctx.lineTo(px,py);ctx.stroke();
        ctx.strokeStyle='#e0e0e0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
        ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
        var cosV=Math.cos(rad),sinV=Math.sin(rad),tanV=Math.tan(rad);
        ctx.fillStyle='#e0e0e0';ctx.font='11px monospace';ctx.fillText('('+cosV.toFixed(2)+', '+sinV.toFixed(2)+')',px+8,py-10);
        ctx.fillStyle='#475569';ctx.font='12px monospace';
        ctx.fillText('0',cx+R+6,cy+14);ctx.fillText('1',cx+R+6,cy-2);
        ctx.fillText('\\u03C0',cx-R-16,cy+14);
        document.getElementById('ucw-sin').textContent=sinV.toFixed(4);
        document.getElementById('ucw-cos').textContent=cosV.toFixed(4);
        document.getElementById('ucw-tan').textContent=Math.abs(tanV)>1e6?'undef':tanV.toFixed(4);
      };
      drawUCW();
    })();
  </script>
</div>'''

# ─── Determine which widget to embed per lesson ──────────────────────────────

# Map: (module_index, lesson_index) -> widget HTML
WIDGET_MAP = {
    # Linear equations in two variables - slope visualizer
    (0, 1): WIDGET_SLOPE,
    # Graphing and interpreting linear functions - slope visualizer
    (0, 2): WIDGET_SLOPE,
    # Systems by substitution - system visualizer
    (1, 0): WIDGET_SYSTEM,
    # Systems by elimination - system visualizer
    (1, 1): WIDGET_SYSTEM,
    # Systems no solution/infinite - system visualizer
    (1, 2): WIDGET_SYSTEM,
    # Systems of inequalities - system visualizer
    (1, 3): WIDGET_SYSTEM,
    # Factoring quadratics - quadratic explorer
    (2, 0): WIDGET_QUADRATIC,
    # Solving quadratics - quadratic explorer
    (2, 1): WIDGET_QUADRATIC,
    # Vertex form - quadratic explorer
    (2, 2): WIDGET_QUADRATIC,
    # Discriminant - quadratic explorer
    (2, 3): WIDGET_QUADRATIC,
    # Quadratic word problems - quadratic explorer
    (2, 4): WIDGET_QUADRATIC,
    # Pythagorean theorem - pythagorean widget
    (6, 3): WIDGET_PYTHAGOREAN,
    # Coordinate geometry midpoint/distance - slope (for coord plane)
    (6, 4): WIDGET_SLOPE,
    # Trig ratios - unit circle
    (7, 0): WIDGET_UNIT_CIRCLE,
    # Radians and degrees - unit circle
    (7, 1): WIDGET_UNIT_CIRCLE,
    # Arc length and sector area - unit circle
    (7, 2): WIDGET_UNIT_CIRCLE,
    # Circle theorems - unit circle
    (7, 3): WIDGET_UNIT_CIRCLE,
    # Equation of circle - unit circle
    (7, 4): WIDGET_UNIT_CIRCLE,
}


# ─── Markdown → HTML Converter ────────────────────────────────────────────────

def md_to_html(md_text: str) -> str:
    """Convert SAT course markdown theory to styled HTML."""
    # Convert LaTeX-like math symbols to unicode/HTML entities
    text = md_text

    # Replace common LaTeX patterns with unicode
    replacements = [
        (r'\neq', '≠'), (r'\leq', '≤'), (r'\geq', '≥'),
        (r'\sqrt{2}', '√2'), (r'\sqrt{3}', '√3'), (r'\sqrt{x}', '√x'),
        (r'\sqrt[3]{x^5}', '&#x2731;(x⁵)'), (r'\sqrt[4]{16}', '⁴√16'),
        (r'\sqrt[n]{a^m}', 'ⁿ√(aᵐ)'),
        (r'\pi', 'π'), (r'\theta', 'θ'),
        (r'\infty', '∞'), (r'\Delta', 'Δ'),
        (r'\cdot', '·'), (r'\times', '×'),
        (r'\rightarrow', '→'), (r'\implies', '⟹'),
        (r'\pm', '±'),
    ]

    # Parse the markdown sections
    sections = parse_sections(text)
    return sections


def parse_sections(md_text: str):
    """Parse markdown into structured sections and return dict of section content."""
    sections = {}
    current_section = 'intro'
    current_content = []

    for line in md_text.split('\n'):
        if line.startswith('### '):
            if current_content:
                sections[current_section] = '\n'.join(current_content)
            current_section = line[4:].strip()
            current_content = []
        elif line.startswith('## '):
            # Title - skip, we'll use the lesson title
            pass
        else:
            current_content.append(line)

    if current_content:
        sections[current_section] = '\n'.join(current_content)

    return sections


def latex_to_html_inline(text: str) -> str:
    """Convert inline LaTeX to HTML with unicode math symbols."""
    # Handle $...$ inline math
    def replace_math(m):
        expr = m.group(1)
        return convert_latex_expr(expr)

    # Handle $$...$$ display math
    def replace_display_math(m):
        expr = m.group(1)
        html = convert_latex_expr(expr)
        return f'<div style="text-align:center;font-size:20px;font-family:serif;margin:12px 0;color:#f8fafc">{html}</div>'

    # First handle display math ($$...$$)
    text = re.sub(r'\$\$(.*?)\$\$', replace_display_math, text, flags=re.DOTALL)
    # Then handle inline math ($...$)
    text = re.sub(r'\$(.*?)\$', replace_math, text)

    return text


def convert_latex_expr(expr: str) -> str:
    """Convert a LaTeX expression to HTML/Unicode."""
    e = expr

    # Fractions: \frac{a}{b} -> a/b or (a)/(b)
    def replace_frac(m):
        num = m.group(1)
        den = m.group(2)
        # Simple fractions
        num_c = convert_latex_expr(num)
        den_c = convert_latex_expr(den)
        return f'<span style="display:inline-block;text-align:center;vertical-align:middle"><span style="display:block;border-bottom:1px solid currentColor;padding:0 4px">{num_c}</span><span style="display:block;padding:0 4px">{den_c}</span></span>'
    e = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', replace_frac, e)

    # Nested fracs (second pass)
    e = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', replace_frac, e)

    # Square root
    e = re.sub(r'\\sqrt\[(\d+)\]\{([^{}]+)\}', lambda m: f'<sup>{m.group(1)}</sup>√({convert_latex_expr(m.group(2))})', e)
    e = re.sub(r'\\sqrt\{([^{}]+)\}', lambda m: f'√({convert_latex_expr(m.group(1))})', e)

    # Superscripts: x^{2} or x^2
    e = re.sub(r'\^{([^{}]+)}', lambda m: f'<sup>{m.group(1)}</sup>', e)
    e = re.sub(r'\^(\d)', lambda m: f'<sup>{m.group(1)}</sup>', e)

    # Subscripts: x_{1} or x_1
    e = re.sub(r'_{([^{}]+)}', lambda m: f'<sub>{m.group(1)}</sub>', e)
    e = re.sub(r'_(\d)', lambda m: f'<sub>{m.group(1)}</sub>', e)

    # Greek and symbols
    replacements = {
        r'\neq': '≠', r'\leq': '≤', r'\geq': '≥', r'\le': '≤', r'\ge': '≥',
        r'\pi': 'π', r'\theta': 'θ', r'\alpha': 'α', r'\beta': 'β',
        r'\infty': '∞', r'\Delta': 'Δ', r'\delta': 'δ',
        r'\cdot': '·', r'\times': '×', r'\div': '÷',
        r'\rightarrow': '→', r'\implies': ' ⟹ ', r'\Rightarrow': ' ⟹ ',
        r'\pm': '±', r'\mp': '∓',
        r'\approx': '≈', r'\sim': '~',
        r'\ell': 'ℓ',
        r'\left': '', r'\right': '',
        r'\text{': '', r'\mathrm{': '', r'\mathbf{': '',
        r'\quad': '  ', r'\qquad': '    ',
    }
    for k, v in replacements.items():
        e = e.replace(k, v)

    # Remove remaining \
    e = re.sub(r'\\([a-zA-Z]+)', lambda m: m.group(1), e)
    # Clean up stray braces
    e = e.replace('{', '').replace('}', '')

    return f'<span style="font-family:serif;font-style:italic">{e}</span>'


def md_inline_to_html(text: str) -> str:
    """Convert markdown inline formatting to HTML."""
    # Bold: **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic: *text*
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Inline code: `code`
    text = re.sub(r'`(.+?)`', r'<code style="background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:4px;font-size:14px">\1</code>', text)
    return text


def process_content(text: str) -> str:
    """Process a block of markdown content into HTML paragraphs."""
    text = text.strip()
    if not text:
        return ''

    lines = text.split('\n')
    result = []
    in_list = False
    list_items = []
    in_table = False
    table_rows = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_list:
                result.append('<ul style="margin:8px 0;padding-left:24px">' + ''.join(list_items) + '</ul>')
                list_items = []
                in_list = False
            if in_table:
                result.append(build_table(table_rows))
                table_rows = []
                in_table = False
            continue

        # Table detection
        if stripped.startswith('|') and stripped.endswith('|'):
            if '---' in stripped:
                continue  # separator row
            in_table = True
            cells = [c.strip() for c in stripped.split('|')[1:-1]]
            table_rows.append(cells)
            continue

        if in_table and not (stripped.startswith('|')):
            result.append(build_table(table_rows))
            table_rows = []
            in_table = False

        # List items
        if re.match(r'^[-*]\s', stripped) or re.match(r'^\d+\.\s', stripped):
            in_list = True
            item_text = re.sub(r'^[-*\d.]+\s+', '', stripped)
            item_html = latex_to_html_inline(md_inline_to_html(item_text))
            list_items.append(f'<li style="margin:4px 0;line-height:1.6">{item_html}</li>')
            continue

        if in_list and not re.match(r'^[-*\d.]+\s', stripped):
            result.append('<ul style="margin:8px 0;padding-left:24px">' + ''.join(list_items) + '</ul>')
            list_items = []
            in_list = False

        # Regular paragraph
        para = latex_to_html_inline(md_inline_to_html(stripped))
        result.append(f'<p style="font-size:16px;margin:8px 0;line-height:1.7">{para}</p>')

    if in_list:
        result.append('<ul style="margin:8px 0;padding-left:24px">' + ''.join(list_items) + '</ul>')
    if in_table:
        result.append(build_table(table_rows))

    return '\n'.join(result)


def build_table(rows):
    """Build an HTML table from parsed rows."""
    if not rows:
        return ''
    html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">'
    for i, row in enumerate(rows):
        tag = 'th' if i == 0 else 'td'
        style_header = 'background:#4f46e5;color:white;' if i == 0 else ''
        html += '<tr>'
        for cell in row:
            cell_html = latex_to_html_inline(md_inline_to_html(cell))
            html += f'<{tag} style="{style_header}padding:8px 12px;border:1px solid #c7d2fe;text-align:left">{cell_html}</{tag}>'
        html += '</tr>'
    html += '</table>'
    return html


# ─── Section Card Builders ────────────────────────────────────────────────────

def card_concept(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:#eef2ff;border-radius:16px;padding:24px;margin:16px 0;border:1px solid #c7d2fe">
  <h2 style="color:#6366f1;font-size:22px;margin:0 0 12px">&#x1F9E0; Understanding the Concept</h2>
  {html}
</div>'''


def card_formulas(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-left:4px solid #6366f1;padding:20px;border-radius:0 12px 12px 0;margin:16px 0">
  <h3 style="color:#4f46e5;font-size:18px;margin:0 0 12px">&#x1F4D0; Key Formulas</h3>
  <div style="font-size:17px;font-family:serif">{html}</div>
</div>'''


def card_steps(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:#f0fdf4;border-radius:16px;padding:24px;margin:16px 0;border:1px solid #bbf7d0">
  <h3 style="color:#166534;font-size:18px;margin:0 0 12px">&#x1F4DD; How to Solve (Step by Step)</h3>
  {html}
</div>'''


def card_example(content: str, num: int) -> str:
    html = process_content(content)
    return f'''<div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #22c55e">
  <h3 style="color:#166534;font-size:17px;margin:0 0 10px">&#x270F;&#xFE0F; Worked Example {num}</h3>
  {html}
</div>'''


def card_traps(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:#fef2f2;border-radius:16px;padding:24px;margin:16px 0;border:1px solid #fecaca">
  <h3 style="color:#dc2626;font-size:18px;margin:0 0 12px">&#x26A0;&#xFE0F; SAT Traps to Avoid</h3>
  {html}
</div>'''


def card_connection(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:#eff6ff;border-radius:16px;padding:20px;margin:16px 0;border:1px solid #bfdbfe">
  <h3 style="color:#1d4ed8;font-size:17px;margin:0 0 10px">&#x1F517; Connection to Other Topics</h3>
  {html}
</div>'''


def card_drill(content: str) -> str:
    html = process_content(content)
    return f'''<div style="background:#fefce8;border-radius:16px;padding:24px;margin:16px 0;border:1px solid #fde68a">
  <h3 style="color:#92400e;font-size:18px;margin:0 0 12px">&#x1F3CB;&#xFE0F; Quick Drill</h3>
  {html}
</div>'''


# ─── Main Lesson Converter ────────────────────────────────────────────────────

def convert_lesson_theory(title: str, theory_md: str, module_idx: int, lesson_idx: int) -> str:
    """Convert a lesson's markdown theory to rich styled HTML."""

    sections = parse_sections(theory_md)

    html_parts = []

    # Outer wrapper
    html_parts.append(f'''<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1e293b;line-height:1.7;max-width:720px;margin:0 auto">''')

    # Title banner
    html_parts.append(f'''<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px 28px;margin-bottom:20px;color:white">
  <h1 style="margin:0;font-size:26px;font-weight:700">{title}</h1>
  <p style="margin:8px 0 0;font-size:14px;opacity:0.85">SAT Math PRO &mdash; 4C/ID Instructional Design</p>
</div>''')

    # Process each section
    example_num = 0
    for section_name, content in sections.items():
        content = content.strip()
        if not content:
            continue

        if 'Understanding the Concept' in section_name or '🧠' in section_name:
            html_parts.append(card_concept(content))
        elif 'Key Formula' in section_name or '📐' in section_name:
            html_parts.append(card_formulas(content))
        elif 'How to Solve' in section_name or '📝' in section_name:
            html_parts.append(card_steps(content))
        elif 'Worked Example' in section_name or '✏️' in section_name:
            example_num += 1
            html_parts.append(card_example(content, example_num))
        elif 'Trap' in section_name or '⚠️' in section_name:
            html_parts.append(card_traps(content))
        elif 'Connection' in section_name or '🔗' in section_name:
            html_parts.append(card_connection(content))
        elif 'Drill' in section_name or '🏋️' in section_name:
            html_parts.append(card_drill(content))
        elif section_name == 'intro':
            if content.strip():
                html_parts.append(f'<div style="margin:12px 0">{process_content(content)}</div>')
        else:
            # Generic section
            clean_name = re.sub(r'^[^\w]*', '', section_name).strip()
            html_parts.append(f'''<div style="background:#f8fafc;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #e2e8f0">
  <h3 style="color:#475569;font-size:17px;margin:0 0 10px">{clean_name}</h3>
  {process_content(content)}
</div>''')

    # Add interactive widget if applicable
    widget = WIDGET_MAP.get((module_idx, lesson_idx))
    if widget:
        html_parts.append(f'''<div style="background:#f8fafc;border-radius:16px;padding:20px;margin:20px 0;border:2px solid #6366f1">
  <h3 style="color:#6366f1;font-size:18px;margin:0 0 12px">&#x1F3AE; Try It Yourself</h3>
  <p style="font-size:14px;color:#64748b;margin:0 0 12px">Use this interactive tool to visualize the concepts from this lesson.</p>
  {widget}
</div>''')

    # Close outer wrapper
    html_parts.append('</div>')

    return '\n'.join(html_parts)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    with open('sat_math_pro_course_4cid.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Deep copy to avoid mutating original
    html_data = copy.deepcopy(data)

    modules = html_data['course']['modules']
    total = 0

    for mi, module in enumerate(modules):
        for li, lesson in enumerate(module['lessons']):
            theory_md = lesson.get('theory', '')
            title = lesson.get('title', f'Lesson {li}')

            lesson['theory'] = convert_lesson_theory(title, theory_md, mi, li)
            total += 1
            print(f'  Converted M{mi}L{li}: {title}', file=sys.stderr)

    print(f'\nTotal lessons converted: {total}', file=sys.stderr)

    with open('sat_math_pro_course_html.json', 'w', encoding='utf-8') as f:
        json.dump(html_data, f, ensure_ascii=False, indent=2)

    print(f'Output written to sat_math_pro_course_html.json', file=sys.stderr)


if __name__ == '__main__':
    main()
