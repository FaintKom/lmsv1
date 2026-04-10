"""
Interactive widgets for SAT Math course theory sections.
Each constant is a self-contained HTML/CSS/JS string wrapped in <!-- interactive --> markers.
The platform's content-renderer.tsx auto-detects these markers and renders them in sandboxed iframes.

JSXGraph widgets use CDN: https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraphcore.js
Vanilla JS widgets are fully self-contained with no external dependencies.
"""

# ═══════════════════════════════════════════════════════════════════════
# Shared helpers
# ═══════════════════════════════════════════════════════════════════════

_JSXGRAPH_CSS = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraph.css">'
_JSXGRAPH_JS = '<script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraphcore.js"></' + 'script>'

_WIDGET_STYLE = """<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;padding:16px}
.widget-title{font-size:1rem;font-weight:700;color:#4f46e5;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.widget-title::before{content:'\\1F3AE';font-size:1.1rem}
.controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;align-items:center}
.controls label{font-size:0.85rem;font-weight:600;color:#475569}
.controls input[type=range]{flex:1;min-width:120px;accent-color:#6366f1}
.val{display:inline-block;min-width:40px;text-align:center;font-weight:700;color:#6366f1;font-size:0.95rem;background:#eef2ff;border-radius:6px;padding:2px 8px}
.info-box{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:12px 16px;margin:12px 0;font-size:0.9rem;line-height:1.5}
.info-box b{color:#4338ca}
button.action{background:#6366f1;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background .15s}
button.action:hover{background:#4f46e5}
</style>"""

def _jsx_widget(widget_id, height, body_html, script_code):
    """Helper to build a JSXGraph widget string."""
    return (
        '<!-- interactive -->'
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + _WIDGET_STYLE
        + _JSXGRAPH_CSS
        + '</head><body>'
        + body_html
        + f'<div id="{widget_id}" style="width:100%;height:{height}px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin:8px 0"></div>'
        + _JSXGRAPH_JS
        + '<script>' + script_code + '</' + 'script>'
        + '</body></html>'
        '<!-- /interactive -->'
    )

def _vanilla_widget(body_html, script_code):
    """Helper to build a vanilla JS widget string."""
    return (
        '<!-- interactive -->'
        '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + _WIDGET_STYLE
        + '</head><body>'
        + body_html
        + '<script>' + script_code + '</' + 'script>'
        + '</body></html>'
        '<!-- /interactive -->'
    )


# ═══════════════════════════════════════════════════════════════════════
# MODULE 1: Heart of Algebra
# ═══════════════════════════════════════════════════════════════════════

# ── 1.1 Equation Balance Scale ────────────────────────────────────────
WIDGET_EQUATION_BALANCE = _vanilla_widget(
    '<div class="widget-title">Equation Balance</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:12px">Drag the slider to apply operations and watch the equation balance in real time.</p>'
    '<div id="eq-display" style="text-align:center;font-size:1.4rem;font-weight:700;padding:16px;background:white;border-radius:12px;border:1px solid #e2e8f0;margin:8px 0">'
    '  <span id="left">3x + 7</span>'
    '  <span style="color:#6366f1;margin:0 12px">=</span>'
    '  <span id="right">22</span>'
    '</div>'
    '<div style="display:flex;justify-content:center;margin:16px 0">'
    '  <canvas id="beam" width="360" height="100"></canvas>'
    '</div>'
    '<div class="controls">'
    '  <label>Step:</label>'
    '  <input type="range" id="step" min="0" max="2" value="0" step="1">'
    '  <span class="val" id="stepLabel">Start</span>'
    '</div>'
    '<div class="info-box" id="explain">Move the slider to solve step by step.</div>',
    # --- script ---
    r"""
    var steps=[
      {l:'3x + 7',r:'22',explain:'Starting equation: 3x + 7 = 22',tilt:0,label:'Start'},
      {l:'3x',r:'15',explain:'Subtract 7 from both sides: 3x = 15',tilt:0,label:'Step 1: −7'},
      {l:'x',r:'5',explain:'Divide both sides by 3: x = 5  ✓',tilt:0,label:'Step 2: ÷3'}
    ];
    var slider=document.getElementById('step'),leftEl=document.getElementById('left'),
        rightEl=document.getElementById('right'),stepLabel=document.getElementById('stepLabel'),
        explainEl=document.getElementById('explain'),canvas=document.getElementById('beam'),
        ctx=canvas.getContext('2d');
    function drawBeam(tilt){
      ctx.clearRect(0,0,360,100);
      var cx=180,cy=50,len=140,angle=tilt*0.15;
      // fulcrum
      ctx.beginPath();ctx.moveTo(cx,cy+30);ctx.lineTo(cx-15,cy+48);ctx.lineTo(cx+15,cy+48);ctx.closePath();
      ctx.fillStyle='#94a3b8';ctx.fill();
      // beam
      ctx.save();ctx.translate(cx,cy+30);ctx.rotate(angle);
      ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(len,0);ctx.strokeStyle='#6366f1';ctx.lineWidth=4;ctx.stroke();
      // pans
      ctx.beginPath();ctx.arc(-len,0,18,0,Math.PI*2);ctx.fillStyle='#c7d2fe';ctx.fill();ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.arc(len,0,18,0,Math.PI*2);ctx.fillStyle='#c7d2fe';ctx.fill();ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.stroke();
      ctx.restore();
    }
    function update(){
      var s=steps[+slider.value];
      leftEl.textContent=s.l;rightEl.textContent=s.r;
      stepLabel.textContent=s.label;explainEl.innerHTML='<b>'+s.label+':</b> '+s.explain;
      drawBeam(s.tilt);
    }
    slider.addEventListener('input',update);
    update();
    """
)

