// TermsModal — shown once after first login. Stores acceptance in localStorage.
const TERMS_KEY = 'kr_terms_accepted'
export function termsAccepted() { return localStorage.getItem(TERMS_KEY) === '1' }
export function acceptTerms()   { localStorage.setItem(TERMS_KEY, '1') }

export default function TermsModal({ onAccept, dark = false }) {
  const bg   = dark ? '#111' : '#fff'
  const text = dark ? '#fff' : '#000'
  const sub  = dark ? '#555' : '#888'
  const Y    = '#F5C000'

  return (
    <div role="dialog" aria-modal="true" aria-label="Terms and Conditions" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:9999,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:bg, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:430,
        padding:'24px 24px 40px', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📜</div>
          <p style={{ fontWeight:800, fontSize:20, color:text }}>Before you continue</p>
          <p style={{ fontSize:13, color:sub, marginTop:6 }}>Please read and accept our Terms & Privacy Policy</p>
        </div>
        <div style={{ flex:1, overflowY:'auto', background:dark?'#0a0a0a':'#f9f9f9',
          borderRadius:14, padding:'16px', marginBottom:16, fontSize:13, color:sub, lineHeight:1.7 }}>
          <p style={{ fontWeight:700, color:text, marginBottom:8 }}>Terms of Service</p>
          <p>Kaam Ready is a platform that connects customers with skilled workers in Karnataka. By using the app you agree to:</p>
          <ul style={{ paddingLeft:16, margin:'8px 0' }}>
            <li>Use the platform only for lawful purposes</li>
            <li>Provide accurate information during registration</li>
            <li>Not misuse or harass any worker or customer</li>
            <li>Pay for services rendered as agreed</li>
            <li>Workers must complete Aadhaar KYC before accepting jobs</li>
          </ul>
          <p style={{ fontWeight:700, color:text, margin:'12px 0 8px' }}>Privacy Policy</p>
          <p>We collect your phone number, name, city, and booking history to provide our service. Your data is stored securely on Supabase (ISO 27001 compliant). We do not sell your data to third parties. Location data is only used to match workers to customers.</p>
          <p style={{ marginTop:8 }}>For queries: <span style={{ color:Y }}>support@thekaamready.in</span></p>
        </div>
        <button type="button" onClick={onAccept}
          style={{ width:'100%', background:Y, border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:800,
            cursor:'pointer', fontFamily:'inherit' }}>
          I Accept — Continue →
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:sub, marginTop:10 }}>
          By tapping "I Accept" you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
