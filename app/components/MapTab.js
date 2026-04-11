'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { ICONS, PRESET_COLORS, ROUTE_COLORS, ODP, getPolygonPath } from './mapUtils'
import MapEditPanel from './MapEditPanel'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'

const DEFAULT_FORM = { label: '', icon: 'custom', width_m: 5, height_m: 3, color: NAVY, rotation_degrees: 0, w3w: '', notes: '' }

// Build one Google Maps overlay (polygon + icon marker) for an item
function buildOverlay(map, ov, infoWindow, assignments, onClick) {
  const G    = window.google.maps
  const path = getPolygonPath(ov.lat, ov.lng, ov.width_m, ov.height_m, ov.rotation_degrees || 0)
  const icon = ICONS[ov.icon] || ICONS.custom

  const poly = new G.Polygon({
    paths: path, map,
    fillColor: ov.color, fillOpacity: 0.7,
    strokeColor: '#fff', strokeWeight: 1.5, strokeOpacity: 0.9,
  })

  const marker = new G.Marker({
    position: { lat: ov.lat, lng: ov.lng },
    map,
    label: { text: icon.emoji, fontSize: '18px' },
    icon: { path: G.SymbolPath.CIRCLE, scale: 14, fillColor: ov.color, fillOpacity: 0.85, strokeColor: '#fff', strokeWeight: 1.5 },
    draggable: true,
    cursor: 'move',
    zIndex: 10,
  })

  // Hover info
  const showInfo = () => {
    const vols = (assignments[`MAP_${ov.id}`] || [])
    const volHtml = vols.length ? vols.map(v => `<div style="font-size:11px;color:#555;margin-top:2px">${v.is_lead ? '★ ' : ''}${v.volunteer_name}${v.volunteer_phone ? ' · ' + v.volunteer_phone : ''}</div>`).join('') : ''
    const w3wHtml = ov.w3w ? `<a href="https://w3w.co/${ov.w3w}" target="_blank" style="font-size:11px;color:#e74c3c;display:block;margin-top:4px">///${ov.w3w}</a>` : ''
    infoWindow.setContent(`<div style="font-family:sans-serif;padding:2px 4px;max-width:180px"><div style="font-weight:700;font-size:13px;color:#1B2869">${icon.emoji} ${ov.label}</div>${volHtml}${w3wHtml}<div style="font-size:10px;color:#999;margin-top:4px">Click to edit · Drag to move</div></div>`)
    infoWindow.open(map, marker)
  }
  poly.addListener('mouseover', showInfo)
  marker.addListener('mouseover', showInfo)
  poly.addListener('mouseout', () => setTimeout(() => infoWindow.close(), 300))
  marker.addListener('mouseout', () => setTimeout(() => infoWindow.close(), 300))

  // Click opens edit panel
  poly.addListener('click', (e) => { e.stop?.(); onClick(ov.id) })
  marker.addListener('click', () => onClick(ov.id))

  // Drag updates polygon shape
  marker.addListener('drag', (e) => {
    const newPath = getPolygonPath(e.latLng.lat(), e.latLng.lng(), ov.width_m, ov.height_m, ov.rotation_degrees || 0)
    poly.setPaths(newPath)
  })

  marker.addListener('dragend', async (e) => {
    const lat = e.latLng.lat(), lng = e.latLng.lng()
    await supabase.from('map_overlays').update({ lat, lng }).eq('id', ov.id)
  })

  return { remove: () => { poly.setMap(null); marker.setMap(null) } }
}

