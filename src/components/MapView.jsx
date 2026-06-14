import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const WORKER_ICON = L.divIcon({
  html: '<div style="background:#F5C000;border:2px solid #000;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px">👷</div>',
  iconSize: [32, 32], iconAnchor: [16, 16], className: ''
})

const HOME_ICON = L.divIcon({
  html: '<div style="background:#10B981;border:2px solid #fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px">📍</div>',
  iconSize: [32, 32], iconAnchor: [16, 16], className: ''
})

export default function MapView({ workerLat, workerLng, customerLat, customerLng, style = {} }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const workerMarkerRef = useRef(null)

  // Default to Bengaluru if no coords
  const cLat = customerLat || 12.9716
  const cLng = customerLng || 77.5946
  const wLat = workerLat || (cLat + 0.008)
  const wLng = workerLng || (cLng + 0.006)

  useEffect(() => {
    if (mapInstanceRef.current) return
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([cLat, cLng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
    L.marker([cLat, cLng], { icon: HOME_ICON }).addTo(map).bindPopup('Your location')
    workerMarkerRef.current = L.marker([wLat, wLng], { icon: WORKER_ICON }).addTo(map).bindPopup('Worker')
    L.polyline([[cLat, cLng], [wLat, wLng]], { color: '#F5C000', weight: 3, dashArray: '6,6' }).addTo(map)
    mapInstanceRef.current = map
    // Fix grey/blank tiles: container is sized after first paint
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 600)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', onResize); map.remove(); mapInstanceRef.current = null }
  }, [])

  // Update worker position if it changes
  useEffect(() => {
    if (workerMarkerRef.current && workerLat && workerLng) {
      workerMarkerRef.current.setLatLng([workerLat, workerLng])
    }
  }, [workerLat, workerLng])

  return <div ref={mapRef} style={{ width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', ...style }} />
}
