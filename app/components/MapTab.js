'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'

const PALETTE = [
  { label: 'Start / Finish Arch',  category: 'infrastructure', color: NAVY,      w: 6,  h: 1 },
  { label: 'Registration Gazebo',  category: 'infrastructure', color: NAVY,      w: 6,  h: 4 },
  { label: 'Baggage Drop',         category: 'infrastructure', color: CYAN,      w: 8,  h: 4 },
  { label: 'Medical Tent',         category: 'infrastructure', color: '#ef4444', w: 5,  h: 4 },
  { label: 'Portable Toilets',     category: 'infrastructure', color: '#6b7280', w: 10, h: 3 },
  { label: 'Water Station',        category: 'infrastructure', color: '#22c55e', w: 4,  h: 2 },
  { label: 'Sponsor Gazebo',       category: 'sponsor',        color: YELLOW,    w: 5,  h: 4 },
  { label: 'Coffee Van',           category: 'vendor',         color: '#92400e', w: 4,  h: 2 },
  { label: 'Sports Massage',       category: 'vendor',         color: '#7c3aed', w: 4,  h: 3 },
  { label: 'Marshal Point',        category: 'marshal',        color: '#f97316', w: 2,  h: 2 },
  { label: 'Water Point',          category: 'marshal',        color: '#22c55e', w: 3,  h: 2 },
  { label: 'Custom',               category: 'custom',         color: '#ffffff', w: 4,  h: 4 },
]

const ROUTE_COLORS = [
  { label: 'Outbound',  color: '#1B2869' },
  { label: 'Return',    color: '#00B5E2' },
  { label: 'Field loop',color: '#FECB00' },
  { label: 'Custom',    color: '#ef4444' },
]

// ODP centre coordinates
const ODP_CENTER = { lat: 51.4609, lng: -0.3058 }

