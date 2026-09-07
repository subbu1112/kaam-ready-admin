import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import TopBar from '../components/TopBar'
import Badge from '../components/Badge'
import Loader from '../components/Loader'
import { exportCSV } from '../lib/export'

/*
 * Account & data deletion requests (public.deletion_requests).
 *
 * Both apps write here when someone taps "Delete my account", but until now
 * nothing in the admin panel read the table, so the requests piled up unseen.
 * The DPDP Act puts a statutory clock on these, so the list leads with how long
 * each one has been waiting.
 *
 * Deleting the account itself stays a deliberate manual step — this page never
 * destroys data. It shows who asked, gives you their contact details, and lets
 * you record that you have dealt with it.
 */

const fmt = d => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const daysWaiting = d => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0)

const OPEN = s => !['completed', 'done', 'rejected'].includes(String(s || 'pending').toLowerCase())

function btn(bg, size = 'md') {
  return {
    background: bg, color: '#fff', border: 'none',
    borderRadius: size === 'sm' ? 6 : 8,
    padding: size === 'sm' ? '5px 10px' : '9px 16px',
    fontSize: size === 'sm' ? 12 : 13, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  }
}

export default function DeletionRequests({ showToast }) {
  const [rows, setRows]       = useState([])
  const [people, setPeople]   = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('open')
  const [busy, setBusy]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await sb.from('deletion_requests')
      .select('*').order('requested_at', { ascending: true })   // oldest first: they are the overdue ones
    if (error) { showToast && showToast(error.message); setLoading(false); return }
    const list = data || []
    setRows(list)

    // Names/contacts live in profiles and workers, not on the request itself.
    const ids = [...new Set(list.map(r => r.user_id).filter(Boolean))]
    if (ids.length) {
      const [{ data: profs }, { data: works }] = await Promise.all([
        sb.from('profiles').select('id,name,full_name,email,phone').in('id', ids),
        sb.from('workers').select('id,name,phone').in('id', ids),
      ])
      const map = {}
      ;(profs || []).forEach(p => { map[p.id] = { name: p.full_name || p.name, email: p.email, phone: p.phone } })
      ;(works || []).forEach(w => { map[w.id] = { ...(map[w.id] || {}), name: map[w.id]?.name || w.name, phone: map[w.id]?.phone || w.phone } })
      setPeople(map)
    }
    setLoading(false)
  }

  async function setStatus(row, status) {
    const label = status === 'completed' ? 'completed' : 'rejected'
    if (!confirm(`Mark this request ${label}?\n\nThis only records your decision — it does not delete any data.`)) return
    setBusy(row.id)
    const patch = { status }
    if (status === 'completed') patch.completed_at = new Date().toISOString()
    const { error } = await sb.from('deletion_requests').update(patch).eq('id', row.id)
    setBusy(null)
    if (error) { showToast && showToast(error.message); return }
    showToast && showToast(`Request marked ${label}`)
    load()
  }

  const shown = rows.filter(r => filter === 'all' || (filter === 'open' ? OPEN(r.status) : !OPEN(r.status)))
  const openCount = rows.filter(r => OPEN(r.status)).length
  const overdue   = rows.filter(r => OPEN(r.status) && daysWaiting(r.requested_at) >= 30).length

  return (
    <>
      <TopBar
        title="Deletion requests"
        subtitle={`${openCount} open${overdue ? ` · ${overdue} past 30 days` : ''}`}
        actions={
          <button style={btn('#334155')} onClick={() => exportCSV('deletion-requests', shown)}>
            Export CSV
          </button>
        }
      />

      <div style={{ padding: 20 }}>
        {overdue > 0 && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
            padding: '12px 14px', marginBottom: 16, color: '#991B1B', fontSize: 13, lineHeight: 1.55,
          }}>
            <strong>{overdue} request{overdue !== 1 ? 's have' : ' has'} been waiting more than 30 days.</strong>{' '}
            The DPDP Act expects these to be actioned within statutory timelines.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[['open', `Open (${openCount})`], ['closed', 'Closed'], ['all', 'All']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              ...btn(filter === id ? '#0F172A' : '#E2E8F0', 'sm'),
              color: filter === id ? '#fff' : '#334155', padding: '7px 14px', fontSize: 13,
            }}>{label}</button>
          ))}
        </div>

        {loading && <Loader />}

        {!loading && shown.length === 0 && (
          <p style={{ color: '#64748B', fontSize: 14, padding: '28px 0', textAlign: 'center' }}>
            Nothing here.
          </p>
        )}

        {!loading && shown.map(r => {
          const who = people[r.user_id] || {}
          const days = daysWaiting(r.requested_at)
          const open = OPEN(r.status)
          return (
            <div key={r.id} style={{
              background: '#fff', border: '1px solid ' + (open && days >= 30 ? '#FECACA' : '#E2E8F0'),
              borderRadius: 12, padding: 16, marginBottom: 10,
              display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 15 }}>{who.name || 'Unknown user'}</strong>
                  <Badge>{r.role || 'user'}</Badge>
                  {open
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: days >= 30 ? '#B91C1C' : '#B45309' }}>
                        waiting {days} day{days !== 1 ? 's' : ''}
                      </span>
                    : <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>
                        {String(r.status).toLowerCase()}
                      </span>}
                </div>
                <p style={{ fontSize: 13, color: '#475569' }}>
                  {who.email || '—'}{who.phone ? ` · ${who.phone}` : ''}
                </p>
                {r.reason && (
                  <p style={{ fontSize: 13, color: '#334155', marginTop: 6 }}>
                    Reason: {r.reason}
                  </p>
                )}
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                  Requested {fmt(r.requested_at)}
                  {r.completed_at ? ` · closed ${fmt(r.completed_at)}` : ''}
                </p>
              </div>

              {open && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={busy === r.id} style={btn('#16A34A', 'sm')}
                    onClick={() => setStatus(r, 'completed')}>Mark completed</button>
                  <button disabled={busy === r.id} style={btn('#64748B', 'sm')}
                    onClick={() => setStatus(r, 'rejected')}>Reject</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
