import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import { exportCSV } from '../lib/export'

const INR = v => '₹' + (v || 0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'
const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

// Escrow = customer money that has been collected & verified but not yet released to the worker.
export default function Escrow({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('held')   // held | released

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await sb.from('bookings')
      .select('id,service,customer_name,worker_id,amount,status,payment_status,payment_verified_at,completed_at,created_at')
      .in('payment_status', ['verified','paid'])
      .order('payment_verified_at', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  const held     = rows.filter(r => r.status !== 'completed')
  const released = rows.filter(r => r.status === 'completed')
  const heldTotal     = held.reduce((a,r)=>a+(r.amount||0),0)
  const releasedTotal = released.reduce((a,r)=>a+(r.amount||0),0)
  const workerShare   = Math.round(heldTotal * 0.9)
  const commission    = heldTotal - workerShare

  const list = tab === 'held' ? held : released

  const cards = [
    ['Funds in Escrow', INR(heldTotal), '#f59e0b', `${held.length} bookings held`],
    ['Worker Share (90%)', INR(workerShare), '#10b981', 'To be released to workers'],
    ['Platform Commission (10%)', INR(commission), '#8b5cf6', 'KaamReady earnings on held funds'],
    ['Released to Date', INR(releasedTotal), '#6366f1', `${released.length} completed`],
  ]

  return (
    <div>
      <TopBar title="Escrow" subtitle="Customer funds collected, held until the job is completed" actions={
        <button onClick={()=>exportCSV(list.map(r=>({Booking:r.id,Service:r.service,Customer:r.customer_name,Amount:r.amount,Status:r.status,Verified:fmt(r.payment_verified_at)})),'escrow')}
          style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Export CSV</button>
      } />
      <div style={{ padding:32 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {cards.map(([l,v,c,sub]) => (
            <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.08)', borderLeft:`4px solid ${c}` }}>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>{v}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8 }}>
            {[['held','In Escrow'],['released','Released']].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{ padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:tab===k?'#6366f1':'#f1f5f9', color:tab===k?'#fff':'#64748b' }}>{l}</button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b', lineHeight:'34px' }}>{list.length} bookings</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Booking','Service','Customer','Amount','Worker Share','Status','Verified'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={{ ...td, fontFamily:'monospace', fontSize:12 }}>#{(r.id||'').slice(0,8).toUpperCase()}</td>
                      <td style={td}>{r.service||'—'}</td>
                      <td style={td}>{r.customer_name||'—'}</td>
                      <td style={td}><span style={{ fontWeight:700 }}>{INR(r.amount)}</span></td>
                      <td style={td}><span style={{ color:'#10b981' }}>{INR(Math.round((r.amount||0)*0.9))}</span></td>
                      <td style={td}><Badge status={r.status||'—'} /></td>
                      <td style={{ ...td, fontSize:12 }}>{fmt(r.payment_verified_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!list.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No bookings in this state</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
