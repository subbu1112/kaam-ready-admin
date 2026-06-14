import { useState } from 'react'
import { sb } from '../lib/supabase'

export default function AvatarUpload({ userId, currentUrl, table = 'profiles', onUploaded, size = 72, dark = false }) {
  const [uploading, setUploading] = useState(false)

  async function pick(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `${userId}/avatar.jpg`
      const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = sb.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl + '?t=' + Date.now()
      await sb.from(table).update({ avatar_url: publicUrl }).eq('id', userId)
      onUploaded && onUploaded(publicUrl)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setUploading(false)
  }

  const bg = dark ? '#1a1a1a' : '#FFF8D6'

  return (
    <label style={{ cursor:'pointer', display:'block', width:size, height:size, borderRadius:size*0.28, margin:'0 auto', position:'relative' }}>
      {currentUrl ? (
        <img src={currentUrl} alt="avatar"
          style={{ width:size, height:size, borderRadius:size*0.28, objectFit:'cover', border:'3px solid #F5C000' }} />
      ) : (
        <div style={{ width:size, height:size, borderRadius:size*0.28, background:bg,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.5 }}>
          {dark ? '⚡' : '👤'}
        </div>
      )}
      <div style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:8,
        background:'#F5C000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        boxShadow:'0 2px 6px rgba(0,0,0,.2)' }}>
        {uploading ? '⏳' : '📷'}
      </div>
      <input type="file" accept="image/*" style={{ display:'none' }} onChange={pick} disabled={uploading} />
    </label>
  )
}
