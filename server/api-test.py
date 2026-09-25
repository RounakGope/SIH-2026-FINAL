"""End-to-end test of the FasalRakshak API against a running server.

    python api-test.py [base_url]        (default http://localhost:8080/api)

Needs the server started with a short automation interval, e.g.
AUTOMATION_INTERVAL_MS=15000, so escalations and block alerts fire during the run.
"""
import json, sys, time, uuid, urllib.request, urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/api'
passed = failed = 0

def call(method, path, body=None, token=None, headers=None, expect=None):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if token: h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, method=method, headers=h, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req) as r:
            code, text = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, text = e.code, e.read().decode()
    data = json.loads(text) if text and text[0] in '[{' else text
    return code, data

def check(name, cond, detail=''):
    global passed, failed
    if cond: passed += 1; print('  ok  ', name)
    else: failed += 1; print('  FAIL', name, detail)

now = int(time.time() * 1000)
print('Auth')
c, a = call('POST', '/auth/device', {'deviceId': 'test-device-' + uuid.uuid4().hex})
check('farmer device gets a token', c == 200 and a.get('token'), a)
A = a['token']; uidA = a['uid']
c, a2 = call('POST', '/auth/device', {'deviceId': 'test-device-other-' + uuid.uuid4().hex}); B = a2['token']
c, e = call('POST', '/auth/login', {'email': 'expert@kvk-wardha.demo', 'password': 'fasalrakshak-demo'})
check('KVK expert logs in', c == 200 and e.get('role') == 'expert', e)
E = e.get('token')
c, w = call('POST', '/auth/login', {'email': 'expert@kvk-wardha.demo', 'password': 'wrong'})
check('wrong password refused, with a reason the app can show', c == 401 and w.get('message') == 'Wrong email or password', w)

print('Access control')
check('no token -> staff list refused', call('GET', '/staff/cases')[0] == 401)
check('farmer token -> staff list refused', call('GET', '/staff/cases', token=A)[0] == 403)
check('staff token -> farmer sync refused', call('POST', '/sync', {'ops': []}, token=E)[0] == 403)

print('Sync (outbox, idempotent)')
plot = {'id': 'plot-' + uuid.uuid4().hex[:8], 'crop': 'Cotton', 'taluka': 'Arvi', 'phone': '9000000011', 'smsConsent': True, 'lang': 'hi'}
case = {'id': 'case-' + uuid.uuid4().hex[:8], 'plotId': plot['id'], 'crop': 'Cotton', 'taluka': 'Arvi', 'lat': 20.99, 'lon': 78.23,
        'label': 'bacterial_blight', 'confidence': 0.81, 'status': 'auto', 'share': True, 'phone': '9000000011', 'lang': 'hi',
        'plantsInfected': 3, 'plantsWalked': 5, 'leafPct': 15.3, 'sevIndex': 9.2, 'acres': 2, 'createdAt': now, 'photo': 'data:image/jpeg;base64,AAAA'}
ops = [{'opId': uuid.uuid4().hex, 'type': 'plot', 'plot': plot}, {'opId': uuid.uuid4().hex, 'type': 'case', 'case': case}]
c, r = call('POST', '/sync', {'ops': ops}, token=A)
check('ops applied', c == 200 and len(r['applied']) == 2, r)
c, r = call('POST', '/sync', {'ops': ops}, token=A)
check('same ops again: acknowledged, not re-applied', c == 200 and len(r['applied']) == 2 and not r['rejected'])
c, mine = call('GET', '/cases/mine', token=A)
check('exactly one copy of the case', c == 200 and sum(1 for x in mine if x['id'] == case['id']) == 1, len(mine))

