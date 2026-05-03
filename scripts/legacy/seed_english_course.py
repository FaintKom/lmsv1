"""Create English for Beginners demo course with language exercise types."""
import requests, json, uuid
import os

API = "https://grasslms.online/api/v1"
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in")

def mkid(): return uuid.uuid4().hex[:7]

def mk_lesson(cid, mid, title, sort, html_body, ex_type, ex_title, ex_config, dur=10):
    content = {"version":2,"blocks":[{"id":mkid(),"type":"html","sort_order":0,"page":1,"body":html_body,"format":"html"}]}
    r = requests.post(f"{API}/courses/{cid}/modules/{mid}/lessons", json={"title":title,"content_type":"text","sort_order":sort,"duration_minutes":dur,"content":content}, headers=H)
    lid = r.json()["id"]
    r2 = requests.post(f"{API}/exercises", json={"lesson_id":lid,"exercise_type":ex_type,"title":ex_title,"config":ex_config}, headers=H)
    eid = r2.json()["id"]
    print(f"  {title} -> {r2.json().get('display_id')}")
    content["blocks"].append({"id":mkid(),"type":"exercise","sort_order":1,"page":1,"exercise_id":eid})
    requests.put(f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}", json={"content":content}, headers=H)
    return lid

# Create course
r = requests.post(f"{API}/courses", json={"title":"English for Beginners","description":"Learn English from scratch with interactive exercises, dialogues, and games.","category":"Languages"}, headers=H)
cid = r.json()["id"]
print(f"Course: {cid[:8]}")

# MODULE 1: Greetings
r = requests.post(f"{API}/courses/{cid}/modules", json={"title":"Greetings & Introductions","sort_order":0}, headers=H)
m1 = r.json()["id"]
print("Module 1: Greetings")

mk_lesson(cid, m1, "Hello! Nice to Meet You", 0,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">👋 Common Greetings</h2>'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0">'
    '<div style="background:#eef2ff;border-radius:12px;padding:16px;text-align:center"><span style="font-size:28px">🌅</span><br><strong style="font-size:18px">Good morning!</strong><br><span style="color:#64748b;font-size:13px">Before noon</span></div>'
    '<div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center"><span style="font-size:28px">☀️</span><br><strong style="font-size:18px">Good afternoon!</strong><br><span style="color:#64748b;font-size:13px">12pm - 6pm</span></div>'
    '<div style="background:#ede9fe;border-radius:12px;padding:16px;text-align:center"><span style="font-size:28px">🌙</span><br><strong style="font-size:18px">Good evening!</strong><br><span style="color:#64748b;font-size:13px">After 6pm</span></div>'
    '<div style="background:#ecfdf5;border-radius:12px;padding:16px;text-align:center"><span style="font-size:28px">🤝</span><br><strong style="font-size:18px">Nice to meet you!</strong><br><span style="color:#64748b;font-size:13px">First meeting</span></div>'
    '</div>'
    '<div style="background:#f1f5f9;border-radius:12px;padding:16px;margin-top:16px">'
    '<h3 style="color:#334155;margin:0 0 8px">💡 Key Phrases</h3>'
    '<ul style="margin:0;padding-left:20px;color:#475569">'
    '<li><strong>Hello / Hi</strong> — informal greeting</li>'
    '<li><strong>How are you?</strong> — asking about someone</li>'
    '<li><strong>I am fine, thank you!</strong> — polite response</li>'
    '</ul></div></div>',
    "dialogue", "Greeting Dialogue",
    {"context":"Meeting someone","messages":[
        {"speaker":"Tom","text":"Hello! My name is Tom. What is your name?"},
        {"speaker":"You","text":None,"options":[
            {"id":"a","text":"My name is Alex. Nice to meet you!","is_correct":True},
            {"id":"b","text":"I like pizza.","is_correct":False},
            {"id":"c","text":"Goodbye!","is_correct":False}
        ]},
        {"speaker":"Tom","text":"Nice to meet you too! How are you?"},
        {"speaker":"You","text":None,"options":[
            {"id":"a","text":"I am fine, thank you!","is_correct":True},
            {"id":"b","text":"My name is Alex.","is_correct":False}
        ]},
        {"speaker":"Tom","text":"Great! See you later!"}
    ]}
)

mk_lesson(cid, m1, "Numbers 1-20", 1,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">🔢 Numbers 1-20</h2>'
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:20px 0">'
    + ''.join(f'<div style="background:{["#dbeafe","#dcfce7","#fef9c3","#fce7f3","#ede9fe"][i%5]};border-radius:10px;padding:12px;text-align:center"><div style="font-size:24px;font-weight:bold">{i+1}</div><div style="font-size:12px">{["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"][i]}</div></div>' for i in range(20))
    + '</div></div>',
    "matching", "Match Numbers",
    {"pairs":[{"left":"1","right":"one"},{"left":"5","right":"five"},{"left":"10","right":"ten"},{"left":"13","right":"thirteen"},{"left":"20","right":"twenty"}],"shuffle":True}
)