export default function MapTab() {
  const mapRef      = useRef(null)
  const googleRef   = useRef(null)
  const mapObjRef   = useRef(null)
  const overlaysRef = useRef({}) // id → google OverlayView instance
  const drawingRef  = useRef(null)
  const routeLineRef = useRef(null)

  const [overlays,   setOverlays]   = useState([])
  const [routes,     setRoutes]     = useState([])
  const [selected,   setSelected]   = useState(null) // overlay id
  const [popup,      setPopup]      = useState(null) // overlay data
  const [mode,       setMode]       = useState('view')   // view | place | route
  const [pendingItem,setPendingItem]= useState(null) // palette item to place
  const [activeRoute,setActiveRoute]= useState(null) // route being drawn
  const [routePoints,setRoutePoints]= useState([])
  const [routeColor, setRouteColor] = useState(ROUTE_COLORS[0].color)
  const [routeLabel, setRouteLabel] = useState('Route')
  const [loaded,     setLoaded]     = useState(false)
  const [sideTab,    setSideTab]    = useState('items') // items | routes

  // Load data from Supabase
  const loadData = useCallback(async () => {
    const [{ data: ovs }, { data: rts }] = await Promise.all([
      supabase.from('map_overlays').select('*').order('sort_order'),
      supabase.from('map_routes').select('*'),
    ])
    if (ovs) setOverlays(ovs)
    if (rts) setRoutes(rts)
  }, [])

  // Load Google Maps script
  useEffect(() => {
    loadData()
    if (window.google) { setLoaded(true); return }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=drawing`
    script.async = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [loadData])

  // Init map once Google is loaded
  useEffect(() => {
    if (!loaded || !mapRef.current || mapObjRef.current) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: ODP_CENTER,
      zoom: 18,
      mapTypeId: 'satellite',
      tilt: 0,
      disableDefaultUI: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: true,
    })
    mapObjRef.current = map
    googleRef.current = window.google
    renderAll(map, overlays, routes)
  }, [loaded])

  // Re-render overlays when data changes
  useEffect(() => {
    if (!mapObjRef.current) return
    renderAll(mapObjRef.current, overlays, routes)
  }, [overlays, routes])

  const renderAll = (map, ovs, rts) => {
    // Clear existing
    Object.values(overlaysRef.current).forEach(o => o.setMap && o.setMap(null))
    overlaysRef.current = {}

    // Draw overlay blocks
    ovs.forEach(ov => {
      const marker = createOverlayMarker(map, ov)
      overlaysRef.current[ov.id] = marker
    })

    // Draw routes
    rts.forEach(rt => {
      if (!rt.points || rt.points.length < 2) return
      const line = new window.google.maps.Polyline({
        path: rt.points,
        geodesic: true,
        strokeColor: rt.color,
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      })
      overlaysRef.current[`route_${rt.id}`] = line
    })
  }

  const createOverlayMarker = (map, ov) => {
    // Use a Rectangle to represent physical dimensions
    const metersPerDeg = 111320
    const latOffset = (ov.height_m / 2) / metersPerDeg
    const lngOffset = (ov.width_m  / 2) / (metersPerDeg * Math.cos(ov.lat * Math.PI / 180))

    const bounds = {
      north: ov.lat + latOffset,
      south: ov.lat - latOffset,
      east:  ov.lng + lngOffset,
      west:  ov.lng - lngOffset,
    }

    const rect = new window.google.maps.Rectangle({
      bounds,
      map,
      fillColor: ov.color,
      fillOpacity: 0.75,
      strokeColor: '#ffffff',
      strokeWeight: 1.5,
      strokeOpacity: 0.8,
    })

    // Label marker at centre
    const label = new window.google.maps.Marker({
      position: { lat: ov.lat, lng: ov.lng },
      map,
      label: { text: ov.label, color: '#fff', fontSize: '10px', fontWeight: '700' },
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 },
    })

    rect.addListener('click', () => setPopup(ov))
    label.addListener('click', () => setPopup(ov))

    return { rect, label, setMap: (m) => { rect.setMap(m); label.setMap(m) } }
  }

  // Place item on map click
  useEffect(() => {
    if (!mapObjRef.current) return
    if (mode !== 'place' || !pendingItem) return

    const listener = mapObjRef.current.addListener('click', async (e) => {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      const payload = { label: pendingItem.label, category: pendingItem.category, lat, lng, width_m: pendingItem.w, height_m: pendingItem.h, color: pendingItem.color }
      const { data } = await supabase.from('map_overlays').insert(payload).select().single()
      if (data) setOverlays(prev => [...prev, data])
      setMode('view'); setPendingItem(null)
    })

    return () => window.google.maps.event.removeListener(listener)
  }, [mode, pendingItem])

  // Route drawing
  useEffect(() => {
    if (!mapObjRef.current) return
    if (mode !== 'route') return

    const listener = mapObjRef.current.addListener('click', (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setRoutePoints(prev => {
        const next = [...prev, pt]
        // Draw preview line
        if (routeLineRef.current) routeLineRef.current.setMap(null)
        routeLineRef.current = new window.google.maps.Polyline({
          path: next, geodesic: true,
          strokeColor: routeColor, strokeOpacity: 0.7, strokeWeight: 4,
          map: mapObjRef.current,
        })
        return next
      })
    })

    return () => window.google.maps.event.removeListener(listener)
  }, [mode, routeColor])

  const saveRoute = async () => {
    if (routePoints.length < 2) return
    const { data } = await supabase.from('map_routes').insert({ label: routeLabel, color: routeColor, points: routePoints }).select().single()
    if (data) setRoutes(prev => [...prev, data])
    if (routeLineRef.current) { routeLineRef.current.setMap(null); routeLineRef.current = null }
    setRoutePoints([])
    setMode('view')
  }

  const cancelRoute = () => {
    if (routeLineRef.current) { routeLineRef.current.setMap(null); routeLineRef.current = null }
    setRoutePoints([])
    setMode('view')
  }

  const deleteOverlay = async (id) => {
    await supabase.from('map_overlays').delete().eq('id', id)
    setOverlays(prev => prev.filter(o => o.id !== id))
    setPopup(null)
  }

  const deleteRoute = async (id) => {
    await supabase.from('map_routes').delete().eq('id', id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const modeColor = (m) => mode === m ? YELLOW : 'rgba(255,255,255,0.35)'

  return (
    <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 120px)', minHeight: 500 }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

        {/* Mode controls */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mode</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['view','View / pan'],['place','Place item'],['route','Draw route']].map(([m, lbl]) => (
              <button key={m} onClick={() => { setMode(m); if (m !== 'place') setPendingItem(null); if (m !== 'route') cancelRoute() }}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${modeColor(m)}`, background: mode === m ? YELLOW : 'transparent', color: mode === m ? NAVY : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, fontWeight: mode === m ? 700 : 400, textAlign: 'left' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Route config (when in route mode) */}
        {mode === 'route' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${YELLOW}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: YELLOW, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Drawing route</div>
            <input value={routeLabel} onChange={e => setRouteLabel(e.target.value)} placeholder="Route label"
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 8px', fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {ROUTE_COLORS.map(rc => (
                <button key={rc.color} onClick={() => setRouteColor(rc.color)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: `2px solid ${routeColor === rc.color ? '#fff' : 'transparent'}`, background: rc.color, fontSize: 10, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {rc.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{routePoints.length} points. Click map to add.</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={saveRoute} disabled={routePoints.length < 2}
                style={{ flex: 1, padding: 7, borderRadius: 7, background: routePoints.length >= 2 ? YELLOW : 'rgba(255,255,255,0.08)', color: routePoints.length >= 2 ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 12, cursor: routePoints.length >= 2 ? 'pointer' : 'not-allowed' }}>
                Save
              </button>
              <button onClick={cancelRoute} style={{ padding: '7px 10px', borderRadius: 7, background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12, cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['items','routes'].map(t => (
            <button key={t} onClick={() => setSideTab(t)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1px solid ${sideTab === t ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: sideTab === t ? YELLOW : 'transparent', color: sideTab === t ? NAVY : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: sideTab === t ? 700 : 400, cursor: 'pointer' }}>
              {t === 'items' ? 'Items' : 'Routes'}
            </button>
          ))}
        </div>

        {/* Items palette */}
        {sideTab === 'items' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {mode === 'place' ? 'Click item then click map' : 'Select Place mode first'}
            </div>
            {PALETTE.map((item, i) => (
              <button key={i}
                onClick={() => { setMode('place'); setPendingItem(item) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, border: `1px solid ${pendingItem?.label === item.label ? YELLOW : 'rgba(255,255,255,0.1)'}`, background: pendingItem?.label === item.label ? 'rgba(254,203,0,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Routes list */}
        {sideTab === 'routes' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Saved routes</div>
            {routes.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None yet — draw a route</div>}
            {routes.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{r.label}</span>
                <button onClick={() => deleteRoute(r.id)} style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Placed overlays list */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>On map ({overlays.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {overlays.map(o => (
              <div key={o.id} onClick={() => { setPopup(o); mapObjRef.current?.panTo({ lat: o.lat, lng: o.lng }) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, cursor: 'pointer' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                <button onClick={e => { e.stopPropagation(); deleteOverlay(o.id) }}
                  style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, background: '#0c1535', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Loading map…
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Mode indicator */}
        {mode !== 'view' && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: YELLOW, color: NAVY, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 20, pointerEvents: 'none' }}>
            {mode === 'place' ? (pendingItem ? `Click map to place: ${pendingItem.label}` : 'Select item from sidebar') : `Drawing: ${routeLabel} — click map to add points`}
          </div>
        )}
      </div>

      {/* ── Popup ── */}
      {popup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}
          onClick={() => setPopup(null)}>
          <div style={{ background: '#1a2060', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: popup.color }} />
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{popup.label}</div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>{popup.category}</div>
              </div>
              <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ color: YELLOW, fontWeight: 700, fontSize: 18 }}>{popup.width_m}m</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>width</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ color: YELLOW, fontWeight: 700, fontSize: 18 }}>{popup.height_m}m</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>depth</div>
              </div>
            </div>
            {popup.notes && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16, lineHeight: 1.6 }}>{popup.notes}</div>}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16, fontFamily: 'monospace' }}>
              {popup.lat.toFixed(6)}, {popup.lng.toFixed(6)}
            </div>
            <button onClick={() => deleteOverlay(popup.id)}
              style={{ width: '100%', padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Remove from map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
