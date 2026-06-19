export default function Navbar({ onStart }){
  return (
    <nav className="nav">
      <div className="container nav-in">
        <a className="brand" href="#top">
          <span className="brand-badge">M</span>
          <b>Mavericks<span>AI</span> FormFiller</b>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#jurisdictions">Jurisdictions</a>
          <button className="btn btn-gold nav-cta" onClick={onStart}>Fill a form</button>
        </div>
      </div>
    </nav>
  )
}
