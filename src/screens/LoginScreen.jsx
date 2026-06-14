import { useState } from 'react'
import { sb } from '../lib/supabase'
const Y='#F5C000', BG='#0A0A0A'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@kaamready.in')
  const [pass,  setPass]  = useState('')
  const [err,   setErr]   = useState('')
  const [busy,  setBusy]  = useState(false)

  async function login() {
    if (!pass) { setErr('Enter password'); return }
    setBusy(true); setErr('')
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:BG, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⚡</div>
      <p style={{ color:Y, fontWeight:900, fontSize:28, letterSpacing:'-1px', marginBottom:4 }}>KaamReady</p>
      <p style={{ color:'#555', fontSize:14, marginBottom:40 }}>Admin Dashboard</p>
      <div style={{ width:'100%', maxWidth:380 }}>
        <input value={email} onChange={e=>setEmail(e.target.value)}
          style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:12, padding:'14px 16px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 }}
          placeholder="Email" type="email" />
        <input value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          style={{ width:'100%', background:'#111', border:'1.5px solid #2a2a2a', borderRadius:12, padding:'14px 16px', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:16 }}
          placeholder="Password" type="password" />
        {err && <p style={{ color:'#ef4444', fontSize:13, marginBottom:12, textAlign:'center' }}>{err}</p>}
        <button onClick={login} disabled={busy}
          style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontWeight:900, fontSize:16, cursor:'pointer', fontFamily:'inherit', opacity:busy?0.6:1 }}>
          {busy ? 'Signing in…' : 'Sign In →'}
        </button>
      </div>
    </div>
  )
}