# ── 1.2 Number Line Inequality Grapher ────────────────────────────────
WIDGET_INEQUALITY_NUMBER_LINE = _jsx_widget('jxgbox1', 220,
    '<div class="widget-title">Inequality Number Line</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag the boundary point and change the operator to see how the solution set changes.</p>'
    '<div class="controls">'
    '  <label>Operator:</label>'
    '  <select id="op" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.9rem">'
    '    <option value="lt">&lt; (less than)</option>'
    '    <option value="le">≤ (less or equal)</option>'
    '    <option value="gt" selected>&gt; (greater than)</option>'
    '    <option value="ge">≥ (greater or equal)</option>'
    '  </select>'
    '  <span class="val" id="bval">2</span>'
    '</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox1',{boundingbox:[-8,3,8,-3],axis:false,showNavigation:false,showCopyright:false,pan:{enabled:false},zoom:{enabled:false}});
    // number line
    board.create('line',[[0,0],[1,0]],{straightFirst:true,straightLast:true,strokeColor:'#94a3b8',strokeWidth:2,fixed:true,highlight:false});
    for(var i=-7;i<=7;i++){
      board.create('point',[i,0],{size:1,name:'',fixed:true,strokeColor:'#94a3b8',fillColor:'#94a3b8',highlight:false,showInfobox:false,label:{offset:[0,-15],fontSize:11}});
      board.create('text',[i,-0.6,i.toString()],{fixed:true,anchorX:'middle',fontSize:12,cssStyle:'color:#64748b'});
    }
    var bp=board.create('point',[2,0],{size:5,name:'',strokeColor:'#6366f1',fillColor:'#6366f1',showInfobox:false,attractors:[],snapToGrid:true,snapSizeX:1});
    // shading line
    var shade=board.create('line',[[function(){return bp.X()},0],[function(){var op=document.getElementById('op').value;return op==='lt'||op==='le'?-10:10},0]],{straightFirst:false,straightLast:false,strokeColor:'#6366f1',strokeWidth:6,strokeOpacity:0.4,fixed:true,highlight:false});
    var arrow=board.create('point',[function(){var op=document.getElementById('op').value;return op==='lt'||op==='le'?-7.5:7.5},0],{size:4,name:'',strokeColor:'#6366f1',fillColor:'#6366f1',fixed:true,highlight:false,showInfobox:false});
    function updateCircle(){
      var op=document.getElementById('op').value;
      var filled=(op==='le'||op==='ge');
      bp.setAttribute({fillColor:filled?'#6366f1':'white',strokeWidth:filled?1:3});
      document.getElementById('bval').textContent=bp.X().toFixed(0);
      board.update();
    }
    bp.on('drag',updateCircle);
    document.getElementById('op').addEventListener('change',function(){updateCircle();board.update()});
    updateCircle();
    """
)

# ── 1.3 Two-Line Intersection Explorer ────────────────────────────────
WIDGET_TWO_LINE_INTERSECTION = _jsx_widget('jxgbox2', 380,
    '<div class="widget-title">System of Equations Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust slope and intercept of two lines to see where they intersect.</p>'
    '<div class="controls">'
    '  <label style="color:#6366f1">Line 1:</label>'
    '  <label>m₁</label><input type="range" id="m1" min="-3" max="3" value="2" step="0.5" style="width:80px"><span class="val" id="vm1">2</span>'
    '  <label>b₁</label><input type="range" id="b1" min="-4" max="4" value="-1" step="0.5" style="width:80px"><span class="val" id="vb1">-1</span>'
    '</div>'
    '<div class="controls">'
    '  <label style="color:#f59e0b">Line 2:</label>'
    '  <label>m₂</label><input type="range" id="m2" min="-3" max="3" value="-1" step="0.5" style="width:80px"><span class="val" id="vm2">-1</span>'
    '  <label>b₂</label><input type="range" id="b2" min="-4" max="4" value="3" step="0.5" style="width:80px"><span class="val" id="vb2">3</span>'
    '</div>'
    '<div class="info-box" id="result">Intersection: loading...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox2',{boundingbox:[-6,6,6,-6],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    var L1=board.create('functiongraph',[function(x){return gv('m1')*x+gv('b1')}],{strokeColor:'#6366f1',strokeWidth:2.5});
    var L2=board.create('functiongraph',[function(x){return gv('m2')*x+gv('b2')}],{strokeColor:'#f59e0b',strokeWidth:2.5});
    var ip=board.create('point',[function(){var m1=gv('m1'),b1=gv('b1'),m2=gv('m2'),b2=gv('b2');if(Math.abs(m1-m2)<0.01)return NaN;return(b2-b1)/(m1-m2)},function(){var m1=gv('m1'),b1=gv('b1'),m2=gv('m2'),b2=gv('b2');if(Math.abs(m1-m2)<0.01)return NaN;var x=(b2-b1)/(m1-m2);return m1*x+b1}],{size:5,name:'',strokeColor:'#ef4444',fillColor:'#ef4444',fixed:true,showInfobox:false});
    function update(){
      ['m1','b1','m2','b2'].forEach(function(id){document.getElementById('v'+id).textContent=gv(id)});
      board.update();
      var m1=gv('m1'),b1=gv('b1'),m2=gv('m2'),b2=gv('b2'),res=document.getElementById('result');
      if(Math.abs(m1-m2)<0.01){
        res.innerHTML=b1===b2?'<b>Infinite solutions</b> — same line!':'<b>No solution</b> — parallel lines (same slope, different intercepts)';
      } else {
        var x=(b2-b1)/(m1-m2),y=m1*x+b1;
        res.innerHTML='<b>Intersection:</b> ('+x.toFixed(1)+', '+y.toFixed(1)+') — one unique solution';
      }
    }
    ['m1','b1','m2','b2'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    update();
    """
)

# ── 1.4 Slope Explorer ───────────────────────────────────────────────
WIDGET_SLOPE_EXPLORER = _jsx_widget('jxgbox3', 380,
    '<div class="widget-title">Slope Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag the two points to see slope calculated in real time. The rise and run are shown as colored segments.</p>'
    '<div class="info-box" id="slope-info">Drag the points!</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox3',{boundingbox:[-6,6,6,-6],axis:true,showNavigation:false,showCopyright:false,keepaspectratio:true});
    var p1=board.create('point',[1,2],{size:5,name:'A',strokeColor:'#6366f1',fillColor:'#6366f1',label:{fontSize:14,offset:[10,5]}});
    var p2=board.create('point',[4,5],{size:5,name:'B',strokeColor:'#6366f1',fillColor:'#6366f1',label:{fontSize:14,offset:[10,5]}});
    var line=board.create('line',[p1,p2],{strokeColor:'#6366f1',strokeWidth:2,straightFirst:true,straightLast:true});
    // rise segment (vertical)
    var rise=board.create('segment',[[function(){return p2.X()},function(){return p1.Y()}],p2],{strokeColor:'#ef4444',strokeWidth:3,dash:2});
    // run segment (horizontal)
    var run=board.create('segment',[p1,[function(){return p2.X()},function(){return p1.Y()}]],{strokeColor:'#22c55e',strokeWidth:3,dash:2});
    // labels
    board.create('text',[function(){return p2.X()+0.3},function(){return(p1.Y()+p2.Y())/2},'rise'],{fontSize:13,cssStyle:'color:#ef4444;font-weight:700'});
    board.create('text',[function(){return(p1.X()+p2.X())/2},function(){return p1.Y()-0.5},'run'],{fontSize:13,cssStyle:'color:#22c55e;font-weight:700'});
    function updateInfo(){
      var dx=p2.X()-p1.X(),dy=p2.Y()-p1.Y();
      var info=document.getElementById('slope-info');
      if(Math.abs(dx)<0.01){info.innerHTML='<b>Undefined slope</b> — vertical line (run = 0)';return}
      var m=dy/dx;
      info.innerHTML='<b>Rise</b> = '+(dy>=0?'+':'')+dy.toFixed(1)+' &nbsp; <b>Run</b> = '+(dx>=0?'+':'')+dx.toFixed(1)+' &nbsp; <b>Slope m</b> = '+m.toFixed(2)+'<br>Equation: <b>y = '+m.toFixed(2)+'x + '+(p1.Y()-m*p1.X()).toFixed(2)+'</b>';
    }
    p1.on('drag',updateInfo);p2.on('drag',updateInfo);
    updateInfo();
    """
)

# ── 1.5 Intercept Plotter ────────────────────────────────────────────
WIDGET_INTERCEPT_PLOTTER = _jsx_widget('jxgbox4', 380,
    '<div class="widget-title">Intercept Plotter</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Enter slope (m) and y-intercept (b) to see the line, its x-intercept, and y-intercept plotted.</p>'
    '<div class="controls">'
    '  <label>m =</label><input type="range" id="pm" min="-3" max="3" value="1" step="0.25" style="width:100px"><span class="val" id="pvm">1</span>'
    '  <label>b =</label><input type="range" id="pb" min="-4" max="4" value="2" step="0.5" style="width:100px"><span class="val" id="pvb">2</span>'
    '</div>'
    '<div class="info-box" id="int-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox4',{boundingbox:[-6,6,6,-6],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    var fn=board.create('functiongraph',[function(x){return gv('pm')*x+gv('pb')}],{strokeColor:'#6366f1',strokeWidth:2.5});
    var yInt=board.create('point',[0,function(){return gv('pb')}],{size:5,name:'y-int',strokeColor:'#22c55e',fillColor:'#22c55e',fixed:true,showInfobox:false,label:{fontSize:12,offset:[10,5],cssStyle:'color:#22c55e;font-weight:700'}});
    var xInt=board.create('point',[function(){var m=gv('pm');return Math.abs(m)<0.01?NaN:-gv('pb')/m},0],{size:5,name:'x-int',strokeColor:'#ef4444',fillColor:'#ef4444',fixed:true,showInfobox:false,label:{fontSize:12,offset:[10,5],cssStyle:'color:#ef4444;font-weight:700'}});
    function update(){
      document.getElementById('pvm').textContent=gv('pm');
      document.getElementById('pvb').textContent=gv('pb');
      var m=gv('pm'),b=gv('pb'),info=document.getElementById('int-info');
      var eq='y = '+m+'x'+(b>=0?' + ':' − ')+Math.abs(b);
      if(Math.abs(m)<0.01) info.innerHTML='<b>'+eq+'</b><br>y-intercept: <b>(0, '+b+')</b> | x-intercept: <b>none</b> (horizontal line)';
      else info.innerHTML='<b>'+eq+'</b><br>y-intercept: <b>(0, '+b+')</b> | x-intercept: <b>('+(-b/m).toFixed(1)+', 0)</b>';
      board.update();
    }
    document.getElementById('pm').addEventListener('input',update);
    document.getElementById('pb').addEventListener('input',update);
    update();
    """
)

