"""Create Robot & 3D World course on Hetzner."""
import requests, os
import os
os.environ["PYTHONIOENCODING"] = "utf-8"

API = "https://204-168-165-41.nip.io/api/v1"
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
H = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
print("Logged in")

r = requests.post(f"{API}/courses", json={"title": "Robot Coding & 3D World", "description": "Learn programming with a 2D robot and explore 3D worlds", "category": "Programming"}, headers=H)
cid = r.json()["id"]

# Robot module
r = requests.post(f"{API}/courses/{cid}/modules", json={"title": "2D Robot (Blockly)", "sort_order": 0}, headers=H)
m1 = r.json()["id"]

robots = [
    ("Robot: Easy Path", {"grid_width":5,"grid_height":5,"cells":[{"x":0,"y":2,"type":"start"},{"x":4,"y":2,"type":"goal"}],"available_blocks":["move_up","move_down","move_left","move_right"],"win_condition":"reach_goal","difficulty":"beginner","target_steps":4,"optimal_blocks":4,"hints":["Just go right 4 times!"]}),
    ("Robot: Wall Detour", {"grid_width":6,"grid_height":6,"cells":[{"x":0,"y":3,"type":"start"},{"x":5,"y":3,"type":"goal"},{"x":2,"y":1,"type":"wall"},{"x":2,"y":2,"type":"wall"},{"x":2,"y":3,"type":"wall"},{"x":2,"y":4,"type":"wall"}],"available_blocks":["move_up","move_down","move_left","move_right"],"win_condition":"reach_goal","difficulty":"beginner","target_steps":8,"hints":["Go around the wall!"]}),
    ("Robot: Star Collector", {"grid_width":5,"grid_height":5,"cells":[{"x":0,"y":0,"type":"start"},{"x":2,"y":0,"type":"item"},{"x":4,"y":0,"type":"item"},{"x":4,"y":2,"type":"item"},{"x":4,"y":4,"type":"item"},{"x":1,"y":1,"type":"wall"},{"x":1,"y":2,"type":"wall"}],"available_blocks":["move_up","move_down","move_left","move_right","pick_up","repeat_times","math_number"],"win_condition":"collect_all","difficulty":"intermediate","max_blocks":15,"hints":["Collect all 4 stars!"]}),
    ("Robot: Python Maze", {"grid_width":8,"grid_height":8,"cells":[{"x":0,"y":0,"type":"start"},{"x":7,"y":7,"type":"goal"},{"x":1,"y":0,"type":"wall"},{"x":1,"y":1,"type":"wall"},{"x":1,"y":2,"type":"wall"},{"x":1,"y":3,"type":"wall"},{"x":3,"y":2,"type":"wall"},{"x":3,"y":3,"type":"wall"},{"x":3,"y":4,"type":"wall"},{"x":3,"y":5,"type":"wall"},{"x":3,"y":6,"type":"wall"},{"x":5,"y":0,"type":"wall"},{"x":5,"y":1,"type":"wall"},{"x":5,"y":2,"type":"wall"},{"x":5,"y":3,"type":"wall"},{"x":5,"y":4,"type":"wall"},{"x":6,"y":6,"type":"wall"},{"x":7,"y":6,"type":"wall"}],"available_blocks":["move_up","move_down","move_left","move_right","pick_up","repeat_times","while_not_at_goal","controls_if","if_wall_ahead","if_item_here","math_number","logic_negate"],"win_condition":"reach_goal","difficulty":"advanced","allow_python":True,"hints":["Try Python mode!"]}),
]
for i, (title, cfg) in enumerate(robots):
    r = requests.post(f"{API}/courses/{cid}/modules/{m1}/lessons", json={"title":title,"content_type":"robot_2d","sort_order":i,"duration_minutes":5}, headers=H)
    lid = r.json()["id"]
    r2 = requests.post(f"{API}/exercises", json={"lesson_id":lid,"exercise_type":"robot_2d","title":title,"config":cfg}, headers=H)
    print(f"  {r2.json().get('display_id','?')} - {title}")

# 3D module
r = requests.post(f"{API}/courses/{cid}/modules", json={"title": "3D World", "sort_order": 1}, headers=H)
m2 = r.json()["id"]

worlds = [
    ("3D: Find the Exit", {"grid_width":6,"grid_depth":6,"cells":[{"x":5,"z":3,"y":0,"type":"goal","id":"g1","color":"#22c55e"},{"x":3,"z":2,"y":0,"type":"wall","id":"w1"},{"x":3,"z":3,"y":0,"type":"wall","id":"w2"},{"x":3,"z":4,"y":0,"type":"wall","id":"w3"}],"player_start":{"x":1,"y":0,"z":3,"direction":"east"},"available_blocks":["move_forward","turn_left","turn_right"],"win_condition":"reach_goal","difficulty":"beginner","hints":["Go around the wall!"]}),
    ("3D: Jump Platforms", {"grid_width":7,"grid_depth":5,"cells":[{"x":2,"z":2,"y":1,"type":"platform","id":"p1"},{"x":3,"z":2,"y":1,"type":"platform","id":"p2"},{"x":4,"z":2,"y":2,"type":"platform","id":"p3"},{"x":5,"z":2,"y":2,"type":"platform","id":"p4"},{"x":6,"z":2,"y":0,"type":"goal","id":"g1","color":"#22c55e"},{"x":2,"z":1,"y":0,"type":"wall","id":"w1"},{"x":2,"z":3,"y":0,"type":"wall","id":"w2"},{"x":3,"z":1,"y":0,"type":"wall","id":"w3"},{"x":3,"z":3,"y":0,"type":"wall","id":"w4"},{"x":4,"z":1,"y":0,"type":"wall","id":"w5"},{"x":4,"z":3,"y":0,"type":"wall","id":"w6"},{"x":5,"z":1,"y":0,"type":"wall","id":"w7"},{"x":5,"z":3,"y":0,"type":"wall","id":"w8"}],"player_start":{"x":0,"y":0,"z":2,"direction":"east"},"available_blocks":["move_forward","turn_left","turn_right","jump","repeat_times","math_number"],"win_condition":"reach_goal","difficulty":"intermediate","allow_python":True,"hints":["Use jump to get onto platforms!"]}),
]
for i, (title, cfg) in enumerate(worlds):
    r = requests.post(f"{API}/courses/{cid}/modules/{m2}/lessons", json={"title":title,"content_type":"world_3d","sort_order":i,"duration_minutes":10}, headers=H)
    lid = r.json()["id"]
    r2 = requests.post(f"{API}/exercises", json={"lesson_id":lid,"exercise_type":"world_3d","title":title,"config":cfg}, headers=H)
    print(f"  {r2.json().get('display_id','?')} - {title}")

requests.post(f"{API}/courses/{cid}/publish", headers=H)
print("Published!")

# Enroll student
r = requests.post(f"{API}/auth/login", json={"email":"student@learnhub.app","password":os.environ.get("E2E_STUDENT_PASSWORD","")})
sh = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
requests.post(f"{API}/progress/enroll", json={"course_id": cid}, headers=sh)
print("Student enrolled!")
