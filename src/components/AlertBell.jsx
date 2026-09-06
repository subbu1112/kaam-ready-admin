import { useEffect, useRef, useState } from 'react'
import { sb } from '../lib/supabase'

/*
 * Admin alert bell.
 *
 * Database triggers write role='admin' rows into `notifications` whenever a
 * booking is created, a payment moves to pending_verification, a worker signs
 * up, or a worker submits KYC documents. This subscribes to that table over
 * Supabase Realtime, so an alert appears the moment it happens rather than on
 * the next refresh, and raises a desktop notification when the tab is in the
 * background.
 */

const KIND = {
  new_booking:    { ico: '≡', page: 'bookings',  tint: '#3B82F6', label: 'Booking'  },
  payment_review: { ico: '✦', page: 'payments',  tint: '#EF4444', label: 'Payment'  },
  new_worker:     { ico: '◈', page: 'workers',   tint: '#22C55E', label: 'Worker'   },
  kyc_review:     { ico: '✓', page: 'approvals', tint: '#F59E0B', label: 'Approval' },
}
const fallback = { ico: '•', page: 'dashboard', tint: '#94A3B8', label: 'Alert' }
const kindOf = t => KIND[t] || fallback

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function AlertBell({ setPage, narrow }) {
  const [items, setItems] = useState([])
  const [open, setOpen]   = useState(false)
  const [desktop, setDesktop] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  )
  const panelRef = useRef(null)
  const btnRef   = useRef(null)

  const unread = items.filter(n => !n.read).length

  async function load() {
    const { data } = await sb
      .from('notifications')
      .select('id,title,body,type,read,booking_id,created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
      .limit(30)
    setItems(data || [])
  }

  useEffect(() => { load() }, [])

  // Live feed. Realtime respects RLS, so a non-admin session receives nothing.
  useEffect(() => {
    const ch = sb
      .channel('admin-alerts')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'role=eq.admin' },
        ({ new: row }) => {
          setItems(prev => (prev.some(p => p.id === row.id) ? prev : [row, ...prev].slice(0, 30)))
          try {
            if (typeof Notification !== 'undefined' &&
                Notification.permission === 'granted' &&
                document.visibilityState !== 'visible') {
              new Notification(row.title, { body: row.body, icon: '/icon-192.png', tag: row.id })
            }
          } catch { /* notifications blocked — the badge still updates */ }
        })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    await sb.rpc('admin_mark_alerts_read', { p_ids: null })
  }

  async function openItem(n) {
    setOpen(false)
    setPage(kindOf(n.type).page)
    if (!n.read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)))
      await sb.rpc('admin_mark_alerts_read', { p_ids: [n.id] })
    }
  }

  async function askDesktop() {
    try {
      const p = await Notification.requestPermission()
      setDesktop(p)
    } catch { setDesktop('denied') }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-label={unread ? `${unread} unread alerts` : 'Alerts'}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          background: open ? 'rgba(255,215,0,.14)' : 'rgba(255,255,255,.06)',
          border: '1px solid ' + (open ? 'rgba(255,215,0,.35)' : '#262626'),
          color: '#fff', fontSize: 16, lineHeight: 1, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18,
            padding: '0 5px', borderRadius: 9, background: '#EF4444', color: '#fff',
            fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '2px solid #141414',
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} style={{
          position: 'absolute', top: 46, right: 0,
          width: narrow ? 'min(340px, calc(100vw - 28px))' : 380,
          maxHeight: 460, overflowY: 'auto',
          background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
          boxShadow: '0 20px 50px rgba(15,23,42,.28)', zIndex: 300, color: '#0F172A',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', borderBottom: '1px solid #EEF2F6',
            position: 'sticky', top: 0, background: '#fff', borderRadius: '14px 14px 0 0',
          }}>
            <strong style={{ fontSize: 14 }}>Alerts</strong>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 12, fontWeight: 700, color: '#B8900A', fontFamily: 'inherit',
              }}>Mark all read</button>
            )}
          </div>

          {desktop === 'default' && (
            <button onClick={askDesktop} style={{
              width: '100%', textAlign: 'left', padding: '10px 16px', cursor: 'pointer',
              background: '#FFFBEB', border: 'none', borderBottom: '1px solid #FDE68A',
              fontSize: 12, color: '#92400E', fontFamily: 'inherit',
            }}>
              Turn on desktop alerts so new bookings reach you while this tab is in the background →
            </button>
          )}

          {items.length === 0 && (
            <p style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
              Nothing yet. New bookings, workers and payments will show up here.
            </p>
          )}

          {items.map(n => {
            const k = kindOf(n.type)
            return (
              <button key={n.id} onClick={() => openItem(n)} style={{
                width: '100%', display: 'flex', gap: 11, alignItems: 'flex-start',
                padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                background: n.read ? '#fff' : '#F8FAFF',
                border: 'none', borderBottom: '1px solid #F1F5F9', fontFamily: 'inherit',
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: k.tint + '1A', color: k.tint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                }}>{k.ico}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{
                    display: 'block', fontSize: 13, fontWeight: n.read ? 600 : 800,
                    color: '#0F172A', marginBottom: 2,
                  }}>{n.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
                    {n.body}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {k.label} · {ago(n.created_at)}
                  </span>
                </span>
                {!n.read && (
                  <span style={{
                    width: 8, height: 8, borderRadius: 4, background: '#EF4444',
                    flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