# MODULE 2: Vocabulary
r = requests.post(f"{API}/courses/{cid}/modules", json={"title":"Basic Vocabulary","sort_order":1}, headers=H)
m2 = r.json()["id"]
print("Module 2: Vocabulary")

mk_lesson(cid, m2, "Colors", 0,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">🎨 Colors</h2>'
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0">'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#ef4444;color:white"><strong>Red</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#3b82f6;color:white"><strong>Blue</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#22c55e;color:white"><strong>Green</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#eab308;color:white"><strong>Yellow</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#f97316;color:white"><strong>Orange</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#8b5cf6;color:white"><strong>Purple</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#ec4899;color:white"><strong>Pink</strong></div>'
    '<div style="border-radius:12px;padding:20px 12px;text-align:center;background:#1e293b;color:white"><strong>Black</strong></div>'
    '</div></div>',
    "translation", "Translate Colors",
    {"source_text":"The sky is blue and the grass is green.","source_language":"en","target_language":"your language",
     "accepted_answers":["El cielo es azul y el pasto es verde","El cielo es azul y la hierba es verde","Gokyuzu mavi ve cimen yesil","Небо голубое и трава зелёная","Небо синее а трава зелёная"],
     "case_sensitive":False,"hints":["sky = cielo / gokyuzu / небо","blue = azul / mavi / голубой","grass = hierba / cimen / трава"]}
)

mk_lesson(cid, m2, "Family Members", 1,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">👨\u200d👩\u200d👧\u200d👦 Family Members</h2>'
    '<div style="text-align:center;margin:20px 0">'
    '<div style="display:inline-flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;justify-content:center">'
    '<div style="background:#dbeafe;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👴</span><br><strong>Grandfather</strong></div>'
    '<div style="background:#fce7f3;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👵</span><br><strong>Grandmother</strong></div>'
    '</div><br>'
    '<div style="display:inline-flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;justify-content:center">'
    '<div style="background:#dbeafe;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👨</span><br><strong>Father</strong></div>'
    '<div style="background:#fce7f3;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👩</span><br><strong>Mother</strong></div>'
    '<div style="background:#dbeafe;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👨</span><br><strong>Uncle</strong></div>'
    '<div style="background:#fce7f3;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👩</span><br><strong>Aunt</strong></div>'
    '</div><br>'
    '<div style="display:inline-flex;gap:16px;flex-wrap:wrap;justify-content:center">'
    '<div style="background:#dbeafe;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👦</span><br><strong>Brother</strong></div>'
    '<div style="background:#fce7f3;border-radius:12px;padding:14px 20px;text-align:center"><span style="font-size:32px">👧</span><br><strong>Sister</strong></div>'
    '</div></div></div>',
    "categorize", "Sort Family Members",
    {"categories":[{"name":"Male","items":["father","brother","grandfather","uncle"]},{"name":"Female","items":["mother","sister","grandmother","aunt"]}]}
)

# MODULE 3: Grammar
r = requests.post(f"{API}/courses/{cid}/modules", json={"title":"Grammar Basics","sort_order":2}, headers=H)
m3 = r.json()["id"]
print("Module 3: Grammar")

mk_lesson(cid, m3, "Present Simple: To Be", 0,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">📗 Present Simple: To Be</h2>'
    '<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:12px;overflow:hidden">'
    '<thead><tr style="background:#6366f1;color:white"><th style="padding:12px;text-align:left">Pronoun</th><th style="padding:12px;text-align:left">Verb</th><th style="padding:12px;text-align:left">Example</th></tr></thead>'
    '<tbody>'
    '<tr style="background:#eef2ff"><td style="padding:10px"><strong>I</strong></td><td style="padding:10px;color:#4f46e5;font-weight:bold">am</td><td style="padding:10px">I am a student 🎒</td></tr>'
    '<tr style="background:#fff"><td style="padding:10px"><strong>You</strong></td><td style="padding:10px;color:#4f46e5;font-weight:bold">are</td><td style="padding:10px">You are my friend 🤝</td></tr>'
    '<tr style="background:#eef2ff"><td style="padding:10px"><strong>He/She/It</strong></td><td style="padding:10px;color:#4f46e5;font-weight:bold">is</td><td style="padding:10px">She is a teacher 👩\u200d🏫</td></tr>'
    '<tr style="background:#fff"><td style="padding:10px"><strong>We</strong></td><td style="padding:10px;color:#4f46e5;font-weight:bold">are</td><td style="padding:10px">We are happy 😊</td></tr>'
    '<tr style="background:#eef2ff"><td style="padding:10px"><strong>They</strong></td><td style="padding:10px;color:#4f46e5;font-weight:bold">are</td><td style="padding:10px">They are at school 🏫</td></tr>'
    '</tbody></table></div>',
    "conjugation", "Conjugate: To Be",
    {"verb":"to be","tense":"Present Simple","language":"en","table":[
        {"pronoun":"I","correct":"am"},{"pronoun":"You","correct":"are"},
        {"pronoun":"He","correct":"is"},{"pronoun":"She","correct":"is"},
        {"pronoun":"We","correct":"are"},{"pronoun":"They","correct":"are"}
    ]}
)

