import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Badge from '../components/Badge'
import { exportCSV } from '../lib/export'

const INR = v => '₹' + (v || 0).toLocaleString('en-IN')
const th = { padding:'10px 16px', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }
const td = { padding:'12px 16px', fontSize:14, color:'#1e293b', borderBottom:'1px solid #f1f5f9' }

export default function Wallets({ showToast }) {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ]             = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data } = await sb.from('workers')
      .select('id,name,phone,upi_id,wallet_balance,commission_due,credit_balance,kyc_status')
      .order('wallet_balance', { ascending: false })
    setRows(data || [])
    setLoading(false)
  }

  const filtered = rows.filter(r => !q || (r.name||'').toLowerCase().includes(q.toLowerCase()) || (r.phone||'').includes(q))
  const totWallet = rows.reduce((a,r)=>a+(r.wallet_balance||0),0)
  const totComm   = rows.reduce((a,r)=>a+(r.commission_due||0),0)
  const totCredit = rows.reduce((a,r)=>a+(r.credit_balance||0),0)

  const cards = [
    ['Total Wallet Liability', INR(totWallet), '#10b981', 'Owed to workers (pending payout)'],
    ['Commission Due', INR(totComm), '#f59e0b', 'Platform fees yet to be collected'],
    ['Credit Balance', INR(totCredit), '#6366f1', 'Promotional / referral credits'],
    ['Workers', String(rows.length), '#8b5cf6', 'Total wallets'],
  ]

  return (
    <div>
      <TopBar title="Wallets" subtitle="Worker wallet balances & platform liabilities" actions={
        <button onClick={()=>exportCSV(filtered.map(r=>({Worker:r.name,Phone:r.phone,UPI:r.upi_id,Wallet:r.wallet_balance,CommissionDue:r.commission_due,Credit:r.credit_balance})),'wallets')}
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
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', gap:8, alignItems:'center' }}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search worker by name or phone..."
              style={{ flex:1, maxWidth:320, padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }} />
            <span style={{ marginLeft:'auto', fontSize:13, color:'#64748b' }}>{filtered.length} workers</span>
          </div>
          {loading ? <Loader /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Worker','Phone','UPI ID','Wallet Balance','Commission Due','Credit','KYC'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><span style={{ fontWeight:600 }}>{r.name||'—'}</span></td>
                      <td style={td}>{r.phone||'—'}</td>
                      <td style={td}><span style={{ fontFamily:'monospace', fontSize:12, color:'#6366f1' }}>{r.upi_id||'—'}</span></td>
                      <td style={td}><span style={{ fontWeight:700, color:'#10b981' }}>{INR(r.wallet_balance)}</span></td>
                      <td style={td}>{INR(r.commission_due)}</td>
                      <td style={td}>{INR(r.credit_balance)}</td>
                      <td style={td}><Badge status={r.kyc_status || 'pending'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No workers found</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