# ── 1.6 Cost Model Simulator ─────────────────────────────────────────
WIDGET_COST_SIMULATOR = _vanilla_widget(
    '<div class="widget-title">Linear Model Simulator</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust the base fee and hourly rate to see how total cost changes.</p>'
    '<div class="controls">'
    '  <label>Base fee:</label><input type="range" id="base" min="0" max="100" value="50" step="5"><span class="val" id="vbase">$50</span>'
    '</div>'
    '<div class="controls">'
    '  <label>Rate/hr:</label><input type="range" id="rate" min="5" max="60" value="30" step="5"><span class="val" id="vrate">$30</span>'
    '</div>'
    '<div class="controls">'
    '  <label>Hours:</label><input type="range" id="hrs" min="0" max="10" value="3" step="0.5"><span class="val" id="vhrs">3</span>'
    '</div>'
    '<canvas id="costChart" width="400" height="200" style="width:100%;border-radius:10px;border:1px solid #e2e8f0;margin:8px 0"></canvas>'
    '<div class="info-box" id="cost-info">...</div>',
    # --- script ---
    r"""
    var c=document.getElementById('costChart'),ctx=c.getContext('2d');
    function gv(id){return parseFloat(document.getElementById(id).value)}
    function draw(){
      var base=gv('base'),rate=gv('rate'),hrs=gv('hrs');
      document.getElementById('vbase').textContent='$'+base;
      document.getElementById('vrate').textContent='$'+rate;
      document.getElementById('vhrs').textContent=hrs;
      var total=base+rate*hrs;
      document.getElementById('cost-info').innerHTML='<b>C(h) = '+rate+'h + '+base+'</b><br>For '+hrs+' hours: <b>$'+total.toFixed(0)+'</b>';
      // draw chart
      ctx.clearRect(0,0,400,200);
      ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,400,200);
      // axes
      ctx.strokeStyle='#94a3b8';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(40,10);ctx.lineTo(40,170);ctx.lineTo(390,170);ctx.stroke();
      // labels
      ctx.fillStyle='#64748b';ctx.font='11px system-ui';
      ctx.fillText('$',20,15);ctx.fillText('Hours',370,185);
      var maxY=base+rate*10,scaleY=150/maxY,scaleX=340/10;
      // grid + y labels
      for(var i=0;i<=4;i++){
        var val=Math.round(maxY*i/4),py=170-val*scaleY;
        ctx.fillStyle='#94a3b8';ctx.fillText('$'+val,0,py+4);
        ctx.strokeStyle='#e2e8f0';ctx.beginPath();ctx.moveTo(40,py);ctx.lineTo(390,py);ctx.stroke();
      }
      // x labels
      for(var i=0;i<=10;i+=2){
        var px=40+i*scaleX;
        ctx.fillStyle='#94a3b8';ctx.fillText(i,px-4,185);
      }
      // line
      ctx.strokeStyle='#6366f1';ctx.lineWidth=2.5;ctx.beginPath();
      ctx.moveTo(40,170-base*scaleY);
      for(var h=0;h<=10;h+=0.5){ctx.lineTo(40+h*scaleX,170-(base+rate*h)*scaleY)}
      ctx.stroke();
      // current point
      var px=40+hrs*scaleX,py=170-total*scaleY;
      ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fillStyle='#ef4444';ctx.fill();ctx.strokeStyle='white';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#1e293b';ctx.font='bold 12px system-ui';ctx.fillText('$'+total.toFixed(0),px+10,py-5);
    }
    ['base','rate','hrs'].forEach(function(id){document.getElementById(id).addEventListener('input',draw)});
    draw();
    """
)


# ═══════════════════════════════════════════════════════════════════════
# MODULE 2: Problem Solving & Data Analysis
# ═══════════════════════════════════════════════════════════════════════

# ── 2.1 Cross-Multiplication Visualizer ───────────────────────────────
WIDGET_CROSS_MULTIPLICATION = _vanilla_widget(
    '<div class="widget-title">Cross-Multiplication Visualizer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Enter values for a proportion. Leave one blank (as x) to solve.</p>'
    '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0;font-size:1.3rem">'
    '  <div style="text-align:center"><input id="ca" type="number" value="3" style="width:50px;text-align:center;font-size:1.2rem;border:2px solid #6366f1;border-radius:8px;padding:4px"><hr style="border:2px solid #6366f1;margin:4px 0"><input id="cb" type="number" value="4" style="width:50px;text-align:center;font-size:1.2rem;border:2px solid #6366f1;border-radius:8px;padding:4px"></div>'
    '  <span style="font-size:1.5rem;color:#6366f1;font-weight:700">=</span>'
    '  <div style="text-align:center"><input id="cc" type="number" value="9" style="width:50px;text-align:center;font-size:1.2rem;border:2px solid #f59e0b;border-radius:8px;padding:4px"><hr style="border:2px solid #f59e0b;margin:4px 0"><input id="cd" type="number" placeholder="x" style="width:50px;text-align:center;font-size:1.2rem;border:2px solid #f59e0b;border-radius:8px;padding:4px"></div>'
    '</div>'
    '<div style="text-align:center;margin:8px 0"><button class="action" onclick="solve()">Solve</button></div>'
    '<div class="info-box" id="cross-info">Enter three values and leave one empty to solve.</div>',
    # --- script ---
    r"""
    function solve(){
      var a=document.getElementById('ca').value,b=document.getElementById('cb').value,
          c=document.getElementById('cc').value,d=document.getElementById('cd').value;
      var info=document.getElementById('cross-info'),vals=[a,b,c,d],empty=vals.filter(function(v){return v===''}).length;
      if(empty!==1){info.innerHTML='<b>Leave exactly one field empty</b> to solve.';return}
      a=a===''?null:+a;b=b===''?null:+b;c=c===''?null:+c;d=d===''?null:+d;
      var result,step;
      if(a===null){result=(b*c)/d;document.getElementById('ca').value=result;step='a = (b × c) ÷ d = ('+b+' × '+c+') ÷ '+d+' = '+result}
      else if(b===null){result=(a*d)/c;document.getElementById('cb').value=result;step='b = (a × d) ÷ c = ('+a+' × '+d+') ÷ '+c+' = '+result}
      else if(c===null){result=(a*d)/b;document.getElementById('cc').value=result;step='c = (a × d) ÷ b = ('+a+' × '+d+') ÷ '+b+' = '+result}
      else{result=(b*c)/a;document.getElementById('cd').value=result;step='d = (b × c) ÷ a = ('+b+' × '+c+') ÷ '+a+' = '+result}
      info.innerHTML='<b>Cross-multiply:</b> a × d = b × c<br>'+step;
    }
    """
)

# ── 2.2 Percent Calculator ───────────────────────────────────────────
WIDGET_PERCENT_CALCULATOR = _vanilla_widget(
    '<div class="widget-title">Percent Calculator</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust the percent to see the visual bar fill and calculations update.</p>'
    '<div class="controls">'
    '  <label>Whole:</label><input type="number" id="whole" value="200" style="width:70px;border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:0.9rem">'
    '  <label>Percent:</label><input type="range" id="pct" min="0" max="100" value="35"><span class="val" id="vpct">35%</span>'
    '</div>'
    '<div style="background:#e2e8f0;border-radius:10px;height:36px;overflow:hidden;margin:12px 0;position:relative">'
    '  <div id="bar" style="background:linear-gradient(90deg,#6366f1,#818cf8);height:100%;width:35%;border-radius:10px;transition:width .2s"></div>'
    '  <span id="barLabel" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-weight:700;font-size:0.9rem;color:#1e293b">70 / 200</span>'
    '</div>'
    '<div class="info-box" id="pct-info">...</div>',
    # --- script ---
    r"""
    function update(){
      var whole=parseFloat(document.getElementById('whole').value)||0,
          pct=parseFloat(document.getElementById('pct').value);
      var part=whole*pct/100;
      document.getElementById('vpct').textContent=pct+'%';
      document.getElementById('bar').style.width=pct+'%';
      document.getElementById('barLabel').textContent=part.toFixed(1)+' / '+whole;
      document.getElementById('pct-info').innerHTML='<b>Part = Whole × (Percent ÷ 100)</b><br>'+part.toFixed(1)+' = '+whole+' × ('+pct+' ÷ 100) = '+whole+' × '+( pct/100).toFixed(3);
    }
    document.getElementById('pct').addEventListener('input',update);
    document.getElementById('whole').addEventListener('input',update);
    update();
    """
)

