export default function Hero({ onStart, agentic }){
  return (
    <header className="hero" id="top">
      <div className="container">
        <div className="pill-row">
          <span className="pill">★ Any form</span>
          <span className="pill">★ Any jurisdiction</span>
          <span className="pill">★ Live-cited law</span>
        </div>
        <h1>Fill any form, anywhere —<br/>with <span className="hl">verified law</span>, not guesswork.</h1>
        <p className="lead">Upload a court or government form, add your facts, choose a jurisdiction. MavericksAI completes the
          <b style={{color:'#fff'}}> exact file</b> you uploaded and cites every statute and case from official legal databases.</p>
        <div className="hero-cta">
          <button className="btn btn-gold btn-lg" onClick={onStart}>Start filling — it's free to try</button>
          <a className="btn btn-ghost btn-lg" href="#how" style={{color:'#fff',borderColor:'rgba(255,255,255,.25)'}}>See how it works</a>
        </div>
        <div className="hero-badges">
          <div>✓ PDF &amp; Word <b>returned completed</b></div>
          <div>✓ Citations from <b>authoritative databases</b></div>
          <div>✓ {agentic ? <b style={{color:'#F5B528'}}>Live legal research ON</b> : <b>Deterministic mode</b>}</div>
        </div>
      </div>
    </header>
  )
}
