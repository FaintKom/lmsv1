#!/usr/bin/env python3
"""
Generate python_pro_course_html.json from python_pro_course_4cid.json
Converts markdown lesson content to rich styled HTML with embedded interactive widgets.
"""

import json
import re
import html as html_module
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, "python_pro_course_4cid.json")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "python_pro_course_html.json")

# ── Interactive Widget HTML Snippets ──────────────────────────────────────────

WIDGET_VARIABLE_ASSIGNMENT = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 16px;font-size:18px;color:#a78bfa">&#x1F4E6; Variable Assignment Simulator</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Type a variable name and value, then click <b>Assign</b> to see it stored in a box!</p>
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
    <input id="hw-vn" placeholder="variable name" style="flex:1;min-width:90px;padding:10px 14px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none"/>
    <span style="color:#a78bfa;font-size:22px;line-height:42px">=</span>
    <input id="hw-vv" placeholder="value" style="flex:1;min-width:90px;padding:10px 14px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none"/>
    <button onclick="(function(){var n=document.getElementById('hw-vn').value.trim(),v=document.getElementById('hw-vv').value.trim();if(!n)return;window._hw_vars=window._hw_vars||{};window._hw_vars[n]=v||'None';var h='';for(var k in window._hw_vars){h+='<div style=\\'background:#2a2a4a;border:2px solid #7c3aed;border-radius:12px;padding:12px 18px;text-align:center;min-width:90px;animation:hwFade .3s ease\\'><div style=\\'font-size:11px;color:#a78bfa;margin-bottom:4px;font-family:monospace\\'>'+k+'</div><div style=\\'font-size:20px;font-weight:700;color:#f0abfc;font-family:monospace\\'>'+window._hw_vars[k]+'</div></div>';}document.getElementById('hw-boxes').innerHTML=h;document.getElementById('hw-vn').value='';document.getElementById('hw-vv').value=''})()" style="padding:10px 20px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer;font-size:14px">Assign</button>
  </div>
  <div id="hw-boxes" style="display:flex;flex-wrap:wrap;gap:12px;min-height:60px"></div>
  <style>@keyframes hwFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style>
</div>'''

WIDGET_PRINT_OUTPUT = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F4FA; print() Simulator</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 12px">Type text in quotes and click <b>Run</b> to see the output!</p>
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <span style="font-family:monospace;font-size:15px;color:#c084fc;line-height:40px">print(</span>
    <input id="hw-pi" placeholder='"Hello, World!"' style="flex:1;min-width:120px;padding:10px 14px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#fbbf24;font-family:monospace;font-size:14px;outline:none"/>
    <span style="font-family:monospace;font-size:15px;color:#c084fc;line-height:40px">)</span>
    <button onclick="(function(){var v=document.getElementById('hw-pi').value.trim();var out=v.replace(/^['\"]|['\"]$/g,'');document.getElementById('hw-po').innerHTML+='<div style=\\'color:#34d399\\'>'+out+'</div>';document.getElementById('hw-pi').value=''})()" style="padding:10px 18px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;cursor:pointer;font-size:14px">Run</button>
  </div>
  <div style="font-family:monospace;font-size:12px;color:#64748b;margin-bottom:4px">Terminal Output:</div>
  <div id="hw-po" style="font-family:monospace;font-size:14px;background:#0f0f1a;padding:12px;border-radius:10px;min-height:60px;border:1px solid #334155"></div>
</div>'''

