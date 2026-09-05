import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { WORKER_DOCS, PAN_DOC, docSubmitted, allDocsSubmitted, resolveDocUrl, KYC_LABEL, KYC_TONE } from '../lib/kycDocs'

const C = { primary:'#6366F1', success:'#10B981', danger:'#EF4444', warning:'#F59E0B', border:'#E2E8F0', card:'#FFFFFF', muted:'#64748B', text:'#0F172A', bg:'#F0F4FF' }
const fmt = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

// Worker verification queue.
//
// Each worker must submit Aadhaar front, Aadhaar back and a selfie video. The
// admin views all three, then approves, rejects with a reason, or asks for a
// resubmission. Nobody is marked verified until an admin acts here.
const QUEUE_FILTERS = [
  ['submitted',         'Awaiting review'],
  ['pending',           'Incomplete'],
  ['resubmit_required', 'Resubmission asked'],
  ['rejected',          'Rejected'],
  ['approved',          'Approved'],
]

export default function Approvals({ user, showToast }) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [queue,   setQueue]   = useState('submitted')
  const [cat,     setCat]     = useState('all')
  const [saving,  setSaving]  = useState(null)
  const [preview, setPreview] = useState(null)   // { url, kind, label }
  const [decide,  setDecide]  = useState(null)   // { worker, decision }
  const [reason,  setReason]  = useState('')

  useEffect(() => { load() }, [queue])

  async function load() {
    setLoading(true)
    let q = sb.from('workers').select('*').order('verification_submitted_at', { ascending: true, nullsFirst: false })
    if (queue === 'pending') {
      // "Incomplete" also has to catch the rows written before kyc_status
      // gained a 'submitted' value, which sat at 'pending' with documents.
      q = q.in('kyc_status', ['pending'])
    } else {
      q = q.eq('kyc_status', queue)
    }
    const { data, error } = await q
    if (error) showToast?.('Could not load: ' + error.message, 'error')
    setWorkers(data || [])
    setLoading(false)
  }

  async function openDoc(worker, doc) {
    const url = await resolveDocUrl(worker, doc)
    if (!url) { showToast?.('That document is not available', 'error'); return }
    setPreview({ url, kind: doc.kind, label: doc.label, worker: worker.name })
  }

  async function submitDecision() {
    const { worker, decision } = decide || {}
    if (!worker) return
    if (decision !== 'approved' && !reason.trim()) {
      showToast?.('Please give the worker a reason', 'error'); return
    }
    setSaving(worker.id)
    const { error } = await sb.rpc('admin_review_worker_kyc', {
      p_worker_id: worker.id,
      p_decision: decision,
      p_reason: decision === 'approved' ? null : reason.trim(),
    })
    setSaving(null)
    if (error) { showToast?.(error.message.replace(/^.*?:\s*/, ''), 'error'); return }
    setDecide(null); setReason('')
    setWorkers(list => list.filter(x => x.id !== worker.id))
    showToast?.(
      `${worker.name || 'Worker'} ${decision === 'approved' ? 'approved ✓' : decision === 'rejected' ? 'rejected' : 'asked to resubmit'}`,
      decision === 'approved' ? 'success' : 'error')
  }

  const cats = ['all', ...Array.from(new Set(workers.map(w => w.skill).filter(Boolean)))]
  const list = cat === 'all' ? workers : workers.filter(w => w.skill === cat)

  const field = (label, value) => value ? (
    <div style={{ background:C.bg, borderRadius:8, padding:'7px 11px' }}>
      <p style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:.3 }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:600, color:C.text, wordBreak:'break-word' }}>{value}</p>
    </div>
  ) : null

  return (
    <div>
      <div style={{ background:C.card, borderRadius:16, padding:'18px 24px', marginBottom:16, border:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:C.text }}>Worker Verification</h2>
          <p style={{ fontSize:13, color:C.muted }}>
            {workers.length} worker{workers.length!==1?'s':''} · {QUEUE_FILTERS.find(q=>q[0]===queue)?.[1]}
          </p>
        </div>
        <button onClick={load} style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:'8px 16px', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', color:C.text }}>↺ Refresh</button>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {QUEUE_FILTERS.map(([f,l]) => (
          <button key={f} onClick={()=>{ setQueue(f); setCat('all') }}
            style={{ padding:'8px 15px', borderRadius:9, cursor:'pointer', fontSize:12.5, fontWeight:700, fontFamily:'inherit',
              background: queue===f ? C.primary : C.card, color: queue===f ? '#fff' : C.muted,
              border: queue===f ? 'none' : '1px solid '+C.border }}>
            {l}
          </button>
        ))}
      </div>

      {cats.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {cats.map(f => (
            <button key={f} onClick={()=>setCat(f)}
              style={{ padding:'6px 13px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', textTransform:'capitalize',
                background: cat===f ? C.text : C.card, color: cat===f ? '#fff' : C.muted,
                border: cat===f ? 'none' : '1px solid '+C.border }}>
              {f}{f!=='all' && ` (${workers.filter(w=>w.skill===f).length})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:48, textAlign:'center', color:C.muted }}>Loading…</div>
      ) : list.length === 0 ? (
        <div style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:56, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <p style={{ fontWeight:700, color:C.text }}>Nothing here</p>
          <p style={{ fontSize:13, color:C.muted }}>No workers in this queue right now.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', gap:16 }}>
          {list.map(w => {
            const [bg, fg] = KYC_TONE[w.kyc_status] || KYC_TONE.pending
            const complete = allDocsSubmitted(w)
            return (
              <div key={w.id} style={{ background:C.card, borderRadius:16, border:'1px solid '+C.border, padding:18, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <p style={{ fontWeight:800, fontSize:15, color:C.text }}>{w.name || 'Unnamed worker'}</p>
                    <p style={{ fontSize:11, color:C.muted }}>
                      Applied {fmt(w.created_at)}
                      {w.verification_submitted_at ? ` · submitted ${fmt(w.verification_submitted_at)}` : ''}
                    </p>
                  </div>
                  <span style={{ background:bg, color:fg, fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
                    {KYC_LABEL[w.kyc_status] || w.kyc_status || 'pending'}
                  </span>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {field('Trade', w.skill)}
                  {field('Phone', w.phone)}
                  {field('City', w.city)}
                  {field('Email', w.email)}
                  {field('UPI ID', w.upi_id)}
                  {field('Aadhaar (last 4)', w.aadhaar_number)}
                </div>

                {/* Per-document checklist — the exact thing the admin signs off */}
                <div>
                  <p style={{ fontSize:11, color:C.muted, fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:.3 }}>
                    Verification documents
                  </p>
                  {WORKER_DOCS.map(doc => {
                    const ok = docSubmitted(w, doc)
                    return (
                      <div key={doc.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop:'1px solid '+C.border }}>
                        <span style={{ width:22, height:22, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                          background: ok ? '#D1FAE5' : '#FEE2E2', color: ok ? '#065F46' : '#991B1B', fontSize:12, fontWeight:900 }}>
                          {ok ? '✓' : '✕'}
                        </span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:C.text }}>{doc.label}</p>
                          <p style={{ fontSize:11, color: ok ? C.muted : '#991B1B' }}>
                            {ok ? 'Submitted' + (w[doc.atCol] ? ' · ' + fmt(w[doc.atCol]) : '') : 'Not Submitted'}
                          </p>
                        </div>
                        {ok && (
                          <button onClick={() => openDoc(w, doc)}
                            style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 12px',
                              fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.primary, flexShrink:0 }}>
                            {doc.kind === 'video' ? '▶ Play' : '🔍 View'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {w.pan_front_url && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop:'1px solid '+C.border }}>
                      <span style={{ width:22, height:22, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                        background:'#E0E7FF', color:C.primary, fontSize:12, fontWeight:900 }}>i</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:C.text }}>PAN (optional)</p>
                        <p style={{ fontSize:11, color:C.muted }}>Submitted</p>
                      </div>
                      <button onClick={() => openDoc(w, PAN_DOC)}
                        style={{ background:C.bg, border:'1px solid '+C.border, borderRadius:8, padding:'6px 12px',
                          fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:C.primary }}>🔍 View</button>
                    </div>
                  )}
                </div>

                {w.kyc_rejection_reason && (
                  <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'9px 12px' }}>
                    <p style={{ fontSize:11, fontWeight:800, color:'#991B1B', marginBottom:2 }}>Last decision</p>
                    <p style={{ fontSize:12.5, color:C.text }}>{w.kyc_rejection_reason}</p>
                    {w.kyc_reviewed_at && <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>{fmt(w.kyc_reviewed_at)}{w.kyc_reviewed_by ? ' · ' + w.kyc_reviewed_by : ''}</p>}
                  </div>
                )}

                {!complete && (
                  <p style={{ fontSize:12, color:'#92400E', background:'#FEF3C7', borderRadius:9, padding:'8px 11px' }}>
                    ⚠️ Not all three documents are in — approving now would mark this worker verified
                    without a full identity check.
                  </p>
                )}

                <div style={{ display:'flex', gap:8, marginTop:'auto', flexWrap:'wrap' }}>
                  {w.kyc_status !== 'approved' && (
                    <button onClick={()=>{ setDecide({ worker:w, decision:'approved' }); setReason('') }} disabled={saving===w.id}
                      style={{ flex:'1 1 100px', background:C.success, color:'#fff', border:'none', borderRadius:10, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:saving===w.id?.6:1 }}>✓ Approve</button>
                  )}
                  <button onClick={()=>{ setDecide({ worker:w, decision:'resubmit_required' }); setReason('') }} disabled={saving===w.id}
                    style={{ flex:'1 1 100px', background:'#fff', color:C.warning, border:'1.5px solid '+C.warning, borderRadius:10, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:saving===w.id?.6:1 }}>↻ Resubmit</button>
                  <button onClick={()=>{ setDecide({ worker:w, decision:'rejected' }); setReason('') }} disabled={saving===w.id}
                    style={{ flex:'1 1 100px', background:'#fff', color:C.danger, border:'1.5px solid '+C.danger, borderRadius:10, padding:'11px', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:saving===w.id?.6:1 }}>✕ Reject</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document viewer */}
      {preview && (
        <div onClick={()=>setPreview(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
          <p style={{ color:'#fff', fontWeight:700, marginBottom:12 }}>{preview.label} — {preview.worker}</p>
          <div onClick={e=>e.stopPropagation()} style={{ maxWidth:'100%', maxHeight:'80vh' }}>
            {preview.kind === 'video'
              ? <video src={preview.url} controls autoPlay playsInline style={{ maxWidth:'100%', maxHeight:'80vh', borderRadius:12, background:'#000' }} />
              : <img src={preview.url} alt={preview.label} style={{ maxWidth:'100%', maxHeight:'80vh', borderRadius:12, objectFit:'contain' }} />}
          </div>
          <button onClick={()=>setPreview(null)}
            style={{ marginTop:16, background:'#fff', border:'none', borderRadius:10, padding:'9px 20px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Close</button>
        </div>
      )}

      {/* Decision confirmation */}
      {decide && (
        <div onClick={()=>setDecide(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:18, padding:24, width:'100%', maxWidth:460 }}>
            <h3 style={{ fontWeight:800, fontSize:17, marginBottom:6 }}>
              {decide.decision === 'approved' ? 'Approve this worker?'
                : decide.decision === 'rejected' ? 'Reject this worker?'
                : 'Ask for a resubmission?'}
            </h3>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>
              {decide.worker.name || 'This worker'} · {decide.worker.phone || 'no phone'}
              {decide.decision === 'approved'
                ? ' — they will be able to receive and accept jobs immediately.'
                : ' — they are told your reason in the app and can upload again.'}
            </p>
            {decide.decision !== 'approved' && (
              <textarea value={reason} onChange={e=>setReason(e.target.value.slice(0,400))} rows={3} autoFocus
                placeholder={decide.decision === 'rejected'
                  ? 'e.g. Aadhaar photo is blurred and the name does not match the selfie video'
                  : 'e.g. Please re-record the selfie video in better light'}
                style={{ width:'100%', border:'1.5px solid '+C.border, borderRadius:10, padding:12, fontSize:14,
                  outline:'none', fontFamily:'inherit', resize:'none', marginBottom:16, boxSizing:'border-box' }} />
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>{ setDecide(null); setReason('') }}
                style={{ flex:1, background:C.bg, border:'1px solid '+C.border, borderRadius:10, padding:12, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
              <button onClick={submitDecision} disabled={!!saving}
                style={{ flex:1, background: decide.decision === 'approved' ? C.success : C.danger, color:'#fff',
                  border:'none', borderRadius:10, padding:12, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', opacity:saving?.6:1 }}>
                {saving ? 'Saving…' : decide.decision === 'approved' ? 'Approve' : decide.decision === 'rejected' ? 'Reject' : 'Request resubmission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
