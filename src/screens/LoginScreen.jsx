import { useState } from 'react'
import Btn from '../components/Btn'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function LoginScreen({ setScreen, showToast }) {
  const [tab,   setTab]   = useState('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [isReg, setIsReg] = useState(false)
  const [busy,  setBusy]  = useState(false)

  async function sendOTP() {
    if (phone.length < 10) { showToast('Enter a valid 10-digit number'); return }
    setBusy(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON},
        body:JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to send OTP'); return }
      localStorage.setItem('kr_phone', phone)
      setScreen('otp')
      showToast('OTP sent ✓')
    } catch { showToast('Network error — try again') }
    finally { setBusy(false) }
  }

  async function emailAuth() {
    if (!email.includes('@') || pass.length < 6) {
      showToast('Enter valid email and password (min 6 chars)'); return
    }
    setBusy(true)
    try {
      const { sb } = await import('../lib/supabase')
      if (isReg) {
        const { error } = await sb.auth.signUp({ email, password:pass })
        if (error) { showToast(error.message); return }
        showToast('Account created! Check email to verify.')
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password:pass })
        if (error) { showToast(error.message); return }
      }
    } catch(e) { showToast('Error: '+e.message) }
    finally { setBusy(false) }
  }

  const inputStyle = {
    width:'100%', border:'1.5px solid #EBEBEB', borderRadius:13, padding:'14px 16px',
    fontSize:15, outline:'none', fontFamily:'inherit', background:'#F5F5F8',
    boxSizing:'border-box', transition:'border .15s',
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#F5F5F8',
      maxWidth:430, margin:'0 auto', width:'100%', height:'100vh', overflow:'hidden' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(145deg,#F5C000,#FFD740 60%,#FFE980)',
        padding:'60px 28px 36px', textAlign:'center' }}>
        <div style={{ width:76, height:76, borderRadius:24, background:'rgba(0,0,0,.12)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:38, margin:'0 auto 16px' }}>⚡</div>
        <h1 style={{ fontSize:30, fontWeight:900, color:'#1A1A1A', letterSpacing:-.5 }}>Kaam Ready</h1>
        <p style={{ fontSize:14, color:'rgba(0,0,0,.55)', marginTop:6 }}>
          Skilled workers across Karnataka
        </p>
      </div>

      {/* Form */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 20px' }}>
        {/* Tab switcher */}
        <div style={{ display:'flex', background:'#fff', borderRadius:14, padding:4, gap:4, marginBottom:20,
          boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          {[['phone','📱 Phone'],['email','✉️ Email']].map(([t,l]) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              style={{ flex:1, padding:'10px 0', borderRadius:11, border:'none', fontWeight:700,
                fontSize:13, background: tab===t ? '#F5C000' : 'transparent',
                color: tab===t ? '#1A1A1A' : '#9CA3AF', cursor:'pointer', fontFamily:'inherit',
                transition:'.15s', boxShadow: tab===t ? '0 2px 8px rgba(245,192,0,.3)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>

        {tab==='phone' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'#fff', borderRadius:18, padding:20,
              boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)' }}>
              <p style={{ fontWeight:800, fontSize:18, marginBottom:4, color:'#1A1A1A' }}>Sign in with Phone</p>
              <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:18 }}>
                We'll send a 6-digit OTP to your number
              </p>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <div style={{ background:'#F5F5F8', borderRadius:13, padding:'14px', fontWeight:700,
                  fontSize:14, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                  🇮🇳 +91
                </div>
                <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  placeholder="98765 43210" type="tel" style={{ ...inputStyle, flex:1, width:'auto' }} />
              </div>
              <Btn label={busy ? 'Sending...' : 'Send OTP →'} onClick={sendOTP} disabled={busy} />
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:18, padding:20,
            boxShadow:'0 1px 4px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', marginBottom:20 }}>
              {[['Sign In',false],['Create Account',true]].map(([l,r]) => (
                <button key={l} type="button" onClick={() => setIsReg(r)}
                  style={{ flex:1, padding:'9px 0', border:'none', fontFamily:'inherit',
                    borderBottom: `2.5px solid ${isReg===r ? '#F5C000' : '#EBEBEB'}`,
                    background:'none', fontWeight:700, fontSize:13,
                    color: isReg===r ? '#1A1A1A' : '#9CA3AF', cursor:'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" type="email" style={inputStyle} />
              <input value={pass} onChange={e => setPass(e.target.value)}
                placeholder="Password (min 6 chars)" type="password" style={inputStyle} />
            </div>
            <Btn
              label={busy ? (isReg?'Creating...':'Signing in...') : (isReg?'Create Account →':'Sign In →')}
              onClick={emailAuth} disabled={busy} />
          </div>
        )}

        <p style={{ textAlign:'center', fontSize:12, color:'#C4C4C4', marginTop:20, paddingBottom:24 }}>
          By continuing you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  )
}