WIDGET_IF_ELSE_FLOWCHART = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F500; If / Else Flowchart</h3>
  <p style="font-size:13px;color:#94a3b8;margin:0 0 10px">Drag the slider to change <code style="color:#fbbf24">x</code> and see which branch executes!</p>
  <div style="text-align:center;margin-bottom:12px">
    <label style="font-family:monospace;font-size:14px;color:#c4b5fd">x = <span id="hw-ifval">50</span></label><br/>
    <input id="hw-ifsl" type="range" min="0" max="100" value="50" style="width:80%;margin-top:8px;accent-color:#7c3aed"/>
    <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-top:4px">Condition: <strong style="color:#fbbf24">if x &gt; 50</strong></div>
  </div>
  <svg viewBox="0 0 300 220" style="width:100%;max-width:300px;display:block;margin:0 auto">
    <defs><marker id="hw-ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#7c3aed"/></marker></defs>
    <rect x="100" y="5" width="100" height="32" rx="16" fill="#3b3b5c" stroke="#7c3aed" stroke-width="2"/>
    <text x="150" y="26" text-anchor="middle" fill="#e0e0e0" font-size="12" font-family="monospace">Start</text>
    <line x1="150" y1="37" x2="150" y2="58" stroke="#7c3aed" stroke-width="2" marker-end="url(#hw-ah)"/>
    <polygon id="hw-diamond" points="150,58 215,90 150,122 85,90" fill="#2a2a4a" stroke="#fbbf24" stroke-width="2"/>
    <text x="150" y="95" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="monospace">x &gt; 50?</text>
    <line x1="215" y1="90" x2="250" y2="90" stroke="#7c3aed" stroke-width="2"/>
    <line x1="250" y1="90" x2="250" y2="150" stroke="#7c3aed" stroke-width="2" marker-end="url(#hw-ah)"/>
    <text x="232" y="82" fill="#22c55e" font-size="10" font-family="monospace">True</text>
    <rect id="hw-tbox" x="200" y="152" width="100" height="30" rx="8" fill="#2a2a4a" stroke="#22c55e" stroke-width="2"/>
    <text x="250" y="172" text-anchor="middle" fill="#22c55e" font-size="11" font-family="monospace">print("big")</text>
    <line x1="85" y1="90" x2="50" y2="90" stroke="#7c3aed" stroke-width="2"/>
    <line x1="50" y1="90" x2="50" y2="150" stroke="#7c3aed" stroke-width="2" marker-end="url(#hw-ah)"/>
    <text x="63" y="82" fill="#ef4444" font-size="10" font-family="monospace">False</text>
    <rect id="hw-fbox" x="0" y="152" width="100" height="30" rx="8" fill="#2a2a4a" stroke="#ef4444" stroke-width="2"/>
    <text x="50" y="172" text-anchor="middle" fill="#ef4444" font-size="11" font-family="monospace">print("small")</text>
    <line x1="250" y1="182" x2="250" y2="200" stroke="#7c3aed" stroke-width="1"/>
    <line x1="50" y1="182" x2="50" y2="200" stroke="#7c3aed" stroke-width="1"/>
    <line x1="50" y1="200" x2="250" y2="200" stroke="#7c3aed" stroke-width="1"/>
    <circle cx="150" cy="200" r="4" fill="#7c3aed"/>
  </svg>
  <div id="hw-ifres" style="text-align:center;font-family:monospace;font-size:15px;margin-top:10px;padding:10px;border-radius:10px;background:#2a2a4a;transition:all .3s"></div>
  <script>(function(){var sl=document.getElementById('hw-ifsl');function upd(){var v=+sl.value;document.getElementById('hw-ifval').textContent=v;var t=v>50;document.getElementById('hw-tbox').style.opacity=t?1:0.25;document.getElementById('hw-fbox').style.opacity=t?0.25:1;document.getElementById('hw-ifres').innerHTML=t?'<span style="color:#22c55e">Output: "big"</span>':'<span style="color:#ef4444">Output: "small"</span>'}sl.addEventListener('input',upd);upd()})()</script>
