/**
 * Input validation utility — shared across all admin forms.
 * Returns { valid: true } or { valid: false, error: 'message' }
 */

export function validatePhone(phone) {
  if (!phone) return { valid: false, error: 'Phone number is required' }
  const clean = phone.replace(/[^0-9]/g, '')
  if (clean.length < 10 || clean.length > 12) return { valid: false, error: 'Enter a valid 10-digit phone number' }
  return { valid: true }
}

export function validateAmount(amount) {
  const n = parseFloat(amount)
  if (!amount || isNaN(n)) return { valid: false, error: 'Enter a valid amount' }
  if (n <= 0) return { valid: false, error: 'Amount must be greater than 0' }
  if (n > 1000000) return { valid: false, error: 'Amount seems too large' }
  return { valid: true }
}

export function validateUTR(utr) {
  if (!utr || !utr.trim()) return { valid: false, error: 'UTR / transaction reference is required' }
  if (utr.trim().length < 6) return { valid: false, error: 'UTR must be at least 6 characters' }
  return { valid: true }
}

export function validateEmail(email) {
  if (!email) return { valid: false, error: 'Email is required' }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return { valid: false, error: 'Enter a valid email address' }
  return { valid: true }
}

export function validateUPI(upi) {
  if (!upi) return { valid: false, error: 'UPI ID is required' }
  const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/
  if (!re.test(upi)) return { valid: false, error: 'Enter a valid UPI ID (e.g. name@upi)' }
  return { valid: true }
}

export function validateText(value, field = 'This field', { min = 1, max = 500 } = {}) {
  if (!value || !value.trim()) return { valid: false, error: `${field} is required` }
  if (value.trim().length < min) return { valid: false, error: `${field} must be at least ${min} characters` }
  if (value.trim().length > max) return { valid: false, error: `${field} must be under ${max} characters` }
  return { valid: true }
}

/** Sanitise a string to prevent XSS when rendering as text */
export function sanitise(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>"'&]/g, c => ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#x27;", '&':'&amp;' }[c]))
}

/** Rate-limit guard — returns false if more than `limit` calls in `windowMs` */
const _callTimes = {}
export function rateLimit(key, limit = 3, windowMs = 60000) {
  const now = Date.now()
  if (!_callTimes[key]) _callTimes[key] = []
  _callTimes[key] = _callTimes[key].filter(t => now - t < windowMs)
  if (_callTimes[key].length >= limit) return false
  _callTimes[key].push(now)
  return true
}
