export default function Footer(){
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div style={{maxWidth:320}}>
            <div className="brand"><span className="brand-badge">M</span><b>Mavericks<span style={{color:'#F5B528'}}>AI</span> FormFiller</b></div>
            <p style={{margin:0,color:'#9fb1c6'}}>Fill any form for any jurisdiction, with verified, cited law. Your file, completed.</p>
          </div>
          <div className="foot-cols">
            <div><h4>Product</h4><a href="#how">How it works</a><a href="#features">Features</a><a href="#jurisdictions">Jurisdictions</a></div>
            <div><h4>Trust</h4><a href="#">Immutable legal rule</a><a href="#">Privacy</a><a href="#">Security</a></div>
            <div><h4>Build</h4><a href="#">API</a><a href="#">Self-host</a><a href="#">Status</a></div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} MavericksAI. Not legal advice — review by a qualified professional in the jurisdiction is recommended before filing.</span>
          <span>Made for millions, worldwide.</span>
        </div>
      </div>
    </footer>
  )
}