</div>'''

WIDGET_FOR_LOOP = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F501; Loop Iteration Visualizer</h3>
  <div style="font-family:monospace;font-size:14px;background:#1a1a2e;padding:12px;border-radius:10px;margin-bottom:12px">
    <span style="color:#c084fc">for</span> i <span style="color:#c084fc">in</span> <span style="color:#fbbf24">range(<span id="hw-lc">5</span>)</span>:<br/>
    &nbsp;&nbsp;print(i)
  </div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <label style="font-size:13px">Iterations:</label>
    <input id="hw-ln" type="range" min="1" max="10" value="5" oninput="document.getElementById('hw-lc').textContent=this.value" style="flex:1;accent-color:#7c3aed"/>
    <button onclick="(function(){var n=+document.getElementById('hw-ln').value;var bl='';for(var j=0;j<n;j++)bl+='<div id=\\'hw-lb'+j+'\\' style=\\'width:40px;height:40px;border-radius:10px;background:#2a2a4a;border:2px solid #4c4f82;display:flex;align-items:center;justify-content:center;font-family:monospace;font-weight:700;font-size:16px;transition:all .2s\\'>'+j+'</div>';document.getElementById('hw-lbl').innerHTML=bl;document.getElementById('hw-lo').textContent='';var i=0;var tm=setInterval(function(){if(i>=n){clearInterval(tm);return}if(i>0){var p=document.getElementById('hw-lb'+(i-1));if(p){p.style.background='#2a2a4a';p.style.borderColor='#22c55e';p.style.color='#22c55e'}}var e=document.getElementById('hw-lb'+i);if(e){e.style.background='#7c3aed';e.style.borderColor='#a78bfa';e.style.color='#fff'}document.getElementById('hw-lo').textContent+='>>> print('+i+')\\n';i++;if(i>=n)setTimeout(function(){var l=document.getElementById('hw-lb'+(n-1));if(l){l.style.background='#2a2a4a';l.style.borderColor='#22c55e';l.style.color='#22c55e'}},250)},500)})()" style="padding:8px 18px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer;font-size:14px">Run &#9654;</button>
  </div>
  <div id="hw-lbl" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>
  <div id="hw-lo" style="font-family:monospace;font-size:13px;background:#1a1a2e;padding:10px;border-radius:10px;min-height:28px;white-space:pre-wrap"></div>
</div>'''

WIDGET_LIST_OPERATIONS = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F4CB; List Operations</h3>
  <div id="hw-ld" style="display:flex;gap:6px;flex-wrap:wrap;min-height:50px;padding:12px;background:#1a1a2e;border-radius:10px;margin-bottom:12px;align-items:center;font-family:monospace;font-size:13px">
    <span style="color:#94a3b8">my_list = [</span><span id="hw-li"></span><span style="color:#94a3b8">]</span>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <input id="hw-linp" placeholder="value" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#e0e0e0;font-family:monospace;font-size:14px;outline:none"/>
    <button onclick="window._hw_la('append')" style="padding:8px 14px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.append()</button>
    <button onclick="window._hw_la('pop')" style="padding:8px 14px;border:none;border-radius:10px;background:#ef4444;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.pop()</button>
    <button onclick="window._hw_la('insert')" style="padding:8px 14px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.insert(0,)</button>
    <button onclick="window._hw_la('sort')" style="padding:8px 14px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.sort()</button>
    <button onclick="window._hw_la('reverse')" style="padding:8px 14px;border:none;border-radius:10px;background:#8b5cf6;color:#fff;font-weight:600;cursor:pointer;font-size:13px">.reverse()</button>
  </div>
  <div id="hw-llog" style="font-family:monospace;font-size:12px;color:#94a3b8;max-height:60px;overflow-y:auto"></div>
  <script>(function(){var a=[3,1,4,1,5],cs=['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c','#f87171','#2dd4bf'];function r(){var h='';a.forEach(function(v,i){h+='<span style="display:inline-block;padding:6px 12px;background:'+cs[i%cs.length]+'22;border:2px solid '+cs[i%cs.length]+';border-radius:8px;font-family:monospace;font-weight:600;font-size:15px;color:'+cs[i%cs.length]+'">'+v+'</span> '});document.getElementById('hw-li').innerHTML=h}function lg(m){document.getElementById('hw-llog').innerHTML='<div style="color:#a78bfa">&gt;&gt;&gt; '+m+'</div>'+document.getElementById('hw-llog').innerHTML}window._hw_la=function(op){var inp=document.getElementById('hw-linp').value.trim();if(op==='append'){var v=inp||'0';a.push(isNaN(v)?v:+v);lg('my_list.append('+v+')')}else if(op==='pop'){if(a.length){var x=a.pop();lg('my_list.pop() removed '+x)}else lg('Error: pop from empty list')}else if(op==='insert'){var v=inp||'0';a.unshift(isNaN(v)?v:+v);lg('my_list.insert(0, '+v+')')}else if(op==='sort'){a.sort(function(x,y){return x-y});lg('my_list.sort()')}else if(op==='reverse'){a.reverse();lg('my_list.reverse()')}document.getElementById('hw-linp').value='';r()};r()})()</script>
