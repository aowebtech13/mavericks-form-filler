#!/usr/bin/env python3
"""FormFiller web backend (Flask).

Endpoints:
  GET  /                  -> web app
  GET  /api/health        -> status + whether agentic mode is on
  GET  /api/legal-sources -> jurisdiction -> authoritative databases
  POST /api/analyze       -> detect fields + auto-propose values (heuristic; agentic if key set)
  POST /api/fill          -> return the SAME uploaded form, completed

Deterministic mode (no key): fills from facts the user types/uploads (Label: value),
maps by visible label + synonyms, flags legal fields for verification.
Agentic mode (ANTHROPIC_API_KEY set): Claude maps facts to fields intelligently AND
performs real-time, jurisdiction-restricted legal research with cited, verified answers.
"""
import os, re, json, tempfile, uuid
from flask import Flask, request, send_file, jsonify, Response
import engine

APP_DIR=os.path.dirname(os.path.abspath(__file__))
app=Flask(__name__, static_folder=os.path.join(APP_DIR,'static'), static_url_path='')
TMP=tempfile.gettempdir()
AGENTIC = bool(os.environ.get('ANTHROPIC_API_KEY'))

LEGAL_SOURCES = {
 "Kenya":["new.kenyalaw.org","kenyalaw.org"],
 "United Kingdom (England & Wales)":["legislation.gov.uk","caselaw.nationalarchives.gov.uk","bailii.org"],
 "United States":["uscode.house.gov","govinfo.gov","courtlistener.com"],
 "Canada":["laws-lois.justice.gc.ca","canlii.org","ontario.ca"],
 "Australia":["legislation.gov.au","austlii.edu.au"],
 "Nigeria":["lawnigeria.com","placng.org"],
 "South Africa":["gov.za","saflii.org"],
 "India":["indiacode.nic.in","indiankanoon.org"],
 "Ireland":["irishstatutebook.ie","courts.ie"],
 "New Zealand":["legislation.govt.nz","nzlii.org"],
 "Singapore":["sso.agc.gov.sg","elitigation.sg"],
}

def parse_facts(text):
    d={}
    for line in (text or '').splitlines():
        m=re.match(r'^\s*["\']?([A-Za-z][A-Za-z0-9 ._\-/()]{1,50}?)["\']?\s*[:=]\s*(.+?)\s*$', line)
        if m and m.group(2).strip(): d[m.group(1).strip()]=m.group(2).strip()
    return d

def heuristic_values(fields, facts, full_text):
    out={}
    for f in fields:
        v=engine._resolve(f['label'] or f['key'], facts) or engine._resolve(f.get('key',''), facts)
        if not v and full_text:
            m=re.search(re.escape(f['label'])+r'\s*[:=\-]?\s*([^\n]{1,80})', full_text, re.I)
            if m and engine.norm(m.group(1)): v=m.group(1).strip()
        out[f['key']]={'value':v or '', 'source':'document/instruction' if v else '', 'status':'filled' if v else 'empty'}
    return out

def agentic_fill(fields, facts_text, jurisdiction):
    """Use Claude to map facts->fields and research legal fields with citations.
    Returns {key:{value,source,status}}. Requires ANTHROPIC_API_KEY + anthropic SDK."""
    import anthropic
    client=anthropic.Anthropic()
    domains=LEGAL_SOURCES.get(jurisdiction, [])
    field_list=[{'key':f['key'],'label':f['label'],'legal':f.get('legal',False)} for f in fields]
    sys=("You are FormFiller's legal-research engine. Map the user's facts to each form field. "
         "For fields marked legal=true, you MUST use web_search restricted to the official legal "
         "databases of the jurisdiction and return the exact statute/section/rule/case WITH a source URL. "
         "If you cannot verify a legal answer from an authoritative source, leave value empty and set "
         "status='unverified'. Never invent citations. Return ONLY JSON: "
         '{"KEY":{"value":"...","source":"URL or document/instruction","status":"filled|unverified|empty"}}')
    user=(f"Jurisdiction: {jurisdiction}\nAuthoritative domains: {domains}\n\n"
          f"User facts / instructions:\n{facts_text}\n\nFields:\n{json.dumps(field_list,indent=2)}")
    tools=[{"type":"web_search_20250305","name":"web_search","max_uses":8,
            **({"allowed_domains":domains} if domains else {})}]
    msg=client.messages.create(model="claude-opus-4-8", max_tokens=4000,
        system=sys, tools=tools, messages=[{"role":"user","content":user}])
    text="".join(b.text for b in msg.content if getattr(b,'type','')=='text')
    m=re.search(r'\{.*\}', text, re.S)
    return json.loads(m.group(0)) if m else {}

