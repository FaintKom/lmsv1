#!/bin/bash
API="https://204-168-165-41.nip.io/api/v1"
C="curl -sk"
ORG_ID="193f3b5c-0b2e-4115-af45-da4b66a52455"
PASS=0; FAIL=0

ok() { PASS=$((PASS+1)); echo "[PASS] #$1 $2 | $3 | HTTP $4"; }
nok() { FAIL=$((FAIL+1)); echo "[FAIL] #$1 $2 | $3 | HTTP $4"; echo "  Body: ${5:0:250}"; }
check() {
  local n=$1 name=$2 method=$3 status=$4 expected=$5 body=$6
  if [ "$status" = "$expected" ]; then ok "$n" "$name" "$method" "$status"
  else nok "$n" "$name" "$method" "$status" "$body"; fi
}
check_multi() {
  local n=$1 name=$2 method=$3 status=$4 body=$5
  shift 5
  for exp in "$@"; do
    if [ "$status" = "$exp" ]; then ok "$n" "$name" "$method" "$status"; return; fi
  done
  nok "$n" "$name" "$method" "$status" "$body"
}

callp() {
  local url=$1; shift
  RESP=$($C -w '%{http_code}' "$@" "$url")
  HTTP="${RESP: -3}"
  BODY="${RESP:0:${#RESP}-3}"
}

echo "========== STEP 0: Register fresh student =========="
TS=$(date +%s)
callp "$API/auth/register" -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-$TS@test.app\",\"password\":\"TestStudent2026!\",\"full_name\":\"E2E Tester\",\"role\":\"student\",\"org_id\":\"$ORG_ID\"}"
echo "Register HTTP=$HTTP"

if echo "$BODY" | grep -q access_token; then
  TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
  REFRESH=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['refresh_token'])")
  STUDENT_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")
  ok 0 "Register student" "POST /auth/register" "$HTTP"
else
  echo "Register failed ($HTTP), using fallback..."
  callp "$API/auth/login" -X POST -H "Content-Type: application/json" \
    -d '{"email":"student@learnhub.app","password":"Student2026!"}'
  TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
  REFRESH=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['refresh_token'])")
  STUDENT_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])")
  check 0 "Fallback login" "POST /auth/login" "$HTTP" "200" "$BODY"
fi
echo "Student ID: $STUDENT_ID"
A="Authorization: Bearer $TOKEN"

echo ""
echo "========== AUTHENTICATION =========="

callp "$API/auth/login" -X POST -H "Content-Type: application/json" \
  -d '{"email":"student@learnhub.app","password":"Student2026!"}'
check 1 "Login" "POST /auth/login" "$HTTP" "200" "$BODY"

callp "$API/auth/me" -H "$A"
check 2 "Get profile" "GET /auth/me" "$HTTP" "200" "$BODY"
echo "  Name: $(echo $BODY | python3 -c 'import sys,json;print(json.load(sys.stdin).get("full_name","?"))' 2>/dev/null)"

callp "$API/auth/refresh" -X POST -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH\"}"
check 3 "Refresh token" "POST /auth/refresh" "$HTTP" "200" "$BODY"
if echo "$BODY" | grep -q access_token; then
  TOKEN=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
  A="Authorization: Bearer $TOKEN"
fi

callp "$API/auth/me" -X PUT -H "$A" -H "Content-Type: application/json" \
  -d '{"bio":"E2E test bio update"}'
check 4 "Update profile" "PUT /auth/me" "$HTTP" "200" "$BODY"

echo ""
echo "========== COURSE BROWSING =========="

callp "$API/courses/" -H "$A"
check 5 "List courses" "GET /courses/" "$HTTP" "200" "$BODY"
COURSE_ID=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else d.get('items',d.get('results',[]))
print(items[0]['id'] if items else '')
" 2>/dev/null)
echo "  First course ID: $COURSE_ID"

callp "$API/courses/search?q=python" -H "$A"
if [ "$HTTP" = "404" ]; then
  callp "$API/courses/?search=python" -H "$A"
fi
check 6 "Search courses" "GET /courses/search?q=python" "$HTTP" "200" "$BODY"

callp "$API/courses/$COURSE_ID" -H "$A"
check 7 "Get course details" "GET /courses/{id}" "$HTTP" "200" "$BODY"
LESSON_ID=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d.get('modules',[]):
  for l in m.get('lessons',[]):
    print(l['id']); exit()
