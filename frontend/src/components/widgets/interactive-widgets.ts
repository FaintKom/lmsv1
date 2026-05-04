// =============================================================================
// Interactive HTML Widgets for Lesson Content
// Each widget is a self-contained HTML snippet with inline CSS & JS.
// Embed via ContentRenderer with format="html".
// =============================================================================

// ---------------------------------------------------------------------------
// 1. PYTHON: Variable Assignment Visualizer
// ---------------------------------------------------------------------------
export const WIDGET_VARIABLE_ASSIGNMENT = `
<div id="var-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 16px;font-size:18px;color:#a78bfa">Variable Assignment</h3>
 <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
 <input id="var-name" placeholder="variable name" style="flex:1;min-width:100px;padding:10px 14px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none" />
 <span style="color:#a78bfa;font-size:22px;line-height:42px">=</span>
 <input id="var-val" placeholder="value" style="flex:1;min-width:100px;padding:10px 14px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none" />
 <button onclick="assignVar()" style="padding:10px 20px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer;transition:transform .15s;font-size:14px" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">Assign</button>
 </div>
 <div id="var-boxes" style="display:flex;flex-wrap:wrap;gap:12px;min-height:60px"></div>
 <script>
 (function(){
 var vars={};
 window.assignVar=function(){
 var n=document.getElementById('var-name').value.trim();
 var v=document.getElementById('var-val').value.trim();
 if(!n)return;
 vars[n]=v||'None';
 render();
 document.getElementById('var-name').value='';
 document.getElementById('var-val').value='';
 };
 function render(){
 var html='';
 for(var k in vars){
 html+='<div style="background:#2a2a4a;border:2px solid #7c3aed;border-radius:12px;padding:12px 18px;text-align:center;min-width:90px;position:relative;animation:fadeIn .3s ease">';
 html+='<div style="font-size:11px;color:#a78bfa;margin-bottom:4px;font-family:monospace">'+k+'</div>';
 html+='<div style="font-size:20px;font-weight:700;color:#f0abfc;font-family:monospace">'+vars[k]+'</div>';
 html+='<button onclick="delete window._vars_[\''+k+'\'];window._rerender_()" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:12px;cursor:pointer;line-height:20px">x</button>';
 html+='</div>';
 }
 document.getElementById('var-boxes').innerHTML=html;
 }
 window._vars_=vars;
 window._rerender_=render;
 })();
 </script>
 <style>@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style>
</div>`;