mk_lesson(cid, m3, "Word Order in English", 1,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">📐 Word Order</h2>'
    '<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:24px;color:white;text-align:center;margin:20px 0">'
    '<p style="font-size:14px;margin:0 0 8px;opacity:0.8">English uses SVO order:</p>'
    '<div style="display:flex;justify-content:center;gap:12px;font-size:18px;font-weight:bold;flex-wrap:wrap">'
    '<span style="background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px">Subject</span>'
    '<span style="padding:8px 4px">→</span>'
    '<span style="background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px">Verb</span>'
    '<span style="padding:8px 4px">→</span>'
    '<span style="background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px">Object</span>'
    '</div></div>'
    '<div style="margin:16px 0">'
    '<div style="background:#ecfdf5;border-left:4px solid #22c55e;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:8px">✅ <strong>The cat</strong> <em>sits</em> <u>on the mat</u>.</div>'
    '<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:8px">❌ On the mat sits the cat.</div>'
    '<div style="background:#ecfdf5;border-left:4px solid #22c55e;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:8px">✅ <strong>She</strong> <em>reads</em> <u>a book</u>.</div>'
    '<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:0 8px 8px 0">❌ A book reads she.</div>'
    '</div></div>',
    "sentence_builder", "Build a Sentence",
    {"words":["The","cat","sits","on","the","mat"],"correct_order":["The","cat","sits","on","the","mat"],
     "distractors":["dog","runs"],"instructions":"Build the correct sentence from the given words"}
)

# MODULE 4: Reading
r = requests.post(f"{API}/courses/{cid}/modules", json={"title":"Reading & Comprehension","sort_order":3}, headers=H)
m4 = r.json()["id"]
print("Module 4: Reading")

mk_lesson(cid, m4, "My Daily Routine", 0,
    '<div style="font-family:system-ui;max-width:600px;margin:0 auto">'
    '<h2 style="color:#6366f1;text-align:center">📖 Reading Practice</h2>'
    '<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0">'
    '<strong>💡 Tip:</strong> Read the text carefully, then answer the questions below!'
    '</div>'
    '<div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin:16px 0">'
    '<h3 style="color:#1e293b;margin:0 0 8px">📝 New Vocabulary</h3>'
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    '<div style="background:white;padding:8px 12px;border-radius:8px;font-size:14px"><strong>wake up</strong> — get out of bed</div>'
    '<div style="background:white;padding:8px 12px;border-radius:8px;font-size:14px"><strong>brush teeth</strong> — clean teeth</div>'
    '<div style="background:white;padding:8px 12px;border-radius:8px;font-size:14px"><strong>take a shower</strong> — wash body</div>'
    '<div style="background:white;padding:8px 12px;border-radius:8px;font-size:14px"><strong>homework</strong> — school tasks</div>'
    '</div></div></div>',
    "reading", "Daily Routine Comprehension",
    {"passage":"My name is Sarah. I wake up at 7 o'clock every morning. First, I brush my teeth and take a shower. Then I eat breakfast - usually toast with butter and a cup of tea. I go to school at 8:30. After school, I do my homework and play with my dog, Max. I go to bed at 9 o'clock.",
     "questions":[
        {"question":"What time does Sarah wake up?","type":"multiple_choice","options":[
            {"id":"a","text":"6 o'clock","is_correct":False},
            {"id":"b","text":"7 o'clock","is_correct":True},
            {"id":"c","text":"8 o'clock","is_correct":False}
        ]},
        {"question":"What does Sarah eat for breakfast?","type":"text","correct_answer":"toast"},
        {"question":"What is the name of Sarah's dog?","type":"text","correct_answer":"Max"},
        {"question":"What time does Sarah go to bed?","type":"multiple_choice","options":[
            {"id":"a","text":"8 o'clock","is_correct":False},
            {"id":"b","text":"9 o'clock","is_correct":True},
            {"id":"c","text":"10 o'clock","is_correct":False}
        ]}
    ]}
)

# Publish + enroll
requests.post(f"{API}/courses/{cid}/publish", headers=H)
print("Published!")
for email, pwd in [("student@grasslms.online","Student2026!"),("alex@grasslms.online","Alex2026!")]:
    r2 = requests.post(f"{API}/auth/login", json={"email":email,"password":pwd})
    if r2.status_code == 200:
        sh = {"Authorization":f"Bearer {r2.json()['access_token']}","Content-Type":"application/json"}
        requests.post(f"{API}/progress/enroll", json={"course_id":cid}, headers=sh)
print("Students enrolled. Done!")
