# MavericksAI FormFiller

Fill **any** form (PDF or Word) for **any jurisdiction**, with legal answers drawn live from
**authoritative databases and cited** — and the *same file you uploaded* returned, completed.
Built as a production web app for a global audience.

**Brand:** navy blue `#0A2540` · yellow-gold `#F5B528` · white.

## Architecture
```
mavericksai-formfiller/
├── frontend/        React (Vite) single-page app — the branded UI
│   └── src/         App, components (Navbar, Hero, Workspace, Features, How, Footer), api.js, index.css
├── backend/         Flask API + serves the built frontend
│   ├── app.py       /api/health, /api/analyze, /api/fill, /api/legal-sources
│   ├── engine.py    PDF (PyMuPDF) + Word (python-docx) detection & filling
│   ├── legal_sources.py  jurisdiction → authoritative legal databases
│   └── static/      the built React app (prod)
├── Dockerfile       multi-stage: build React → serve from Python
└── docker-compose.yml
```

## Run it

### Fastest — Docker (one command)
```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
# open http://localhost:8000
```
Omit the key to run in deterministic mode (no live legal research).

### Local dev (hot reload)
```bash
# backend
cd backend && pip install -r requirements.txt
ANTHROPIC_API_KEY=sk-ant-... python app.py        # :8000

# frontend (separate terminal)
cd frontend && npm install && npm run dev          # :5173  (proxies /api to :8000)
```

### Production without Docker
```bash
cd frontend && npm install && npm run build        # outputs dist/
cp -r dist/* ../backend/static/
cd ../backend && pip install -r requirements.txt
gunicorn -b 0.0.0.0:8000 app:app
```

## Two modes
- **Deterministic (default):** fills fillable PDFs, Word placeholders `{{...}}`, "Label: ___" blanks and
  table cells; maps facts by visible label + synonyms. Legal fields flagged for verification.
- **Agentic (`ANTHROPIC_API_KEY` set):** Claude maps facts to complex/positional forms and runs **real-time,
  jurisdiction-restricted legal research**, returning **verified, cited** statutes/cases. Unverifiable legal
  answers are left blank and flagged — never guessed (the immutable rule).

## Deploy for the world (free tiers exist)
Any host that runs a container or a Python service works. Set `ANTHROPIC_API_KEY` for agentic mode.
- **Render / Railway / Fly.io / Google Cloud Run:** deploy the `Dockerfile`; you get a public HTTPS URL.
- **Render (no Docker):** Build `cd frontend && npm install && npm run build && cp -r dist/* ../backend/static/ && pip install -r ../backend/requirements.txt`; Start `cd backend && gunicorn -b 0.0.0.0:$PORT app:app`.

## API
- `GET /api/health` → `{ ok, agentic, jurisdictions[] }`
- `GET /api/legal-sources` → jurisdiction → authoritative domains
- `POST /api/analyze` (multipart: `form`, `instructions`, `jurisdiction`, `sources[]`) → fields + proposed values
- `POST /api/fill` (multipart: `form` or `form_id`, `values` JSON) → the completed file

## Security & compliance
- Uploads are processed to fill your form and stored in a temp dir; add retention/cleanup + auth + rate limiting for production.
- Serve behind HTTPS. Keep `ANTHROPIC_API_KEY` server-side only (never in the frontend).
- **Not legal advice.** Legal answers are cited so they can be independently checked; have a professional licensed in the jurisdiction review before filing.

## Limits
- Scanned/flat PDFs need OCR (add an OCR step).
- Complex positional Word forms fill best in **agentic mode**.
- Live legal research requires `ANTHROPIC_API_KEY` (browsers can't reach legal databases directly).
