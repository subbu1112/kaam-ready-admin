import { useState } from 'react'
import { sb } from '../lib/supabase'
import Btn from '../components/Btn'
import Card from '../components/Card'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function OTPScreen({ setScreen, showToast }) {
  const [otp,  setOtp]  = useState(['','','','','',''])
  const [busy, setBusy] = useState(false)

  function handleKey(i, val) {
    val = val.replace(/\D/g,'').slice(-1)
    const n=[...otp]; n[i]=val; setOtp(n)
    if (val && i < 5) document.getElementById('o'+(i+1))?.focus()
  }

  async function verify() {
    const code = otp.join('')
    if (code.length < 6) { showToast('Enter all 6 digits'); return }
    setBusy(true)
    const phone = localStorage.getItem('kr_phone') || ''
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ phone, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Invalid OTP'); return }

      const { error } = await sb.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'email',
      })
      if (error) { showToast('Auth error: ' + error.message); return }
      // App.jsx will detect session change and route to home
    } catch {
      showToast('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ height:'100vh', background:'#fff', maxWidth:430, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#F5C000', padding:'16px 24px 20px' }}>
        <button type="button" aria-label="Back to login" onClick={() => setScreen('login')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h2 style={{ fontWeight:800, fontSize:20, marginTop:8 }}>Enter OTP</h2>
        <p style={{ fontSize:13, color:'rgba(0,0,0,.6)' }}>6-digit code sent to your number</p>
      </div>
      <div style={{ padding:24, flex:1 }}>
        <Card>
          <p style={{ fontSize:14, color:'#555', marginBottom:4 }}>Enter the 6-digit code</p>
          <div style={{ display:'flex', gap:8, justifyContent:'center', margin:'16px 0' }}>
            {otp.map((v,i) => (
              <input key={i} id={'o'+i} maxLength={1} inputMode="numeric" value={v}
                onChange={e => handleKey(i, e.target.value)}
                style={{ width:46, height:54, border:'2px solid #E5E5EA', borderRadius:12,
                  textAlign:'center', fontSize:22, fontWeight:700, outline:'none', fontFamily:'inherit' }} />
            ))}
          </div>
          <Btn label={busy?'Verifying...':'Verify & Continue ✓'} onClick={verify} disabled={busy} />
        </Card>
      </div>
    </div>
  )
}
