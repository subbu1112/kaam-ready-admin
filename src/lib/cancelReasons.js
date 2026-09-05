// Cancellation reasons. Codes are stored in booking_cancellations.reason_code
// and never translated; labels are what the person picked, stored alongside so
// the admin sees the exact wording the user saw.

export const CUSTOMER_CANCEL_REASONS = [
  { code: 'changed_mind',    label: 'Changed my mind' },
  { code: 'worker_too_slow', label: 'Worker taking too long' },
  { code: 'found_another',   label: 'Found another worker' },
  { code: 'wrong_details',   label: 'Incorrect booking details' },
  { code: 'price_issue',     label: 'Price issue' },
  { code: 'not_needed',      label: 'No longer need the service' },
  { code: 'other',           label: 'Other' },
]

export const WORKER_CANCEL_REASONS = [
  { code: 'cannot_reach',        label: 'Cannot reach location' },
  { code: 'too_far',             label: 'Too far' },
  { code: 'emergency',           label: 'Emergency' },
  { code: 'wrong_service',       label: 'Wrong service request' },
  { code: 'customer_unavailable',label: 'Customer unavailable' },
  { code: 'personal',            label: 'Personal reason' },
  { code: 'other',               label: 'Other' },
]

export const labelFor = (list, code) => list.find(r => r.code === code)?.label || code
