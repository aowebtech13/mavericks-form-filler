import { useEffect, useRef, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Workspace from './components/Workspace'
import Features from './components/Features'
import HowJurisdictions from './components/HowJurisdictions'
import Footer from './components/Footer'
import { getHealth } from './api'

export default function App(){
  const [health,setHealth]=useState({ agentic:false, jurisdictions:[] })
  const appRef=useRef()
  useEffect(()=>{ getHealth().then(setHealth).catch(()=>{}) },[])
  const scrollToApp=()=>document.getElementById('app')?.scrollIntoView({behavior:'smooth'})
  return (
    <>
      <Navbar onStart={scrollToApp} />
      <Hero onStart={scrollToApp} agentic={health.agentic} />
      <Workspace health={health} ref={appRef} />
      <HowJurisdictions jurisdictions={health.jurisdictions} />
      <Features />
      <Footer />
    </>
  )
}