print('Farmer write rules')
forged = dict(case, id='case-' + uuid.uuid4().hex[:8], status='confirmed')
c, r = call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': forged}]}, token=A)
check('farmer cannot create a case already "confirmed"', r['rejected'])
sneaky = dict(case, id='case-' + uuid.uuid4().hex[:8], expert={'by': 'me'}, seed=True)
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': sneaky}]}, token=A)
got = [x for x in call('GET', '/cases/mine', token=A)[1] if x['id'] == sneaky['id']][0]
check('expert verdict and seed flag stripped from a farmer write', got.get('expert') is None and not got.get('seed'), got)
c, r = call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': dict(case, label='healthy')}]}, token=B)
check("another farmer cannot overwrite this farmer's case", r['rejected'])

print('Anonymous reports')
private = dict(case, id='case-' + uuid.uuid4().hex[:8], share=False)
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': private}]}, token=A)
c, reps = call('GET', '/reports?taluka=Arvi', token=B)
mine_rep = [r for r in reps if r['id'] == case['id']]
check('shared case is visible to another farmer as a report', c == 200 and len(mine_rep) == 1)
leak = [k for k in ('uid', 'photo', 'phone', 'lat', 'lon', 'plotId') if mine_rep and k in mine_rep[0]]
check('report carries no uid, photo, phone or exact location', not leak, leak)
check('report has the 5 km grid cell', mine_rep and mine_rep[0].get('cy') == round(20.99 * 20), mine_rep)
check("a farmer who didn't consent publishes nothing", not [r for r in reps if r['id'] == private['id']])
c, near = call('GET', '/reports?lat=20.99&lon=78.23&radiusKm=5', token=B)
check('radius query finds the case within 5 km', any(r['id'] == case['id'] for r in near))
c, far = call('GET', '/reports?lat=20.55&lon=78.84&radiusKm=5', token=B)
check('radius query leaves it out 70 km away', not any(r['id'] == case['id'] for r in far))
withdrawn = dict(case, id='case-' + uuid.uuid4().hex[:8])
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': withdrawn}]}, token=A)
before = any(r['id'] == withdrawn['id'] for r in call('GET', '/reports?taluka=Arvi', token=B)[1])
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': {'id': withdrawn['id'], 'share': False}}]}, token=A)
after = any(r['id'] == withdrawn['id'] for r in call('GET', '/reports?taluka=Arvi', token=B)[1])
check('consent withdrawn: the report comes down', before and not after, (before, after))

print('Expert decision')
c, d = call('POST', f"/staff/cases/{case['id']}/decision", {'status': 'corrected', 'label': 'leaf_curl'}, token=E)
check('expert corrects the case', c == 200 and d['status'] == 'corrected' and d['label'] == 'leaf_curl', d)
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': dict(case, label='bacterial_blight', status='auto', confidence=0.9)}]}, token=A)
got = [x for x in call('GET', '/cases/mine', token=A)[1] if x['id'] == case['id']][0]
check("farmer's next photo can't undo the expert's label", got['label'] == 'leaf_curl' and got['status'] == 'corrected', got)
c, inbox = call('GET', '/sms/sandbox', token=E)
reply = [m for m in inbox if m['to'] == '9000000011' and m['kind'] == 'expert']
check('farmer told by SMS in Hindi', reply and 'विशेषज्ञ' in reply[0]['text'], reply[:1])
fine = dict(case, id='case-' + uuid.uuid4().hex[:8], phone='9000000012', status='pending_review', confidence=0.5)
call('POST', '/sync', {'ops': [{'opId': uuid.uuid4().hex, 'type': 'case', 'case': fine}]}, token=A)
call('POST', f"/staff/cases/{fine['id']}/decision", {'status': 'corrected', 'label': 'healthy'}, token=E)
reply = [m for m in call('GET', '/sms/sandbox', token=E)[1] if m['to'] == '9000000012']
check('a healthy verdict says no treatment is needed', reply and 'इलाज की ज़रूरत नहीं' in reply[0]['text'], reply[:1])

