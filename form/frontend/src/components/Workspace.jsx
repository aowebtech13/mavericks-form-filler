import { useRef, useState } from 'react'
import { analyze, fillForm } from '../api'

function fmt(b){return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'}

function Drop({label, accept, multiple, files, onAdd, onRemove}){
  const ref = useRef()
  const [drag,setDrag]=useState(false)
  return (
    <>
      <div className={'drop'+(drag?' drag':'')} onClick={()=>ref.current.click()}
        onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);onAdd([...e.dataTransfer.files])}}>
        <div className="big">Click to upload <span style={{fontWeight:500,color:'#5B6B7C'}}>or drag &amp; drop</span></div>
        <div className="small">{label}</div>
        <input ref={ref} type="file" hidden accept={accept} multiple={multiple}
          onChange={e=>{onAdd([...e.target.files]); e.target.value=''}} />
      </div>
      {files.length>0 && (
        <ul className="filelist">
          {files.map((f,i)=>(
            <li key={i}><span className="fn">{f.name}</span><span className="sz">{fmt(f.size)}</span>
              <button className="x" onClick={()=>onRemove(i)}>✕</button></li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function Workspace({ health }){
  const [form,setForm]=useState(null)
  const [sources,setSources]=useState([])
  const [instructions,setInstructions]=useState('')
  const [jurisdiction,setJurisdiction]=useState('')
  const [fields,setFields]=useState([])
  const [formId,setFormId]=useState(null)
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const [progress,setProgress]=useState(0)
  const [fillMsg,setFillMsg]=useState(null)
  const agentic = health?.agentic

  async function run(){
    if(!form) return
    setBusy(true); setFillMsg(null); setFields([]); setProgress(15)
    setStatus(agentic ? 'Analyzing form and researching law live…' : 'Analyzing form and mapping your facts…')
    try{
      const j = await analyze({ form, sources, instructions, jurisdiction })
      setProgress(70); setFields(j.fields||[]); setFormId(j.form_id)
      const filled=(j.fields||[]).filter(f=>f.value).length
      setStatus(`${j.note||''} Detected ${j.fields.length} field(s), ${filled} auto-filled.`)
      if((j.fields||[]).some(f=>f.value)){ await doFill(j.fields, j.form_id) }
      setProgress(100)
    }catch(e){ setStatus(''); setFillMsg({type:'err',text:e.message}) }
    finally{ setBusy(false); setTimeout(()=>setProgress(0),900) }
  }

  async function doFill(flds=fields, fid=formId){
    setFillMsg({type:'warn',text:'Filling your form…'})
    const values={}; (flds||[]).forEach(f=>{ if(f.value) values[f.key]=f.value })
    try{
      const { blob, name } = await fillForm({ form, form_id: fid, values })
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url)
      setFillMsg({type:'ok',text:'Completed form downloaded. Edit any value and re-fill if needed.'})
    }catch(e){ setFillMsg({type:'err',text:e.message}) }
  }

  function setVal(i,v){ setFields(fs=>fs.map((f,idx)=>idx===i?{...f,value:v}:f)) }
  function reset(){ setForm(null);setSources([]);setInstructions('');setJurisdiction('');setFields([]);setFormId(null);setStatus('');setFillMsg(null) }

  return (
    <section className="container work" id="app">
      <div className="work-card">
        <div className="immutable">
          <span className="lk">🔒</span>
          <div><b>Immutable rule.</b> Any statute, rule, regulation or case placed on your form comes only from authentic,
            verifiable legal databases for the jurisdiction you select — and is cited. Anything unverifiable is left blank and flagged, never guessed.
          <span className={'modepill '+(agentic?'mode-on':'mode-off')} style={{marginLeft:10}}>
            {agentic?'Live legal research: ON':'Deterministic mode'}</span></div>
        </div>

        <div className="steps">
          <div className="step">
            <div className="step-head"><span className="step-num">1</span><span className="step-title">Upload the form to complete</span><span className="tag-first">First · Required</span></div>
            <p className="step-hint">PDF or Word .docx. This exact file is returned, completed.</p>
            <Drop label="PDF · DOCX" accept=".pdf,.docx" multiple={false} files={form?[form]:[]}
              onAdd={fs=>fs[0]&&setForm(fs[0])} onRemove={()=>setForm(null)} />
          </div>

          <div className="step">
            <div className="step-head"><span className="step-num">2</span><span className="step-title">Upload relevant documents</span><span className="tag-soft">Sources</span></div>
            <p className="step-hint">Files containing the answers. Text sources (.txt, .csv) are read for facts.</p>
            <Drop label="Multiple files allowed" accept="" multiple={true} files={sources}
              onAdd={fs=>setSources(s=>[...s,...fs])} onRemove={i=>setSources(s=>s.filter((_,x)=>x!==i))} />
          </div>

          <div className="step">
            <div className="step-head"><span className="step-num">3</span><span className="step-title">Instructions</span><span className="tag-soft">Free text</span></div>
            <p className="step-hint">Your facts and directions — naturally, or as “Label: value”.</p>
            <textarea className="field-ml" value={instructions} onChange={e=>setInstructions(e.target.value)}
              placeholder={"e.g.\nApplicant Name: Jane A. Doe\nDate: 2026-06-15\nThis is a motion to vary child support."} />
          </div>

          <div className="step">
            <div className="step-head"><span className="step-num gold">⚑</span><span className="step-title">Jurisdiction</span><span className="tag-soft">Drives legal sourcing</span></div>
            <p className="step-hint">Set this whenever the form needs a legal answer.</p>
            <div className="field-ml" style={{maxWidth:360}}>
              <select value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)}>
                <option value="">Select jurisdiction…</option>
                {(health?.jurisdictions||[]).map(j=><option key={j}>{j}</option>)}
                <option value="other">Other (type in Instructions)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="run-row">
          <button className="btn btn-gold btn-lg" disabled={!form||busy} onClick={run}>
            {busy?'Working…':'Auto-Fill & Download'}</button>
          <button className="btn btn-ghost" onClick={reset}>Start a new task</button>
        </div>
        {progress>0 && <div className="progress"><i style={{width:progress+'%'}}/></div>}
        {status && <div className="statusbar">{status}</div>}

        {fields.length>0 && (
          <div className="review">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span className="step-num" style={{background:'#1E9E6A'}}>✓</span>
              <b>Detected fields — edit any value, then re-fill</b>
            </div>
            <table className="tbl">
              <thead><tr><th style={{width:'38%'}}>Field</th><th>Value</th><th style={{width:120}}>Status</th></tr></thead>
              <tbody>
                {fields.map((f,i)=>(
                  <tr key={i}>
                    <td><div style={{fontWeight:600}}>{f.label||f.key}</div>
                      <div className="fk">{f.key}</div>
                      {f.source && /^https?:/.test(f.source) && <div className="fk src"><a href={f.source} target="_blank" rel="noreferrer">source ↗</a></div>}</td>
                    <td><input type="text" value={f.value||''} onChange={e=>setVal(i,e.target.value)} /></td>
                    <td>{f.status==='filled'
                      ? <span className="badge b-ok">filled</span>
                      : f.status==='unverified'
                        ? <span className="badge b-un">unverified</span>
                        : f.legal ? <span className="badge b-legal">legal</span> : <span className="badge b-legal" style={{background:'#EEF2F7',color:'#5B6B7C'}}>empty</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="run-row" style={{paddingLeft:0}}>
              <button className="btn btn-navy" onClick={()=>doFill()}>Fill &amp; Download</button>
              {fillMsg && <span className={'msg '+(fillMsg.type==='ok'?'msg-ok':fillMsg.type==='warn'?'msg-warn':'msg-err')}>{fillMsg.text}</span>}
            </div>
          </div>
        )}
        {fields.length===0 && fillMsg && <div className="statusbar"><span className={'msg '+(fillMsg.type==='ok'?'msg-ok':fillMsg.type==='warn'?'msg-warn':'msg-err')}>{fillMsg.text}</span></div>}
      </div>
    </section>
  )
}
