const F = [
  { ic:'📄', t:'Your exact file, completed', d:'We never rebuild your form. Fillable PDFs, Word templates, "Label: ___" blanks and table cells are filled in place — layout preserved.' },
  { ic:'⚖️', t:'Law you can verify', d:'For any statute, rule or case, we search the jurisdiction’s official databases live, confirm it’s in force, and cite a source URL. Unverifiable answers are flagged, never invented.' },
  { ic:'🌍', t:'Built for every jurisdiction', d:'Kenya, the UK, US, Canada, Australia, India and more — each mapped to its authoritative legal source. New jurisdictions resolve to the official government site.' },
  { ic:'⚡', t:'One action, no manual mapping', d:'Upload, add facts, click once. We read each field’s visible label and map your facts automatically, then hand back the finished document.' },
  { ic:'🔒', t:'Private by design', d:'Your uploads are used only to fill your form. Run it yourself or self-host — your data, your server.' },
  { ic:'🧾', t:'Cited Fill Report', d:'Every run produces a report: each field, its value, and where it came from — document, instruction, or a verified legal citation with a link.' },
]
export default function Features(){
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="eyebrow">Why MavericksAI</div>
        <h2 className="h2">Accuracy you can check. Speed you can feel.</h2>
        <p className="sub">A world-standard form engine with an immutable rule at its core: cite real law or leave it blank.</p>
        <div className="feature-grid">
          {F.map((f,i)=>(
            <div className="feature" key={i}>
              <div className="ic">{f.ic}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
