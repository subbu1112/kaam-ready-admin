import { useState } from 'react'
import { sb } from '../lib/supabase'
import Card from '../components/Card'
import AvatarUpload from '../components/AvatarUpload'

import { Y, YD, YL } from '../theme'

function PaymentModal({ onClose, showToast }) {
  const [upi, setUpi] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kr_payment_methods')||'[]') } catch { return [] }
  })
  async function addUPI() {
    if (!upi.includes('@')) { showToast('Enter a valid UPI ID (e.g. name@upi)'); return }
    setSaving(true)
    const updated = [...saved.filter(u => u !== upi), upi]
    localStorage.setItem('kr_payment_methods', JSON.stringify(updated))
    setSaved(updated); setUpi('')
    showToast('UPI saved ✓'); setSaving(false)
  }
  function remove(u) {
    const updated = saved.filter(x => x !== u)
    localStorage.setItem('kr_payment_methods', JSON.stringify(updated))
    setSaved(updated)
  }
  return (
    <div role="dialog" aria-modal="true" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:999,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430,
        padding:'22px 20px 44px', animation:'slideUp .3s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <p style={{ fontWeight:800, fontSize:18 }}>💳 Payment Methods</p>
          <button type="button" onClick={onClose}
            style={{ background:'#F5F5F8', border:'none', borderRadius:10, padding:'6px 13px',
              cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13 }}>
            Close
          </button>
        </div>
        {saved.map(u => (
          <div key={u} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
            background:'#F5F5F8', borderRadius:13, marginBottom:8 }}>
            <span style={{ fontSize:20 }}>📱</span>
            <span style={{ flex:1, fontSize:14, fontWeight:600 }}>{u}</span>
            <button type="button" onClick={() => remove(u)}
              style={{ background:'none', border:'none', color:'#EF4444', fontSize:20, cursor:'pointer' }}>
              ×
            </button>
          </div>
        ))}
        <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:10 }}>Add UPI ID</p>
        <div style={{ display:'flex', gap:8 }}>
          <input value={upi} onChange={e => setUpi(e.target.value)} placeholder="yourname@gpay"
            style={{ flex:1, border:'1.5px solid #EBEBEB', borderRadius:13, padding:'12px 14px',
              fontSize:14, outline:'none', fontFamily:'inherit', background:'#FAFAFA' }} />
          <button type="button" onClick={addUPI} disabled={saving}
            style={{ background:Y, border:'none', borderRadius:13, padding:'12px 18px',
              fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileScreen({ user, city, bookings, showToast, setTab }) {
  const [modal,     setModal]     = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const completedJobs = bookings.filter(b => b.status==='completed').length

  const menus = [
    { ico:'📋', label:'My Bookings',      bg:'#D1FAE5', fn: () => setTab('bookings') },
    { ico:'📍', label:'Change City',      bg:'#DBEAFE', fn: () => showToast('Coming soon!') },
    { ico:'🏠', label:'Saved Addresses',  bg:'#FFF8D6', fn: () => showToast('Coming soon!') },
    { ico:'💳', label:'Payment Methods',  bg:'#F3F4F6', fn: () => setModal('payment') },
    { ico:'❓', label:'Help & Support',   bg:'#F3F4F6', fn: () => showToast('Call 1800-KR-HELP') },
    { ico:'📜', label:'Terms & Privacy',  bg:'#F3F4F6', fn: () => showToast('Coming soon!') },
  ]

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#F5F5F8' }}>
      {modal==='payment' && <PaymentModal onClose={() => setModal(null)} showToast={showToast} />}

      {/* Hero */}
      <div style={{ background:'linear-gradient(145deg,#F5C000,#FFD740)', padding:'52px 20px 28px', textAlign:'center' }}>
        <AvatarUpload userId={user?.id} currentUrl={avatarUrl} table="profiles"
          onUploaded={url => setAvatarUrl(url)} />
        <h2 style={{ fontSize:22, fontWeight:800, color:'#1A1A1A', marginTop:12 }}>{displayName}</h2>
        {city && (
          <p style={{ fontSize:13, color:'rgba(0,0,0,.55)', marginTop:4 }}>📍 {city}, Karnataka</p>
        )}
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:16 }}>
          {[
            [bookings.length, 'Bookings'],
            [completedJobs,   'Completed'],
            ['✓',             'Verified'],
          ].map(([v,l]) => (
            <div key={l} style={{ background:'rgba(0,0,0,.1)', borderRadius:14, padding:'10px 6px' }}>
              <div style={{ fontSize:18, fontWeight:800, color:'#1A1A1A' }}>{v}</div>
              <div style={{ fontSize:10, color:'rgba(0,0,0,.55)', marginTop:2, fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ background:'#fff', borderRadius:18,
          boxShadow:'0 1px 3px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)',
          overflow:'hidden' }}>
          {menus.map((m, i) => (
            <button key={m.label} type="button" onClick={m.fn}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:13, padding:'14px 16px',
                background:'none', border:'none', borderBottom: i<menus.length-1 ? '1px solid #F5F5F8' : 'none',
                cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
              <div style={{ width:38, height:38, borderRadius:12, background:m.bg,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {m.ico}
              </div>
              <span style={{ fontSize:15, fontWeight:500, color:'#1A1A1A', flex:1 }}>{m.label}</span>
              <span style={{ color:'#D1D5DB', fontSize:18 }}>›</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={() => sb.auth.signOut()}
          style={{ width:'100%', background:'transparent', border:'2px solid #FECACA',
            borderRadius:14, padding:15, color:'#EF4444', fontWeight:700, fontSize:14,
            cursor:'pointer', fontFamily:'inherit' }}>
          Sign Out
        </button>
        <p style={{ textAlign:'center', fontSize:12, color:'#D1D5DB', paddingBottom:12 }}>
          Kaam Ready v1.0 · Made in Karnataka 🇮🇳
        </p>
      </div>
    </div>
  )
}