print('Broadcast, IVR, sensors, speech')
c, b = call('POST', '/staff/broadcast', {'taluka': 'Arvi', 'text': 'Test advisory for Arvi'}, token=E)
check('broadcast reaches the plot that agreed to SMS', c == 200 and b['sent'] >= 1, b)
c, _ = call('POST', '/ivr/register', {'phone': '9000000022', 'taluka': 'Arvi', 'crop': 'Cotton', 'lang': 'mr'})
check('IVR registration', c == 200)
c, ivr = call('POST', '/ivr/calls', {'phone': '9000000022', 'lang': 'mr', 'crop': 'Cotton', 'taluka': 'Arvi', 'transcript': 'पाने पिवळी पडत आहेत'})
check('IVR voice report becomes a pending KVK case', c == 200 and ivr['status'] == 'pending_review' and ivr['kind'] == 'ivr', ivr)
check('IVR rejects a bad phone number', call('POST', '/ivr/calls', {'phone': '12345'})[0] == 400)
call('POST', f"/staff/cases/{ivr['id']}/decision", {'status': 'corrected', 'label': 'leaf_curl'}, token=E)
reply = [m for m in call('GET', '/sms/sandbox', token=E)[1] if m['to'] == '9000000022' and m['kind'] == 'expert']
check('the voice caller gets the diagnosis, not a link to an app', reply and 'फोनवर' in reply[0]['text'] and 'उघडा' not in reply[0]['text'], reply[:1])
check('sensor reading without the device key refused', call('POST', '/sensors/readings', {'plotId': plot['id'], 'leafWetness': 1})[0] == 403)
c, _ = call('POST', '/sensors/readings', {'plotId': plot['id'], 'leafWetness': 1, 'soilMoisture': 31.5, 'tempC': 22.1, 'rh': 93, 'stepMin': 30}, headers={'X-Device-Key': 'dev-sensor-key'})
check('sensor reading with the device key stored', c == 200)
c, rd = call('GET', f"/sensors/{plot['id']}", token=A)
check('farmer reads their plot sensor', c == 200 and rd and rd[-1]['rh'] == 93, rd)
check("another farmer can't read it", call('GET', f"/sensors/{plot['id']}", token=B)[0] == 403)
check('speech without Bhashini keys answers 503 (app falls back to the phone)', call('POST', '/speech/tts', {'text': 'नमस्कार', 'lang': 'mr'}, token=A)[0] == 503)

print('Scheduled automations (escalation, block alert)')
old = {'id': 'seed-old-' + uuid.uuid4().hex[:6], 'crop': 'Cotton', 'taluka': 'Deoli', 'label': 'leaf_curl', 'status': 'pending_review', 'confidence': 0.5, 'createdAt': now - 30 * 3600_000, 'lat': 20.65, 'lon': 78.48}
burst = [{'id': 'seed-' + uuid.uuid4().hex[:8], 'crop': 'Cotton', 'taluka': 'Seloo', 'label': 'jassid_damage', 'status': 'confirmed',
          'confidence': 0.9, 'createdAt': now - i * 3600_000, 'lat': 20.85, 'lon': 78.71, 'acres': 2} for i in range(16)]
call('POST', '/ivr/register', {'phone': '9000000033', 'taluka': 'Seloo', 'crop': 'Cotton', 'lang': 'mr'})
c, s = call('POST', '/staff/seed', [old] + burst, token=E)
check('demo data seeded', c == 200 and s['seeded'] == 17, s)
esc = alert = []
for _ in range(12):
    time.sleep(5)
    inbox = call('GET', '/sms/sandbox', token=E)[1]
    esc = [m for m in inbox if m['kind'] == 'escalation' and 'Deoli' in m['text']]
    alert = [m for m in inbox if m['kind'] == 'alert' and m['to'] == '9000000033']
    if esc and alert: break
check('case waiting 30 h escalated to the district officer by SMS', bool(esc), [m['text'] for m in esc][:1])
check('Seloo reaching 16 jassid farms sends a Marathi block alert', alert and 'तुडतुड' in alert[0]['text'], [m['text'] for m in alert][:1])
c, r = call('DELETE', '/staff/seed', token=E)
check('demo data cleared', c == 200 and r['removed'] >= 17, r)

print(f'\n{passed} passed, {failed} failed')
sys.exit(1 if failed else 0)