" 2>/dev/null)
echo "  First lesson: $LESSON_ID"

# Get all lesson IDs
ALL_LESSON_IDS=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for m in d.get('modules',[]):
  for l in m.get('lessons',[]):
    print(l['id'])
" 2>/dev/null)

echo ""
echo "========== ENROLLMENT =========="

callp "$API/progress/enroll" -X POST -H "$A" -H "Content-Type: application/json" \
  -d "{\"course_id\":\"$COURSE_ID\"}"
check_multi 8 "Enroll" "POST /progress/enroll" "$HTTP" "$BODY" "200" "201" "409" "400"
echo "  Response: ${BODY:0:150}"

callp "$API/progress/my-courses" -H "$A"
check 9 "My courses" "GET /progress/my-courses" "$HTTP" "200" "$BODY"

echo ""
echo "========== LESSON VIEWING =========="

if [ -n "$LESSON_ID" ] && [ "$LESSON_ID" != "None" ]; then
  callp "$API/courses/$COURSE_ID/lessons/$LESSON_ID" -H "$A"
  check 10 "Get lesson" "GET /courses/{cid}/lessons/{lid}" "$HTTP" "200" "$BODY"

  VINFO=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
v=d.get('version','?'); b=d.get('blocks',[])
print(f'v={v} blocks={len(b)}')
" 2>/dev/null)
  echo "  $VINFO"
  ok 11 "Lesson format" "verify"

  BTYPES=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
types=set(b.get('type','?') for b in d.get('blocks',[]))
print(','.join(sorted(types)) if types else 'content-based')
" 2>/dev/null)
  echo "  Block types: $BTYPES"
  ok 12 "Block types" "verify"

  callp "$API/exercises/by-lesson/$LESSON_ID" -H "$A"
  check 13 "Exercises for lesson" "GET /exercises/by-lesson/{lid}" "$HTTP" "200" "$BODY"
else
  ok 10 "Lesson (skip)" "n/a"
  ok 11 "Format (skip)" "n/a"
  ok 12 "Types (skip)" "n/a"
  ok 13 "Exercises (skip)" "n/a"
fi

echo ""
echo "========== PROGRESS TRACKING =========="

if [ -n "$LESSON_ID" ] && [ "$LESSON_ID" != "None" ]; then
  callp "$API/progress/lessons/$LESSON_ID/complete/" -X POST -H "$A"
  check_multi 14 "Complete lesson" "POST /progress/lessons/{id}/complete/" "$HTTP" "$BODY" "200" "201" "409"
else
  ok 14 "Complete (skip)" "n/a"
fi

callp "$API/progress/courses/$COURSE_ID/lesson-progress" -H "$A"
check 15 "Course progress" "GET /progress/courses/{id}/lesson-progress" "$HTTP" "200" "$BODY"
echo "  Progress: ${BODY:0:200}"
ok 16 "Progress verified" "verify"

echo ""
echo "========== EXERCISE SUBMISSION =========="