</div>'''

WIDGET_DICTIONARY = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F5C2;&#xFE0F; Dictionary Visualizer</h3>
  <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <input id="hw-dk" placeholder="key" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#fbbf24;font-family:monospace;font-size:14px;outline:none"/>
    <span style="color:#94a3b8;line-height:38px">:</span>
    <input id="hw-dv" placeholder="value" style="flex:1;min-width:80px;padding:8px 12px;border:2px solid #4c4f82;border-radius:10px;background:#1a1a2e;color:#60a5fa;font-family:monospace;font-size:14px;outline:none"/>
    <button onclick="window._hw_da()" style="padding:8px 16px;border:none;border-radius:10px;background:#22c55e;color:#fff;font-weight:600;cursor:pointer;font-size:13px">Add</button>
  </div>
  <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-bottom:6px">my_dict = {</div>
  <div id="hw-dp" style="display:flex;flex-direction:column;gap:8px;padding:0 12px;min-height:40px"></div>
  <div style="font-family:monospace;font-size:13px;color:#94a3b8;margin-top:6px">}</div>
  <div style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span style="font-family:monospace;font-size:13px">my_dict[</span>
    <input id="hw-dl" placeholder="key" style="width:80px;padding:6px 10px;border:2px solid #4c4f82;border-radius:8px;background:#1a1a2e;color:#fbbf24;font-family:monospace;font-size:13px;outline:none"/>
    <span style="font-family:monospace;font-size:13px">]</span>
    <button onclick="window._hw_dg()" style="padding:6px 14px;border:none;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;font-size:12px">Lookup</button>
    <span id="hw-dr" style="font-family:monospace;font-size:14px;color:#34d399"></span>
  </div>
  <script>(function(){var d={name:'Alice',age:'25',lang:'Python'};function r(){var h='';for(var k in d){h+='<div style="display:flex;align-items:center;gap:8px"><span style="padding:6px 12px;background:#fbbf2420;border:1.5px solid #fbbf24;border-radius:8px;color:#fbbf24;font-family:monospace;font-size:14px">\\"'+k+'\\"</span><span style="color:#7c3aed;font-size:18px">&#8594;</span><span style="padding:6px 12px;background:#60a5fa20;border:1.5px solid #60a5fa;border-radius:8px;color:#60a5fa;font-family:monospace;font-size:14px">\\"'+d[k]+'\\"</span></div>'}document.getElementById('hw-dp').innerHTML=h}window._hw_da=function(){var k=document.getElementById('hw-dk').value.trim(),v=document.getElementById('hw-dv').value.trim();if(!k)return;d[k]=v||'None';r();document.getElementById('hw-dk').value='';document.getElementById('hw-dv').value=''};window._hw_dg=function(){var k=document.getElementById('hw-dl').value.trim(),el=document.getElementById('hw-dr');if(d.hasOwnProperty(k)){el.style.color='#34d399';el.textContent='= \\"'+d[k]+'\\"'}else{el.style.color='#ef4444';el.textContent='KeyError: \\"'+k+'\\"'}};r()})()</script>
</div>'''

