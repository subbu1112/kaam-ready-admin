/**
 * Audit logging utility — every admin action is recorded in the audit_logs table.
 * Import `audit` and call it after any destructive or state-changing action.
 *
 * Usage:
 *   import { audit } from '../lib/audit'
 *   await audit(adminEmail, 'approve_kyc', 'worker', workerId, { name: 'Ravi' })
 */

import { sb } from './supabase'

/**
 * Log an admin action.
 * @param {string} adminEmail - who performed the action
 * @param {string} action     - e.g. 'approve_kyc', 'ban_user', 'release_payout'
 * @param {string} entityType - 'worker'|'user'|'booking'|'payout'|'payment'|'ticket'
 * @param {string} entityId   - the ID of the affected record
 * @param {object} details    - any extra context to store (old values, reason, etc.)
 */
export async function audit(adminEmail, action, entityType, entityId, details = {}) {
  try {
    await sb.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      details,
    })
  } catch (err) {
    // Never crash the UI because of an audit log failure
    console.warn('[audit] Failed to write audit log:', err)
  }
}

// ── Action constants ──────────────────────────────────────────────────────────
export const AUDIT_ACTIONS = {
  // Workers
  APPROVE_KYC:     'approve_kyc',
  REJECT_KYC:      'reject_kyc',
  SUSPEND_WORKER:  'suspend_worker',
  RESTORE_WORKER:  'restore_worker',
  // Users
  SUSPEND_USER:    'suspend_user',
  BAN_USER:        'ban_user',
  RESTORE_USER:    'restore_user',
  // Bookings
  CANCEL_BOOKING:  'cancel_booking',
  COMPLETE_BOOKING:'complete_booking',
  // Payments
  VERIFY_PAYMENT:  'verify_payment',
  REJECT_PAYMENT:  'reject_payment',
  REFUND_PAYMENT:  'refund_payment',
  // Payouts
  RELEASE_PAYOUT:  'release_payout',
  FAIL_PAYOUT:     'fail_payout',
  CREATE_PAYOUT:   'create_payout',
  // Support
  RESOLVE_TICKET:  'resolve_ticket',
  ESCALATE_TICKET: 'escalate_ticket',
  CLOSE_TICKET:    'close_ticket',
}
