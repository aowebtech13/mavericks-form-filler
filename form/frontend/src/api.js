const BASE = import.meta.env.VITE_API_BASE || ''
export async function getHealth(){
  const r = await fetch(`${BASE}/api/health`); if(!r.ok) throw new Error('health'); return r.json()
}
export async function analyze({ form, sources, instructions, jurisdiction }){
  const fd = new FormData()
  fd.append('form', form)
  ;(sources||[]).forEach(f => fd.append('sources', f))
  fd.append('instructions', instructions || '')
  fd.append('jurisdiction', jurisdiction || '')
  const r = await fetch(`${BASE}/api/analyze`, { method:'POST', body: fd })
  const j = await r.json(); if(!r.ok) throw new Error(j.error || 'Analyze failed'); return j
}
export async function fillForm({ form, form_id, values }){
  const fd = new FormData()
  if(form_id) fd.append('form_id', form_id)
  if(form) fd.append('form', form)
  fd.append('values', JSON.stringify(values || {}))
  const r = await fetch(`${BASE}/api/fill`, { method:'POST', body: fd })
  if(!r.ok){ let e='Fill failed'; try{ e=(await r.json()).error }catch{}; throw new Error(e) }
  const blob = await r.blob()
  const cd = r.headers.get('Content-Disposition') || ''
  const m = cd.match(/filename="?([^"]+)"?/)
  return { blob, name: m ? m[1] : 'completed' }
}