WIDGET_WHILE_LOOP = '''<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:500px;margin:24px auto;padding:20px;background:linear-gradient(135deg,#1e1e2e,#2d2b55);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);color:#e0e0e0">
  <h3 style="margin:0 0 12px;font-size:18px;color:#a78bfa">&#x1F504; While Loop Simulator</h3>
  <div style="font-family:monospace;font-size:14px;background:#1a1a2e;padding:12px;border-radius:10px;margin-bottom:12px">
    count = <span id="hw-wv" style="color:#fbbf24">0</span><br/>
    <span style="color:#c084fc">while</span> count &lt; <span id="hw-wt" style="color:#22d3ee">5</span>:<br/>
    &nbsp;&nbsp;print(count)<br/>
    &nbsp;&nbsp;count += 1
  </div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <label style="font-size:13px">Target:</label>
    <input id="hw-wn" type="range" min="1" max="8" value="5" oninput="document.getElementById('hw-wt').textContent=this.value" style="flex:1;accent-color:#7c3aed"/>
    <button id="hw-wb" onclick="(function(){var t=+document.getElementById('hw-wn').value;document.getElementById('hw-wo').textContent='';document.getElementById('hw-wb').disabled=true;var c=0;var tm=setInterval(function(){if(c>=t){clearInterval(tm);document.getElementById('hw-wo').textContent+='\\n--- Loop finished! count = '+c+' which is NOT < '+t;document.getElementById('hw-wb').disabled=false;return}document.getElementById('hw-wv').textContent=c;document.getElementById('hw-wo').textContent+='count='+c+' ('+c+' < '+t+' is True) -> print('+c+')\\n';c++},600)})()" style="padding:8px 18px;border:none;border-radius:10px;background:#7c3aed;color:#fff;font-weight:600;cursor:pointer;font-size:14px">Run &#9654;</button>
  </div>
  <div id="hw-wo" style="font-family:monospace;font-size:12px;background:#1a1a2e;padding:10px;border-radius:10px;min-height:40px;white-space:pre-wrap;color:#34d399"></div>
</div>'''

# ── Section Parser ────────────────────────────────────────────────────────────

def parse_markdown_sections(body):
    """Parse the markdown body into 6 named sections."""
    sections = {}
    current_key = None
    current_lines = []

    for line in body.split('\n'):
        stripped = line.strip()
        if stripped.startswith('### '):
            if current_key:
                sections[current_key] = '\n'.join(current_lines).strip()
            header = stripped[4:].strip()
            if 'How It Works' in header:
                current_key = 'theory'
            elif 'Step by Step' in header:
                current_key = 'steps'
            elif 'Example' in header:
                current_key = 'example'
            elif 'Common Mistakes' in header:
                current_key = 'mistakes'
            elif 'Connection' in header:
                current_key = 'connection'
            elif 'Quick Practice' in header:
                current_key = 'practice'
            else:
                current_key = header.lower().replace(' ', '_')
            current_lines = []
        elif stripped.startswith('## '):
            continue  # skip the title h2
        else:
            current_lines.append(line)

    if current_key:
        sections[current_key] = '\n'.join(current_lines).strip()

    return sections


def escape(text):
    """Escape HTML entities but preserve intentional HTML."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def md_inline_to_html(text):
    """Convert inline markdown (bold, code, italic) to HTML."""
    # Code spans first
    text = re.sub(r'`([^`]+)`', r'<code style="background:#e2e8f0;color:#7c3aed;padding:2px 6px;border-radius:4px;font-size:14px">\1</code>', text)
    # Bold
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    # Italic
    text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
    return text


def convert_theory(text):
    """Convert the theory section paragraphs to HTML."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    html_parts = []
    for p in paragraphs:
        lines = p.strip().split('\n')
        merged = ' '.join(l.strip() for l in lines)
        merged = md_inline_to_html(merged)
        html_parts.append(f'  <p style="font-size:16px;margin-bottom:12px;">{merged}</p>')
    return '\n'.join(html_parts)


