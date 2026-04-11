export const ICONS = {
  start:        { emoji: '🏁', label: 'Start / Finish' },
  marshal:      { emoji: '🦺', label: 'Marshal' },
  mile_marker:  { emoji: '📍', label: 'Mile Marker' },
  first_aid:    { emoji: '🏥', label: 'First Aid' },
  water:        { emoji: '💧', label: 'Water' },
  toilets:      { emoji: '🚻', label: 'Toilets' },
  coffee:       { emoji: '☕', label: 'Coffee' },
  massage:      { emoji: '💆', label: 'Massage' },
  sponsors:     { emoji: '⭐', label: 'Sponsor' },
  prizes:       { emoji: '🏆', label: 'Prizes' },
  tshirts:      { emoji: '👕', label: 'T-shirts' },
  transport:    { emoji: '🚐', label: 'Transport' },
  baggage:      { emoji: '🎒', label: 'Baggage' },
  glasses:      { emoji: '🥂', label: 'Glasses' },
  bananas:      { emoji: '🍌', label: 'Bananas' },
  registration: { emoji: '📋', label: 'Registration' },
  custom:       { emoji: '📌', label: 'Custom' },
}

export const PRESET_COLORS = [
  '#1B2869','#00B5E2','#FECB00','#ef4444',
  '#22c55e','#f97316','#7c3aed','#6b7280',
  '#92400e','#ffffff','#ec4899','#0ea5e9',
]

export const ROUTE_COLORS = [
  { label: 'Outbound',   color: '#1B2869' },
  { label: 'Return',     color: '#00B5E2' },
  { label: 'Field loop', color: '#FECB00' },
  { label: 'Custom',     color: '#ef4444' },
]

export const ODP = { lat: 51.4609, lng: -0.3058 }

// Calculate rotated rectangle polygon path from centre + dimensions
export function getPolygonPath(lat, lng, widthM, heightM, rotDeg) {
  const R      = 6371000
  const latRad = lat * Math.PI / 180
  const dy     = (heightM / 2) / R * (180 / Math.PI)
  const dx     = (widthM  / 2) / (R * Math.cos(latRad)) * (180 / Math.PI)
  const rad    = (rotDeg || 0) * Math.PI / 180
  const cos    = Math.cos(rad)
  const sin    = Math.sin(rad)
  return [[-dx,+dy],[+dx,+dy],[+dx,-dy],[-dx,-dy]].map(([x,y]) => ({
    lat: lat + x * sin + y * cos,
    lng: lng + x * cos - y * sin,
  }))
}
