/**
 * Notification utility — calls the Supabase Edge Function `send-notification`
 * which handles SMS (MSG91), WhatsApp (WATI), and Email (Resend).
 *
 * Usage:
 *   import { notify } from '../lib/notify'
 *   await notify('booking_created', '+919876543210', 'customer@email.com', {
 *     customerName: 'Ravi', service: 'Plumbing', bookingId: 'abc123'
 *   })
 */

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`
const ANON_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Send a notification for a platform event.
 * @param {string} event - 'booking_created'|'worker_assigned'|'payment_success'|'payout_released'|'booking_cancelled'|'job_new'
 * @param {string} phone - recipient's phone number (with country code)
 * @param {string|null} email - recipient's email (optional)
 * @param {Record<string,string>} data - template variables
 * @param {string[]} channels - ['sms','whatsapp','email'] (default: sms + whatsapp)
 */
export async function notify(event, phone, email = null, data = {}, channels = ['sms', 'whatsapp']) {
  try {
    const body = { event, recipient: phone, data, channels }
    if (email && channels.includes('email')) body.email = email

    const res = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.warn('[notify] Edge function returned', res.status)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn('[notify] Failed to send notification:', err)
    return null
  }
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export const notifyBookingCreated = (phone, email, data) =>
  notify('booking_created', phone, email, data, ['sms', 'whatsapp', 'email'])

export const notifyWorkerAssigned = (phone, email, data) =>
  notify('worker_assigned', phone, email, data, ['sms', 'whatsapp'])

export const notifyPaymentSuccess = (phone, email, data) =>
  notify('payment_success', phone, email, data, ['sms', 'whatsapp', 'email'])

export const notifyPayoutReleased = (phone, data) =>
  notify('payout_released', phone, null, data, ['sms', 'whatsapp'])

export const notifyBookingCancelled = (phone, data) =>
  notify('booking_cancelled', phone, null, data, ['sms', 'whatsapp'])

export const notifyNewJob = (phone, data) =>
  notify('job_new', phone, null, data, ['sms', 'whatsapp'])
