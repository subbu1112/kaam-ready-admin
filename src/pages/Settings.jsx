import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

const C = {
  primary:'#6366F1', success:'#10B981', danger:'#EF4444',
  warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF',
  muted:'#64748B', text:'#0F172A', bg:'#F0F4FF',
}

const inp = {
  width:'100%', border:'1.5px solid '+C.border, borderRadius:10, padding:'10px 14px',
  fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#FAFAFA',
}

function Section({ title, desc, children }) {
  return (
    <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', marginBottom:16, border:'1px solid '+C.border }}>
      <h3 style={{ fontWeight:700, fontSize:15, marginBottom:desc?4:16 }}>{title}</h3>
      {desc && <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{desc}</p>}
      {children}
    </div>
  )
}

export default function Settings({ user, showToast }) {
  const [commission,  setCommission]  = useState('10')
  const [minPrice,    setMinPrice]    = useState('100')
  const [maxPrice,    setMaxPrice]    = useState('50000')
  const [upiHandle,   setUpiHandle]   = useState('kaamready@ybl')
  const [supportPh,   setSupportPh]   = useState('')
  const [supportMail, setSupportMail] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [admins,      setAdmins]      = useState([])
  const [newAdmin,    setNewAdmin]    = useState('')
  const [version,     setVersion]     = useState('1.0.0')

  useEffect(() => {
    loadSettings()
    loadAdmins()
  }, [])

  async function loadSettings() {
    const { data } = await sb.from('app_settings').select('*')
    if (!data) return
    const map = {}
    data.forEach(r => { map[r.key] = r.value })
    if (map.commission_pct)    setCommission(map.commission_pct)
    if (map.min_booking_price) setMinPrice(map.min_booking_price)
    if (map.max_booking_price) setMaxPrice(map.max_booking_price)
    if (map.upi_handle)        setUpiHandle(map.upi_handle)
    if (map.support_phone)     setSupportPh(map.support_phone)
    if (map.support_email)     setSupportMail(map.support_email)
    if (map.app_version)       setVersion(map.app_version)
  }

  async function saveSettings() {
    setSaving(true)
    const rows = [
      { key:'commission_pct',    value: commission },
      { key:'min_booking_price', value: minPrice },
      { key:'max_booking_price', value: maxPrice },
      { key:'upi_handle',        value: upiHandle },
      { key:'support_phone',     value: supportPh },
      { key:'support_email',     value: supportMail },
    ]
    for (const r of rows) {
      await sb.from('app_settings').upsert(r, { onConflict:'key' })
    }
    await sb.from('admin_logs').insert({ admin_id: user.id, action:'update_settings', details: { fields: rows.map(r=>r.key) } }).then(()=>{})
    showToast('Settings saved', 'success')
    setSaving(false)
  }

  async function loadAdmins() {
    const { data } = await sb.from('admin_users').select('id,email,created_at,role').order('created_at')
    setAdmins(data || [])
  }

  async function addAdmin() {
    if (!newAdmin.includes('@')) { showToast('Enter a valid email', 'error'); return }
    const { error } = await sb.from('admin_users').insert({ email: newAdmin.trim(), role:'admin' })
    if (error) { showToast(error.message, 'error'); return }
    setNewAdmin('')
    loadAdmins()
    showToast('Admin added', 'success')
  }

  async function removeAdmin(id) {
    if (id === user.id) { showToast("You can't remove yourself", 'error'); return }
    await sb.from('admin_users').delete().eq('id', id)
    loadAdmins()
    showToast('Admin removed', 'success')
  }

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'20px 24px', marginBottom:20, border:'1px solid '+C.border }}>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Settings</h2>
        <p style={{ fontSize:13, color:C.muted }}>Configure platform parameters, payment details, and admin access.</p>
      </div>

      <Section title="💰 Payment Configuration" desc="Controls how commissions and pricing work across the platform.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>Commission % (KaamReady takes)</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input value={commission} onChange={e=>setCommission(e.target.value.replace(/\D/g,''))} type="number" min={0} max={50} style={{ ...inp, width:80 }} />
              <span style={{ fontSize:13, color:C.muted }}>% of booking</span>
            </div>
            <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>Worker receives {100-Number(commission)||90}%</p>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>UPI Handle (customer pays to)</label>
            <input value={upiHandle} onChange={e=>setUpiHandle(e.target.value)} style={inp} placeholder="kaamready@ybl" />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>Min Booking Price (₹)</label>
            <input value={minPrice} onChange={e=>setMinPrice(e.target.value.replace(/\D/g,''))} type="number" style={inp} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>Max Booking Price (₹)</label>
            <input value={maxPrice} onChange={e=>setMaxPrice(e.target.value.replace(/\D/g,''))} type="number" style={inp} />
          </div>
        </div>
      </Section>

      <Section title="📞 Support Contact" desc="Shown to users in the Help & Support section.">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:4 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>Support Phone</label>
            <input value={supportPh} onChange={e=>setSupportPh(e.target.value)} style={inp} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:'block', marginBottom:6, textTransform:'uppercase' }}>Support Email</label>
            <input value={supportMail} onChange={e=>setSupportMail(e.target.value)} style={inp} placeholder="support@kaamready.in" />
          </div>
        </div>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
        <button onClick={saveSettings} disabled={saving}
          style={{ background:C.primary, color:'#fff', border:'none', borderRadius:12, padding:'12px 28px', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:saving?0.6:1 }}>
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      <Section title="👤 Admin Users" desc="People with access to this admin panel.">
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
          {admins.map(a => (
            <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:C.bg, borderRadius:10, border:'1px solid '+C.border }}>
              <div>
                <p style={{ fontWeight:600, fontSize:14 }}>{a.email}</p>
                <p style={{ fontSize:11, color:C.muted }}>{a.role || 'admin'} · Added {new Date(a.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              {a.id !== user.id && (
                <button onClick={() => removeAdmin(a.id)}
                  style={{ background:'#FEE2E2', color:C.danger, border:'none', borderRadius:8, padding:'6px 12px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  Remove
                </button>
              )}
              {a.id === user.id && <span style={{ fontSize:11, color:C.muted }}>You</span>}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={newAdmin} onChange={e=>setNewAdmin(e.target.value)} placeholder="New admin email address" style={{ ...inp, flex:1 }}
            onKeyDown={e => e.key==='Enter' && addAdmin()} />
          <button onClick={addAdmin} style={{ background:C.primary, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
            + Add Admin
          </button>
        </div>
      </Section>

      <Section title="ℹ️ Platform Info">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            ['App Version', version],
            ['Database', 'Supabase (PostgreSQL)'],
            ['Auth', 'Supabase OTP'],
            ['Storage', 'Supabase Storage'],
            ['Payments', 'UPI Manual Verification'],
            ['Environment', import.meta.env.MODE],
          ].map(([k,v]) => (
            <div key={k} style={{ padding:'12px 14px', background:C.bg, borderRadius:10, border:'1px solid '+C.border }}>
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{k}</p>
              <p style={{ fontSize:13, fontWeight:600 }}>{v}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