# ── 2.3 Mean/Median/Mode Explorer ────────────────────────────────────
WIDGET_STATISTICS_EXPLORER = _vanilla_widget(
    '<div class="widget-title">Statistics Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Click values on the dot plot to add/remove data points. See how mean, median, and mode change.</p>'
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;justify-content:center" id="dots"></div>'
    '<div style="text-align:center;margin:8px 0"><button class="action" id="addOutlier">+ Add Outlier (20)</button> <button class="action" id="reset" style="background:#ef4444">Reset</button></div>'
    '<div class="info-box" id="stats-info">Click numbers to add data points.</div>',
    # --- script ---
    r"""
    var data=[2,3,4,4,5,6,7];
    var dotsEl=document.getElementById('dots');
    function render(){
      dotsEl.innerHTML='';
      for(var v=1;v<=10;v++){
        var count=data.filter(function(d){return d===v}).length;
        var btn=document.createElement('button');
        btn.style.cssText='width:36px;height:36px;border-radius:50%;border:2px solid '+(count>0?'#6366f1':'#cbd5e1')+';background:'+(count>0?'#eef2ff':'white')+';font-weight:700;font-size:0.8rem;cursor:pointer;color:'+(count>0?'#6366f1':'#94a3b8')+';position:relative';
        btn.textContent=v;
        if(count>1){var badge=document.createElement('span');badge.style.cssText='position:absolute;top:-6px;right:-6px;background:#6366f1;color:white;font-size:0.65rem;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center';badge.textContent=count;btn.appendChild(badge)}
        btn.onclick=(function(val){return function(){
          var idx=data.indexOf(val);
          if(idx>=0)data.splice(idx,1);else data.push(val);
          render();
        }})(v);
        dotsEl.appendChild(btn);
      }
      updateStats();
    }
    function updateStats(){
      if(data.length===0){document.getElementById('stats-info').innerHTML='No data. Click numbers to add.';return}
      var sorted=data.slice().sort(function(a,b){return a-b});
      var mean=sorted.reduce(function(s,v){return s+v},0)/sorted.length;
      var mid=Math.floor(sorted.length/2);
      var median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
      var freq={},maxF=0,modes=[];
      sorted.forEach(function(v){freq[v]=(freq[v]||0)+1;if(freq[v]>maxF)maxF=freq[v]});
      Object.keys(freq).forEach(function(k){if(freq[k]===maxF)modes.push(k)});
      var range=sorted[sorted.length-1]-sorted[0];
      document.getElementById('stats-info').innerHTML='Data: ['+sorted.join(', ')+']<br><b>Mean</b> = '+mean.toFixed(2)+' &nbsp; <b>Median</b> = '+median+' &nbsp; <b>Mode</b> = '+modes.join(', ')+' &nbsp; <b>Range</b> = '+range;
    }
    document.getElementById('addOutlier').onclick=function(){data.push(20);render()};
    document.getElementById('reset').onclick=function(){data=[2,3,4,4,5,6,7];render()};
    render();
    """
)

