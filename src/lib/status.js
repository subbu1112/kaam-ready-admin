// ─────────────────────────────────────────────────────────────────────────
// KaamReady — canonical booking status vocabulary.
//
// One source of truth shared verbatim by the customer, worker and admin apps
// so a booking never reads as one thing on one screen and another elsewhere.
// The keys are the values actually stored in bookings.status; the labels are
// the product vocabulary. Legacy values ('cancelled') stay mapped so the 156
// bookings that predate this update still render correctly.
// ─────────────────────────────────────────────────────────────────────────

export const BOOKING_STATUS = {
  searching:          { label: 'Pending',              tone: 'amber',  ico: '🔍' },
  worker_notified:    { label: 'Worker Notified',      tone: 'amber',  ico: '📣' },
  scheduled:          { label: 'Scheduled',            tone: 'purple', ico: '📅' },
  accepted:           { label: 'Accepted',             tone: 'blue',   ico: '👷' },
  assigned:           { label: 'Confirmed',            tone: 'blue',   ico: '✅' },
  arrived:            { label: 'Worker Arrived',       tone: 'blue',   ico: '📍' },
  otp_verified:       { label: 'In Progress',          tone: 'blue',   ico: '🔧' },
  priced:             { label: 'Awaiting Payment',     tone: 'amber',  ico: '💳' },
  completed:          { label: 'Completed',            tone: 'green',  ico: '✓'  },
  paid:               { label: 'Completed',            tone: 'green',  ico: '✓'  },
  customer_cancelled: { label: 'Cancelled by Customer',tone: 'red',    ico: '✕'  },
  worker_cancelled:   { label: 'Cancelled by Worker',  tone: 'red',    ico: '✕'  },
  rejected:           { label: 'Rejected',             tone: 'red',    ico: '⛔' },
  expired:            { label: 'Expired',              tone: 'grey',   ico: '⏱'  },
  cancelled:          { label: 'Cancelled',            tone: 'red',    ico: '✕'  },
}

// Payment state outranks booking state while money is in flight.
export const PAYMENT_STATUS = {
  pending_verification: { label: 'Verifying Payment', tone: 'blue',  ico: '🔍' },
  verified:             { label: 'Paid',              tone: 'green', ico: '✓'  },
  paid:                 { label: 'Paid',              tone: 'green', ico: '✓'  },
  refunded:             { label: 'Refunded',          tone: 'purple',ico: '↩'  },
  rejected:             { label: 'Payment Rejected',  tone: 'red',   ico: '✕'  },
}

export const TONES = {
  amber:  { bg: '#FEF3C7', fg: '#92400E' },
  blue:   { bg: '#DBEAFE', fg: '#1E40AF' },
  green:  { bg: '#D1FAE5', fg: '#065F46' },
  red:    { bg: '#FEE2E2', fg: '#991B1B' },
  purple: { bg: '#EDE9FE', fg: '#5B21B6' },
  grey:   { bg: '#F1F5F9', fg: '#475569' },
}

// Statuses where the booking is still live and the customer may cancel it.
export const OPEN_STATUSES = ['searching', 'scheduled', 'assigned', 'accepted', 'arrived', 'otp_verified', 'priced']
export const CLOSED_STATUSES = ['completed', 'paid', 'cancelled', 'customer_cancelled', 'worker_cancelled', 'rejected', 'expired']

// Derive what a booking should read as right now, taking payment state and the
// "worker notified but nobody accepted yet" nuance into account.
export function statusOf(b) {
  if (!b) return { key: 'searching', ...BOOKING_STATUS.searching, ...TONES.amber }
  const pay = b.payment_status && PAYMENT_STATUS[b.payment_status]
  if (pay) return { key: b.payment_status, ...pay, ...TONES[pay.tone] }

  let key = b.status || 'searching'
  if (key === 'searching' && b.worker_notified_at && !b.worker_id) key = 'worker_notified'
  const meta = BOOKING_STATUS[key] || BOOKING_STATUS.searching
  return { key, ...meta, ...TONES[meta.tone] }
}

// "2 of 5 workers confirmed" — only meaningful on multi-worker bookings.
export function staffingLabel(b) {
  const need = Math.max(Number(b?.workers_required) || 1, 1)
  if (need <= 1) return null
  const have = Number(b?.workers_accepted) || 0
  return `${have} of ${need} workers confirmed`
}

export function isCancellable(b) {
  if (!b) return false
  if (['verified', 'paid'].includes(b.payment_status)) return false
  return OPEN_STATUSES.includes(b.status)
}