// ---------------------------------------------------------------------------
// 2. PYTHON: If/Else Flowchart
// ---------------------------------------------------------------------------
export const WIDGET_IF_ELSE_FLOWCHART = `
<div id="ifelse-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">If / Else Flowchart</h3>
 <div style="text-align:center;margin-bottom:12px">
 <label style="font-family:monospace;font-size:14px;color:#c4b5fd">x = <span id="if-val">50</span></label><br/>
 <input id="if-slider" type="range" min="0" max="100" value="50" oninput="updateIfElse()" style="width:80%;margin-top:8px;accent-color:#7c3aed" />
 <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-top:4px">Condition: <strong style="color:#fbbf24">if x &gt; 50</strong></div>
 </div>
 <svg id="if-svg" viewBox="0 0 300 260" style="width:100%;max-width:300px;display:block;margin:0 auto">
 <defs>
 <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#7c3aed"/></marker>
 </defs>
 <!-- Start -->
 <rect x="100" y="5" width="100" height="36" rx="18" fill="#3b3b5c" stroke="#7c3aed" stroke-width="2"/>
 <text x="150" y="28" text-anchor="middle" fill="#e0e0e0" font-size="13" font-family="monospace">Start</text>
 <!-- Arrow down -->
 <line x1="150" y1="41" x2="150" y2="65" stroke="#7c3aed" stroke-width="2" marker-end="url(#ah)"/>
 <!-- Diamond -->
 <polygon id="if-diamond" points="150,65 220,100 150,135 80,100" fill="#2a2a4a" stroke="#fbbf24" stroke-width="2"/>
 <text x="150" y="105" text-anchor="middle" fill="#fbbf24" font-size="12" font-family="monospace">x &gt; 50?</text>
 <!-- True branch -->
 <line x1="220" y1="100" x2="260" y2="100" stroke="#7c3aed" stroke-width="2"/>
 <line x1="260" y1="100" x2="260" y2="170" stroke="#7c3aed" stroke-width="2" marker-end="url(#ah)"/>
 <text x="240" y="92" fill="#22c55e" font-size="11" font-family="monospace">True</text>
 <rect id="if-true-box" x="210" y="172" width="100" height="36" rx="10" fill="#2a2a4a" stroke="#22c55e" stroke-width="2"/>
 <text x="260" y="195" text-anchor="middle" fill="#22c55e" font-size="12" font-family="monospace">print("big")</text>
 <!-- False branch -->
 <line x1="80" y1="100" x2="40" y2="100" stroke="#7c3aed" stroke-width="2"/>
 <line x1="40" y1="100" x2="40" y2="170" stroke="#7c3aed" stroke-width="2" marker-end="url(#ah)"/>
 <text x="55" y="92" fill="#ef4444" font-size="11" font-family="monospace">False</text>
 <rect id="if-false-box" x="-10" y="172" width="100" height="36" rx="10" fill="#2a2a4a" stroke="#ef4444" stroke-width="2"/>
 <text x="40" y="195" text-anchor="middle" fill="#ef4444" font-size="12" font-family="monospace">print("small")</text>
 <!-- Merge -->
 <line x1="260" y1="208" x2="260" y2="235" stroke="#7c3aed" stroke-width="1.5"/>
 <line x1="40" y1="208" x2="40" y2="235" stroke="#7c3aed" stroke-width="1.5"/>
 <line x1="40" y1="235" x2="260" y2="235" stroke="#7c3aed" stroke-width="1.5"/>
 <circle cx="150" cy="235" r="4" fill="#7c3aed"/>
 <line x1="150" y1="239" x2="150" y2="255" stroke="#7c3aed" stroke-width="2" marker-end="url(#ah)"/>
 </svg>
 <div id="if-result" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;border-radius:10px;background:#2a2a4a;transition:all .3s"></div>
 <script>
 function updateIfElse(){
 var v=+document.getElementById('if-slider').value;
 document.getElementById('if-val').textContent=v;
 var isTrue=v>50;
 document.getElementById('if-true-box').style.opacity=isTrue?1:0.25;
 document.getElementById('if-false-box').style.opacity=isTrue?0.25:1;
 document.getElementById('if-result').innerHTML=isTrue
 ?'<span style="color:#22c55e">Output: "big"</span>'
 :'<span style="color:#ef4444">Output: "small"</span>';
 }
 updateIfElse();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 3. PYTHON: For Loop Animation
// ---------------------------------------------------------------------------
export const WIDGET_FOR_LOOP = `
<div id="loop-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">For Loop Animation</h3>
 <div style="font-family:monospace;font-size:14px;background:#1a1a2e;padding:12px;border-radius:10px;margin-bottom:12px">
 <span style="color:#c084fc">for</span> i <span style="color:#c084fc">in</span> <span style="color:#fbbf24">range(<span id="loop-count">5</span>)</span>:<br/>
 &nbsp;&nbsp;print(i)
 </div>
 <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
 <label style="font-size:13px">Iterations:</label>
 <input id="loop-n" type="range" min="1" max="10" value="5" oninput="document.getElementById('loop-count').textContent=this.value" style="flex:1;accent-color:#7c3aed" />
 <label style="font-size:13px">Speed:</label>
 <input id="loop-speed" type="range" min="100" max="1000" value="500" style="width:80px;accent-color:#7c3aed" />
 <button onclick="startLoop()" style="padding:8px 18px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer;font-size:14px">Run</button>
 </div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px" id="loop-blocks"></div>
 <div id="loop-output" style="font-family:monospace;font-size:13px;background:#1a1a2e;padding:10px;border-radius:10px;min-height:28px;white-space:pre-wrap"></div>
 <script>
 (function(){
 var timer;
 window.startLoop=function(){
 clearInterval(timer);
 var n=+document.getElementById('loop-n').value;
 var speed=+document.getElementById('loop-speed').value;
 var blocks='';
 for(var j=0;j<n;j++) blocks+='<div id="lb'+j+'" style="width:40px;height:40px;border-radius:10px;background:#2a2a4a;border:2px solid #4c4f82;display:flex;align-items:center;justify-content:center;font-family:monospace;font-weight:700;font-size:16px;transition:all .2s">'+j+'</div>';
 document.getElementById('loop-blocks').innerHTML=blocks;
 document.getElementById('loop-output').textContent='';
 var i=0;
 timer=setInterval(function(){
 if(i>=n){clearInterval(timer);return}
 if(i>0){var prev=document.getElementById('lb'+(i-1));if(prev){prev.style.background='#2a2a4a';prev.style.borderColor='#22c55e';prev.style.color='#22c55e'}}
 var el=document.getElementById('lb'+i);
 if(el){el.style.background='#7c3aed';el.style.borderColor='#a78bfa';el.style.color='#fff';el.style.transform='scale(1.15)';setTimeout(function(e){e.style.transform='scale(1)'},150,el)}
 document.getElementById('loop-output').textContent+='>>> print('+i+')\\n';
 i++;
 if(i>=n)setTimeout(function(){var last=document.getElementById('lb'+(n-1));if(last){last.style.background='#2a2a4a';last.style.borderColor='#22c55e';last.style.color='#22c55e'}},speed/2);
 },speed);
 };
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 4. PYTHON: List Operations
// ---------------------------------------------------------------------------
export const WIDGET_LIST_OPERATIONS = `
<div id="list-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">List Operations</h3>
 <div id="list-display" style="display:flex;gap:6px;flex-wrap:wrap;min-height:50px;padding:12px;background:#1a1a2e;border-radius:10px;margin-bottom:12px;align-items:center">
 <span style="color:#94a3b8;font-family:monospace;font-size:13px">my_list = [</span>
 <span id="list-items"></span>
 <span style="color:#94a3b8;font-family:monospace;font-size:13px">]</span>
 </div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
 <input id="list-input" placeholder="value" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none" />
 <button onclick="listOp('append')" style="padding:8px 14px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.append()</button>
 <button onclick="listOp('pop')" style="padding:8px 14px;border:none;border-radius:10px;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.pop()</button>
 <button onclick="listOp('insert')" style="padding:8px 14px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.insert(0,)</button>
 <button onclick="listOp('sort')" style="padding:8px 14px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.sort()</button>
 <button onclick="listOp('reverse')" style="padding:8px 14px;border:none;border-radius:10px;background:#8b5cf6;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.reverse()</button>
 </div>
 <div id="list-log" style="font-family:monospace;font-size:12px;color:#94a3b8;max-height:60px;overflow-y:auto"></div>
 <script>
 (function(){
 var arr=[3,1,4,1,5];
 var colors=['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c','#f87171','#2dd4bf'];
 function render(){
 var html='';
 arr.forEach(function(v,i){html+='<span style="display:inline-block;padding:6px 12px;background:'+colors[i%colors.length]+'22;border:2px solid '+colors[i%colors.length]+';border-radius:8px;font-family:monospace;font-weight:600;font-size:15px;color:'+colors[i%colors.length]+';animation:pop .25s ease">'+v+'</span> '});
 document.getElementById('list-items').innerHTML=html;
 }
 function log(msg){var el=document.getElementById('list-log');el.innerHTML='<div style="color:#a78bfa">>>> '+msg+'</div>'+el.innerHTML}
 window.listOp=function(op){
 var inp=document.getElementById('list-input').value.trim();
 if(op==='append'){var v=inp||'0';arr.push(isNaN(v)?v:+v);log('my_list.append('+v+') &rarr; len='+arr.length)}
 else if(op==='pop'){if(arr.length){var r=arr.pop();log('my_list.pop() &rarr; removed '+r)}else log('Error: pop from empty list')}
 else if(op==='insert'){var v=inp||'0';arr.unshift(isNaN(v)?v:+v);log('my_list.insert(0, '+v+')')}
 else if(op==='sort'){arr.sort(function(a,b){return a-b});log('my_list.sort()')}
 else if(op==='reverse'){arr.reverse();log('my_list.reverse()')}
 document.getElementById('list-input').value='';
 render();
 };
 render();
 })();
 </script>
 <style>@keyframes pop{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}</style>
</div>`;

// ---------------------------------------------------------------------------
// 5. PYTHON: Dictionary Visualizer
// ---------------------------------------------------------------------------
export const WIDGET_DICTIONARY = `
<div id="dict-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">Dictionary Visualizer</h3>
 <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
 <input id="dk" placeholder="key" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#fbbf24;font-family:monospace;font-size:14px;outline:none" />
 <span style="color:#94a3b8;line-height:38px">:</span>
 <input id="dv" placeholder="value" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#60a5fa;font-family:monospace;font-size:14px;outline:none" />
 <button onclick="dictAdd()" style="padding:8px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;cursor:pointer;font-size:13px">Add</button>
 </div>
 <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-bottom:6px">my_dict = {</div>
 <div id="dict-pairs" style="display:flex;flex-direction:column;gap:8px;padding:0 12px;min-height:40px"></div>
 <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-top:6px">}</div>
 <div id="dict-lookup" style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
 <span style="font-family:monospace;font-size:13px">my_dict[</span>
 <input id="dl" placeholder="key" style="width:80px;padding:6px 10px;border:2px solid #4c4f82;border-radius:8px;background:#1a1a2e;color:#fbbf24;font-family:monospace;font-size:13px;outline:none" />
 <span style="font-family:monospace;font-size:13px">]</span>
 <button onclick="dictGet()" style="padding:6px 14px;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-size:12px">Lookup</button>
 <span id="dict-res" style="font-family:monospace;font-size:14px;color:#34d399"></span>
 </div>
 <script>
 (function(){
 var d={name:"Alice",age:"25",lang:"Python"};
 function render(){
 var html='';
 for(var k in d){
 html+='<div style="display:flex;align-items:center;gap:8px;animation:fadeIn .25s ease">';
 html+='<span style="padding:6px 12px;background:#fbbf2420;border:1.5px solid #fbbf24;border-radius:8px;color:#fbbf24;font-family:monospace;font-size:14px">"'+k+'"</span>';
 html+='<span style="color:#7c3aed;font-size:18px">&#8594;</span>';
 html+='<span style="padding:6px 12px;background:#60a5fa20;border:1.5px solid #60a5fa;border-radius:8px;color:#60a5fa;font-family:monospace;font-size:14px">"'+d[k]+'"</span>';
 html+='<button onclick="dictDel(\''+k+'\')" style="width:22px;height:22px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:11px;cursor:pointer">x</button>';
 html+='</div>';
 }
 document.getElementById('dict-pairs').innerHTML=html;
 }
 window.dictAdd=function(){
 var k=document.getElementById('dk').value.trim();
 var v=document.getElementById('dv').value.trim();
 if(!k)return;d[k]=v||'None';render();
 document.getElementById('dk').value='';document.getElementById('dv').value='';
 };
 window.dictDel=function(k){delete d[k];render()};
 window.dictGet=function(){
 var k=document.getElementById('dl').value.trim();
 var el=document.getElementById('dict-res');
 if(d.hasOwnProperty(k)){el.style.color='#34d399';el.textContent='= "'+d[k]+'"'}
 else{el.style.color='#ef4444';el.textContent='KeyError: "'+k+'"'}
 };
 render();
 })();
 </script>
 <style>@keyframes fadeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}</style>
</div>`;

// ---------------------------------------------------------------------------
// 6. SAT MATH: Slope Visualizer
// ---------------------------------------------------------------------------
export const WIDGET_SLOPE = `
<div id="slope-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">Slope Visualizer</h3>
 <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;font-family:monospace;font-size:13px">
 <div>Point A: (<input id="s-x1" type="number" value="1" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fbbf24;text-align:center;font-family:monospace" onchange="drawSlope()">,<input id="s-y1" type="number" value="2" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#fbbf24;text-align:center;font-family:monospace" onchange="drawSlope()">)</div>
 <div>Point B: (<input id="s-x2" type="number" value="5" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#22d3ee;text-align:center;font-family:monospace" onchange="drawSlope()">,<input id="s-y2" type="number" value="6" style="width:40px;padding:4px;border:1px solid #475569;border-radius:6px;background:#0f172a;color:#22d3ee;text-align:center;font-family:monospace" onchange="drawSlope()">)</div>
 </div>
 <canvas id="slope-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a;cursor:crosshair"></canvas>
 <div id="slope-info" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;background:#1e293b;border-radius:10px"></div>
 <script>
 (function(){
 var cv=document.getElementById('slope-cv'),ctx=cv.getContext('2d');
 var W=400,H=300,ox=W/2,oy=H/2,scale=25;
 window.drawSlope=function(){
 var x1=+document.getElementById('s-x1').value,y1=+document.getElementById('s-y1').value;
 var x2=+document.getElementById('s-x2').value,y2=+document.getElementById('s-y2').value;
 ctx.clearRect(0,0,W,H);
 // Grid
 ctx.strokeStyle='#1e3a5f';ctx.lineWidth=0.5;
 for(var i=-10;i<=10;i++){var px=ox+i*scale;ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,H);ctx.stroke();var py=oy-i*scale;ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(W,py);ctx.stroke()}
 // Axes
 ctx.strokeStyle='#475569';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
 var px1=ox+x1*scale,py1=oy-y1*scale,px2=ox+x2*scale,py2=oy-y2*scale;
 // Rise/Run
 var rise=y2-y1,run=x2-x1;
 if(run!==0){
 ctx.setLineDash([5,5]);ctx.strokeStyle='#ef444488';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(px1,py1);ctx.lineTo(px2,py1);ctx.stroke();// run
 ctx.strokeStyle='#22c55e88';
 ctx.beginPath();ctx.moveTo(px2,py1);ctx.lineTo(px2,py2);ctx.stroke();// rise
 ctx.setLineDash([]);
 ctx.fillStyle='#ef4444';ctx.font='bold 12px monospace';ctx.fillText('run='+run,(px1+px2)/2,py1+15);
 ctx.fillStyle='#22c55e';ctx.fillText('rise='+rise,px2+5,(py1+py2)/2);
 }
 // Line extended
 if(run!==0){
 var m=rise/run;var b=y1-m*x1;
 var lx=-10,rx=10;
 ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(ox+lx*scale,oy-(m*lx+b)*scale);ctx.lineTo(ox+rx*scale,oy-(m*rx+b)*scale);ctx.stroke();
 }
 // Points
 ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(px1,py1,7,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#22d3ee';ctx.beginPath();ctx.arc(px2,py2,7,0,Math.PI*2);ctx.fill();
 // Labels
 ctx.fillStyle='#fbbf24';ctx.font='bold 12px monospace';ctx.fillText('A('+x1+','+y1+')',px1+10,py1-8);
 ctx.fillStyle='#22d3ee';ctx.fillText('B('+x2+','+y2+')',px2+10,py2-8);
 // Info
 var info='';
 if(run===0)info='<span style="color:#ef4444">Slope is undefined (vertical line)</span>';
 else{var m=(rise/run);info='slope = rise/run = '+rise+'/'+run+' = <strong style="color:#38bdf8">'+m.toFixed(2)+'</strong>'}
 document.getElementById('slope-info').innerHTML=info;
 };
 drawSlope();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 7. SAT MATH: Quadratic Parabola Explorer
// ---------------------------------------------------------------------------
export const WIDGET_QUADRATIC = `
<div id="quad-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">Quadratic Explorer</h3>
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;font-size:13px">
 <div style="text-align:center"><label>a = <span id="qa-v">1</span></label><br/><input id="qa" type="range" min="-3" max="3" step="0.5" value="1" oninput="drawQuad()" style="width:100%;accent-color:#ef4444"/></div>
 <div style="text-align:center"><label>b = <span id="qb-v">0</span></label><br/><input id="qb" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawQuad()" style="width:100%;accent-color:#22c55e"/></div>
 <div style="text-align:center"><label>c = <span id="qc-v">0</span></label><br/><input id="qc" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawQuad()" style="width:100%;accent-color:#3b82f6"/></div>
 </div>
 <canvas id="quad-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
 <div id="quad-info" style="text-align:center;font-family:monospace;font-size:13px;margin-top:8px;padding:8px;background:#1e293b;border-radius:10px"></div>
 <script>
 (function(){
 var cv=document.getElementById('quad-cv'),ctx=cv.getContext('2d');
 var W=400,H=300,ox=W/2,oy=H*0.65,scale=25;
 window.drawQuad=function(){
 var a=+document.getElementById('qa').value,b=+document.getElementById('qb').value,c=+document.getElementById('qc').value;
 document.getElementById('qa-v').textContent=a;document.getElementById('qb-v').textContent=b;document.getElementById('qc-v').textContent=c;
 ctx.clearRect(0,0,W,H);
 // Grid
 ctx.strokeStyle='#1e3a5f';ctx.lineWidth=0.5;
 for(var i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(ox+i*scale,0);ctx.lineTo(ox+i*scale,H);ctx.stroke();ctx.beginPath();ctx.moveTo(0,oy-i*scale);ctx.lineTo(W,oy-i*scale);ctx.stroke()}
 ctx.strokeStyle='#475569';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,oy);ctx.lineTo(W,oy);ctx.stroke();ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,H);ctx.stroke();
 // Parabola
 if(a!==0){
 ctx.strokeStyle='#f472b6';ctx.lineWidth=2.5;ctx.beginPath();
 for(var px=0;px<=W;px++){var x=(px-ox)/scale;var y=a*x*x+b*x+c;var py=oy-y*scale;if(px===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)}
 ctx.stroke();
 // Vertex
 var vx=-b/(2*a),vy=a*vx*vx+b*vx+c;
 var vpx=ox+vx*scale,vpy=oy-vy*scale;
 ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(vpx,vpy,6,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fbbf24';ctx.font='bold 11px monospace';ctx.fillText('vertex('+vx.toFixed(1)+','+vy.toFixed(1)+')',vpx+8,vpy-8);
 // Axis of symmetry
 ctx.setLineDash([4,4]);ctx.strokeStyle='#fbbf2466';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(vpx,0);ctx.lineTo(vpx,H);ctx.stroke();ctx.setLineDash([]);
 }
 // Equation text
 var eq='y = '+a+'x² '+(b>=0?'+ ':'')+b+'x '+(c>=0?'+ ':'')+c;
 document.getElementById('quad-info').innerHTML='<span style="color:#f472b6">'+eq+'</span>'+(a!==0?' &nbsp; vertex: <span style="color:#fbbf24">('+(-b/(2*a)).toFixed(1)+', '+(a*(-b/(2*a))*(-b/(2*a))+b*(-b/(2*a))+c).toFixed(1)+')</span>':'');
 };
 drawQuad();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 8. SAT MATH: System of Equations
// ---------------------------------------------------------------------------
export const WIDGET_SYSTEM_EQUATIONS = `
<div id="sys-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">System of Equations</h3>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:12px;font-family:monospace">
 <div style="background:#0f172a;padding:10px;border-radius:10px;border:1.5px solid #ef4444">
 <div style="color:#ef4444;margin-bottom:6px">Line 1: y = m1*x + b1</div>
 m1=<span id="m1v">1</span> <input id="m1" type="range" min="-3" max="3" step="0.25" value="1" oninput="drawSys()" style="width:80%;accent-color:#ef4444"/><br/>
 b1=<span id="b1v">0</span> <input id="b1" type="range" min="-5" max="5" step="0.5" value="0" oninput="drawSys()" style="width:80%;accent-color:#ef4444"/>
 </div>
 <div style="background:#0f172a;padding:10px;border-radius:10px;border:1.5px solid #3b82f6">
 <div style="color:#3b82f6;margin-bottom:6px">Line 2: y = m2*x + b2</div>
 m2=<span id="m2v">-0.5</span> <input id="m2" type="range" min="-3" max="3" step="0.25" value="-0.5" oninput="drawSys()" style="width:80%;accent-color:#3b82f6"/><br/>
 b2=<span id="b2v">3</span> <input id="b2" type="range" min="-5" max="5" step="0.5" value="3" oninput="drawSys()" style="width:80%;accent-color:#3b82f6"/>
 </div>
 </div>
 <canvas id="sys-cv" width="400" height="300" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
 <div id="sys-info" style="text-align:center;font-family:monospace;font-size:13px;margin-top:8px;padding:8px;background:#1e293b;border-radius:10px"></div>
 <script>
 (function(){
 var cv=document.getElementById('sys-cv'),ctx=cv.getContext('2d');
 var W=400,H=300,ox=W/2,oy=H/2,sc=25;
 window.drawSys=function(){
 var m1=+document.getElementById('m1').value,b1=+document.getElementById('b1').value;
 var m2=+document.getElementById('m2').value,b2=+document.getElementById('b2').value;
 document.getElementById('m1v').textContent=m1;document.getElementById('b1v').textContent=b1;
 document.getElementById('m2v').textContent=m2;document.getElementById('b2v').textContent=b2;
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
 document.getElementById('sys-info').innerHTML=info;
 };
 drawSys();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 9. SAT MATH: Pythagorean Theorem
// ---------------------------------------------------------------------------
export const WIDGET_PYTHAGOREAN = `
<div id="pyth-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">Pythagorean Theorem</h3>
 <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px;flex-wrap:wrap">
 <div>a = <input id="pa" type="range" min="1" max="8" value="3" oninput="drawPyth()" style="width:80px;accent-color:#ef4444"/> <span id="pa-v" style="color:#ef4444;font-family:monospace">3</span></div>
 <div>b = <input id="pb" type="range" min="1" max="8" value="4" oninput="drawPyth()" style="width:80px;accent-color:#3b82f6"/> <span id="pb-v" style="color:#3b82f6;font-family:monospace">4</span></div>
 </div>
 <canvas id="pyth-cv" width="400" height="340" style="width:100%;border-radius:10px;background:#0f172a"></canvas>
 <div id="pyth-info" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;background:#1e293b;border-radius:10px"></div>
 <script>
 (function(){
 var cv=document.getElementById('pyth-cv'),ctx=cv.getContext('2d');
 window.drawPyth=function(){
 var a=+document.getElementById('pa').value,b=+document.getElementById('pb').value;
 document.getElementById('pa-v').textContent=a;document.getElementById('pb-v').textContent=b;
 var c=Math.sqrt(a*a+b*b);
 ctx.clearRect(0,0,400,340);
 var sc=28,offx=140,offy=80;
 // Triangle
 var Ax=offx,Ay=offy+a*sc;var Bx=offx+b*sc,By=offy+a*sc;var Cx=offx,Cy=offy;
 ctx.fillStyle='#ffffff10';ctx.beginPath();ctx.moveTo(Ax,Ay);ctx.lineTo(Bx,By);ctx.lineTo(Cx,Cy);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#e0e0e0';ctx.lineWidth=2;ctx.stroke();
 // Right angle marker
 var s=10;ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(Ax+s,Ay);ctx.lineTo(Ax+s,Ay-s);ctx.lineTo(Ax,Ay-s);ctx.stroke();
 // Side a (vertical)
 ctx.fillStyle='#ef444466';ctx.fillRect(Cx-a*sc,Cy,a*sc,a*sc);ctx.strokeStyle='#ef4444';ctx.lineWidth=1;ctx.strokeRect(Cx-a*sc,Cy,a*sc,a*sc);
 ctx.fillStyle='#ef4444';ctx.font='bold 14px monospace';ctx.fillText('a\u00B2='+a*a,Cx-a*sc+4,Cy+a*sc/2+5);
 // Side b (horizontal)
 ctx.fillStyle='#3b82f666';ctx.fillRect(Ax,Ay,b*sc,b*sc);ctx.strokeStyle='#3b82f6';ctx.lineWidth=1;ctx.strokeRect(Ax,Ay,b*sc,b*sc);
 ctx.fillStyle='#3b82f6';ctx.font='bold 14px monospace';ctx.fillText('b\u00B2='+b*b,Ax+4,Ay+b*sc/2+5);
 // Side labels
 ctx.fillStyle='#ef4444';ctx.font='bold 15px monospace';ctx.fillText('a='+a,Ax-30,(Ay+Cy)/2+5);
 ctx.fillStyle='#3b82f6';ctx.fillText('b='+b,(Ax+Bx)/2-12,By+18);
 ctx.fillStyle='#22c55e';ctx.fillText('c='+c.toFixed(2),(Cx+Bx)/2+10,(Cy+By)/2-8);
 // Info
 document.getElementById('pyth-info').innerHTML=
 '<span style="color:#ef4444">'+a+'\u00B2</span> + <span style="color:#3b82f6">'+b+'\u00B2</span> = <span style="color:#ef4444">'+a*a+'</span> + <span style="color:#3b82f6">'+b*b+'</span> = <span style="color:#22c55e">'+(a*a+b*b)+'</span><br/>c = \u221A'+(a*a+b*b)+' = <strong style="color:#22c55e">'+c.toFixed(4)+'</strong>';
 };
 drawPyth();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 10. SAT MATH: Unit Circle
// ---------------------------------------------------------------------------
export const WIDGET_UNIT_CIRCLE = `
<div id="uc-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#38bdf8">Unit Circle</h3>
 <div style="text-align:center;margin-bottom:8px">
 <label style="font-size:13px">\u03B8 = <span id="uc-deg" style="color:#fbbf24;font-family:monospace">45</span>\u00B0 (<span id="uc-rad" style="color:#94a3b8;font-family:monospace">0.79</span> rad)</label><br/>
 <input id="uc-angle" type="range" min="0" max="360" value="45" oninput="drawUC()" style="width:80%;accent-color:#7c3aed;margin-top:4px" />
 </div>
 <canvas id="uc-cv" width="360" height="360" style="width:100%;max-width:360px;display:block;margin:0 auto;border-radius:10px;background:#0f172a"></canvas>
 <div id="uc-vals" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;font-family:monospace;font-size:14px;text-align:center">
 <div style="padding:8px;background:#ef444422;border-radius:8px;border:1px solid #ef4444"><div style="font-size:11px;color:#fca5a5">sin \u03B8</div><div id="uc-sin" style="color:#ef4444;font-weight:700">0.71</div></div>
 <div style="padding:8px;background:#3b82f622;border-radius:8px;border:1px solid #3b82f6"><div style="font-size:11px;color:#93c5fd">cos \u03B8</div><div id="uc-cos" style="color:#3b82f6;font-weight:700">0.71</div></div>
 <div style="padding:8px;background:#22c55e22;border-radius:8px;border:1px solid #22c55e"><div style="font-size:11px;color:#86efac">tan \u03B8</div><div id="uc-tan" style="color:#22c55e;font-weight:700">1.00</div></div>
 </div>
 <script>
 (function(){
 var cv=document.getElementById('uc-cv'),ctx=cv.getContext('2d');
 var W=360,cx=W/2,cy=W/2,R=130;
 window.drawUC=function(){
 var deg=+document.getElementById('uc-angle').value;
 var rad=deg*Math.PI/180;
 document.getElementById('uc-deg').textContent=deg;
 document.getElementById('uc-rad').textContent=rad.toFixed(2);
 ctx.clearRect(0,0,W,W);
 // Axes
 ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.stroke();ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,W);ctx.stroke();
 // Circle
 ctx.strokeStyle='#475569';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
 var px=cx+R*Math.cos(rad),py=cy-R*Math.sin(rad);
 // Angle arc
 ctx.strokeStyle='#fbbf24';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,30,0,-rad,true);ctx.stroke();
 ctx.fillStyle='#fbbf24';ctx.font='12px monospace';ctx.fillText(deg+'\u00B0',cx+34,cy-8);
 // Cos line (horizontal)
 ctx.strokeStyle='#3b82f6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,cy);ctx.stroke();
 // Sin line (vertical)
 ctx.strokeStyle='#ef4444';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,cy);ctx.lineTo(px,py);ctx.stroke();
 // Radius
 ctx.strokeStyle='#e0e0e0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();
 // Point
 ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
 // Coordinate label
 var cosV=Math.cos(rad),sinV=Math.sin(rad),tanV=Math.tan(rad);
 ctx.fillStyle='#e0e0e0';ctx.font='11px monospace';ctx.fillText('('+cosV.toFixed(2)+', '+sinV.toFixed(2)+')',px+8,py-10);
 // Axis labels
 ctx.fillStyle='#475569';ctx.font='12px monospace';
 ctx.fillText('0',cx+R+6,cy+14);ctx.fillText('1',cx+R+6,cy-2);
 ctx.fillText('\u03C0',cx-R-16,cy+14);
 document.getElementById('uc-sin').textContent=sinV.toFixed(4);
 document.getElementById('uc-cos').textContent=cosV.toFixed(4);
 document.getElementById('uc-tan').textContent=Math.abs(tanV)>1e6?'undef':tanV.toFixed(4);
 };
 drawUC();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 11. ROBOT: Sequence Concept
// ---------------------------------------------------------------------------
export const WIDGET_SEQUENCE = `
<div id="seq-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#34d399">Sequence: Build a Path</h3>
 <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
 <button onclick="seqAdd('\u2191')" style="padding:10px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-size:20px;cursor:pointer">\u2191</button>
 <button onclick="seqAdd('\u2193')" style="padding:10px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-size:20px;cursor:pointer">\u2193</button>
 <button onclick="seqAdd('\u2190')" style="padding:10px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-size:20px;cursor:pointer">\u2190</button>
 <button onclick="seqAdd('\u2192')" style="padding:10px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-size:20px;cursor:pointer">\u2192</button>
 <button onclick="seqRun()" style="padding:10px 18px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;font-size:14px;cursor:pointer">\u25B6 Run</button>
 <button onclick="seqClear()" style="padding:10px 14px;border:none;border-radius:10px;background:#64748b;color:#fff;font-size:14px;cursor:pointer">Clear</button>
 </div>
 <div id="seq-cmds" style="display:flex;gap:4px;flex-wrap:wrap;min-height:36px;padding:8px;background:#052e16;border-radius:10px;margin-bottom:12px;font-size:22px"></div>
 <div style="position:relative">
 <canvas id="seq-cv" width="280" height="280" style="width:100%;max-width:280px;display:block;margin:0 auto;border-radius:10px;background:#052e16"></canvas>
 </div>
 <script>
 (function(){
 var cmds=[],cv=document.getElementById('seq-cv'),ctx=cv.getContext('2d');
 var GS=7,CS=40,rx=3,ry=3;
 function drawGrid(){
 ctx.clearRect(0,0,280,280);
 for(var r=0;r<GS;r++)for(var c=0;c<GS;c++){ctx.fillStyle=(r+c)%2===0?'#0a3d1f':'#0d4a26';ctx.fillRect(c*CS,r*CS,CS,CS)}
 // Star at (6,0)
 ctx.fillStyle='#fbbf24';ctx.font='24px serif';ctx.fillText('\u2B50',6*CS+8,0*CS+30);
 }
 function drawRobot(x,y){ctx.fillStyle='#22c55e';ctx.font='28px serif';ctx.fillText('\uD83E\uDD16',x*CS+6,y*CS+32)}
 function renderCmds(){document.getElementById('seq-cmds').innerHTML=cmds.map(function(c,i){return '<span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#22c55e33;border-radius:6px;border:1px solid #22c55e">'+c+'</span>'}).join('')}
 window.seqAdd=function(d){if(cmds.length<12){cmds.push(d);renderCmds()}};
 window.seqClear=function(){cmds=[];rx=3;ry=3;renderCmds();drawGrid();drawRobot(rx,ry)};
 window.seqRun=function(){
 var i=0;rx=3;ry=3;drawGrid();drawRobot(rx,ry);
 var t=setInterval(function(){
 if(i>=cmds.length){clearInterval(t);return}
 var c=cmds[i];
 if(c==='\u2191'&&ry>0)ry--;else if(c==='\u2193'&&ry<GS-1)ry++;else if(c==='\u2190'&&rx>0)rx--;else if(c==='\u2192'&&rx<GS-1)rx++;
 drawGrid();
 // Trail
 ctx.fillStyle='#22c55e33';ctx.fillRect(rx*CS,ry*CS,CS,CS);
 drawRobot(rx,ry);
 // Highlight current cmd
 var els=document.getElementById('seq-cmds').children;
 for(var j=0;j<els.length;j++)els[j].style.background=j===i?'#f59e0b55':'#22c55e33';
 i++;
 },400);
 };
 drawGrid();drawRobot(rx,ry);
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 12. ROBOT: Loop Concept (Unrolling)
// ---------------------------------------------------------------------------
export const WIDGET_LOOP_CONCEPT = `
<div id="rloop-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#34d399">Loop Concept: Repeat &amp; Unroll</h3>
 <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
 <label style="font-size:13px">Repeat</label>
 <input id="rl-n" type="range" min="1" max="6" value="3" oninput="document.getElementById('rl-nv').textContent=this.value" style="width:80px;accent-color:#22c55e" />
 <span id="rl-nv" style="color:#fbbf24;font-family:monospace;font-weight:700">3</span>
 <span style="font-size:13px">times:</span>
 <select id="rl-cmd" style="padding:6px;border-radius:8px;background:#052e16;color:#e0e0e0;border:1px solid #22c55e;font-size:14px">
 <option value="\u2192">Move Right \u2192</option>
 <option value="\u2191">Move Up \u2191</option>
 <option value="\u2193">Move Down \u2193</option>
 </select>
 <button onclick="unrollLoop()" style="padding:8px 18px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer;font-size:14px">Unroll</button>
 </div>
 <div style="display:flex;gap:16px;flex-wrap:wrap">
 <div style="flex:1;min-width:140px">
 <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">Loop (compact):</div>
 <div id="rl-compact" style="padding:10px;background:#052e16;border-radius:10px;border:2px solid #22c55e;font-family:monospace;font-size:13px;text-align:center"></div>
 </div>
 <div style="font-size:28px;line-height:80px;color:#fbbf24">\u27A1</div>
 <div style="flex:1;min-width:140px">
 <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">Unrolled (expanded):</div>
 <div id="rl-expanded" style="padding:10px;background:#052e16;border-radius:10px;border:2px dashed #f59e0b;font-family:monospace;font-size:13px;min-height:40px"></div>
 </div>
 </div>
 <script>
 (function(){
 window.unrollLoop=function(){
 var n=+document.getElementById('rl-n').value;
 var cmd=document.getElementById('rl-cmd').value;
 var cmdText=document.getElementById('rl-cmd').selectedOptions[0].text;
 document.getElementById('rl-compact').innerHTML='<div style="color:#22c55e;font-size:15px">repeat '+n+' times {</div><div style="padding:6px 0;font-size:16px">'+cmd+'</div><div style="color:#22c55e;font-size:15px">}</div>';
 var expanded='';
 var i=0;
 document.getElementById('rl-expanded').innerHTML='';
 var timer=setInterval(function(){
 if(i>=n){clearInterval(timer);return}
 expanded+='<div style="padding:4px 0;animation:fadeIn .3s ease;color:#fbbf24"><span style="color:#94a3b8;font-size:11px">#'+(i+1)+'</span> '+cmd+' '+cmdText+'</div>';
 document.getElementById('rl-expanded').innerHTML=expanded;
 i++;
 },350);
 };
 unrollLoop();
 })();
 </script>
 <style>@keyframes fadeIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}</style>
</div>`;

// ---------------------------------------------------------------------------
// 13. ROBOT: Conditional Concept
// ---------------------------------------------------------------------------
export const WIDGET_CONDITIONAL = `
<div id="cond-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#064e3b,#065f46);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 12px;font-size:18px;color:#34d399">Conditional: Decision Tree</h3>
 <div style="text-align:center;margin-bottom:14px">
 <span style="font-size:14px">Is there a <strong style="color:#fbbf24">wall ahead</strong>?</span>
 <div style="margin-top:8px;display:flex;justify-content:center;gap:12px">
 <button id="cond-yes" onclick="condSet(true)" style="padding:10px 28px;border:2px solid #22c55e;border-radius:10px;background:transparent;color:#22c55e;font-weight:700;cursor:pointer;font-size:14px;transition:all .2s">Yes \uD83E\uDDF1</button>
 <button id="cond-no" onclick="condSet(false)" style="padding:10px 28px;border:2px solid #3b82f6;border-radius:10px;background:transparent;color:#3b82f6;font-weight:700;cursor:pointer;font-size:14px;transition:all .2s">No \u2705</button>
 </div>
 </div>
 <svg viewBox="0 0 340 220" style="width:100%;max-width:340px;display:block;margin:0 auto">
 <defs><marker id="ca" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#34d399"/></marker></defs>
 <!-- Robot -->
 <text x="150" y="25" text-anchor="middle" font-size="26">\uD83E\uDD16</text>
 <line x1="170" y1="18" x2="170" y2="55" stroke="#34d399" stroke-width="2" marker-end="url(#ca)"/>
 <!-- Diamond -->
 <polygon id="cond-diamond" points="170,55 240,90 170,125 100,90" fill="#052e16" stroke="#fbbf24" stroke-width="2"/>
 <text x="170" y="95" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="monospace">wall ahead?</text>
 <!-- Yes branch -->
 <line x1="100" y1="90" x2="50" y2="90" stroke="#34d399" stroke-width="2"/>
 <line x1="50" y1="90" x2="50" y2="150" stroke="#34d399" stroke-width="2" marker-end="url(#ca)"/>
 <text x="65" y="83" fill="#22c55e" font-size="11" font-family="monospace">Yes</text>
 <rect id="cond-turn" x="5" y="155" width="90" height="40" rx="10" fill="#052e16" stroke="#22c55e" stroke-width="2"/>
 <text x="50" y="178" text-anchor="middle" fill="#22c55e" font-size="12" font-family="monospace">Turn right</text>
 <text x="50" y="210" text-anchor="middle" font-size="20" id="cond-turn-icon">\u21A9\uFE0F</text>
 <!-- No branch -->
 <line x1="240" y1="90" x2="290" y2="90" stroke="#34d399" stroke-width="2"/>
 <line x1="290" y1="90" x2="290" y2="150" stroke="#34d399" stroke-width="2" marker-end="url(#ca)"/>
 <text x="252" y="83" fill="#3b82f6" font-size="11" font-family="monospace">No</text>
 <rect id="cond-fwd" x="245" y="155" width="90" height="40" rx="10" fill="#052e16" stroke="#3b82f6" stroke-width="2"/>
 <text x="290" y="178" text-anchor="middle" fill="#3b82f6" font-size="12" font-family="monospace">Move fwd</text>
 <text x="290" y="210" text-anchor="middle" font-size="20" id="cond-fwd-icon">\u2B06\uFE0F</text>
 </svg>
 <div id="cond-result" style="text-align:center;font-family:monospace;font-size:14px;margin-top:8px;padding:8px;background:#052e16;border-radius:10px;transition:all .3s"></div>
 <script>
 (function(){
 window.condSet=function(wall){
 document.getElementById('cond-yes').style.background=wall?'#22c55e33':'transparent';
 document.getElementById('cond-no').style.background=!wall?'#3b82f633':'transparent';
 document.getElementById('cond-turn').style.opacity=wall?1:0.2;
 document.getElementById('cond-fwd').style.opacity=wall?0.2:1;
 document.getElementById('cond-turn-icon').style.opacity=wall?1:0.2;
 document.getElementById('cond-fwd-icon').style.opacity=wall?0.2:1;
 document.getElementById('cond-result').innerHTML=wall
 ?'\uD83E\uDD16 <span style="color:#22c55e">Wall detected! Turning right...</span>'
 :'\uD83E\uDD16 <span style="color:#3b82f6">Path clear! Moving forward...</span>';
 };
 condSet(false);
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 14. GENERAL: Progress Tracker
// ---------------------------------------------------------------------------
export const WIDGET_PROGRESS = `
<div id="prog-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 16px;font-size:18px;color:#a78bfa">Concept Mastery</h3>
 <div id="prog-bars"></div>
 <div style="margin-top:14px;text-align:center">
 <button onclick="progReset()" style="padding:8px 20px;border:none;border-radius:10px;background:#6366f1;color:#fff;font-weight:600;cursor:pointer;font-size:13px">Reset Progress</button>
 </div>
 <script>
 (function(){
 var topics=[
 {name:'Variables',icon:'\uD83D\uDCE6',pct:0,color:'#7c3aed'},
 {name:'Conditions',icon:'\uD83D\uDD00',pct:0,color:'#3b82f6'},
 {name:'Loops',icon:'\uD83D\uDD01',pct:0,color:'#22c55e'},
 {name:'Functions',icon:'\u2699\uFE0F',pct:0,color:'#f59e0b'},
 {name:'Lists',icon:'\uD83D\uDCCB',pct:0,color:'#ef4444'}
 ];
 function render(){
 var html='';
 topics.forEach(function(t,i){
 html+='<div style="margin-bottom:12px">';
 html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
 html+='<span style="font-size:14px">'+t.icon+' '+t.name+'</span>';
 html+='<span style="font-family:monospace;font-size:13px;color:'+t.color+'">'+t.pct+'%</span>';
 html+='</div>';
 html+='<div style="height:24px;background:#1e1b4b;border-radius:12px;overflow:hidden;cursor:pointer;position:relative" onclick="progClick('+i+')">';
 html+='<div style="height:100%;width:'+t.pct+'%;background:linear-gradient(90deg,'+t.color+','+t.color+'99);border-radius:12px;transition:width .5s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px">';
 if(t.pct>=100)html+='<span style="font-size:14px">\u2B50</span>';
 html+='</div></div></div>';
 });
 document.getElementById('prog-bars').innerHTML=html;
 }
 window.progClick=function(i){
 topics[i].pct=Math.min(100,topics[i].pct+20);
 render();
 };
 window.progReset=function(){topics.forEach(function(t){t.pct=0});render()};
 render();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// 15. GENERAL: Formula Flashcard
// ---------------------------------------------------------------------------
export const WIDGET_FLASHCARD = `
<div id="flash-widget" style="font-family:'Segoe UI',system-ui,sans-serif;max-width:420px;margin:0 auto;padding:20px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
 <h3 style="margin:0 0 16px;font-size:18px;color:#a78bfa">Formula Flashcards</h3>
 <div id="flash-card" onclick="flipCard()" style="min-height:180px;background:#2e1065;border-radius:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;border:2px solid #7c3aed;transition:transform .4s,box-shadow .4s;position:relative;perspective:600px;user-select:none" onmouseenter="this.style.boxShadow='0 0 24px #7c3aed66'" onmouseleave="this.style.boxShadow='none'">
 <div id="flash-content" style="transition:opacity .2s"></div>
 <div style="position:absolute;bottom:10px;right:14px;font-size:11px;color:#6366f1">click to flip</div>
 </div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
 <button onclick="prevCard()" style="padding:8px 18px;border:none;border-radius:10px;background:#4c1d95;color:#c4b5fd;font-size:18px;cursor:pointer">\u2190</button>
 <span id="flash-counter" style="font-family:monospace;font-size:13px;color:#94a3b8"></span>
 <button onclick="nextCard()" style="padding:8px 18px;border:none;border-radius:10px;background:#4c1d95;color:#c4b5fd;font-size:18px;cursor:pointer">\u2192</button>
 </div>
 <script>
 (function(){
 var cards=[
 {front:'<div style="font-size:36px;font-family:serif;color:#f0abfc">a\u00B2 + b\u00B2 = c\u00B2</div><div style="font-size:13px;color:#c084fc;margin-top:8px">Pythagorean Theorem</div>',
 back:'<div style="font-size:15px;color:#e0e0e0;line-height:1.6">In a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides.<br/><br/><span style="color:#fbbf24">Use when:</span> Finding missing side lengths in right triangles</div>'},
 {front:'<div style="font-size:32px;font-family:serif;color:#f0abfc">m = (y\u2082 - y\u2081) / (x\u2082 - x\u2081)</div><div style="font-size:13px;color:#c084fc;margin-top:8px">Slope Formula</div>',
 back:'<div style="font-size:15px;color:#e0e0e0;line-height:1.6">Slope measures steepness: rise over run between two points.<br/><br/><span style="color:#fbbf24">Positive:</span> goes up \u2197<br/><span style="color:#fbbf24">Negative:</span> goes down \u2198<br/><span style="color:#fbbf24">Zero:</span> horizontal \u2192</div>'},
 {front:'<div style="font-size:30px;font-family:serif;color:#f0abfc">x = (-b \u00B1 \u221A(b\u00B2-4ac)) / 2a</div><div style="font-size:13px;color:#c084fc;margin-top:8px">Quadratic Formula</div>',
 back:'<div style="font-size:15px;color:#e0e0e0;line-height:1.6">Solves any quadratic equation ax\u00B2+bx+c=0.<br/><br/><span style="color:#fbbf24">Discriminant b\u00B2-4ac:</span><br/>> 0 \u2192 two real roots<br/>= 0 \u2192 one root<br/>< 0 \u2192 no real roots</div>'},
 {front:'<div style="font-size:36px;font-family:serif;color:#f0abfc">A = \u03C0r\u00B2</div><div style="font-size:13px;color:#c084fc;margin-top:8px">Area of a Circle</div>',
 back:'<div style="font-size:15px;color:#e0e0e0;line-height:1.6">The area enclosed by a circle with radius r.<br/><br/>\u03C0 \u2248 3.14159<br/><span style="color:#fbbf24">Example:</span> r=5 \u2192 A=25\u03C0 \u2248 78.54</div>'},
 {front:'<div style="font-size:34px;font-family:serif;color:#f0abfc">d = \u221A((x\u2082-x\u2081)\u00B2+(y\u2082-y\u2081)\u00B2)</div><div style="font-size:13px;color:#c084fc;margin-top:8px">Distance Formula</div>',
 back:'<div style="font-size:15px;color:#e0e0e0;line-height:1.6">Distance between two points in a coordinate plane.<br/><br/>Derived from the Pythagorean theorem applied to horizontal and vertical differences.<br/><span style="color:#fbbf24">Always positive!</span></div>'}
 ];
 var idx=0,flipped=false;
 function show(){
 document.getElementById('flash-content').innerHTML=flipped?cards[idx].back:cards[idx].front;
 document.getElementById('flash-counter').textContent=(idx+1)+' / '+cards.length;
 document.getElementById('flash-card').style.background=flipped?'#1e1b4b':'#2e1065';
 }
 window.flipCard=function(){flipped=!flipped;
 var el=document.getElementById('flash-card');el.style.transform='scale(0.95)';setTimeout(function(){show();el.style.transform='scale(1)'},150);
 };
 window.nextCard=function(){idx=(idx+1)%cards.length;flipped=false;show()};
 window.prevCard=function(){idx=(idx-1+cards.length)%cards.length;flipped=false;show()};
 show();
 })();
 </script>
</div>`;

// ---------------------------------------------------------------------------
// Export all widgets as an indexed collection
// ---------------------------------------------------------------------------
export const INTERACTIVE_WIDGETS = {
 // Python Programming
 variableAssignment: WIDGET_VARIABLE_ASSIGNMENT,
 ifElseFlowchart: WIDGET_IF_ELSE_FLOWCHART,
 forLoop: WIDGET_FOR_LOOP,
 listOperations: WIDGET_LIST_OPERATIONS,
 dictionary: WIDGET_DICTIONARY,
 // SAT Math
 slope: WIDGET_SLOPE,
 quadratic: WIDGET_QUADRATIC,
 systemEquations: WIDGET_SYSTEM_EQUATIONS,
 pythagorean: WIDGET_PYTHAGOREAN,
 unitCircle: WIDGET_UNIT_CIRCLE,
 // Robot / Visual Programming
 sequence: WIDGET_SEQUENCE,
 loopConcept: WIDGET_LOOP_CONCEPT,
 conditional: WIDGET_CONDITIONAL,
 // General
 progress: WIDGET_PROGRESS,
 flashcard: WIDGET_FLASHCARD,
} as const;

export type WidgetKey = keyof typeof INTERACTIVE_WIDGETS;