def convert_steps(text):
    """Convert numbered steps to HTML list."""
    lines = text.strip().split('\n')
    items = []
    current = ''
    for line in lines:
        stripped = line.strip()
        m = re.match(r'^(\d+)\.\s+(.+)', stripped)
        if m:
            if current:
                items.append(current)
            current = md_inline_to_html(m.group(2))
        elif stripped and current:
            current += ' ' + md_inline_to_html(stripped)
    if current:
        items.append(current)

    li_html = '\n'.join(
        f'    <li style="margin-bottom:8px;padding-left:4px;">{item}</li>'
        for item in items
    )
    return f'  <ol style="font-size:15px;padding-left:24px;margin:0;">\n{li_html}\n  </ol>'


def convert_example(text):
    """Convert code example with output to HTML."""
    # Extract code blocks and output
    parts = re.split(r'```(\w*)\n', text)
    code_blocks = []
    output_text = ''
    i = 0
    while i < len(parts):
        part = parts[i]
        if part in ('python', 'py', ''):
            # Next part is the code
            if i + 1 < len(parts):
                code = parts[i + 1]
                if code.endswith('```'):
                    code = code[:-3]
                elif '```' in code:
                    code = code[:code.index('```')]
                code_blocks.append(code.strip())
                i += 2
                continue
        # Check for output marker
        if '**Output:**' in part or 'Output:' in part:
            # The remaining after output marker
            after = part.split('**Output:**')[-1] if '**Output:**' in part else part.split('Output:')[-1]
            after = after.strip()
            if after:
                output_text = after
        i += 1

    # Also try to find output in trailing text
    if not output_text:
        match = re.search(r'\*\*Output:\*\*\s*\n```\n(.*?)```', text, re.DOTALL)
        if match:
            output_text = match.group(1).strip()
    if not output_text:
        match = re.search(r'\*\*Output:\*\*\s*\n(.*?)$', text, re.DOTALL)
        if match:
            raw = match.group(1).strip()
            raw = re.sub(r'^```\w*\n?', '', raw)
            raw = re.sub(r'\n?```$', '', raw)
            output_text = raw.strip()

    html = ''
    for code in code_blocks[:1]:  # Only first code block for main example
        escaped_code = html_module.escape(code)
        html += f'''  <pre style="background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.5;"><code>{escaped_code}</code></pre>'''

    if output_text:
        escaped_output = html_module.escape(output_text)
        html += f'''\n  <div style="background:#ecfdf5;padding:12px 16px;border-radius:8px;margin-top:8px;font-family:monospace;font-size:14px;color:#065f46;border-left:4px solid #34d399;">
    <strong>Output:</strong><pre style="margin:4px 0 0;white-space:pre-wrap;">{escaped_output}</pre>
  </div>'''

    return html


def convert_mistakes(text):
    """Convert mistake bullets to warning cards."""
    # Parse each mistake
    mistakes = re.findall(r'-\s+\*\*Mistake:\s*(.+?)\*\*\s*[—–-]\s*(.+?)(?=\n-\s+\*\*Mistake|\Z)', text, re.DOTALL)
    if not mistakes:
        # Fallback: just convert paragraphs
        items = [p.strip() for p in text.split('\n') if p.strip().startswith('-')]
        html = ''
        for item in items:
            item_clean = md_inline_to_html(item.lstrip('- '))
            html += f'''  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:8px;font-size:14px;color:#991b1b;">
    {item_clean}
  </div>\n'''
        return html

    html = ''
    for name, desc in mistakes:
        desc_clean = md_inline_to_html(desc.strip().replace('\n', ' '))
        name_clean = md_inline_to_html(name.strip())
        html += f'''  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:10px;font-size:14px;color:#991b1b;">
    <strong>{name_clean}</strong> &mdash; {desc_clean}
  </div>\n'''
    return html


