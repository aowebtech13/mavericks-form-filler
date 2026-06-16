# FormFiller — Web App

Upload a form (PDF or Word), add your facts and a jurisdiction, and get the **same file back, completed**.
Runs as a normal web service so **anyone, on any device, anywhere** can use it from a browser.

## What it does
- **Box 1** Upload the form to complete (PDF or `.docx`) — returned completed, layout preserved.
- **Box 2** Upload source documents (text sources are read for facts).
- **Box 3** Instructions (facts, naturally or as `Label: value`).
- **Jurisdiction** selector — drives legal sourcing.
- **Auto-Fill & Download** — detects fields, maps your facts, writes them in, downloads the completed file.

## Two modes
- **Deterministic (default, no key):** fills fillable PDFs, Word placeholders `{{...}}`, "Label: ___" blanks, and
  table label/value cells; maps by visible label + synonyms. Legal fields are flagged for verification.
- **Agentic (set `ANTHROPIC_API_KEY`):** Claude maps facts to fields intelligently (handles complex positional
  forms) and performs **real-time, jurisdiction-restricted legal research**, returning verified, **cited** statutes/
  cases. Unverifiable legal answers are left blank and flagged — never guessed (the immutable rule).

## Run locally
```bash
pip install -r requirements.txt
python app.py            # http://localhost:8000
# enable agentic mode:
export ANTHROPIC_API_KEY=sk-ant-...   # (set in your shell first)
python app.py
```

## Run with Docker
```bash
docker build -t formfiller .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY formfiller
# open http://localhost:8000
```

## Deploy so the whole world can use it (free tiers available)
Any host that runs a Python web service works. Start command: `gunicorn -b 0.0.0.0:$PORT app:app`
- **Render.com** — New Web Service → connect repo → Build `pip install -r requirements.txt` →
  Start `gunicorn -b 0.0.0.0:$PORT app:app` → add env var `ANTHROPIC_API_KEY` (optional) → Deploy. You get a public HTTPS URL.
- **Railway.app / Fly.io / Google Cloud Run** — deploy the included `Dockerfile`; set `ANTHROPIC_API_KEY` if you want agentic mode.
- **Your own VPS** — `docker run` as above behind Nginx/Caddy for HTTPS.

## API (for integrators)
- `GET /api/health` → `{ok, agentic, jurisdictions[]}`
- `GET /api/legal-sources` → jurisdiction → authoritative domains
- `POST /api/analyze` (multipart: `form`, `instructions`, `jurisdiction`, `sources[]`) → detected fields + proposed values
- `POST /api/fill` (multipart: `form` or `form_id`, `values` JSON) → the completed file (download)

## Privacy & safety
- Uploads are processed to fill the form and written to a temp dir; add your own retention/cleanup policy for production.
- Put the service behind HTTPS. Consider auth/rate limiting before exposing publicly.
- FormFiller completes forms; it does not file them. **Not legal advice** — have a person licensed in the
  jurisdiction review before filing. Legal answers are cited so they can be independently checked.

## Limits
- Scanned/flat PDFs need OCR (add an OCR step or use the agentic/server pipeline).
- Complex positional Word forms (merged-cell layouts) fill best in **agentic mode**.
- Live legal research requires `ANTHROPIC_API_KEY` (the browser cannot reach legal databases directly).
# mavericks-form-filler
