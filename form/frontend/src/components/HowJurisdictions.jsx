const STEPS=[
  {n:'1',t:'Upload the form',d:'The PDF or Word document you need completed — this exact file comes back filled.'},
  {n:'2',t:'Add your facts',d:'Drop in source documents and type instructions. Naturally, or as "Label: value".'},
  {n:'3',t:'Pick a jurisdiction',d:'Drives which official legal databases we search for any required law.'},
  {n:'4',t:'Get the completed file',d:'Auto-filled, downloaded, with a cited Fill Report. Review and file.'},
]
export default function HowJurisdictions({ jurisdictions }){
  return (
    <section className="section paper" id="how">
      <div className="container">
        <div className="eyebrow">How it works</div>
        <h2 className="h2">From blank form to filed-ready in four steps</h2>
        <div className="feature-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          {STEPS.map(s=>(
            <div className="feature" key={s.n}>
              <div className="ic" style={{background:'#F5B528',color:'#0A2540'}}>{s.n}</div>
              <h3>{s.t}</h3><p>{s.d}</p>
            </div>
          ))}
        </div>
        <div id="jurisdictions" style={{marginTop:48}}>
          <div className="eyebrow">Jurisdiction coverage</div>
          <h2 className="h2" style={{fontSize:24}}>Authoritative sources, mapped</h2>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:14}}>
            {(jurisdictions||[]).map(j=>(
              <span key={j} className="tag-soft" style={{padding:'8px 14px',fontSize:13}}>{j}</span>
            ))}
            <span className="tag-soft" style={{padding:'8px 14px',fontSize:13}}>+ any official government source</span>
          </div>
        </div>
      </div>
    </section>
  )
}