def convert_connection(text):
    """Convert connection text to green card."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    inner = '\n'.join(
        f'  <p style="margin:0 0 8px;font-size:15px;">{md_inline_to_html(" ".join(p.split()))}</p>'
        for p in paragraphs
    )
    return inner


def convert_practice(text):
    """Convert practice questions to styled list."""
    lines = text.strip().split('\n')
    items = []
    current = ''
    for line in lines:
        stripped = line.strip()
        m = re.match(r'^(\d+)\.\s+(.+)', stripped)
        if m:
            if current:
                items.append(current)
            current = md_inline_to_html(m.group(2))
        elif stripped.startswith('Try these'):
            continue
        elif stripped and current:
            current += ' ' + md_inline_to_html(stripped)
    if current:
        items.append(current)

    li_html = '\n'.join(
        f'    <li style="margin-bottom:8px;">{item}</li>'
        for item in items
    )
    return f'  <ol style="font-size:15px;padding-left:24px;margin:0;">\n{li_html}\n  </ol>'


# ── Widget Selection Logic ────────────────────────────────────────────────────

def get_widget_for_lesson(module_index, lesson_index, title):
    """Return appropriate widget HTML for specific lessons, or None."""
    title_lower = title.lower()

    # Module 1 (index 0): print, variables, types, math
    if module_index == 0:
        if lesson_index == 0:  # print()
            return WIDGET_PRINT_OUTPUT
        elif lesson_index == 1:  # Variables
            return WIDGET_VARIABLE_ASSIGNMENT
        elif lesson_index == 2:  # Data types
            return WIDGET_VARIABLE_ASSIGNMENT  # Shows types in boxes
        elif lesson_index == 3:  # Math
            return None  # Code example is sufficient

    # Module 2 (index 1): input, strings
    elif module_index == 1:
        if lesson_index == 0:  # Getting user input
            return WIDGET_PRINT_OUTPUT  # Simulates input/output
        elif lesson_index == 1:  # String operations
            return None
        elif lesson_index == 2:  # F-strings
            return None
        elif lesson_index == 3:  # split/join
            return None

    # Module 3 (index 2): Conditionals
    elif module_index == 2:
        if lesson_index == 0:  # If statements
            return WIDGET_IF_ELSE_FLOWCHART
        elif lesson_index == 1:  # elif chains
            return WIDGET_IF_ELSE_FLOWCHART
        elif lesson_index == 2:  # logical operators
            return WIDGET_IF_ELSE_FLOWCHART
        elif lesson_index == 3:  # nested conditions
            return None

    # Module 4 (index 3): Loops
    elif module_index == 3:
        if lesson_index == 0:  # For loops
            return WIDGET_FOR_LOOP
        elif lesson_index == 1:  # While loops
            return WIDGET_WHILE_LOOP
        elif lesson_index == 2:  # break/continue
            return WIDGET_FOR_LOOP
        elif lesson_index == 3:  # nested loops
            return WIDGET_FOR_LOOP

    # Module 5 (index 4): Lists
    elif module_index == 4:
        if lesson_index <= 1:  # Lists, list operations
            return WIDGET_LIST_OPERATIONS
        elif lesson_index == 2:  # Tuples
            return None
        elif lesson_index == 3:  # Iterating lists
            return WIDGET_LIST_OPERATIONS

    # Module 6 (index 5): Dictionaries
    elif module_index == 5:
        return WIDGET_DICTIONARY

    return None


# ── HTML Builder ──────────────────────────────────────────────────────────────

def build_lesson_html(title, body, module_index, lesson_index):
    """Convert a single lesson's markdown body to rich styled HTML."""
    sections = parse_markdown_sections(body)

    widget = get_widget_for_lesson(module_index, lesson_index, title)

    # Build the HTML
    parts = []
    parts.append(f'<div style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7;max-width:800px;margin:0 auto;">')

    # ── Theory Section ──
    if 'theory' in sections:
        parts.append(f'''
  <h2 style="color:#6366f1;font-size:24px;margin-bottom:16px;border-bottom:2px solid #e0e7ff;padding-bottom:8px;">&#x1F9E0; How It Works</h2>
{convert_theory(sections['theory'])}''')

    # ── Insert Widget after theory ──
    if widget:
        parts.append(f'\n  <!-- Interactive Widget -->\n{widget}')

    # ── Steps Section ──
    if 'steps' in sections:
        parts.append(f'''
  <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
    <h3 style="color:#334155;font-size:18px;margin:0 0 12px;">&#x1F4DD; Step by Step</h3>
{convert_steps(sections['steps'])}
  </div>''')

    # ── Example Section ──
    if 'example' in sections:
        parts.append(f'''
  <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0;">
    <h3 style="color:#334155;font-size:18px;margin:0 0 12px;">&#x1F4BB; Example</h3>
{convert_example(sections['example'])}
  </div>''')

    # ── Mistakes Section ──
    if 'mistakes' in sections:
        parts.append(f'''
  <div style="margin:20px 0;">
    <h3 style="color:#dc2626;font-size:18px;margin:0 0 12px;">&#x26A0;&#xFE0F; Common Mistakes</h3>
{convert_mistakes(sections['mistakes'])}
  </div>''')

    # ── Connection Section ──
    if 'connection' in sections:
        parts.append(f'''
  <div style="background:#ecfdf5;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #10b981;">
    <h3 style="color:#065f46;font-size:18px;margin:0 0 12px;">&#x1F517; Connection</h3>
{convert_connection(sections['connection'])}
  </div>''')

    # ── Practice Section ──
    if 'practice' in sections:
        parts.append(f'''
  <div style="background:#fffbeb;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
    <h3 style="color:#92400e;font-size:18px;margin:0 0 12px;">&#x1F3CB;&#xFE0F; Quick Practice</h3>
{convert_practice(sections['practice'])}
  </div>''')

    parts.append('\n</div>')

    return '\n'.join(parts)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Deep copy structure, only modify content
    output = {
        "course": data["course"],
        "modules": []
    }

    total_lessons = 0

    for mi, module in enumerate(data["modules"]):
        out_module = {
            "title": module["title"],
            "sort_order": module["sort_order"],
            "lessons": []
        }

        for li, lesson in enumerate(module["lessons"]):
            total_lessons += 1
            title = lesson["title"]
            body_md = lesson["content"]["body"]

            html_body = build_lesson_html(title, body_md, mi, li)

            out_lesson = {
                "title": lesson["title"],
                "sort_order": lesson["sort_order"],
                "content_type": lesson["content_type"],
                "content": {
                    "body": html_body,
                    "format": "html"
                }
            }

            # Preserve exercise if present
            if "exercise" in lesson:
                out_lesson["exercise"] = lesson["exercise"]

            out_module["lessons"].append(out_lesson)
            print(f"  [{total_lessons}/37] {title} -> {len(html_body)} chars")

        output["modules"].append(out_module)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nDone! {total_lessons} lessons written to {OUTPUT_FILE}")

    # Verify char counts
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        verify = json.load(f)

    for mi, m in enumerate(verify["modules"]):
        for li, l in enumerate(m["lessons"]):
            body_len = len(l["content"]["body"])
            status = "OK" if 1500 <= body_len <= 8000 else "WARN"
            if status == "WARN":
                print(f"  {status}: M{mi}L{li} {l['title']} = {body_len} chars")


if __name__ == "__main__":
    main()
