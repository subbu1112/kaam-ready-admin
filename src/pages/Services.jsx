import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Modal from '../components/Modal'

const INR = v => '₹' + (v || 0).toLocaleString('en-IN')
const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }
const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box' }
const btn = (bg) => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' })

export default function Services({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit]       = useState(null)   // row being edited
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [adding, setAdding]   = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await sb.from('pricing').select('*').order('service_id').order('city')
    setRows(data || [])
    setLoading(false)
  }

  function openEdit(r) {
    setEdit(r); setAdding(false)
    setForm({ service_id:r.service_id||'', city:r.city||'', base_price:r.base_price||'', per_hour:r.per_hour||'', emergency_mult:r.emergency_mult||'', weekend_mult:r.weekend_mult||'' })
  }
  function openAdd() {
    setAdding(true); setEdit(null)
    setForm({ service_id:'', city:'', base_price:'', per_hour:'', emergency_mult:'1.5', weekend_mult:'1.2' })
  }

  async function save() {
    if (!form.service_id || !form.city) { showToast?.('Service and city are required','error'); return }
    setSaving(true)
    const payload = {
      service_id: form.service_id.trim(),
      city: form.city.trim(),
      base_price: Number(form.base_price)||0,
      per_hour: Number(form.per_hour)||0,
      emergency_mult: Number(form.emergency_mult)||1,
      weekend_mult: Number(form.weekend_mult)||1,
      updated_at: new Date().toISOString(),
    }
    let error
    if (adding) { ({ error } = await sb.from('pricing').insert(payload)) }
    else        { ({ error } = await sb.from('pricing').update(payload).eq('id', edit.id)) }
    setSaving(false)
    if (error) { showToast?.('Save failed: ' + error.message, 'error'); return }
    showToast?.('Pricing saved', 'success')
    setEdit(null); setAdding(false)
    await load()
  }

  async function remove(id) {
    if (!window.confirm('Delete this pricing row?')) return
    const { error } = await sb.from('pricing').delete().eq('id', id)
    if (error) { showToast?.('Delete failed: ' + error.message, 'error'); return }
    showToast?.('Deleted', 'success')
    await load()
  }

  return (
    <div>
      <TopBar title="Services & Pricing" subtitle="Manage service pricing per city" actions={
        <button onClick={openAdd} style={btn('#6366f1')}>+ Add Pricing</button>
      } />
      <div style={{ padding:32 }}>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:14, display:'flex' }}>
            Pricing rules <span style={{ marginLeft:'auto', fontWeight:400, color:'#64748b' }}>{rows.length} entries</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Service','City','Base Price','Per Hour','Emergency ×','Weekend ×','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontWeight:600, textTransform:'capitalize' }}>{r.service_id}</span></td>
                      <td style={td}>{r.city}</td>
                      <td style={td}>{INR(r.base_price)}</td>
                      <td style={td}>{INR(r.per_hour)}</td>
                      <td style={td}>{r.emergency_mult || 1}×</td>
                      <td style={td}>{r.weekend_mult || 1}×</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={()=>openEdit(r)} style={{ ...btn('#6366f1'), padding:'5px 12px', fontSize:12 }}>Edit</button>
                          <button onClick={()=>remove(r.id)} style={{ ...btn('#ef4444'), padding:'5px 12px', fontSize:12 }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No pricing rules yet</div>}
            </div>
          )}
        </div>
      </div>

      {(edit || adding) && (
        <Modal title={adding ? 'Add Pricing' : 'Edit Pricing'} onClose={()=>{ setEdit(null); setAdding(false) }} width={460}>
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Service ID (e.g. elec, plumb, clean)</label>
          <input style={inp} value={form.service_id} onChange={e=>setForm(f=>({...f,service_id:e.target.value}))} disabled={!adding} />
          <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>City</label>
          <input style={inp} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Base Price (₹)</label>
              <input style={inp} type="number" value={form.base_price} onChange={e=>setForm(f=>({...f,base_price:e.target.value}))} /></div>
            <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Per Hour (₹)</label>
              <input style={inp} type="number" value={form.per_hour} onChange={e=>setForm(f=>({...f,per_hour:e.target.value}))} /></div>
            <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Emergency Multiplier</label>
              <input style={inp} type="number" step="0.1" value={form.emergency_mult} onChange={e=>setForm(f=>({...f,emergency_mult:e.target.value}))} /></div>
            <div><label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Weekend Multiplier</label>
              <input style={inp} type="number" step="0.1" value={form.weekend_mult} onChange={e=>setForm(f=>({...f,weekend_mult:e.target.value}))} /></div>
          </div>
          <button disabled={saving} onClick={save} style={{ ...btn('#6366f1'), width:'100%', padding:'12px', marginTop:8, opacity:saving?0.6:1 }}>
            {saving ? 'Saving...' : 'Save Pricing'}
          </button>
        </Modal>
      )}
    </div>
  )
}
