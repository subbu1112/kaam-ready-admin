import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Loader from '../components/Loader'
import Badge from '../components/Badge'

const INR = v => '₹' + (v||0).toLocaleString('en-IN')
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-'
function btnS(bg,size='md') { return { background:bg,color:'#fff',border:'none',borderRadius:size==='sm'?6:8,padding:size==='sm'?'5px 10px':'9px 16px',fontSize:size==='sm'?12:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap' } }

export default function Referrals() {
  const [workers, setWorkers]   = useState([])
  const [refs, setRefs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('leaderboard')
  const [rewardAmt, setRewardAmt] = useState(150)
  const [saving, setSaving]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [w, r] = await Promise.all([
      sb.from('workers').select('id,name,phone,city,referral_code,total_jobs,wallet_balance,credit_balance').order('total_jobs',{ascending:false}),
      sb.from('referral_rewards').select('*,referrer:workers!referrer_id(name,phone),referee:workers!referee_id(name)').order('created_at',{ascending:false}).catch(()=>({ data:[] })),
    ])
    setWorkers(w.data||[])
    setRefs(r.data||[])
    setLoading(false)
  }

  async function generateCode(workerId, name) {
    const code = name.slice(0,3).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase()
    await sb.from('workers').update({ referral_code: code }).eq('id', workerId)
    await load()
  }

  async function markRewardPaid(refId) {
    setSaving(refId)
    await sb.from('referral_rewards').update({ status:'paid', paid_at:new Date().toISOString() }).eq('id',refId)
    setSaving(null)
    await load()
  }

  const totalRewards = refs.filter(r=>r.status==='paid').reduce((a,r)=>a+(r.reward_amount||rewardAmt),0)
  const pendingRewards = refs.filter(r=>r.status==='pending').reduce((a,r)=>a+(r.reward_amount||rewardAmt),0)

  const th = { padding:'10px 16px',textAlign:'left',fontSize:12,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0' }
  const td = { padding:'12px 16px',fontSize:13,color:'#1e293b',borderBottom:'1px solid #f1f5f9' }

  return (
    <div>
      <TopBar title="Refer & Earn" subtitle="Worker referral program — manage codes, rewards, and payouts" />
      <div style={{ padding:32 }}>
        {loading ? <Loader /> : (<>
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
            {[
              ['Total Workers', workers.length, '#6366f1'],
              ['With Referral Code', workers.filter(w=>w.referral_code).length, '#10b981'],
              ['Rewards Paid', INR(totalRewards), '#3b82f6'],
              ['Pending Rewards', INR(pendingRewards), '#f59e0b'],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', borderLeft:`4px solid ${c}` }}>
                <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:6 }}>{l}</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#0f172a' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Config */}
          <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', marginBottom:24, display:'flex', alignItems:'center', gap:16 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Referral Reward Amount</p>
              <p style={{ fontSize:12, color:'#64748b' }}>Amount credited to referrer's wallet when referred worker completes their first job</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto' }}>
              <span style={{ fontSize:16, fontWeight:800, color:'#6366f1' }}>₹</span>
              <input type="number" value={rewardAmt} onChange={e=>setRewardAmt(Number(e.target.value))} min={0} max={1000}
                style={{ width:90, padding:'8px 12px', border:'2px solid #e2e8f0', borderRadius:8, fontSize:15, fontWeight:700, outline:'none', color:'#0f172a', textAlign:'center' }} />
              <button style={btnS('#6366f1')}>Save</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[['leaderboard','🏆 Leaderboard'],['rewards','🎁 Reward Transactions'],['codes','🔑 Manage Codes']].map(([t,l]) => (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:'10px 18px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background:tab===t?'#6366f1':'#fff', color:tab===t?'#fff':'#64748b', boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>{l}</button>
            ))}
          </div>

          {/* Leaderboard */}
          {tab === 'leaderboard' && (
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['#','Name','City','Referral Code','Total Jobs','Wallet','Referred'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {workers.slice(0,50).map((w,i) => {
                    const referredCount = refs.filter(r=>r.referrer?.phone===w.phone||r.referrer_id===w.id).length
                    return (
                      <tr key={w.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={{...td,fontWeight:700,color:'#94a3b8',width:40}}>{i<3?['🥇','🥈','🥉'][i]:i+1}</td>
                        <td style={td}><b>{w.name||'—'}</b><br/><span style={{fontSize:11,color:'#94a3b8'}}>{w.phone}</span></td>
                        <td style={td}>{w.city||'—'}</td>
                        <td style={td}>
                          {w.referral_code
                            ? <code style={{ background:'#eef2ff', color:'#4f46e5', padding:'3px 10px', borderRadius:6, fontSize:13, fontWeight:700 }}>{w.referral_code}</code>
                            : <button onClick={()=>generateCode(w.id,w.name||'WRK')} style={btnS('#10b981','sm')}>Generate</button>}
                        </td>
                        <td style={td}><b>{w.total_jobs||0}</b></td>
                        <td style={td}>{INR(w.wallet_balance||0)}</td>
                        <td style={td}>{referredCount > 0 ? <Badge label={`${referredCount} workers`} color="#8b5cf6" /> : <span style={{color:'#cbd5e1'}}>—</span>}</td>
                      </tr>
                    )
                  })}
                  {workers.length===0 && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>No workers yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Reward Transactions */}
          {tab === 'rewards' && (
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr>{['Referrer','Referred Worker','Date','Reward','Status','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {refs.map(r => (
                    <tr key={r.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <td style={td}><b>{r.referrer?.name||'—'}</b></td>
                      <td style={td}>{r.referee?.name||'—'}</td>
                      <td style={td}>{fmt(r.created_at)}</td>
                      <td style={td}><b>{INR(r.reward_amount||rewardAmt)}</b></td>
                      <td style={td}><Badge label={r.status||'pending'} color={r.status==='paid'?'#10b981':r.status==='approved'?'#6366f1':'#f59e0b'} /></td>
                      <td style={td}>
                        {r.status !== 'paid' && (
                          <button onClick={()=>markRewardPaid(r.id)} disabled={saving===r.id} style={btnS('#10b981','sm')}>{saving===r.id?'...':'Mark Paid'}</button>
                        )}
                        {r.status === 'paid' && <span style={{color:'#10b981',fontSize:12,fontWeight:700}}>✓ Paid {fmt(r.paid_at)}</span>}
                      </td>
                    </tr>
                  ))}
                  {refs.length===0 && <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>No referral transactions yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Manage Codes */}
          {tab === 'codes' && (
            <div>
              <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', marginBottom:16, padding:'16px 20px' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:6 }}>How Referral Codes Work</p>
                <ol style={{ fontSize:13, color:'#64748b', lineHeight:2, paddingLeft:20 }}>
                  <li>Worker shares their unique referral code with another person</li>
                  <li>New worker enters the code during onboarding</li>
                  <li>When the new worker completes their first job, the referrer earns <b style={{color:'#6366f1'}}>{INR(rewardAmt)}</b> wallet credit</li>
                  <li>Admin approves and marks payout in the Reward Transactions tab</li>
                </ol>
              </div>
              <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.08)', overflow:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>{['Worker','Phone','City','Code','Action'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {workers.filter(w=>!w.referral_code).slice(0,100).map(w => (
                      <tr key={w.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={td}><b>{w.name||'—'}</b></td>
                        <td style={td}>{w.phone}</td>
                        <td style={td}>{w.city||'—'}</td>
                        <td style={td}><span style={{color:'#cbd5e1',fontSize:13}}>No code yet</span></td>
                        <td style={td}><button onClick={()=>generateCode(w.id,w.name||'WRK')} style={btnS('#6366f1','sm')}>Generate Code</button></td>
                      </tr>
                    ))}
                    {workers.filter(w=>w.referral_code).map(w => (
                      <tr key={w.id} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <td style={td}><b>{w.name||'—'}</b></td>
                        <td style={td}>{w.phone}</td>
                        <td style={td}>{w.city||'—'}</td>
                        <td style={td}><code style={{background:'#eef2ff',color:'#4f46e5',padding:'3px 10px',borderRadius:6,fontSize:13,fontWeight:700}}>{w.referral_code}</code></td>
                        <td style={td}><button onClick={()=>generateCode(w.id,w.name||'WRK')} style={btnS('#94a3b8','sm')}>Regenerate</button></td>
                      </tr>
                    ))}
                    {workers.length===0 && <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No workers found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
