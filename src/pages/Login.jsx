import { useState } from 'react'
import { sb } from '../lib/supabase'

const Y = '#F5C000'

export default function LoginPage({ onLogin, showToast }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      showToast(error.message, 'error')
    } else {
      onLogin(data.session)
    }
    setLoading(false)
  }

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'#0F172A'
    }}>
      <div style={{
        background:'#1E293B', borderRadius:20, padding:'48px 40px',
        width:420, boxShadow:'0 24px 64px rgba(0,0,0,.5)',
        border:'1px solid #334155'
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
          <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:0 }}>KaamReady Admin</h1>
          <p style={{ color:'#64748B', fontSize:14, marginTop:6 }}>Sign in to your control center</p>
        </div>

        <form onSubmit={handleLogin}>
          <label style={{ display:'block', color:'#94A3B8', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="admin@kaamready.in"
            style={{
              width:'100%', border:'1.5px solid #334155', borderRadius:10,
              padding:'12px 14px', fontSize:14, outline:'none', fontFamily:'inherit',
              background:'#0F172A', color:'#F1F5F9', marginBottom:18,
              transition:'border-color .2s'
            }}
            onFocus={e => e.target.style.borderColor = Y}
            onBlur={e => e.target.style.borderColor = '#334155'}
          />
          <label style={{ display:'block', color:'#94A3B8', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>
            Password
          </label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required placeholder="••••••••"
            style={{
              width:'100%', border:'1.5px solid #334155', borderRadius:10,
              padding:'12px 14px', fontSize:14, outline:'none', fontFamily:'inherit',
              background:'#0F172A', color:'#F1F5F9', marginBottom:28,
              transition:'border-color .2s'
            }}
            onFocus={e => e.target.style.borderColor = Y}
            onBlur={e => e.target.style.borderColor = '#334155'}
          />
          <button
            type="submit" disabled={loading}
            style={{
              width:'100%', background:Y, border:'none', borderRadius:12,
              padding:14, fontSize:15, fontWeight:800, cursor:'pointer',
              fontFamily:'inherit', opacity: loading ? 0.7 : 1,
              transition:'opacity .2s, transform .1s',
              color:'#0F172A'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign:'center', color:'#475569', fontSize:12, marginTop:24 }}>
          KaamReady Platform · Admin v1.0 · Karnataka 🇮🇳
        </p>
      </div>
    </div>
  )
}
