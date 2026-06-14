import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { exportCSV, exportExcel } from '../lib/export'

const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'
const INR = v => 'Rs.' + (v||0).toLocaleString('en-IN')
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Payouts() {
  const [payouts, setPayouts] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newPayout, setNewPayout] = useState({ worker_id:'', amount:'', notes:'', utr:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [p, w] = await Promise.all([
      sb.from('payouts').select('*, workers(name,phone,upi_id)').order('created_at',{ascending:false}),
      sb.from('workers').select('id,name,phone,upi_id,wallet_balance').order('name'),
    ])
    setPayouts(p.data||[])
    setWorkers(w.data||[])
    setLoading(false)
  }

  async function updatePayout(id, status, extra={}) {
    setSaving(true)
    await sb.from('payouts').update({ status, paid_at: status==='paid'?new Date().toISOString():null, ...extra }).eq('id',id)
    await load()
    setSaving(false)
    setSelected(s=>s?{...s,status}:null)
  }

  async function createPayout() {
    if (!newPayout.worker_id||!newPayout.amount) return
    setSaving(true)
    const amt = parseInt(newPayout.amount)
    const commission = Math.round(amt*0.1)
    await sb.from('payouts').insert({ worker_id:newPayout.worker_id, amount:amt, gross_amount:Math.round(amt/0.9), commission_amount:commission, notes:newPayout.notes, status:'pending', week_start: new Date().toISOString().slice(0,10) })
    setNewPayout({ worker_id:'', amount:'', notes:'', utr:'' })
    setShowCreate(false)
    await load()
    setSaving(false)
  }

  const filtered = payouts.filter(p => filter==='all'||p.status===filter)
  const pendingAmt = payouts.filter(p=>p.status==='pending').reduce((a,p)=>a+(p.amount||0),0)
  const releasedAmt = payouts.filter(p=>p.status==='paid').reduce((a,p)=>a+(p.amount||0),0)
  const failedAmt = payouts.filter(p=>p.status==='failed').reduce((a,p)=>a+(p.amount||0),0)
  const totalCommission = payouts.reduce((a,p)=>a+(p.commission_amount||0),0)

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:14,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }
  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', marginBottom:12 }

  return (
    <div>
      <TopBar title="Payout Management" subtitle="Weekly worker payout control center" actions={
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>exportCSV(filtered.map(p=>({Worker:p.workers?.name,Amount:p.amount,Status:p.status,UTR:p.utr,Date:fmt(p.created_at)})),'payouts')} style={btnS('#10b981')}>CSV</button>
          <button onClick={()=>exportExcel(filtered.map(p=>({Worker:p.workers?.name,Amount:p.amount,Status:p.status,UTR:p.utr,Date:fmt(p.created_at)})),'payouts','Payouts')} style={btnS('#3b82f6')}>Excel</button>
          <button onClick={()=>setShowCreate(true)} style={btnS('#6366f1')}>+ Create Payout</button>
        </div>
      } />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[['Pending Payouts',INR(pendingAmt),'#f59e0b'],['Released Payouts',INR(releasedAmt),'#10b981'],['Failed Payouts',INR(failedAmt),'#ef4444'],['Commission Earned',INR(totalCommission),'#8b5cf6']].map(([l,v,c])=>(
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8 }}>
            {['all','pending','paid','failed'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:filter===f?'#6366f1':'#f1f5f9', color:filter===f?'#fff':'#64748b', textTransform:'capitalize' }}>{f}</button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', lineHeight:'34px' }}>{filtered.length} payouts</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>{['Worker','Phone','UPI','Amount','Commission','Status','UTR','Date','Actions'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(p=>(
                    <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><div style={{ fontWeight:600 }}>{p.workers?.name||'-'}</div></td>
                      <td style={td}>{p.workers?.phone||'-'}</td>
                      <td style={td}><span style={{ fontSize:12, fontFamily:'monospace' }}>{p.workers?.upi_id||'-'}</span></td>
                      <td style={td}><span style={{ fontWeight:700, color:'#10b981' }}>{INR(p.amount)}</span></td>
                      <td style={td}>{INR(p.commission_amount||0)}</td>
                      <td style={td}><Badge status={p.status||'pending'} /></td>
                      <td style={td}><span style={{ fontSize:12, fontFamily:'monospace' }}>{p.utr||'-'}</span></td>
                      <td style={td} style={{ ...td, fontSize:12 }}>{fmt(p.created_at)}</td>
                      <td style={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>setSelected(p)} style={btnS('#6366f1','sm')}>View</button>
                          {p.status==='pending' && <>
                            <button onClick={()=>updatePayout(p.id,'paid')} style={btnS('#10b981','sm')}>Release</button>
                            <button onClick={()=>updatePayout(p.id,'failed')} style={btnS('#ef4444','sm')}>Fail</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No payouts found</div>}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <Modal title="Payout Details" onClose={()=>setSelected(null)} width={540}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['Worker',selected.workers?.name],['Phone',selected.workers?.phone],['UPI ID',selected.workers?.upi_id],['Payout Amount',INR(selected.amount)],['Commission',INR(selected.commission_amount||0)],['Status',<Badge status={selected.status||'pending'} />],['UTR',selected.utr||'Not provided'],['Notes',selected.notes||'-'],['Created',fmt(selected.created_at)],['Paid At',fmt(selected.paid_at)]].map(([l,v])=>(
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:3 }}>{l}</div>
                <div style={{ fontWeight:600, fontSize:13 }}>{v||'-'}</div>
              </div>
            ))}
          </div>
          {selected.status==='pending' && (
            <div style={{ marginBottom:16 }}>
              <input placeholder="Enter UTR number after transfer..." style={inp} onChange={e=>selected._utr=e.target.value} />
            </div>
          )}
          <div style={{ display:'flex', gap:8 }}>
            {selected.status==='pending' && <>
              <button disabled={saving} onClick={()=>updatePayout(selected.id,'paid',{utr:selected._utr||''})} style={btnS('#10b981')}>Mark Released</button>
              <button disabled={saving} onClick={()=>updatePayout(selected.id,'failed')} style={btnS('#ef4444')}>Mark Failed</button>
            </>}
          </div>
        </Modal>
      )}
      {showCreate && (
        <Modal title="Create New Payout" onClose={()=>setShowCreate(false)} width={480}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Worker</label>
            <select style={inp} value={newPayout.worker_id} onChange={e=>setNewPayout(p=>({...p,worker_id:e.target.value}))}>
              <option value="">Select worker...</option>
              {workers.map(w=><option key={w.id} value={w.id}>{w.name} — {w.upi_id||'No UPI'} ({w.phone})</option>)}
            </select>
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Payout Amount (Rs.)</label>
            <input style={inp} type="number" placeholder="Enter amount..." value={newPayout.amount} onChange={e=>setNewPayout(p=>({...p,amount:e.target.value}))} />
            <label style={{ fontSize:13, fontWeight:600, display:'block', marginBottom:6 }}>Notes (optional)</label>
            <input style={inp} placeholder="Week of, special note..." value={newPayout.notes} onChange={e=>setNewPayout(p=>({...p,notes:e.target.value}))} />
            {newPayout.amount && <div style={{ padding:'10px 14px', background:'#f0fdf4', borderRadius:8, marginBottom:12, fontSize:13 }}>
              <b>Worker receives:</b> {INR(Math.round(parseFloat(newPayout.amount||0)))} &nbsp;|&nbsp; <b>Commission (10%):</b> {INR(Math.round(parseFloat(newPayout.amount||0)*0.1/0.9))}
            </div>}
            <button disabled={saving} onClick={createPayout} style={{...btnS('#6366f1'),width:'100%',padding:'12px'}}>Create Payout</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