export default function MapTab() {
  const mapRef        = useRef(null)
  const mapObjRef     = useRef(null)
  const infoWinRef    = useRef(null)
  const renderedRef   = useRef({}) // id → { remove }
  const routeLineRef  = useRef(null)

  const [overlays,    setOverlays]    = useState([])
  const [assignments, setAssignments] = useState({}) // { 'MAP_id': [rows] }
  const [routes,      setRoutes]      = useState([])
  const [loaded,      setLoaded]      = useState(false)
  const [mode,        setMode]        = useState('view')
  const [form,        setForm]        = useState(DEFAULT_FORM)
  const [routePoints, setRoutePoints] = useState([])
  const [routeColor,  setRouteColor]  = useState(ROUTE_COLORS[0].color)
  const [routeLabel,  setRouteLabel]  = useState('Route')
  const [editId,      setEditId]      = useState(null)
  const [sideTab,     setSideTab]     = useState('place')

  const editOverlay = editId ? overlays.find(o => o.id === editId) : null

  // Load everything
  const loadData = useCallback(async () => {
    const [{ data: ovs }, { data: rts }, { data: asgn }] = await Promise.all([
      supabase.from('map_overlays').select('*').order('sort_order'),
      supabase.from('map_routes').select('*'),
      supabase.from('role_assignments').select('*').like('role_id', 'MAP_%'),
    ])
    if (ovs) setOverlays(ovs)
    if (rts) setRoutes(rts)
    if (asgn) {
      const map = {}
      asgn.forEach(r => { if (!map[r.role_id]) map[r.role_id] = []; map[r.role_id].push(r) })
      setAssignments(map)
    }
  }, [])

  // Load Google Maps
  useEffect(() => {
    loadData()
    if (window.google?.maps) { setLoaded(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
    s.async = true
    s.onload = () => setLoaded(true)
    document.head.appendChild(s)
  }, [loadData])

  // Init map once
  useEffect(() => {
    if (!loaded || !mapRef.current || mapObjRef.current) return
    mapObjRef.current = new window.google.maps.Map(mapRef.current, {
      center: ODP, zoom: 18, mapTypeId: 'satellite', tilt: 0,
      fullscreenControl: false, streetViewControl: false,
    })
    infoWinRef.current = new window.google.maps.InfoWindow({ disableAutoPan: true })
  }, [loaded])

  // Re-render overlays and routes when data changes
  useEffect(() => {
    if (!mapObjRef.current || !loaded) return
    const map = mapObjRef.current
    const iw  = infoWinRef.current

    Object.values(renderedRef.current).forEach(o => o.remove?.())
    renderedRef.current = {}

    overlays.forEach(ov => {
      renderedRef.current[ov.id] = buildOverlay(map, ov, iw, assignments, (id) => { setEditId(id); setMode('view') })
    })

    routes.forEach(rt => {
      if (!rt.points?.length) return
      const line = new window.google.maps.Polyline({
        path: rt.points, geodesic: true,
        strokeColor: rt.color, strokeOpacity: 0.9, strokeWeight: 4, map,
      })
      renderedRef.current[`rt_${rt.id}`] = { remove: () => line.setMap(null) }
    })
  }, [overlays, routes, assignments, loaded])

  // Place mode — click map to drop item
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'place') return
    const listener = mapObjRef.current.addListener('click', async (e) => {
      if (!form.label.trim()) return
      const { data } = await supabase.from('map_overlays').insert({
        label: form.label, icon: form.icon, category: 'custom',
        lat: e.latLng.lat(), lng: e.latLng.lng(),
        width_m: Number(form.width_m), height_m: Number(form.height_m),
        rotation_degrees: Number(form.rotation_degrees),
        color: form.color, w3w: form.w3w || null, notes: form.notes || null,
      }).select().single()
      if (data) setOverlays(prev => [...prev, data])
      setMode('view')
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [mode, form])

  // Route drawing
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'route') return
    const listener = mapObjRef.current.addListener('click', (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setRoutePoints(prev => {
        const next = [...prev, pt]
        if (routeLineRef.current) routeLineRef.current.setMap(null)
        routeLineRef.current = new window.google.maps.Polyline({
          path: next, geodesic: true, strokeColor: routeColor,
          strokeOpacity: 0.7, strokeWeight: 4, map: mapObjRef.current,
        })
        return next
      })
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [mode, routeColor])

  const undoRoute = () => {
    setRoutePoints(prev => {
      const next = prev.slice(0, -1)
      if (routeLineRef.current) routeLineRef.current.setMap(null)
      routeLineRef.current = next.length > 0 ? new window.google.maps.Polyline({
        path: next, geodesic: true, strokeColor: routeColor,
        strokeOpacity: 0.7, strokeWeight: 4, map: mapObjRef.current,
      }) : null
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
    setEditId(null)
  }

  const handleSave = (updated) => {
    setOverlays(prev => prev.map(o => o.id === updated.id ? updated : o))
    setEditId(null)
  }

  const deleteRoute = async (id) => {
    await supabase.from('map_routes').delete().eq('id', id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const labelCss = { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4, display: 'block' }
  const inputCss = { width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', gap: 10, height: 'calc(100vh - 130px)', minHeight: 500, position: 'relative' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>

        {/* Mode buttons */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Mode</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['view','View'],['place','Place'],['route','Route']].map(([m, lbl]) => (
              <button key={m} onClick={() => { setMode(m); if (m !== 'route') cancelRoute(); if (m !== 'view') setEditId(null) }}
                style={{ flex: 1, padding: '7px 3px', borderRadius: 8, border: `1px solid ${mode === m ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: mode === m ? YELLOW : 'transparent', color: mode === m ? NAVY : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11, fontWeight: mode === m ? 700 : 400 }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
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
              {mode === 'place' ? 'Click map to place' : 'Configure item'}
            </div>

            <div>
              <span style={labelCss}>Name</span>
              <input value={form.label} onChange={e => setF('label', e.target.value)} placeholder="Item name" style={inputCss} />
            </div>

            <div>
              <span style={labelCss}>Icon</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {Object.entries(ICONS).map(([key, ic]) => (
                  <button key={key} onClick={() => setF('icon', key)} title={ic.label}
                    style={{ width: 28, height: 28, borderRadius: 5, border: `1.5px solid ${form.icon === key ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: form.icon === key ? 'rgba(254,203,0,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 14 }}>
                    {ic.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <span style={labelCss}>W (m)</span>
                <input type="number" value={form.width_m} onChange={e => setF('width_m', e.target.value)} style={inputCss} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={labelCss}>D (m)</span>
                <input type="number" value={form.height_m} onChange={e => setF('height_m', e.target.value)} style={inputCss} />
              </div>
            </div>

            <div>
              <span style={labelCss}>Rotate — {form.rotation_degrees}°</span>
              <input type="range" min={0} max={359} value={form.rotation_degrees} onChange={e => setF('rotation_degrees', e.target.value)} style={{ width: '100%', accentColor: YELLOW }} />
            </div>

            <div>
              <span style={labelCss}>Colour</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setF('color', c)}
                    style={{ width: 20, height: 20, borderRadius: 3, background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
                ))}
                <input type="color" value={form.color} onChange={e => setF('color', e.target.value)}
                  style={{ width: 20, height: 20, borderRadius: 3, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0 }} />
              </div>
            </div>

            <div>
              <span style={labelCss}>w3w</span>
              <input value={form.w3w} onChange={e => setF('w3w', e.target.value.replace(/^\/+/,''))} placeholder="word.word.word" style={inputCss} />
            </div>

            <button onClick={() => setMode('place')} disabled={!form.label.trim()}
              style={{ padding: 9, borderRadius: 8, background: form.label.trim() ? YELLOW : 'rgba(255,255,255,0.08)', color: form.label.trim() ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 12, cursor: form.label.trim() ? 'pointer' : 'not-allowed' }}>
              {mode === 'place' ? '→ Click map' : 'Place on map'}
            </button>
          </div>
        )}

        {/* Route panel */}
        {sideTab === 'route' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'route' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: mode === 'route' ? YELLOW : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Route</div>
            <input value={routeLabel} onChange={e => setRouteLabel(e.target.value)} placeholder="Label" style={inputCss} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ROUTE_COLORS.map(rc => (
                <button key={rc.color} onClick={() => setRouteColor(rc.color)}
                  style={{ padding: '4px 6px', borderRadius: 5, border: `2px solid ${routeColor === rc.color ? '#fff' : 'transparent'}`, background: rc.color, fontSize: 9, color: rc.color === YELLOW ? NAVY : '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {rc.label}
                </button>
              ))}
              <input type="color" value={routeColor} onChange={e => setRouteColor(e.target.value)}
                style={{ width: 24, height: 24, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0 }} />
            </div>
            {mode !== 'route'
              ? <button onClick={() => setMode('route')} style={{ padding: 9, borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Start drawing</button>
              : <>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{routePoints.length} points</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={undoRoute} disabled={!routePoints.length} style={{ flex: 1, padding: 7, borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: routePoints.length ? '#fff' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, cursor: routePoints.length ? 'pointer' : 'not-allowed' }}>undo</button>
                    <button onClick={saveRoute} disabled={routePoints.length < 2} style={{ flex: 1, padding: 7, borderRadius: 7, background: routePoints.length >= 2 ? YELLOW : 'rgba(255,255,255,0.08)', color: routePoints.length >= 2 ? NAVY : 'rgba(255,255,255,0.25)', border: 'none', fontWeight: 700, fontSize: 11, cursor: routePoints.length >= 2 ? 'pointer' : 'not-allowed' }}>save</button>
                    <button onClick={cancelRoute} style={{ padding: '7px 8px', borderRadius: 7, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                </>
            }
            {routes.length > 0 && <>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 4 }}>Saved</div>
              {routes.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{r.label}</span>
                  <button onClick={() => deleteRoute(r.id)} style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
                </div>
              ))}
            </>}
          </div>
        )}

        {/* Items on map */}
        {sideTab === 'items' && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>On map ({overlays.length})</div>
            {overlays.map(o => {
              const ic = ICONS[o.icon] || ICONS.custom
              return (
                <div key={o.id} onClick={() => { setEditId(o.id); mapObjRef.current?.panTo({ lat: o.lat, lng: o.lng }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', marginBottom: 3, background: editId === o.id ? 'rgba(254,203,0,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 6, cursor: 'pointer', border: `1px solid ${editId === o.id ? 'rgba(254,203,0,0.3)' : 'transparent'}` }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{ic.emoji}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
        {!loaded && <div style={{ position: 'absolute', inset: 0, background: '#0c1535', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading map…</div>}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {mode !== 'view' && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: YELLOW, color: NAVY, fontWeight: 700, fontSize: 12, padding: '7px 14px', borderRadius: 20, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {mode === 'place' ? (form.label.trim() ? `Click to place: ${form.label}` : 'Enter a name first') : `Drawing: ${routeLabel} — ${routePoints.length} pts`}
          </div>
        )}
      </div>

      {/* ── Edit panel ── */}
      {editOverlay && (
        <MapEditPanel
          overlay={editOverlay}
          onClose={() => setEditId(null)}
          onSave={handleSave}
          onDelete={deleteOverlay}
        />
      )}
    </div>
  )
}