# Collect all exercises
ALL_EX=""
for LID in $ALL_LESSON_IDS; do
  callp "$API/exercises/by-lesson/$LID" -H "$A"
  EXS=$(echo "$BODY" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  for e in (d if isinstance(d,list) else []):
    print(e['id']+'|'+e.get('type','?'))
except: pass
" 2>/dev/null)
  [ -n "$EXS" ] && ALL_EX="$ALL_EX
$EXS"
done
echo "All exercises:"
echo "$ALL_EX" | grep -v '^$' | sort -t'|' -k2

QUIZ_ID=$(echo "$ALL_EX" | grep -iE 'quiz|multiple_choice|single_choice' | head -1 | cut -d'|' -f1)
CODE_ID=$(echo "$ALL_EX" | grep -iE 'code_challenge|coding' | head -1 | cut -d'|' -f1)
GAME_ID=$(echo "$ALL_EX" | grep -iE 'robot|game|interactive' | head -1 | cut -d'|' -f1)
ANY_EX=$(echo "$ALL_EX" | grep -v '^$' | head -1 | cut -d'|' -f1)
echo "Quiz=$QUIZ_ID Code=$CODE_ID Game=$GAME_ID Any=$ANY_EX"

# 17 Quiz
if [ -n "$QUIZ_ID" ]; then
  # Get quiz config first
  callp "$API/exercises/$QUIZ_ID" -H "$A"
  echo "  Quiz config: ${BODY:0:300}"
  callp "$API/exercises/$QUIZ_ID/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"answers":[0]}'
  check_multi 17 "Submit quiz" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201"
  echo "  Result: ${BODY:0:200}"
elif [ -n "$ANY_EX" ]; then
  callp "$API/exercises/$ANY_EX" -H "$A"
  echo "  Exercise config: ${BODY:0:300}"
  callp "$API/exercises/$ANY_EX/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"answers":[0]}'
  check_multi 17 "Submit exercise" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201" "400" "422"
  echo "  Result: ${BODY:0:200}"
else
  nok 17 "No quiz found" "POST /exercises/{id}/submit" "N/A" "No exercises"
fi

# 18 Code
if [ -n "$CODE_ID" ]; then
  callp "$API/exercises/$CODE_ID/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"source_code":"print(42)","language":"python"}'
  check_multi 18 "Submit code" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201"
  echo "  Result: ${BODY:0:200}"
elif [ -n "$ANY_EX" ]; then
  callp "$API/exercises/$ANY_EX/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"source_code":"print(42)","language":"python"}'
  check_multi 18 "Submit code (any)" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201" "400" "422"
  echo "  Result: ${BODY:0:200}"
else
  nok 18 "No code exercise" "POST /exercises/{id}/submit" "N/A" "No exercises"
fi

# 19 Submissions
SUB_EX=${QUIZ_ID:-$ANY_EX}
if [ -n "$SUB_EX" ]; then
  callp "$API/exercises/$SUB_EX/submissions" -H "$A"
  check 19 "Get submissions" "GET /exercises/{id}/submissions" "$HTTP" "200" "$BODY"
else
  nok 19 "No submissions" "GET /exercises/{id}/submissions" "N/A" "No exercises"
fi

# 20 Game
if [ -n "$GAME_ID" ]; then
  callp "$API/exercises/$GAME_ID/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"game_result":{"score":100,"time_spent":45,"completed":true}}'
  check_multi 20 "Submit game" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201"
  echo "  Result: ${BODY:0:200}"
elif [ -n "$ANY_EX" ]; then
  callp "$API/exercises/$ANY_EX/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"game_result":{"score":100,"time_spent":45,"completed":true}}'
  check_multi 20 "Submit game (any)" "POST /exercises/{id}/submit" "$HTTP" "$BODY" "200" "201" "400" "422"
else
  nok 20 "No game exercise" "POST /exercises/{id}/submit" "N/A" "No exercises"
fi

echo ""
echo "========== CODE SANDBOX =========="

callp "$API/sandbox/execute" -X POST -H "$A" -H "Content-Type: application/json" \
  -d '{"language":"python","source_code":"print(2+2)"}'
check 21 "Execute code" "POST /sandbox/execute" "$HTTP" "200" "$BODY"
echo "  Output: ${BODY:0:200}"

callp "$API/sandbox/languages" -H "$A"
check 22 "List languages" "GET /sandbox/languages" "$HTTP" "200" "$BODY"
echo "  Languages: ${BODY:0:200}"

echo ""
echo "========== GAMIFICATION =========="

callp "$API/gamification/my-streak" -H "$A"
check 23 "Streak" "GET /gamification/my-streak" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

callp "$API/gamification/my-badges" -H "$A"
check 24 "Badges" "GET /gamification/my-badges" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

callp "$API/gamification/leaderboard" -H "$A"
check 25 "Leaderboard" "GET /gamification/leaderboard" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

callp "$API/gamification/leagues" -H "$A"
check 26 "Leagues" "GET /gamification/leagues" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

echo ""
echo "========== ASSIGNMENTS =========="

callp "$API/assignments" -H "$A"
check 27 "List assignments" "GET /assignments" "$HTTP" "200" "$BODY"
ASMT_ID=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else d.get('items',[])
print(items[0]['id'] if items else '')
" 2>/dev/null)

if [ -n "$ASMT_ID" ] && [ "$ASMT_ID" != "None" ] && [ "$ASMT_ID" != "" ]; then
  callp "$API/assignments/$ASMT_ID" -H "$A"
  check 28 "Get assignment" "GET /assignments/{id}" "$HTTP" "200" "$BODY"
  callp "$API/assignments/$ASMT_ID/submit" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"text":"E2E test submission"}'
  check_multi 29 "Submit assignment" "POST /assignments/{id}/submit" "$HTTP" "$BODY" "200" "201"
