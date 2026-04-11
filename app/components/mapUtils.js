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

const R = 6371000 // Earth radius metres

// Bearing in radians from point1 to point2
export function bearing(lat1, lng1, lat2, lng2) {
  const dL  = (lng2 - lng1) * Math.PI / 180
  const la1 = lat1 * Math.PI / 180
  const la2 = lat2 * Math.PI / 180
  const y   = Math.sin(dL) * Math.cos(la2)
  const x   = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dL)
  return Math.atan2(y, x) // radians, 0 = north, clockwise
}

// Destination point given distance (m) and bearing (radians) from origin
export function destination(lat, lng, distM, bearingRad) {
  const d  = distM / R
  const la = lat * Math.PI / 180
  const lo = lng * Math.PI / 180
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(bearingRad))
  const lo2 = lo + Math.atan2(Math.sin(bearingRad) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2))
  return { lat: la2 * 180 / Math.PI, lng: lo2 * 180 / Math.PI }
}

// Haversine distance in metres between two lat/lng points
export function distanceM(lat1, lng1, lat2, lng2) {
  const la1 = lat1 * Math.PI / 180, la2 = lat2 * Math.PI / 180
  const dLa = la2 - la1, dLo = (lng2 - lng1) * Math.PI / 180
  const a   = Math.sin(dLa/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLo/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Four corners of a rotated rectangle using proper spherical geometry
// rotDeg: 0 = north, clockwise
export function getPolygonPath(lat, lng, widthM, heightM, rotDeg) {
  const rot = (rotDeg || 0) * Math.PI / 180 // clockwise from north in radians
  const w2  = widthM  / 2
  const h2  = heightM / 2

  // Bearing to each corner from centre (clockwise from north)
  // NW, NE, SE, SW  (w = east/west, h = north/south in local frame)
  const corners = [
    { dX: -w2, dY:  h2 }, // NW in local frame
    { dX:  w2, dY:  h2 }, // NE
    { dX:  w2, dY: -h2 }, // SE
    { dX: -w2, dY: -h2 }, // SW
  ]

  return corners.map(({ dX, dY }) => {
    const dist    = Math.sqrt(dX*dX + dY*dY)
    const angle   = Math.atan2(dX, dY) // bearing if unrotated (north = 0)
    const finalBearing = angle + rot
    return destination(lat, lng, dist, finalBearing)
  })
}

// Position of the rotation handle (12m above centre along current rotation axis)
export function rotHandlePos(lat, lng, rotDeg) {
  return destination(lat, lng, 14, (rotDeg || 0) * Math.PI / 180) // 14m north of centre, rotated
}

// Corner positions for resize handles
export function cornerPositions(lat, lng, widthM, heightM, rotDeg) {
  return getPolygonPath(lat, lng, widthM, heightM, rotDeg)
}
