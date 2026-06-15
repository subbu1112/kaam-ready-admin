import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-'
const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')

function btnS(bg,size='md') {
  return { background:bg, color:'#fff', border:'none', borderRadius:size==='sm'?6:8, padding:size==='sm'?'5px 10px':'9px 16px', fontSize:size==='sm'?12:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }
}

export default function Workers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [kycFilter, setKycFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [bookings, setBookings] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await sb.from('workers').select('*').order('created_at', { ascending: false })
    setWorkers(data || [])
    setLoading(false)
  }

  async function openWorker(w) {
    setSelected(w)
    const { data } = await sb.from('bookings').select('*').eq('worker_id', w.id).order('created_at', { ascending: false })
    setBookings(data || [])
  }

  async function updateKYC(id, status) {
    setSaving(true)
    await sb.from('workers').update({ kyc_status: status, aadhar_verified: status === 'approved', aadhaar_verified: status === 'approved' }).eq('id', id)
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, kyc_status: status } : null)
  }

  async function updateStatus(id, status) {
    setSaving(true)
    await sb.from('workers').update({ account_status: status }).eq('id', id)
    await load()
    setSaving(false)
    setSelected(s => s ? { ...s, account_status: status } : null)
  }

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    const matchQ = !q || (w.name||'').toLowerCase().includes(q) || (w.phone||'').includes(q) || (w.skill||'').toLowerCase().includes(q)
    const matchF = filter === 'all' || (w.account_status||'active') === filter
    const matchK = kycFilter === 'all' || (w.kyc_status||'pending') === kycFilter
    return matchQ && matchF && matchK
  })

  const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

  return (
    <div>
      <TopBar title="Worker Management" subtitle={`${workers.length} registered workers`} actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>exportCSV(filtered.map(w=>({Name:w.name,Phone:w.phone,Skill:w.skill,City:w.city,Rating:w.rating,Jobs:w.total_jobs,KYC:w.kyc_status,Status:w.account_status||'active'})),'workers')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>exportExcel(filtered.map(w=>({Name:w.name,Phone:w.phone,Skill:w.skill,City:w.city,Rating:w.rating,Jobs:w.total_jobs,KYC:w.kyc_status,Status:w.account_status||'active'})),'workers','Workers')} style={btnS('#3b82f6')}>Excel</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, skill..." style={{ padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, width:240, outline:'none' }} />
            <div style={{ display:'flex', gap:6 }}>
              {['all','active','suspended'].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['all','pending','approved','rejected'].map(f=>(
                <button key={f} onClick={()=>setKycFilter(f)} style={{ padding:'7px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:kycFilter===f?'#f59e0b':'#f1f5f9', color:kycFilter===f?'#fff':'#64748b', textTransform:'capitalize' }}>KYC: {f}</button>
              ))}
            </div>
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b' }}>{filtered.length} results</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>
                  {['Worker','Phone','Skill','City','Rating','Jobs','KYC','Status','Online','Actions'].map(h=><th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map(w=>(
                    <tr key={w.id} style={{ cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><div style={{ fontWeight:600 }}>{w.name||'No name'}</div><div style={{ fontSize:11, color:'#94a3b8' }}>{w.id.slice(0,8)}...</div></td>
                      <td style={td}>{w.phone||'-'}</td>
                      <td style={td}>{w.skill||'-'}</td>
                      <td style={td}>{w.city||'-'}</td>
                      <td style={td}><span style={{ fontWeight:700, color:'#f59e0b' }}>{w.rating||5} ★</span></td>
                      <td style={td}>{w.total_jobs||0}</td>
                      <td style={td}><Badge status={w.kyc_status||'pending'} /></td>
                      <td style={td}><Badge status={w.account_status||'active'} /></td>
                      <td style={td}><span style={{ width:8, height:8, borderRadius:'50%', background:w.is_online?'#10b981':'#cbd5e1', display:'inline-block' }} /></td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          <button onClick={()=>openWorker(w)} style={btnS('#6366f1','sm')}>View</button>
                          {w.kyc_status==='pending' && <>
                            <button onClick={()=>updateKYC(w.id,'approved')} style={btnS('#10b981','sm')}>Approve</button>
                            <button onClick={()=>updateKYC(w.id,'rejected')} style={btnS('#ef4444','sm')}>Reject</button>
                          </>}
                          {(w.account_status||'active')==='active' ? <button onClick={()=>updateStatus(w.id,'suspended')} style={btnS('#f59e0b','sm')}>Suspend</button> : <button onClick={()=>updateStatus(w.id,'active')} style={btnS('#10b981','sm')}>Restore</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No workers found</div>}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal title={`Worker: ${selected.name||'No name'}`} onClose={()=>setSelected(null)} width={750}>
          {/* Contact Info */}
          <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid #bfdbfe' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', marginBottom:8 }}>📞 Contact Information</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Phone',selected.phone],['Email',selected.email],['Alternate Phone',selected.alternate_phone],['Address',selected.address],['City',selected.city],['Working Hours',selected.working_hours_start&&selected.working_hours_end?`${selected.working_hours_start} – ${selected.working_hours_end}`:null]].map(([l,v])=>v?(
                <div key={l} style={{ background:'#fff', borderRadius:7, padding:'8px 12px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{l}</div>
                  <div style={{ fontWeight:600, fontSize:13, color:'#1e293b', marginTop:2 }}>{v}</div>
                </div>
              ):null)}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[['Rating',`${selected.rating||5} / 5`],['Total Jobs',selected.total_jobs||0],['Wallet',INR(selected.wallet_balance)],['Skill',selected.skill],['UPI ID',selected.upi_id||'-'],['Bank',selected.bank_account||'-'],['IFSC',selected.bank_ifsc||'-'],['Aadhaar No.',selected.aadhaar_number||'-'],['PAN No.',selected.pan_number||'-'],['KYC Status',selected.kyc_status||'pending'],['Service Radius',selected.service_radius_km?(selected.service_radius_km+' km'):'-'],['Joined',fmt(selected.created_at)]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div>
                <div style={{ fontWeight:700, fontSize:13 }}>{v||'-'}</div>
              </div>
            ))}
          </div>

          {/* KYC document status */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:6, background:selected.aadhar_verified?'#D1FAE5':'#FEF3C7', color:selected.aadhar_verified?'#065F46':'#92400E' }}>
              Aadhaar: {selected.aadhar_verified?'✓ Verified':selected.aadhar_submitted?'⏳ Submitted':'✗ Not submitted'}
            </span>
            <span style={{ fontSize:12, fontWeight:700, padding:'4px 10px', borderRadius:6, background:selected.pan_verified?'#D1FAE5':'#FEF3C7', color:selected.pan_verified?'#065F46':'#92400E' }}>
              PAN: {selected.pan_verified?'✓ Verified':selected.pan_submitted?'⏳ Submitted':'✗ Not submitted'}
            </span>
          </div>

          {(selected.aadhar_front_url||selected.aadhaar_front_url||selected.pan_front_url||selected.selfie_url) && (
            <div style={{ marginBottom:20 }}>
              <h4 style={{ fontWeight:700, marginBottom:10 }}>KYC Documents</h4>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {[['Aadhaar Front',selected.aadhar_front_url||selected.aadhaar_front_url],['Aadhaar Back',selected.aadhar_back_url||selected.aadhaar_back_url],['PAN Card',selected.pan_front_url],['Selfie',selected.selfie_url]].filte