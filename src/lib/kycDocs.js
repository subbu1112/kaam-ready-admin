import { sb } from './supabase'

// The `kyc` bucket is private. Documents are stored as PATHS on the worker row
// and each viewer mints a short-lived signed URL when they open them — the old
// build persisted 1-hour signed URLs, so anything more than an hour old showed
// up in this queue as a broken image.

export const KYC_BUCKET = 'kyc'

export const WORKER_DOCS = [
  { key:'aadhaar_front', label:'Aadhaar Front', kind:'image',
    pathCol:'aadhaar_front_path', urlCols:['aadhar_front_url','aadhaar_front_url'],
    atCol:'aadhaar_front_submitted_at' },
  { key:'aadhaar_back',  label:'Aadhaar Back',  kind:'image',
    pathCol:'aadhaar_back_path',  urlCols:['aadhar_back_url','aadhaar_back_url'],
    atCol:'aadhaar_back_submitted_at' },
  { key:'selfie_video',  label:'Selfie Video',  kind:'video',
    pathCol:'selfie_video_path',  urlCols:['selfie_video_url'],
    atCol:'selfie_video_submitted_at' },
]

export const PAN_DOC = { key:'pan', label:'PAN', kind:'image', pathCol:null, urlCols:['pan_front_url'] }

export function docSubmitted(worker, doc) {
  if (!worker) return false
  if (doc.pathCol && worker[doc.pathCol]) return true
  return (doc.urlCols || []).some(c => !!worker[c])
}

export function allDocsSubmitted(worker) {
  return WORKER_DOCS.every(d => docSubmitted(worker, d))
}

// Resolve a viewable URL: prefer a fresh signed URL from the stored path, and
// fall back to whatever URL an older submission left behind.
export async function resolveDocUrl(worker, doc, seconds = 3600) {
  const path = doc.pathCol ? worker?.[doc.pathCol] : null
  if (path) {
    try {
      const { data, error } = await sb.storage.from(KYC_BUCKET).createSignedUrl(path, seconds)
      if (!error && data?.signedUrl) return data.signedUrl
    } catch { /* fall through to the legacy URL */ }
  }
  for (const c of doc.urlCols || []) if (worker?.[c]) return worker[c]
  return null
}

export const KYC_LABEL = {
  pending:           'Pending',
  submitted:         'Awaiting review',
  approved:          'Approved',
  rejected:          'Rejected',
  resubmit_required: 'Resubmission requested',
}

export const KYC_TONE = {
  pending:           ['#FEF3C7', '#92400E'],
  submitted:         ['#DBEAFE', '#1E40AF'],
  approved:          ['#D1FAE5', '#065F46'],
  rejected:          ['#FEE2E2', '#991B1B'],
  resubmit_required: ['#FFEDD5', '#9A3412'],
}
