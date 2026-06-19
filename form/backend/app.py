#!/usr/bin/env python3
"""MavericksAI FormFiller — backend API + static host for the React app.

Endpoints:
  GET  /                  -> the React web app (built)
  GET  /api/health        -> {ok, agentic, jurisdictions[]}
  GET  /api/legal-sources -> jurisdiction -> authoritative domains
  POST /api/analyze       -> detect fields + auto-propose values
  POST /api/fill          -> the SAME uploaded form, completed (download)

Deterministic mode (no key): fills from the user's facts, maps by visible label.
Agentic mode (ANTHROPIC_API_KEY set): Claude maps facts to complex forms AND does
real-time, jurisdiction-restricted legal research with verified, cited answers.
"""
import os, re, json, tempfile, uuid
from flask import Flask, request, send_file, jsonify, send_from_directory
import engine
from legal_sources import LEGAL_SOURCES

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(APP_DIR, "static")
TMP = tempfile.gettempdir()
AGENTIC = bool(os.environ.get("ANTHROPIC_API_KEY"))
MODEL = os.environ.get("FORMFILLER_MODEL", "claude-opus-4-8")

app = Flask(__name__, static_folder=STATIC, static_url_path="")

@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = os.environ.get("CORS_ORIGIN", "*")
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return resp

def parse_facts(text):
    d = {}
    for line in (text or "").splitlines():
        m = re.match(r'^\s*["\']?([A-Za-z][A-Za-z0-9 ._\-/()]{1,50}?)["\']?\s*[:=]\s*(.+?)\s*$', line)
        if m and m.group(2).strip():
            d[m.group(1).strip()] = m.group(2).strip()
    return d

def heuristic_values(fields, facts, full_text):
    out = {}
    for f in fields:
        v = engine._resolve(f["label"] or f["key"], facts) or engine._resolve(f.get("key", ""), facts)
        if not v and full_text:
            m = re.search(re.escape(f["label"]) + r"\s*[:=\-]?\s*([^\n]{1,80})", full_text, re.I)
            if m and engine.norm(m.group(1)):
                v = m.group(1).strip()
        out[f["key"]] = {"value": v or "", "source": "document/instruction" if v else "", "status": "filled" if v else "empty"}
    return out

def agentic_fill(fields, facts_text, jurisdiction):
    import anthropic
    client = anthropic.Anthropic()
    domains = LEGAL_SOURCES.get(jurisdiction, [])
    field_list = [{"key": f["key"], "label": f["label"], "legal": f.get("legal", False)} for f in fields]
    sys = ("You are MavericksAI FormFiller's legal-research engine. Map the user's facts to each form field. "
           "For fields where legal=true you MUST use web_search restricted to the official legal databases of the "
           "jurisdiction and return the exact statute/section/rule/case WITH a real source URL. If you cannot verify "
           "a legal answer from an authoritative source, set value empty and status='unverified'. Never invent "
           "citations. Return ONLY JSON: {\"KEY\":{\"value\":\"...\",\"source\":\"URL or document/instruction\",\"status\":\"filled|unverified|empty\"}}")
    user = (f"Jurisdiction: {jurisdiction}\nAuthoritative domains: {domains}\n\n"
            f"User facts / instructions:\n{facts_text}\n\nFields:\n{json.dumps(field_list, indent=2)}")
    tools = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 8, **({"allowed_domains": domains} if domains else {})}]
    msg = client.messages.create(model=MODEL, max_tokens=4096, system=sys, tools=tools,
                                 messages=[{"role": "user", "content": user}])
    text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0)) if m else {}

def save_upload(fs):
    path = os.path.join(TMP, f"{uuid.uuid4().hex}_{re.sub(r'[^A-Za-z0-9._-]','_', fs.filename or 'file')}")
    fs.save(path); return path

@app.get("/api/health")
def health():
    return jsonify(ok=True, agentic=AGENTIC, jurisdictions=list(LEGAL_SOURCES.keys()))

@app.get("/api/legal-sources")
def sources():
    return jsonify(LEGAL_SOURCES)

@app.post("/api/analyze")
def analyze():
    if "form" not in request.files:
        return jsonify(error="No form uploaded"), 400
    fpath = save_upload(request.files["form"])
    instructions = request.form.get("instructions", "")
    jurisdiction = request.form.get("jurisdiction", "")
    src_text = ""
    for fs in request.files.getlist("sources"):
        if re.search(r"\.(txt|csv|md|json)$", fs.filename or "", re.I):
            try: src_text += "\n" + fs.read().decode("utf-8", "ignore")
            except Exception: pass
    facts_text = (instructions + "\n" + src_text).strip()
    try: det = engine.detect(fpath)
    except Exception as e: return jsonify(error=str(e)), 400
    fields = det["fields"]; note = ""
    if AGENTIC and fields:
        try:
            vals = agentic_fill(fields, facts_text, jurisdiction)
            note = "Agentic mode: Claude mapped facts and researched legal fields live."
        except Exception as e:
            vals = heuristic_values(fields, parse_facts(facts_text), facts_text)
            note = f"Heuristic mode (agentic error: {e})."
    else:
        vals = heuristic_values(fields, parse_facts(facts_text), facts_text)
        note = "" if AGENTIC else "Heuristic mode. Set ANTHROPIC_API_KEY for agentic mapping + live legal research."
    for f in fields:
        v = vals.get(f["key"], {}); f["value"] = v.get("value", ""); f["source"] = v.get("source", ""); f["status"] = v.get("status", "empty")
    return jsonify(kind=det["kind"], fields=fields, note=note, form_id=os.path.basename(fpath), agentic=AGENTIC)

@app.post("/api/fill")
def fill():
    form_id = request.form.get("form_id", "")
    fpath = os.path.join(TMP, os.path.basename(form_id)) if form_id else None
    if (not fpath or not os.path.exists(fpath)) and "form" in request.files:
        fpath = save_upload(request.files["form"])
    if not fpath or not os.path.exists(fpath):
        return jsonify(error="Form not found; re-upload."), 400
    try: values = json.loads(request.form.get("values", "{}"))
    except Exception: values = {}
    ext = "docx" if fpath.lower().endswith(".docx") else "pdf"
    out = os.path.join(TMP, f"completed_{uuid.uuid4().hex}.{ext}")
    try: engine.fill(fpath, values, out)
    except Exception as e: return jsonify(error=f"Fill failed: {e}"), 500
    base = re.sub(r"^[0-9a-f]{32}_", "", os.path.basename(fpath))
    name = re.sub(r"\.(pdf|docx)$", "", base, flags=re.I) + f"_COMPLETED.{ext}"
    mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == "docx" else "application/pdf"
    return send_file(out, as_attachment=True, download_name=name, mimetype=mime)

# Serve the React app (SPA fallback)
@app.get("/")
def index():
    return send_from_directory(STATIC, "index.html")

@app.errorhandler(404)
def spa(e):
    if request.path.startswith("/api/"):
        return jsonify(error="Not found"), 404
    return send_from_directory(STATIC, "index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"MavericksAI FormFiller on http://0.0.0.0:{port}  (agentic={AGENTIC})")
    app.run(host="0.0.0.0", port=port)