def save_upload(fs):
    path=os.path.join(TMP, f"{uuid.uuid4().hex}_{re.sub(r'[^A-Za-z0-9._-]','_',fs.filename)}")
    fs.save(path); return path

@app.get('/')
def index(): return app.send_static_file('index.html')

@app.get('/api/health')
def health(): return jsonify(ok=True, agentic=AGENTIC, jurisdictions=list(LEGAL_SOURCES.keys()))

@app.get('/api/legal-sources')
def sources(): return jsonify(LEGAL_SOURCES)

@app.post('/api/analyze')
def analyze():
    if 'form' not in request.files: return jsonify(error='No form uploaded'), 400
    fpath=save_upload(request.files['form'])
    instructions=request.form.get('instructions','')
    jurisdiction=request.form.get('jurisdiction','')
    src_text=''
    for fs in request.files.getlist('sources'):
        if re.search(r'\.(txt|csv|md|json)$', fs.filename or '', re.I):
            try: src_text+='\n'+fs.read().decode('utf-8','ignore')
            except Exception: pass
    facts_text=(instructions+'\n'+src_text).strip()
    try: det=engine.detect(fpath)
    except Exception as e: return jsonify(error=str(e)), 400
    fields=det['fields']
    note=''
    if AGENTIC and fields:
        try:
            vals=agentic_fill(fields, facts_text, jurisdiction); note='Agentic mode: Claude mapped facts and researched legal fields live.'
        except Exception as e:
            vals=heuristic_values(fields, parse_facts(facts_text), facts_text); note=f'Heuristic mode (agentic error: {e}).'
    else:
        vals=heuristic_values(fields, parse_facts(facts_text), facts_text)
        note='Heuristic mode. Set ANTHROPIC_API_KEY on the server for agentic mapping + live legal research.' if not AGENTIC else ''
    for f in fields:
        v=vals.get(f['key'],{}); f['value']=v.get('value',''); f['source']=v.get('source',''); f['status']=v.get('status','empty')
    return jsonify(kind=det['kind'], fields=fields, note=note, form_id=os.path.basename(fpath), agentic=AGENTIC)

@app.post('/api/fill')
def fill():
    form_id=request.form.get('form_id','')
    fpath=os.path.join(TMP, os.path.basename(form_id)) if form_id else None
    if (not fpath or not os.path.exists(fpath)) and 'form' in request.files:
        fpath=save_upload(request.files['form'])
    if not fpath or not os.path.exists(fpath): return jsonify(error='Form not found; re-upload.'), 400
    try: values=json.loads(request.form.get('values','{}'))
    except Exception: values={}
    ext='docx' if fpath.lower().endswith('.docx') else 'pdf'
    out=os.path.join(TMP, f"completed_{uuid.uuid4().hex}.{ext}")
    try: engine.fill(fpath, values, out)
    except Exception as e: return jsonify(error=f'Fill failed: {e}'), 500
    base=re.sub(r'^[0-9a-f]{32}_','', os.path.basename(fpath))
    name=re.sub(r'\.(pdf|docx)$','', base, flags=re.I)+f'_COMPLETED.{ext}'
    mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document' if ext=='docx' else 'application/pdf'
    return send_file(out, as_attachment=True, download_name=name, mimetype=mime)

if __name__=='__main__':
    port=int(os.environ.get('PORT','8000'))
    print(f"FormFiller running on http://0.0.0.0:{port}  (agentic={AGENTIC})")
    app.run(host='0.0.0.0', port=port)
