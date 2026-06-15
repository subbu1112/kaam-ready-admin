import { useState } from 'react'
import { sb } from '../lib/supabase'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function Login({ onLogin }) {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setLoading(true)
    const ADMIN = import.meta.env.VITE_ADMIN_EMAIL || 'admin@kaamready.in'
    if (email.toLowerCase().trim() !== ADMIN) { setErr('Not an admin account'); setLoading(false); return }

    // Step 1: sign in with Supabase
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({ email: email.trim(), password: pass })
    if (authErr) { setErr(authErr.message); setLoading(false); return }

    // Step 2: server-side RBAC check via Edge Function
    try {
      const token = authData.session?.access_token
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        // Not an admin — revoke session immediately
        await sb.auth.signOut()
        const data = await res.json().catch(() => ({}))
        setErr(data.error || 'Admin verification failed. Access denied.')
        setLoading(false)
        return
      }
    } catch {
      await sb.auth.signOut()
      setErr('Could not verify admin access. Please try again.')
      setLoading(false)
      return
    }

    onLogin()
    setLoading(false)
  }

  const inp = { width:'100%', padding:'12px 14px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:14, outline:'none', transition:'border 0.2s' }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:400, boxShadow:'0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, background:'#6366f1', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <span style={{ color:'#fff', fontWeight:900, fontSize:24 }}>K</span>
          </div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>KaamReady Admin</h1>
          <p style={{ color:'#64748b', marginTop:4, fontSize:14 }}>Control Center — Authorized Access Only</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Admin Email</label>
            <input style={inp} type="email" placeholder="admin@kaamready.in" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Password</label>
            <input style={inp} type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required />
          </div>
          {err && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{err}</div>}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px', background:'#6366f1', color:'#fff', border:'none',
            borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer', opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Verifying...' : 'Sign In to Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  )
}