# ── 2.4 Correlation Explorer ─────────────────────────────────────────
WIDGET_CORRELATION_EXPLORER = _jsx_widget('jxgbox5', 380,
    '<div class="widget-title">Correlation Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag points to see how the line of best fit and correlation change. Click on the plane to add new points.</p>'
    '<div class="info-box" id="corr-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox5',{boundingbox:[-1,12,12,-1],axis:true,showNavigation:false,showCopyright:false});
    var pts=[[1,2],[2,3.5],[3,4],[5,6],[6,5.5],[7,8],[8,7.5],[9,9]];
    var points=pts.map(function(p){return board.create('point',p,{size:4,strokeColor:'#6366f1',fillColor:'#6366f1',name:'',showInfobox:false})});
    board.on('down',function(e){
      var coords=board.getUsrCoordsOfMouse(e);
      if(coords[0]>0&&coords[0]<11&&coords[1]>0&&coords[1]<11){
        points.push(board.create('point',[coords[0],coords[1]],{size:4,strokeColor:'#6366f1',fillColor:'#6366f1',name:'',showInfobox:false}));
        points[points.length-1].on('drag',updateFit);
        updateFit();
      }
    });
    var fitLine=null;
    function updateFit(){
      if(fitLine)board.removeObject(fitLine);
      var n=points.length,sx=0,sy=0,sxy=0,sx2=0;
      points.forEach(function(p){var x=p.X(),y=p.Y();sx+=x;sy+=y;sxy+=x*y;sx2+=x*x});
      var m=(n*sxy-sx*sy)/(n*sx2-sx*sx),b=(sy-m*sx)/n;
      fitLine=board.create('functiongraph',[function(x){return m*x+b}],{strokeColor:'#ef4444',strokeWidth:2,dash:2});
      // r value
      var mx=sx/n,my=sy/n,num=0,d1=0,d2=0;
      points.forEach(function(p){var dx=p.X()-mx,dy=p.Y()-my;num+=dx*dy;d1+=dx*dx;d2+=dy*dy});
      var r=num/Math.sqrt(d1*d2);
      var type=Math.abs(r)>0.7?'strong':Math.abs(r)>0.4?'moderate':'weak';
      var dir=r>0?'positive':'negative';
      document.getElementById('corr-info').innerHTML='<b>Line of best fit:</b> y = '+m.toFixed(2)+'x + '+b.toFixed(2)+'<br><b>Correlation r</b> = '+r.toFixed(3)+' ('+type+' '+dir+')';
    }
    points.forEach(function(p){p.on('drag',updateFit)});
    updateFit();
    """
)

# ── 2.5 Probability Spinner ──────────────────────────────────────────
WIDGET_PROBABILITY_SPINNER = _vanilla_widget(
    '<div class="widget-title">Probability Spinner</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Spin the wheel and track results. Adjust sector sizes with the sliders.</p>'
    '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:start">'
    '  <canvas id="spinner" width="200" height="200" style="border-radius:50%;cursor:pointer"></canvas>'
    '  <div style="flex:1;min-width:160px">'
    '    <div class="controls"><label>Red:</label><input type="range" id="sr" min="1" max="10" value="3"><span class="val" id="vr">3</span></div>'
    '    <div class="controls"><label>Blue:</label><input type="range" id="sb" min="1" max="10" value="3"><span class="val" id="vb">3</span></div>'
    '    <div class="controls"><label>Green:</label><input type="range" id="sg" min="1" max="10" value="2"><span class="val" id="vg">2</span></div>'
    '    <div style="text-align:center;margin:8px 0"><button class="action" id="spinBtn">Spin!</button></div>'
    '    <div class="info-box" id="spin-info">Click Spin or click the wheel!</div>'
    '  </div>'
    '</div>',
    # --- script ---
    r"""
    var cv=document.getElementById('spinner'),cx=cv.getContext('2d'),colors=['#ef4444','#3b82f6','#22c55e'],
        names=['Red','Blue','Green'],counts=[0,0,0],totalSpins=0,angle=0,spinning=false;
    function getWeights(){return[+document.getElementById('sr').value,+document.getElementById('sb').value,+document.getElementById('sg').value]}
    function drawWheel(rot){
      var w=getWeights(),total=w.reduce(function(a,b){return a+b},0);
      cx.clearRect(0,0,200,200);
      var startAngle=rot||0;
      w.forEach(function(wt,i){
        var sliceAngle=2*Math.PI*wt/total;
        cx.beginPath();cx.moveTo(100,100);cx.arc(100,100,95,startAngle,startAngle+sliceAngle);cx.closePath();
        cx.fillStyle=colors[i];cx.fill();cx.strokeStyle='white';cx.lineWidth=2;cx.stroke();
        var mid=startAngle+sliceAngle/2;
        cx.fillStyle='white';cx.font='bold 14px system-ui';cx.textAlign='center';
        cx.fillText(names[i],100+65*Math.cos(mid),100+65*Math.sin(mid)+5);
        startAngle+=sliceAngle;
      });
      // pointer
      cx.beginPath();cx.moveTo(195,95);cx.lineTo(195,105);cx.lineTo(180,100);cx.closePath();cx.fillStyle='#1e293b';cx.fill();
    }
    function spin(){
      if(spinning)return;spinning=true;
      var w=getWeights(),total=w.reduce(function(a,b){return a+b},0);
      var target=Math.random()*2*Math.PI+4*Math.PI,speed=target/60,cur=angle,frame=0;
      function anim(){
        frame++;var progress=frame/60,ease=1-Math.pow(1-progress,3);
        cur=angle+target*ease;drawWheel(cur);
        if(frame<60)requestAnimationFrame(anim);
        else{
          angle=cur%(2*Math.PI);spinning=false;
          // determine result
          var norm=(2*Math.PI-angle%(2*Math.PI))%(2*Math.PI),cum=0;
          w.forEach(function(wt,i){cum+=2*Math.PI*wt/total;if(norm<cum&&counts[i]===counts[i]){counts[i]++;totalSpins++}});
          // fix double count
          totalSpins=counts.reduce(function(a,b){return a+b},0);
          var info=names.map(function(n,i){return'<b>'+n+':</b> '+counts[i]+' ('+((counts[i]/totalSpins)*100).toFixed(0)+'%)'}).join(' &nbsp; ');
          document.getElementById('spin-info').innerHTML=info+'<br>Total spins: '+totalSpins;
        }
      }
      anim();
    }
    cv.addEventListener('click',spin);
    document.getElementById('spinBtn').addEventListener('click',spin);
    ['sr','sb','sg'].forEach(function(id){document.getElementById(id).addEventListener('input',function(){
      document.getElementById('v'+id.charAt(1)).textContent=this.value;drawWheel(angle);
    })});
    drawWheel(0);
    """
)


# ═══════════════════════════════════════════════════════════════════════
# MODULE 3: Passport to Advanced Math
# ═══════════════════════════════════════════════════════════════════════

# ── 3.1 Discriminant Explorer ─────────────────────────────────────────
WIDGET_DISCRIMINANT_EXPLORER = _jsx_widget('jxgbox6', 380,
    '<div class="widget-title">Discriminant Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust a, b, c in ax² + bx + c = 0 and see the parabola, roots, and discriminant.</p>'
    '<div class="controls">'
    '  <label>a</label><input type="range" id="da" min="-3" max="3" value="1" step="0.5" style="width:70px"><span class="val" id="vda">1</span>'
    '  <label>b</label><input type="range" id="db" min="-6" max="6" value="-4" step="0.5" style="width:70px"><span class="val" id="vdb">-4</span>'
    '  <label>c</label><input type="range" id="dc" min="-6" max="6" value="3" step="0.5" style="width:70px"><span class="val" id="vdc">3</span>'
    '</div>'
    '<div class="info-box" id="disc-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox6',{boundingbox:[-6,8,6,-4],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    var fn=board.create('functiongraph',[function(x){return gv('da')*x*x+gv('db')*x+gv('dc')}],{strokeColor:'#6366f1',strokeWidth:2.5});
    var r1=board.create('point',[function(){var a=gv('da'),b=gv('db'),c=gv('dc'),D=b*b-4*a*c;return D>=0&&Math.abs(a)>0.01?(-b-Math.sqrt(D))/(2*a):NaN},0],{size:5,name:'',strokeColor:'#22c55e',fillColor:'#22c55e',fixed:true,showInfobox:false});
    var r2=board.create('point',[function(){var a=gv('da'),b=gv('db'),c=gv('dc'),D=b*b-4*a*c;return D>0&&Math.abs(a)>0.01?(-b+Math.sqrt(D))/(2*a):NaN},0],{size:5,name:'',strokeColor:'#22c55e',fillColor:'#22c55e',fixed:true,showInfobox:false});
    var vtx=board.create('point',[function(){var a=gv('da'),b=gv('db');return Math.abs(a)>0.01?-b/(2*a):NaN},function(){var a=gv('da'),b=gv('db'),c=gv('dc');var x=-b/(2*a);return Math.abs(a)>0.01?a*x*x+b*x+c:NaN}],{size:4,name:'vertex',strokeColor:'#f59e0b',fillColor:'#f59e0b',fixed:true,showInfobox:false,label:{fontSize:11,offset:[8,-10]}});
    function update(){
      ['da','db','dc'].forEach(function(id){document.getElementById('v'+id).textContent=gv(id)});
      var a=gv('da'),b=gv('db'),c=gv('dc'),D=b*b-4*a*c;
      var info=document.getElementById('disc-info');
      var color=D>0?'#22c55e':D===0?'#f59e0b':'#ef4444';
      var label=D>0?'Two real roots':D===0?'One repeated root':'No real roots';
      info.innerHTML='<b>Discriminant:</b> b² − 4ac = ('+b+')² − 4('+a+')('+c+') = <span style="color:'+color+';font-weight:700">'+D.toFixed(1)+'</span><br><b>'+label+'</b>';
      if(D>0&&Math.abs(a)>0.01){var x1=(-b-Math.sqrt(D))/(2*a),x2=(-b+Math.sqrt(D))/(2*a);info.innerHTML+=' → x = '+x1.toFixed(2)+' and x = '+x2.toFixed(2)}
      else if(D===0&&Math.abs(a)>0.01){info.innerHTML+=' → x = '+(-b/(2*a)).toFixed(2)}
      board.update();
    }
    ['da','db','dc'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    update();
    """
)

