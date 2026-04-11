'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'
const ODP    = { lat: 51.4609, lng: -0.3058 }

// ─── GEOMETRY ────────────────────────────────────────────────────────────────
function getPolygonPath(lat, lng, widthM, heightM, rotDeg) {
  const R      = 6371000
  const latRad = lat * Math.PI / 180
  const dy     = (heightM / 2) / R * (180 / Math.PI)
  const dx     = (widthM  / 2) / (R * Math.cos(latRad)) * (180 / Math.PI)
  const rad    = rotDeg * Math.PI / 180
  const cos    = Math.cos(rad)
  const sin    = Math.sin(rad)

  return [
    [-dx, +dy], [+dx, +dy], [+dx, -dy], [-dx, -dy]
  ].map(([x, y]) => ({
    lat: lat + (x * sin + y * cos),
    lng: lng + (x * cos - y * sin),
  }))
}

// ─── MAP HELPERS ─────────────────────────────────────────────────────────────
function makeOverlay(map, ov, infoWindow, onDragEnd) {
  const G = window.google.maps

  const path = getPolygonPath(ov.lat, ov.lng, ov.width_m, ov.height_m, ov.rotation_degrees || 0)

  const poly = new G.Polygon({
    paths: path,
    map,
    fillColor: ov.color,
    fillOpacity: 0.75,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    strokeOpacity: 0.9,
  })

  // Invisible draggable marker at centre
  const marker = new G.Marker({
    position: { lat: ov.lat, lng: ov.lng },
    map,
    icon: { path: G.SymbolPath.CIRCLE, scale: 6, fillColor: ov.color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1.5 },
    draggable: true,
    cursor: 'move',
  })

  // Hover label
  const showInfo = () => {
    infoWindow.setContent(`<div style="font-family:sans-serif;font-size:13px;font-weight:600;color:#1B2869;padding:2px 4px">${ov.label}</div>`)
    infoWindow.open(map, marker)
  }
  poly.addListener('mouseover', showInfo)
  marker.addListener('mouseover', showInfo)
  poly.addListener('mouseout', () => infoWindow.close())
  marker.addListener('mouseout', () => infoWindow.close())

  // Drag — move polygon with marker
  marker.addListener('drag', (e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    const newPath = getPolygonPath(lat, lng, ov.width_m, ov.height_m, ov.rotation_degrees || 0)
    poly.setPaths(newPath)
  })

  marker.addListener('dragend', (e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    onDragEnd(ov.id, lat, lng)
  })

  return {
    remove: () => { poly.setMap(null); marker.setMap(null) },
    update: (newPath) => poly.setPaths(newPath),
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const DEFAULT_FORM = { label: '', width_m: 5, height_m: 3, color: NAVY, rotation_degrees: 0, notes: '' }
const PRESET_COLORS = [NAVY, CYAN, YELLOW, '#ef4444', '#22c55e', '#f97316', '#7c3aed', '#6b7280', '#92400e', '#ffffff']
const ROUTE_COLORS  = [
  { label: 'Outbound',   color: '#1B2869' },
  { label: 'Return',     color: '#00B5E2' },
  { label: 'Field loop', color: '#FECB00' },
  { label: 'Custom',     color: '#ef4444' },
]

export default function MapTab() {
  const mapRef       = useRef(null)
  const mapObjRef    = useRef(null)
  const infoWinRef   = useRef(null)
  const overlayMapRef = useRef({}) // id → { remove, update }
  const routeLineRef = useRef(null)

  const [overlays,    setOverlays]    = useState([])
  const [routes,      setRoutes]      = useState([])
  const [loaded,      setLoaded]      = useState(false)
  const [mode,        setMode]        = useState('view')
  const [form,        setForm]        = useState(DEFAULT_FORM)
  const [routePoints, setRoutePoints] = useState([])
  const [routeColor,  setRouteColor]  = useState(ROUTE_COLORS[0].color)
  const [routeLabel,  setRouteLabel]  = useState('Route')
  const [sideTab,     setSideTab]     = useState('place')

  // Load data
  const loadData = useCallback(async () => {
    const [{ data: ovs }, { data: rts }] = await Promise.all([
      supabase.from('map_overlays').select('*').order('sort_order'),
      supabase.from('map_routes').select('*'),
    ])
    if (ovs) setOverlays(ovs)
    if (rts) setRoutes(rts)
  }, [])

  // Load Google Maps
  useEffect(() => {
    loadData()
    if (window.google?.maps) { setLoaded(true); return }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
    s.async = true
    s.onload = () => setLoaded(true)
    document.head.appendChild(s)
  }, [loadData])

  // Init map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapObjRef.current) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: ODP, zoom: 18, mapTypeId: 'satellite', tilt: 0,
      fullscreenControl: false, streetViewControl: false,
    })
    mapObjRef.current = map
    infoWinRef.current = new window.google.maps.InfoWindow()
  }, [loaded])

  // Render overlays whenever data or map changes
  useEffect(() => {
    if (!mapObjRef.current || !loaded) return
    const map = mapObjRef.current
    const iw  = infoWinRef.current

    // Remove all existing
    Object.values(overlayMapRef.current).forEach(o => o.remove?.())
    overlayMapRef.current = {}

    // Add overlays
    overlays.forEach(ov => {
      overlayMapRef.current[ov.id] = makeOverlay(map, ov, iw, handleDragEnd)
    })

    // Draw routes
    routes.forEach(rt => {
      if (!rt.points?.length) return
      const key = `route_${rt.id}`
      overlayMapRef.current[key] = {
        remove: new window.google.maps.Polyline({
          path: rt.points, geodesic: true,
          strokeColor: rt.color, strokeOpacity: 0.9, strokeWeight: 4, map,
        }).setMap.bind(null, null)
      }
      // Wrap properly
      const line = new window.google.maps.Polyline({
        path: rt.points, geodesic: true,
        strokeColor: rt.color, strokeOpacity: 0.9, strokeWeight: 4, map,
      })
      overlayMapRef.current[key] = { remove: () => line.setMap(null) }
    })
  }, [overlays, routes, loaded])

  // Place mode — click map
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'place') return
    const listener = mapObjRef.current.addListener('click', async (e) => {
      if (!form.label.trim()) return
      const lat = e.latLng.lat(), lng = e.latLng.lng()
      const payload = { label: form.label, category: 'custom', lat, lng, width_m: Number(form.width_m), height_m: Number(form.height_m), color: form.color, rotation_degrees: Number(form.rotation_degrees), notes: form.notes }
      const { data } = await supabase.from('map_overlays').insert(payload).select().single()
      if (data) setOverlays(prev => [...prev, data])
      setMode('view')
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [mode, form])

  // Route mode — click map
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'route') return
    const listener = mapObjRef.current.addListener('click', (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setRoutePoints(prev => {
        const next = [...prev, pt]
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

  const handleDragEnd = async (id, lat, lng) => {
    await supabase.from('map_overlays').update({ lat, lng }).eq('id', id)
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, lat, lng } : o))
  }

  const undoRoute = () => {
    setRoutePoints(prev => {
      const next = prev.slice(0, -1)
      if (routeLineRef.current) routeLineRef.current.setMap(null)
      if (next.length > 0) {
        routeLineRef.current = new window.google.maps.Polyline({
          path: next, geodesic: true,
          strokeColor: routeColor, strokeOpacity: 0.7, strokeWeight: 4,
          map: mapObjRef.current,
        })
      } else {
        routeLineRef.current = null
      }
      return next
    })
  }

  const saveRoute = async () => {
    if (routePoints.length < 2) return
    const { data } = await supabase.from('map_routes').insert({ label: routeLabel, color: routeColor, points: routePoints }).select().single()
    if (data) setRoutes(prev => [...prev, data])
    if (routeLineRef.current) { routeLineRef.current.setMap(null); routeLineRef.current = null }
    setRoutePoints([]); setMode('view')
  }

  const cancelRoute = () => {
    if (routeLineRef.current) { routeLineRef.current.setMap(null); routeLineRef.current = null }
    setRoutePoints([]); setMode('view')
  }

  const deleteOverlay = async (id) => {
    await supabase.from('map_overlays').delete().eq('id', id)
    setOverlays(prev => prev.filter(o => o.id !== id))
  }

  const deleteRoute = async (id) => {
    await supabase.from('map_routes').delete().eq('id', id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' }
  const numInput   = (k, placeholder, min, max) => (
    <input type="number" value={form[k]} onChange={e => setF(k, e.target.value)} placeholder={placeholder} min={min} max={max}
      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
  )

  return (
    <div style={{ display: 'flex', gap: 10, height: 'calc(100vh - 130px)', minHeight: 500 }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

        {/* Mode */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mode</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['view','View'],['place','Place'],['route','Route']].map(([m, lbl]) => (
              <button key={m} onClick={() => { setMode(m); if (m !== 'route') cancelRoute() }}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `1px solid ${mode === m ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: mode === m ? YELLOW : 'transparent', color: mode === m ? NAVY : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: mode === m ? 700 : 400 }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Side tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['place','route','items'].map(t => (
            <button key={t} onClick={() => setSideTab(t)}
              style={{ flex: 1, padding: '5px 2px', borderRadius: 7, border: `1px solid ${sideTab === t ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: sideTab === t ? YELLOW : 'transparent', color: sideTab === t ? NAVY : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: sideTab === t ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {t === 'items' ? 'On map' : t}
            </button>
          ))}
        </div>

        {/* Place form */}
        {sideTab === 'place' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'place' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: mode === 'place' ? YELLOW : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {mode === 'place' ? 'Click map to place' : 'Item to place'}
            </div>

            <div>
              <span style={labelStyle}>Name</span>
              <input value={form.label} onChange={e => setF('label', e.target.value)} placeholder="e.g. Up & Running gazebo"
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>Width (m)</span>
                {numInput('width_m', '5', 0.5, 200)}
              </div>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>Depth (m)</span>
                {numInput('height_m', '3', 0.5, 200)}
              </div>
            </div>

            <div>
              <span style={labelStyle}>Rotation (°)</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="range" min={0} max={359} value={form.rotation_degrees} onChange={e => setF('rotation_degrees', e.target.value)}
                  style={{ flex: 1, accentColor: YELLOW }} />
                <span style={{ fontSize: 12, color: YELLOW, minWidth: 32, textAlign: 'right' }}>{form.rotation_degrees}°</span>
              </div>
            </div>

            <div>
              <span style={labelStyle}>Colour</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setF('color', c)}
                    style={{ width: 22, height: 22, borderRadius: 4, background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
                ))}
                <input type="color" value={form.color} onChange={e => setF('color', e.target.value)}
                  style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0, background: 'none' }} title="Custom colour" />
              </div>
            </div>

            <div>
              <span style={labelStyle}>Notes</span>
              <input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Optional"
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <button onClick={() => setMode('place')} disabled={!form.label.trim()}
              style={{ padding: 9, borderRadius: 8, background: form.label.trim() ? YELLOW : 'rgba(255,255,255,0.08)', color: form.label.trim() ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 13, cursor: form.label.trim() ? 'pointer' : 'not-allowed' }}>
              {mode === 'place' ? '→ Click map to place' : 'Place on map'}
            </button>
          </div>
        )}

        {/* Route panel */}
        {sideTab === 'route' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'route' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: mode === 'route' ? YELLOW : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Route</div>

            <input value={routeLabel} onChange={e => setRouteLabel(e.target.value)} placeholder="Route label"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: '#fff', outline: 'none' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ROUTE_COLORS.map(rc => (
                <button key={rc.color} onClick={() => setRouteColor(rc.color)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: `2px solid ${routeColor === rc.color ? '#fff' : 'transparent'}`, background: rc.color, fontSize: 10, color: rc.color === YELLOW ? NAVY : '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {rc.label}
                </button>
              ))}
              <input type="color" value={routeColor} onChange={e => setRouteColor(e.target.value)}
                style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} title="Custom" />
            </div>

            {mode !== 'route'
              ? <button onClick={() => setMode('route')} style={{ padding: 9, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Start drawing</button>
              : (
                <>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{routePoints.length} points — click map to add</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={undoRoute} disabled={routePoints.length === 0}
                      style={{ flex: 1, padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: routePoints.length > 0 ? '#fff' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, cursor: routePoints.length > 0 ? 'pointer' : 'not-allowed' }}>
                      undo
                    </button>
                    <button onClick={saveRoute} disabled={routePoints.length < 2}
                      style={{ flex: 1, padding: 7, borderRadius: 7, background: routePoints.length >= 2 ? YELLOW : 'rgba(255,255,255,0.08)', color: routePoints.length >= 2 ? NAVY : 'rgba(255,255,255,0.25)', border: 'none', fontWeight: 700, fontSize: 12, cursor: routePoints.length >= 2 ? 'pointer' : 'not-allowed' }}>
                      save
                    </button>
                    <button onClick={cancelRoute} style={{ padding: '7px 10px', borderRadius: 7, background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                </>
              )
            }

            {routes.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Saved routes</div>
                {routes.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{r.label}</span>
                    <button onClick={() => deleteRoute(r.id)} style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Items on map */}
        {sideTab === 'items' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>On map ({overlays.length})</div>
            {overlays.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Nothing placed yet</div>}
            {overlays.map(o => (
              <div key={o.id} onClick={() => mapObjRef.current?.panTo({ lat: o.lat, lng: o.lng })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', marginBottom: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 6, cursor: 'pointer' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                <button onClick={e => { e.stopPropagation(); deleteOverlay(o.id) }}
                  style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, background: '#0c1535', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading map…</div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {mode !== 'view' && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: YELLOW, color: NAVY, fontWeight: 700, fontSize: 12, padding: '7px 16px', borderRadius: 20, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {mode === 'place'
              ? form.label.trim() ? `Click to place: ${form.label}` : 'Enter a name in the sidebar first'
              : `Drawing: ${routeLabel} — ${routePoints.length} pts`}
          </div>
        )}
      </div>
    </div>
  )
}