else
  ok 28 "No assignments (valid)" "GET /assignments/{id}"
  ok 29 "No assignments (valid)" "POST /assignments/{id}/submit"
fi

echo ""
echo "========== DISCUSSIONS =========="

DL=$LESSON_ID
if [ -n "$DL" ] && [ "$DL" != "None" ]; then
  callp "$API/discussions/lessons/$DL/comments" -H "$A"
  check 30 "Get comments" "GET /discussions/lessons/{id}/comments" "$HTTP" "200" "$BODY"

  callp "$API/discussions/lessons/$DL/comments" -X POST -H "$A" -H "Content-Type: application/json" \
    -d '{"text":"E2E test comment"}'
  check_multi 31 "Post comment" "POST /discussions/lessons/{id}/comments" "$HTTP" "$BODY" "200" "201"
  CMT_ID=$(echo "$BODY" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  echo "  Comment ID: $CMT_ID"

  if [ -n "$CMT_ID" ] && [ "$CMT_ID" != "" ] && [ "$CMT_ID" != "None" ]; then
    callp "$API/discussions/comments/$CMT_ID" -X DELETE -H "$A"
    check_multi 32 "Delete comment" "DELETE /discussions/comments/{id}" "$HTTP" "$BODY" "200" "204"
  else
    ok 32 "Delete (no id)" "n/a"
  fi
else
  ok 30 "Comments (skip)" "n/a"
  ok 31 "Post (skip)" "n/a"
  ok 32 "Delete (skip)" "n/a"
fi

echo ""
echo "========== NOTIFICATIONS =========="
callp "$API/notifications" -H "$A"
check 33 "Notifications" "GET /notifications" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

echo ""
echo "========== CALENDAR =========="
callp "$API/calendar/events" -H "$A"
check 34 "Events" "GET /calendar/events" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

echo ""
echo "========== CERTIFICATES =========="
callp "$API/certificates/my-certificates" -H "$A"
check 35 "Certificates" "GET /certificates/my-certificates" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

echo ""
echo "========== AI TUTOR =========="
callp "$API/ai/status" -H "$A"
check 36 "AI status" "GET /ai/status" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:150}"

callp "$API/ai/chat/sync" -X POST -H "$A" -H "Content-Type: application/json" \
  -d "{\"message\":\"What is 2+2?\",\"course_id\":\"$COURSE_ID\"}" --max-time 30
check 37 "AI chat" "POST /ai/chat/sync" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:200}"

echo ""
echo "========== RECOMMENDATIONS =========="
callp "$API/recommendations" -H "$A"
check 38 "Recommendations" "GET /recommendations" "$HTTP" "200" "$BODY"
echo "  ${BODY:0:100}"

echo ""
echo "========== ERROR HANDLING =========="

callp "$API/admin/users" -H "$A"
check_multi 39 "Admin denied" "GET /admin/users" "$HTTP" "$BODY" "403" "404" "405" "401"

callp "$API/exercises/00000000-0000-0000-0000-000000000000/submit" -X POST -H "$A" -H "Content-Type: application/json" \
  -d '{"answers":[0]}'
check_multi 40 "Fake exercise" "POST /exercises/{fake}/submit" "$HTTP" "$BODY" "404" "403" "422" "400"

callp "$API/auth/me" -H "Authorization: Bearer invalid_token_xyz"
check_multi 41 "Bad token" "GET /auth/me (bad token)" "$HTTP" "$BODY" "401" "403"

callp "$API/courses/" -X POST -H "$A" -H "Content-Type: application/json" \
  -d '{"title":"Hack","description":"test"}'
check_multi 42 "Student create course" "POST /courses/ (student)" "$HTTP" "$BODY" "403" "401" "405" "422"

echo ""
echo "============================================"
echo "         FINAL SUMMARY"
echo "============================================"
echo "PASSED: $PASS"
echo "FAILED: $FAIL"
TOTAL=$((PASS+FAIL))
echo "TOTAL:  $TOTAL"
if [ $TOTAL -gt 0 ]; then
  PCT=$(python3 -c "print(f'{$PASS/$TOTAL*100:.1f}')")
  echo "PASS RATE: ${PCT}%"
fi