# ── 3.2 Vertex Form Explorer ─────────────────────────────────────────
WIDGET_VERTEX_FORM_EXPLORER = _jsx_widget('jxgbox7', 380,
    '<div class="widget-title">Vertex Form Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust a, h, k in y = a(x − h)² + k and see the parabola transform.</p>'
    '<div class="controls">'
    '  <label>a</label><input type="range" id="va" min="-3" max="3" value="1" step="0.25" style="width:70px"><span class="val" id="vva">1</span>'
    '  <label>h</label><input type="range" id="vh" min="-4" max="4" value="2" step="0.5" style="width:70px"><span class="val" id="vvh">2</span>'
    '  <label>k</label><input type="range" id="vk" min="-4" max="4" value="-3" step="0.5" style="width:70px"><span class="val" id="vvk">-3</span>'
    '</div>'
    '<div class="info-box" id="vtx-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox7',{boundingbox:[-6,8,6,-6],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    // parent dashed
    board.create('functiongraph',[function(x){return x*x}],{strokeColor:'#94a3b8',strokeWidth:1.5,dash:3});
    var fn=board.create('functiongraph',[function(x){var a=gv('va'),h=gv('vh'),k=gv('vk');return a*(x-h)*(x-h)+k}],{strokeColor:'#6366f1',strokeWidth:2.5});
    var vtx=board.create('point',[function(){return gv('vh')},function(){return gv('vk')}],{size:5,name:'vertex',strokeColor:'#ef4444',fillColor:'#ef4444',fixed:true,showInfobox:false,label:{fontSize:12,offset:[8,8]}});
    var axis=board.create('line',[[function(){return gv('vh')},0],[function(){return gv('vh')},1]],{strokeColor:'#f59e0b',strokeWidth:1.5,dash:3,fixed:true,highlight:false});
    function update(){
      ['va','vh','vk'].forEach(function(id){document.getElementById('v'+id).textContent=gv(id)});
      var a=gv('va'),h=gv('vh'),k=gv('vk');
      var dir=a>0?'Opens upward':'Opens downward';if(a===0)dir='Flat line (a=0)';
      var width=Math.abs(a)>1?'narrower than':Math.abs(a)<1?'wider than':'same width as';
      document.getElementById('vtx-info').innerHTML='<b>y = '+a+'(x − '+h+')² + '+k+'</b><br>Vertex: <b>('+h+', '+k+')</b> | '+dir+' | '+width+' parent';
      board.update();
    }
    ['va','vh','vk'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    update();
    """
)

# ── 3.3 Polynomial Degree Explorer ───────────────────────────────────
WIDGET_POLYNOMIAL_EXPLORER = _jsx_widget('jxgbox8', 380,
    '<div class="widget-title">Polynomial Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust coefficients to see how polynomial shape, degree, and end behavior change.</p>'
    '<div class="controls">'
    '  <label>a₃x³</label><input type="range" id="p3" min="-2" max="2" value="0" step="0.25" style="width:60px"><span class="val" id="vp3">0</span>'
    '  <label>a₂x²</label><input type="range" id="p2" min="-3" max="3" value="1" step="0.25" style="width:60px"><span class="val" id="vp2">1</span>'
    '  <label>a₁x</label><input type="range" id="p1" min="-4" max="4" value="-2" step="0.5" style="width:60px"><span class="val" id="vp1">-2</span>'
    '  <label>a₀</label><input type="range" id="p0" min="-4" max="4" value="1" step="0.5" style="width:60px"><span class="val" id="vp0">1</span>'
    '</div>'
    '<div class="info-box" id="poly-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox8',{boundingbox:[-5,10,5,-10],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    var fn=board.create('functiongraph',[function(x){return gv('p3')*x*x*x+gv('p2')*x*x+gv('p1')*x+gv('p0')}],{strokeColor:'#6366f1',strokeWidth:2.5});
    function update(){
      ['p3','p2','p1','p0'].forEach(function(id){document.getElementById('v'+id).textContent=gv(id)});
      var c=[gv('p3'),gv('p2'),gv('p1'),gv('p0')];
      var deg=c[0]!==0?3:c[1]!==0?2:c[2]!==0?1:0;
      var lead=c[3-deg]||c[3];
      var terms=[];
      if(c[0]!==0)terms.push(c[0]+'x³');if(c[1]!==0)terms.push((c[1]>0&&terms.length?'+':'')+c[1]+'x²');
      if(c[2]!==0)terms.push((c[2]>0&&terms.length?'+':'')+c[2]+'x');if(c[3]!==0)terms.push((c[3]>0&&terms.length?'+':'')+c[3]);
      var eq=terms.join(' ')||'0';
      var end='';
      if(deg===0)end='Constant — horizontal line';
      else if(deg===1)end=lead>0?'↗ rises left to right':'↘ falls left to right';
      else if(deg===2)end=lead>0?'↑ both ends up (U shape)':'↓ both ends down (∩ shape)';
      else end=lead>0?'↙↗ down-left, up-right':'↗↙ up-left, down-right';
      document.getElementById('poly-info').innerHTML='<b>f(x) = '+eq+'</b><br>Degree: <b>'+deg+'</b> | Leading coefficient: <b>'+lead+'</b><br>End behavior: '+end;
      board.update();
    }
    ['p3','p2','p1','p0'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    update();
    """
)

# ── 3.4 Growth/Decay Simulator ────────────────────────────────────────
WIDGET_EXPONENTIAL_EXPLORER = _jsx_widget('jxgbox9', 380,
    '<div class="widget-title">Growth & Decay Simulator</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Adjust the initial value and rate to see exponential growth vs decay.</p>'
    '<div class="controls">'
    '  <label>Initial (a):</label><input type="range" id="ea" min="10" max="200" value="100" step="10" style="width:80px"><span class="val" id="vea">100</span>'
    '  <label>Rate (r):</label><input type="range" id="er" min="-50" max="100" value="15" step="5" style="width:80px"><span class="val" id="ver">+15%</span>'
    '</div>'
    '<div class="info-box" id="exp-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox9',{boundingbox:[-1,500,10,-20],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    var fn=board.create('functiongraph',[function(x){var a=gv('ea'),r=gv('er')/100;return a*Math.pow(1+r,x)}],{strokeColor:'#6366f1',strokeWidth:2.5});
    // reference line at initial value
    var ref=board.create('functiongraph',[function(x){return gv('ea')}],{strokeColor:'#94a3b8',strokeWidth:1,dash:3});
    function update(){
      var a=gv('ea'),r=gv('er');
      document.getElementById('vea').textContent=a;
      document.getElementById('ver').textContent=(r>=0?'+':'')+r+'%';
      var base=(1+r/100),type=r>0?'Growth':'Decay';
      if(r===0)type='Constant';
      var color=r>0?'#22c55e':'#ef4444';if(r===0)color='#64748b';
      // adjust bounding box
      var maxY=a*Math.pow(base,9);
      if(maxY>500)board.setBoundingBox([-1,maxY*1.1,10,-maxY*0.05]);
      else board.setBoundingBox([-1,Math.max(500,a*2),10,-20]);
      var vals=[0,1,2,3,5].map(function(t){return'f('+t+')='+Math.round(a*Math.pow(base,t))}).join(', ');
      document.getElementById('exp-info').innerHTML='<b>f(x) = '+a+' · '+base.toFixed(2)+'<sup>x</sup></b><br><span style="color:'+color+';font-weight:700">'+type+'</span> | Base = '+base.toFixed(2)+'<br>'+vals;
      board.update();
    }
    ['ea','er'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    update();
    """
)

# ── 3.5 Transformation Playground ─────────────────────────────────────
WIDGET_TRANSFORMATION_PLAYGROUND = _jsx_widget('jxgbox10', 400,
    '<div class="widget-title">Transformation Playground</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Apply shifts, stretches, and reflections to the parent function.</p>'
    '<div class="controls">'
    '  <label>Parent:</label>'
    '  <select id="parent" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.85rem">'
    '    <option value="x2">x²</option><option value="abs">|x|</option><option value="sqrt">√x</option>'
    '  </select>'
    '  <label>h</label><input type="range" id="th" min="-4" max="4" value="0" step="0.5" style="width:60px"><span class="val" id="vth">0</span>'
    '  <label>k</label><input type="range" id="tk" min="-4" max="4" value="0" step="0.5" style="width:60px"><span class="val" id="vtk">0</span>'
    '</div>'
    '<div class="controls">'
    '  <label>a (stretch)</label><input type="range" id="ta" min="-3" max="3" value="1" step="0.25" style="width:80px"><span class="val" id="vta">1</span>'
    '  <label><input type="checkbox" id="treflect"> Reflect over x-axis</label>'
    '</div>'
    '<div class="info-box" id="trans-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox10',{boundingbox:[-6,8,6,-4],axis:true,showNavigation:false,showCopyright:false});
    function gv(id){return parseFloat(document.getElementById(id).value)}
    function parentFn(x){
      var p=document.getElementById('parent').value;
      if(p==='x2')return x*x;if(p==='abs')return Math.abs(x);return x>=0?Math.sqrt(x):NaN;
    }
    var dashed=board.create('functiongraph',[function(x){return parentFn(x)}],{strokeColor:'#94a3b8',strokeWidth:1.5,dash:3});
    var fn=board.create('functiongraph',[function(x){
      var a=gv('ta'),h=gv('th'),k=gv('tk'),r=document.getElementById('treflect').checked?-1:1;
      return r*a*parentFn(x-h)+k;
    }],{strokeColor:'#6366f1',strokeWidth:2.5});
    function update(){
      ['th','tk','ta'].forEach(function(id){document.getElementById('v'+id).textContent=gv(id)});
      var a=gv('ta'),h=gv('th'),k=gv('tk'),r=document.getElementById('treflect').checked;
      var sign=r?'-':'';var eq='y = '+sign+(a!==1?a:'')+'f(x'+(h>0?' − '+h:h<0?' + '+(-h):'')+')' +(k>0?' + '+k:k<0?' − '+(-k):'');
      document.getElementById('trans-info').innerHTML='<b>'+eq+'</b><br>Horizontal shift: <b>'+(h>0?'right '+h:h<0?'left '+(-h):'none')+'</b> | Vertical shift: <b>'+(k>0?'up '+k:k<0?'down '+(-k):'none')+'</b>'+(r?'<br><b>Reflected</b> over x-axis':'');
      board.update();
    }
    ['th','tk','ta'].forEach(function(id){document.getElementById(id).addEventListener('input',update)});
    document.getElementById('parent').addEventListener('change',function(){board.update();update()});
    document.getElementById('treflect').addEventListener('change',function(){board.update();update()});
    update();
    """
)


# ═══════════════════════════════════════════════════════════════════════
# MODULE 4: Geometry & Trigonometry
# ═══════════════════════════════════════════════════════════════════════

# ── 4.1 Pythagorean Theorem Visualizer ────────────────────────────────
WIDGET_PYTHAGOREAN_VISUALIZER = _jsx_widget('jxgbox11', 400,
    '<div class="widget-title">Pythagorean Theorem Visualizer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag the legs of the right triangle and watch the squares on each side update.</p>'
    '<div class="info-box" id="pyth-info">a² + b² = c²</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox11',{boundingbox:[-2,14,14,-2],axis:false,showNavigation:false,showCopyright:false,keepaspectratio:true});
    var O=board.create('point',[0,0],{fixed:true,size:0,name:'',visible:false});
    var A=board.create('point',[5,0],{size:4,name:'A',strokeColor:'#22c55e',fillColor:'#22c55e',label:{fontSize:13,offset:[5,-15]}});
    var B=board.create('point',[5,4],{size:4,name:'B',strokeColor:'#3b82f6',fillColor:'#3b82f6',label:{fontSize:13,offset:[10,0]}});
    // constrain A to x-axis
    A.on('drag',function(){A.moveTo([A.X(),0])});
    // constrain B to be above A
    B.on('drag',function(){B.moveTo([A.X(),Math.max(0.5,B.Y())])});
    // triangle
    board.create('polygon',[O,A,B],{fillColor:'#eef2ff',fillOpacity:0.5,borders:{strokeColor:'#6366f1',strokeWidth:2}});
    // right angle marker
    board.create('angle',[B,A,O],{radius:0.5,fillColor:'#94a3b8',fillOpacity:0.3,strokeColor:'#94a3b8',name:'',orthoType:'square'});
    // squares on each side
    function sq(color,opacity){return{fillColor:color,fillOpacity:opacity,borders:{strokeColor:color,strokeWidth:1.5}}}
    // a² square (on bottom leg)
    board.create('regularpolygon',[O,A,4],sq('#22c55e',0.15));
    // b² square (on right leg)
    board.create('regularpolygon',[A,B,4],sq('#3b82f6',0.15));
    // labels
    board.create('text',[function(){return A.X()/2},function(){return-0.8},function(){return'a = '+A.X().toFixed(1)}],{fontSize:13,cssStyle:'color:#22c55e;font-weight:700'});
    board.create('text',[function(){return A.X()+0.5},function(){return B.Y()/2},function(){return'b = '+B.Y().toFixed(1)}],{fontSize:13,cssStyle:'color:#3b82f6;font-weight:700'});
    board.create('text',[function(){return A.X()/2-1},function(){return B.Y()/2+0.5},function(){var a=A.X(),b=B.Y();return'c = '+Math.sqrt(a*a+b*b).toFixed(1)}],{fontSize:13,cssStyle:'color:#6366f1;font-weight:700'});
    function updateInfo(){
      var a=A.X(),b=B.Y(),c2=a*a+b*b,c=Math.sqrt(c2);
      document.getElementById('pyth-info').innerHTML='<b>a² + b² = c²</b><br>'+a.toFixed(1)+'² + '+b.toFixed(1)+'² = '+(a*a).toFixed(1)+' + '+(b*b).toFixed(1)+' = <b>'+ c2.toFixed(1)+'</b><br>c = √'+c2.toFixed(1)+' = <b>'+c.toFixed(2)+'</b>';
    }
    A.on('drag',updateInfo);B.on('drag',updateInfo);
    updateInfo();
    """
)

# ── 4.2 Circle Explorer ──────────────────────────────────────────────
WIDGET_CIRCLE_EXPLORER = _jsx_widget('jxgbox12', 380,
    '<div class="widget-title">Circle Measurements Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag the radius point to resize the circle. Adjust the sector angle.</p>'
    '<div class="controls">'
    '  <label>Sector angle:</label><input type="range" id="cangle" min="0" max="360" value="90" step="5"><span class="val" id="vcangle">90°</span>'
    '</div>'
    '<div class="info-box" id="circle-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox12',{boundingbox:[-8,8,8,-8],axis:false,showNavigation:false,showCopyright:false,keepaspectratio:true});
    var center=board.create('point',[0,0],{fixed:true,size:3,name:'O',strokeColor:'#6366f1',fillColor:'#6366f1',label:{fontSize:12,offset:[-15,-10]}});
    var rp=board.create('point',[4,0],{size:4,name:'',strokeColor:'#ef4444',fillColor:'#ef4444',showInfobox:false});
    var circle=board.create('circle',[center,rp],{strokeColor:'#6366f1',strokeWidth:2.5,fillColor:'#eef2ff',fillOpacity:0.15});
    var radius=board.create('segment',[center,rp],{strokeColor:'#ef4444',strokeWidth:2,dash:2});
    board.create('text',[function(){return rp.X()/2+0.3},function(){return 0.5},function(){return'r = '+Math.sqrt(rp.X()*rp.X()+rp.Y()*rp.Y()).toFixed(1)}],{fontSize:12,cssStyle:'color:#ef4444;font-weight:700'});
    function update(){
      var r=Math.sqrt(rp.X()*rp.X()+rp.Y()*rp.Y());
      var ang=parseFloat(document.getElementById('cangle').value);
      document.getElementById('vcangle').textContent=ang+'°';
      var area=Math.PI*r*r,circ=2*Math.PI*r;
      var arcLen=(ang/360)*circ,sectArea=(ang/360)*area;
      document.getElementById('circle-info').innerHTML='<b>Radius</b> = '+r.toFixed(2)+' | <b>Diameter</b> = '+(2*r).toFixed(2)+'<br><b>Area</b> = π·'+r.toFixed(1)+'² = <b>'+area.toFixed(2)+'</b> | <b>Circumference</b> = 2π·'+r.toFixed(1)+' = <b>'+circ.toFixed(2)+'</b><br><b>Sector ('+ang+'°):</b> Arc length = <b>'+arcLen.toFixed(2)+'</b> | Sector area = <b>'+sectArea.toFixed(2)+'</b>';
    }
    rp.on('drag',update);
    document.getElementById('cangle').addEventListener('input',update);
    update();
    """
)

# ── 4.3 Right Triangle Trig Explorer ─────────────────────────────────
WIDGET_TRIG_EXPLORER = _jsx_widget('jxgbox13', 380,
    '<div class="widget-title">Right Triangle Trigonometry</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Drag the angle to see sin, cos, tan values update in real time.</p>'
    '<div class="controls">'
    '  <label>Angle θ:</label><input type="range" id="tangle" min="5" max="85" value="30" step="1"><span class="val" id="vtangle">30°</span>'
    '</div>'
    '<div class="info-box" id="trig-info">...</div>',
    # --- script ---
    r"""
    var board=JXG.JSXGraph.initBoard('jxgbox13',{boundingbox:[-1,6,7,-1],axis:false,showNavigation:false,showCopyright:false,keepaspectratio:true});
    var O=board.create('point',[0,0],{fixed:true,size:0,name:'',visible:false});
    var hyp=5;
    function deg(){return parseFloat(document.getElementById('tangle').value)}
    var A=board.create('point',[function(){return hyp*Math.cos(deg()*Math.PI/180)},0],{fixed:true,size:0,name:'',visible:false});
    var B=board.create('point',[function(){return hyp*Math.cos(deg()*Math.PI/180)},function(){return hyp*Math.sin(deg()*Math.PI/180)}],{fixed:true,size:0,name:'',visible:false});
    // triangle sides
    board.create('segment',[O,A],{strokeColor:'#22c55e',strokeWidth:3,fixed:true,highlight:false}); // adjacent
    board.create('segment',[A,B],{strokeColor:'#ef4444',strokeWidth:3,fixed:true,highlight:false}); // opposite
    board.create('segment',[O,B],{strokeColor:'#6366f1',strokeWidth:3,fixed:true,highlight:false}); // hypotenuse
    // right angle
    board.create('angle',[O,A,B],{radius:0.4,fillColor:'#94a3b8',fillOpacity:0.3,name:'',orthoType:'square',fixed:true});
    // angle arc
    board.create('angle',[A,O,B],{radius:1,fillColor:'#f59e0b',fillOpacity:0.2,strokeColor:'#f59e0b',name:'θ',fixed:true,label:{fontSize:16,offset:[0,0]}});
    // labels
    board.create('text',[function(){return hyp*Math.cos(deg()*Math.PI/180)/2},function(){return-0.6},'adjacent'],{fontSize:12,cssStyle:'color:#22c55e;font-weight:700',fixed:true});
    board.create('text',[function(){return hyp*Math.cos(deg()*Math.PI/180)+0.4},function(){return hyp*Math.sin(deg()*Math.PI/180)/2},'opposite'],{fontSize:12,cssStyle:'color:#ef4444;font-weight:700',fixed:true});
    board.create('text',[function(){return hyp*Math.cos(deg()*Math.PI/180)/2-1.2},function(){return hyp*Math.sin(deg()*Math.PI/180)/2+0.5},'hypotenuse'],{fontSize:12,cssStyle:'color:#6366f1;font-weight:700',fixed:true});
    function update(){
      var a=deg(),rad=a*Math.PI/180;
      document.getElementById('vtangle').textContent=a+'°';
      var s=Math.sin(rad),c=Math.cos(rad),t=Math.tan(rad);
      var opp=(hyp*s).toFixed(2),adj=(hyp*c).toFixed(2);
      document.getElementById('trig-info').innerHTML='<b>θ = '+a+'°</b> | Hypotenuse = '+hyp+'<br>Opposite = <b>'+opp+'</b> | Adjacent = <b>'+adj+'</b><br><b>sin θ</b> = opp/hyp = '+s.toFixed(4)+' &nbsp; <b>cos θ</b> = adj/hyp = '+c.toFixed(4)+' &nbsp; <b>tan θ</b> = opp/adj = '+t.toFixed(4);
      board.update();
    }
    document.getElementById('tangle').addEventListener('input',update);
    update();
    """
)

# ── 4.4 Volume Visualizer ────────────────────────────────────────────
WIDGET_VOLUME_VISUALIZER = _vanilla_widget(
    '<div class="widget-title">3D Volume Explorer</div>'
    '<p style="font-size:0.85rem;color:#64748b;margin-bottom:8px">Select a shape and adjust dimensions to calculate volume.</p>'
    '<div class="controls">'
    '  <label>Shape:</label>'
    '  <select id="shape" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.85rem">'
    '    <option value="cylinder">Cylinder</option><option value="cone">Cone</option>'
    '    <option value="sphere">Sphere</option><option value="box">Rectangular Prism</option>'
    '  </select>'
    '</div>'
    '<div class="controls" id="dim-r"><label>Radius:</label><input type="range" id="vr" min="1" max="10" value="4" step="0.5"><span class="val" id="vvr">4</span></div>'
    '<div class="controls" id="dim-h"><label>Height:</label><input type="range" id="vht" min="1" max="15" value="6" step="0.5"><span class="val" id="vvh">6</span></div>'
    '<div class="controls" id="dim-l" style="display:none"><label>Length:</label><input type="range" id="vl" min="1" max="10" value="5" step="0.5"><span class="val" id="vvl">5</span></div>'
    '<div class="controls" id="dim-w" style="display:none"><label>Width:</label><input type="range" id="vw" min="1" max="10" value="3" step="0.5"><span class="val" id="vvw">3</span></div>'
    '<canvas id="vol3d" width="200" height="160" style="display:block;margin:8px auto;border-radius:10px;border:1px solid #e2e8f0"></canvas>'
    '<div class="info-box" id="vol-info">...</div>',
    # --- script ---
    r"""
    var cv=document.getElementById('vol3d'),ctx=cv.getContext('2d');
    function gv(id){return parseFloat(document.getElementById(id).value)}
    function updateVisibility(){
      var s=document.getElementById('shape').value;
      document.getElementById('dim-r').style.display=(s!=='box')?'flex':'none';
      document.getElementById('dim-h').style.display=(s!=='sphere')?'flex':'none';
      document.getElementById('dim-l').style.display=(s==='box')?'flex':'none';
      document.getElementById('dim-w').style.display=(s==='box')?'flex':'none';
    }
    function draw(){
      var s=document.getElementById('shape').value;
      updateVisibility();
      ['vr','vht','vl','vw'].forEach(function(id){var el=document.getElementById('v'+id);if(el)el.textContent=gv(id.replace('v',''))});
      ctx.clearRect(0,0,200,160);
      var cx=100,cy=80;
      ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.fillStyle='rgba(99,102,241,0.1)';
      if(s==='cylinder'){
        var r=30,h=60;
        ctx.beginPath();ctx.ellipse(cx,cy-h/2,r,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx-r,cy-h/2);ctx.lineTo(cx-r,cy+h/2);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+r,cy-h/2);ctx.lineTo(cx+r,cy+h/2);ctx.stroke();
        ctx.beginPath();ctx.ellipse(cx,cy+h/2,r,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      } else if(s==='cone'){
        var r=35,h=70;
        ctx.beginPath();ctx.moveTo(cx,cy-h/2);ctx.lineTo(cx-r,cy+h/2);ctx.lineTo(cx+r,cy+h/2);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.ellipse(cx,cy+h/2,r,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      } else if(s==='sphere'){
        var r=45;
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(cx,cy,r,r/3,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      } else {
        var w=50,h=40,d=20;
        ctx.beginPath();ctx.moveTo(cx-w/2,cy+h/2);ctx.lineTo(cx+w/2,cy+h/2);ctx.lineTo(cx+w/2,cy-h/2);ctx.lineTo(cx-w/2,cy-h/2);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+w/2,cy-h/2);ctx.lineTo(cx+w/2+d,cy-h/2-d/2);ctx.lineTo(cx-w/2+d,cy-h/2-d/2);ctx.lineTo(cx-w/2,cy-h/2);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+w/2,cy+h/2);ctx.lineTo(cx+w/2+d,cy+h/2-d/2);ctx.lineTo(cx+w/2+d,cy-h/2-d/2);ctx.lineTo(cx+w/2,cy-h/2);ctx.closePath();ctx.fill();ctx.stroke();
      }
      // calc volume
      var vol,formula;
      if(s==='cylinder'){var r=gv('vr'),h=gv('vht');vol=Math.PI*r*r*h;formula='V = πr²h = π·'+r+'²·'+h+' = <b>'+vol.toFixed(1)+'</b>'}
      else if(s==='cone'){var r=gv('vr'),h=gv('vht');vol=Math.PI*r*r*h/3;formula='V = ⅓πr²h = ⅓·π·'+r+'²·'+h+' = <b>'+vol.toFixed(1)+'</b>'}
      else if(s==='sphere'){var r=gv('vr');vol=4/3*Math.PI*r*r*r;formula='V = ⁴⁄₃πr³ = ⁴⁄₃·π·'+r+'³ = <b>'+vol.toFixed(1)+'</b>'}
      else{var l=gv('vl'),w=gv('vw'),h=gv('vht');vol=l*w*h;formula='V = l·w·h = '+l+'·'+w+'·'+h+' = <b>'+vol.toFixed(1)+'</b>'}
      document.getElementById('vol-info').innerHTML='<b>'+s.charAt(0).toUpperCase()+s.slice(1)+'</b><br>'+formula;
    }
    ['vr','vht','vl','vw'].forEach(function(id){document.getElementById(id).addEventListener('input',draw)});
    document.getElementById('shape').addEventListener('change',draw);
    draw();
    """
)
