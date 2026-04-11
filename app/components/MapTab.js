'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { ICONS, PRESET_COLORS, ROUTE_COLORS, ODP, getPolygonPath, rotHandlePos, cornerPositions, bearing, distanceM, destination, w3wToLatLng, latLngToW3w } from './mapUtils'
import MapEditPanel from './MapEditPanel'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'
const DEFAULT_FORM = { label: '', icon: 'custom', width_m: 5, height_m: 3, color: NAVY, rotation_degrees: 0, w3w: '', notes: '' }

// Clean SVG icon marker — colored circle with emoji
function makeIconUrl(emoji, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
    <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="20" y="27" text-anchor="middle" font-size="18" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>
    <polygon points="13,34 27,34 20,46" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`
  return { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: null, anchor: null }
}

// Global deselect registry — so clicking one item deselects others
const registry = {}

function buildOverlay(map, ov, infoWindow, assignments, onClickEdit, onStateChange) {
  const G    = window.google.maps
  const icon = ICONS[ov.icon] || ICONS.custom
  const { url } = makeIconUrl(icon.emoji, ov.color)

  let state = { lat: ov.lat, lng: ov.lng, w: ov.width_m, h: ov.height_m, rot: ov.rotation_degrees || 0 }
  let selected = false

  // Polygon
  const poly = new G.Polygon({
    paths: getPolygonPath(state.lat, state.lng, state.w, state.h, state.rot),
    map, fillColor: ov.color, fillOpacity: 0.55,
    strokeColor: '#fff', strokeWeight: 1.5, strokeOpacity: 0.85,
  })

  // Centre marker with SVG pin icon
  const centre = new G.Marker({
    position: { lat: state.lat, lng: state.lng }, map,
    icon: {
      url,
      scaledSize: new G.Size(40, 46),
      anchor: new G.Point(20, 46),
    },
    draggable: true, cursor: 'move', zIndex: 20,
  })

  // Rotation handle — hidden until selected
  const rh = new G.Marker({
    position: rotHandlePos(state.lat, state.lng, state.rot),
    map: null, // hidden
    icon: { path: G.SymbolPath.CIRCLE, scale: 7, fillColor: '#f97316', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    draggable: true, cursor: 'grab', zIndex: 30, title: 'Drag to rotate',
  })

  // Corner handles — hidden until selected
  const cHandles = getPolygonPath(state.lat, state.lng, state.w, state.h, state.rot).map((corner) =>
    new G.Marker({
      position: corner, map: null,
      icon: { path: G.SymbolPath.CIRCLE, scale: 5, fillColor: '#fff', fillOpacity: 1, strokeColor: NAVY, strokeWeight: 2 },
      draggable: true, cursor: 'nwse-resize', zIndex: 25, title: 'Drag to resize',
    })
  )

  const redraw = () => {
    const path = getPolygonPath(state.lat, state.lng, state.w, state.h, state.rot)
    poly.setPaths(path)
    centre.setPosition({ lat: state.lat, lng: state.lng })
    if (selected) {
      rh.setPosition(rotHandlePos(state.lat, state.lng, state.rot))
      const corners = cornerPositions(state.lat, state.lng, state.w, state.h, state.rot)
      cHandles.forEach((h, i) => h.setPosition(corners[i]))
    }
  }

  const deselect = () => {
    selected = false
    rh.setMap(null)
    cHandles.forEach(h => h.setMap(null))
    poly.setOptions({ strokeColor: '#fff', strokeWeight: 1.5 })
  }

  const select = () => {
    // Deselect all others
    Object.values(registry).forEach(fn => fn())
    selected = true
    rh.setMap(map)
    cHandles.forEach(h => h.setMap(map))
    poly.setOptions({ strokeColor: YELLOW, strokeWeight: 2.5 })
  }

  registry[ov.id] = deselect

  // Click selects + opens edit
  const handleClick = () => { select(); onClickEdit(ov.id) }
  poly.addListener('click', e => { e.stop?.(); handleClick() })
  centre.addListener('click', handleClick)

  // Hover
  const showHover = () => {
    const vols = (assignments[`MAP_${ov.id}`] || [])
    const volHtml = vols.map(v => `<div style="font-size:11px;color:#444;margin-top:2px">${v.is_lead ? '★ ' : ''}${v.volunteer_name}${v.volunteer_phone ? ' · ' + v.volunteer_phone : ''}</div>`).join('')
    const w3wHtml = ov.w3w ? `<a href="https://w3w.co/${ov.w3w}" target="_blank" style="font-size:11px;color:#e74c3c;display:block;margin-top:3px">///${ov.w3w}</a>` : ''
    infoWindow.setContent(`<div style="font-family:sans-serif;padding:3px 5px;max-width:200px"><b style="color:#1B2869;font-size:13px">${icon.emoji} ${ov.label}</b>${volHtml}${w3wHtml}<div style="font-size:9px;color:#aaa;margin-top:3px">Click to edit · Drag to move</div></div>`)
    infoWindow.open(map, centre)
  }
  poly.addListener('mouseover', showHover)
  centre.addListener('mouseover', showHover)
  poly.addListener('mouseout',  () => setTimeout(() => infoWindow.close(), 400))
  centre.addListener('mouseout', () => setTimeout(() => infoWindow.close(), 400))

  // Centre drag — moves whole shape
  centre.addListener('drag', e => { state.lat = e.latLng.lat(); state.lng = e.latLng.lng(); redraw() })
  centre.addListener('dragend', async () => {
    const w3w = await latLngToW3w(state.lat, state.lng)
    await supabase.from('map_overlays').update({ lat: state.lat, lng: state.lng, w3w: w3w || null }).eq('id', ov.id)
    onStateChange(ov.id, { lat: state.lat, lng: state.lng, w3w: w3w || null })
  })

  // Rotation handle drag
  rh.addListener('drag', e => {
    const b = bearing(state.lat, state.lng, e.latLng.lat(), e.latLng.lng())
    state.rot = ((b * 180 / Math.PI) + 360) % 360
    redraw()
  })
  rh.addListener('dragend', async () => {
    await supabase.from('map_overlays').update({ rotation_degrees: state.rot }).eq('id', ov.id)
    onStateChange(ov.id, { rotation_degrees: state.rot })
  })

  // Corner drag — resize
  cHandles.forEach((h) => {
    h.addListener('drag', e => {
      const dist = distanceM(state.lat, state.lng, e.latLng.lat(), e.latLng.lng())
      const b    = bearing(state.lat, state.lng, e.latLng.lat(), e.latLng.lng())
      const relB = ((b - state.rot * Math.PI / 180) + 2 * Math.PI) % (2 * Math.PI)
      const sin  = Math.abs(Math.sin(relB))
      const cos  = Math.abs(Math.cos(relB))
      if (sin > cos) state.w = Math.max(0.5, dist * 2 * sin)
      else           state.h = Math.max(0.5, dist * 2 * cos)
      redraw()
    })
    h.addListener('dragend', async () => {
      await supabase.from('map_overlays').update({ width_m: state.w, height_m: state.h }).eq('id', ov.id)
      onStateChange(ov.id, { width_m: state.w, height_m: state.h })
    })
  })

  return {
    remove: () => {
      delete registry[ov.id]
      poly.setMap(null); centre.setMap(null); rh.setMap(null)
      cHandles.forEach(h => h.setMap(null))
    },
    deselect,
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function MapTab() {
  const mapRef      = useRef(null)
  const mapObjRef   = useRef(null)
  const infoWinRef  = useRef(null)
  const renderedRef = useRef({})
  const routeLineRef = useRef(null)

  const [overlays,    setOverlays]    = useState([])
  const [assignments, setAssignments] = useState({})
  const [routes,      setRoutes]      = useState([])
  const [zones,       setZones]       = useState([])
  const [loaded,      setLoaded]      = useState(false)
  const [mode,        setMode]        = useState('view')
  const [form,        setForm]        = useState(DEFAULT_FORM)
  const [routePoints, setRoutePoints] = useState([])
  const [routeColor,  setRouteColor]  = useState(ROUTE_COLORS[0].color)
  const [routeLabel,  setRouteLabel]  = useState('Route')
  const [editId,      setEditId]      = useState(null)
  const [zonePoints,  setZonePoints]  = useState([])
  const [zoneColor,   setZoneColor]   = useState('#22c55e')
  const [zoneLabel,   setZoneLabel]   = useState('Zone')
  const zoneLineRef  = useRef(null)
  const zonePolyRef  = useRef(null)
  const [sideTab,     setSideTab]     = useState('place')
  const [sideOpen,    setSideOpen]    = useState(true)

  const editOverlay = editId ? overlays.find(o => o.id === editId) : null

  const loadData = useCallback(async () => {
    const [{ data: ovs }, { data: rts }, { data: asgn }, { data: zns }] = await Promise.all([
      supabase.from('map_overlays').select('*').order('sort_order'),
      supabase.from('map_routes').select('*'),
      supabase.from('role_assignments').select('*').like('role_id', 'MAP_%'),
      supabase.from('map_zones').select('*'),
    ])
    if (ovs) setOverlays(ovs)
    if (rts) setRoutes(rts)
    if (zns) setZones(zns)
    if (asgn) {
      const map = {}
      asgn.forEach(r => { if (!map[r.role_id]) map[r.role_id] = []; map[r.role_id].push(r) })
      setAssignments(map)
    }
  }, [])

  useEffect(() => {
    loadData()
    if (window.google?.maps) { setLoaded(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
    s.async = true; s.onload = () => setLoaded(true)
    document.head.appendChild(s)
  }, [loadData])

  useEffect(() => {
    if (!loaded || !mapRef.current || mapObjRef.current) return
    mapObjRef.current = new window.google.maps.Map(mapRef.current, {
      center: ODP, zoom: 18, mapTypeId: 'satellite', tilt: 0,
      fullscreenControl: false, streetViewControl: false,
    })
    infoWinRef.current = new window.google.maps.InfoWindow({ disableAutoPan: true })
    // Click on map deselects all
    mapObjRef.current.addListener('click', () => {
      Object.values(registry).forEach(fn => fn())
      setEditId(null)
    })
  }, [loaded])

  const handleStateChange = useCallback((id, patch) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
  }, [])

  useEffect(() => {
    if (!mapObjRef.current || !loaded) return
    const map = mapObjRef.current
    const iw  = infoWinRef.current

    Object.values(renderedRef.current).forEach(o => o.remove?.())
    renderedRef.current = {}

    overlays.forEach(ov => {
      renderedRef.current[ov.id] = buildOverlay(map, ov, iw, assignments,
        (id) => { setEditId(id); setMode('view') },
        handleStateChange
      )
    })

    routes.forEach(rt => {
      if (!rt.points?.length) return
      const line = new window.google.maps.Polyline({
        path: rt.points, geodesic: true,
        strokeColor: rt.color, strokeOpacity: 0.9, strokeWeight: 4, map,
      })
      renderedRef.current[`rt_${rt.id}`] = { remove: () => line.setMap(null) }
    })

    zones.forEach(zn => {
      if (!zn.points?.length) return
      const poly = new window.google.maps.Polygon({
        paths: zn.points, map,
        fillColor: zn.color, fillOpacity: 0.12,
        strokeColor: zn.color, strokeWeight: 2, strokeOpacity: 0.7,
      })
      const iw = infoWinRef.current
      poly.addListener('mouseover', (e) => {
        poly.setOptions({ fillOpacity: 0.35 })
        iw.setContent(`<div style="font-family:sans-serif;padding:2px 6px;font-weight:700;color:${zn.color};font-size:14px">${zn.label}</div>`)
        iw.setPosition(e.latLng)
        iw.open(map)
      })
      poly.addListener('mouseout', () => { poly.setOptions({ fillOpacity: 0.12 }); iw.close() })
      renderedRef.current[`zn_${zn.id}`] = { remove: () => poly.setMap(null) }
    })
  }, [overlays, routes, zones, assignments, loaded, handleStateChange])

  // Place mode
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'place') return
    const listener = mapObjRef.current.addListener('click', async (e) => {
      if (!form.label.trim()) return
      const lat = e.latLng.lat(), lng = e.latLng.lng()
      const autoW3w = form.w3w?.trim() || (await latLngToW3w(lat, lng)) || null
      const { data } = await supabase.from('map_overlays').insert({
        label: form.label, icon: form.icon, category: 'custom', lat, lng,
        width_m: Number(form.width_m), height_m: Number(form.height_m),
        rotation_degrees: Number(form.rotation_degrees),
        color: form.color, w3w: autoW3w, notes: form.notes || null,
      }).select().single()
      if (data) setOverlays(prev => [...prev, data])
      setMode('view')
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [mode, form])

  // Route mode
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

  // Zone drawing mode
  useEffect(() => {
    if (!mapObjRef.current || mode !== 'zone') return
    const listener = mapObjRef.current.addListener('click', (e) => {
      const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setZonePoints(prev => {
        const next = [...prev, pt]
        if (zoneLineRef.current) zoneLineRef.current.setMap(null)
        // Draw preview as closed polygon
        zoneLineRef.current = new window.google.maps.Polygon({
          paths: next, map: mapObjRef.current,
          fillColor: zoneColor, fillOpacity: 0.2,
          strokeColor: zoneColor, strokeWeight: 2, strokeOpacity: 0.8,
        })
        return next
      })
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [mode, zoneColor])

  const saveZone = async () => {
    if (zonePoints.length < 3) return
    const { data } = await supabase.from('map_zones').insert({ label: zoneLabel, color: zoneColor, points: zonePoints }).select().single()
    if (data) setZones(prev => [...prev, data])
    if (zoneLineRef.current) { zoneLineRef.current.setMap(null); zoneLineRef.current = null }
    setZonePoints([]); setMode('view')
  }

  const cancelZone = () => {
    if (zoneLineRef.current) { zoneLineRef.current.setMap(null); zoneLineRef.current = null }
    setZonePoints([]); setMode('view')
  }

  const deleteZone = async (id) => {
    await supabase.from('map_zones').delete().eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
  }

  const undoZone = () => {
    setZonePoints(prev => {
      const next = prev.slice(0, -1)
      if (zoneLineRef.current) zoneLineRef.current.setMap(null)
      if (next.length >= 2) {
        zoneLineRef.current = new window.google.maps.Polygon({
          paths: next, map: mapObjRef.current,
          fillColor: zoneColor, fillOpacity: 0.2,
          strokeColor: zoneColor, strokeWeight: 2, strokeOpacity: 0.8,
        })
      } else { zoneLineRef.current = null }
      return next
    })
  }

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

  // When saving from edit panel — if w3w changed, move the item to that location
  const handleSave = async (updated) => {
    let finalUpdated = { ...updated }
    const existing = overlays.find(o => o.id === updated.id)
    if (updated.w3w && updated.w3w !== existing?.w3w) {
      const pos = await w3wToLatLng(updated.w3w)
      if (pos) {
        await supabase.from('map_overlays').update({ lat: pos.lat, lng: pos.lng }).eq('id', updated.id)
        finalUpdated = { ...finalUpdated, lat: pos.lat, lng: pos.lng }
        if (mapObjRef.current) mapObjRef.current.panTo(pos)
      }
    }
    setOverlays(prev => prev.map(o => o.id === finalUpdated.id ? finalUpdated : o))
    setEditId(null)
  }

  const deleteRoute = async (id) => {
    await supabase.from('map_routes').delete().eq('id', id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const setF  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const iS    = { width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '6px 8px', fontSize: 12, color: '#fff', outline: 'none', boxSizing: 'border-box' }
  const LS    = { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, display: 'block' }

  return (
    <div style={{ display: 'flex', gap: 10, height: 'calc(100vh - 130px)', minHeight: 500, position: 'relative' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: sideOpen ? 190 : 36, flexShrink: 0, transition: 'width 0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => setSideOpen(s => !s)}
          style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sideOpen ? '◀' : '▶'}
        </button>

        {sideOpen && (<>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Mode</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['view','View'],['place','Place'],['route','Route'],['zone','Zone']].map(([m, lbl]) => (
                <button key={m} onClick={() => { setMode(m); if (m !== 'route') cancelRoute(); if (m !== 'zone') cancelZone(); if (m !== 'view') setEditId(null) }}
                  style={{ flex: 1, padding: '6px 3px', borderRadius: 6, border: `1px solid ${mode === m ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: mode === m ? YELLOW : 'transparent', color: mode === m ? NAVY : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 10, fontWeight: mode === m ? 700 : 400 }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {['place','route','zone','items'].map(t => (
              <button key={t} onClick={() => setSideTab(t)}
                style={{ flex: 1, padding: '4px 2px', borderRadius: 6, border: `1px solid ${sideTab === t ? YELLOW : 'rgba(255,255,255,0.12)'}`, background: sideTab === t ? YELLOW : 'transparent', color: sideTab === t ? NAVY : 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: sideTab === t ? 700 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
                {t === 'items' ? 'On map' : t}
              </button>
            ))}
          </div>

          {/* Place form */}
          {sideTab === 'place' && (
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'place' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: mode === 'place' ? YELLOW : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {mode === 'place' ? 'Click map to drop' : 'Configure'}
              </div>
              <div><span style={LS}>Name</span><input value={form.label} onChange={e => setF('label', e.target.value)} placeholder="Item name" style={iS} /></div>
              <div>
                <span style={LS}>Icon</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {Object.entries(ICONS).map(([key, ic]) => (
                    <button key={key} onClick={() => setF('icon', key)} title={ic.label}
                      style={{ width: 24, height: 24, borderRadius: 4, border: `1.5px solid ${form.icon === key ? YELLOW : 'rgba(255,255,255,0.1)'}`, background: form.icon === key ? 'rgba(254,203,0,0.15)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 12 }}>
                      {ic.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ flex: 1 }}><span style={LS}>W (m)</span><input type="number" value={form.width_m} onChange={e => setF('width_m', e.target.value)} style={iS} /></div>
                <div style={{ flex: 1 }}><span style={LS}>D (m)</span><input type="number" value={form.height_m} onChange={e => setF('height_m', e.target.value)} style={iS} /></div>
              </div>
              <div>
                <span style={LS}>Colour</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setF('color', c)}
                      style={{ width: 18, height: 18, borderRadius: 3, background: c, border: `2px solid ${form.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
                  ))}
                  <input type="color" value={form.color} onChange={e => setF('color', e.target.value)} style={{ width: 18, height: 18, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0 }} />
                </div>
              </div>
              <div>
                <span style={LS}>w3w — jump then drop</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={form.w3w} onChange={e => setF('w3w', e.target.value.replace(/^\/+/, ''))} placeholder="word.word.word" style={{ ...iS, flex: 1 }} />
                  <button onClick={async () => {
                    const pos = await w3wToLatLng(form.w3w)
                    if (pos && mapObjRef.current) { mapObjRef.current.panTo(pos); mapObjRef.current.setZoom(19) }
                  }} style={{ padding: '4px 7px', borderRadius: 6, background: 'rgba(231,76,60,0.2)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.4)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>///</button>
                </div>
              </div>
              <button onClick={() => setMode('place')} disabled={!form.label.trim()}
                style={{ padding: 8, borderRadius: 7, background: form.label.trim() ? YELLOW : 'rgba(255,255,255,0.08)', color: form.label.trim() ? NAVY : 'rgba(255,255,255,0.3)', border: 'none', fontWeight: 700, fontSize: 11, cursor: form.label.trim() ? 'pointer' : 'not-allowed' }}>
                {mode === 'place' ? '→ Click map' : 'Place on map'}
              </button>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>After placing: click to select, then drag 🟠 to rotate · drag ⚪ corners to resize</div>
            </div>
          )}

          {/* Route panel */}
          {sideTab === 'route' && (
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'route' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: mode === 'route' ? YELLOW : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Route</div>
              <input value={routeLabel} onChange={e => setRouteLabel(e.target.value)} placeholder="Label" style={iS} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {ROUTE_COLORS.map(rc => (
                  <button key={rc.color} onClick={() => setRouteColor(rc.color)}
                    style={{ padding: '3px 6px', borderRadius: 4, border: `2px solid ${routeColor === rc.color ? '#fff' : 'transparent'}`, background: rc.color, fontSize: 8, color: rc.color === YELLOW ? NAVY : '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {rc.label}
                  </button>
                ))}
                <input type="color" value={routeColor} onChange={e => setRouteColor(e.target.value)} style={{ width: 22, height: 22, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0 }} />
              </div>
              {mode !== 'route'
                ? <button onClick={() => setMode('route')} style={{ padding: 8, borderRadius: 7, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Start drawing</button>
                : <>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{routePoints.length} points — click map</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={undoRoute} disabled={!routePoints.length} style={{ flex: 1, padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: routePoints.length ? '#fff' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, cursor: routePoints.length ? 'pointer' : 'not-allowed' }}>undo</button>
                      <button onClick={saveRoute} disabled={routePoints.length < 2} style={{ flex: 1, padding: 6, borderRadius: 6, background: routePoints.length >= 2 ? YELLOW : 'rgba(255,255,255,0.08)', color: routePoints.length >= 2 ? NAVY : 'rgba(255,255,255,0.25)', border: 'none', fontWeight: 700, fontSize: 10, cursor: routePoints.length >= 2 ? 'pointer' : 'not-allowed' }}>save</button>
                      <button onClick={cancelRoute} style={{ padding: '6px 7px', borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                    </div>
                  </>
              }
              {routes.length > 0 && <>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 4 }}>Saved</div>
                {routes.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 5px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 1, background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                    <button onClick={() => deleteRoute(r.id)} style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
                  </div>
                ))}
              </>}
            </div>
          )}

          {/* Zone panel */}
          {sideTab === 'zone' && (
            <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${mode === 'zone' ? YELLOW : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: mode === 'zone' ? YELLOW : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Zone area</div>
              <input value={zoneLabel} onChange={e => setZoneLabel(e.target.value)} placeholder="Zone name" style={iS} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[['#22c55e','Field'],['#3b82f6','Richmond'],['#f97316','Ham'],['#a855f7','Kingston'],['#ec4899','Custom']].map(([c, lbl]) => (
                  <button key={c} onClick={() => setZoneColor(c)}
                    style={{ padding: '3px 7px', borderRadius: 4, border: `2px solid ${zoneColor === c ? '#fff' : 'transparent'}`, background: c, fontSize: 9, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {lbl}
                  </button>
                ))}
                <input type="color" value={zoneColor} onChange={e => setZoneColor(e.target.value)} style={{ width: 22, height: 22, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0 }} />
              </div>
              {mode !== 'zone'
                ? <button onClick={() => setMode('zone')} style={{ padding: 8, borderRadius: 7, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Start drawing zone</button>
                : <>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{zonePoints.length} points — click map to add. Zone closes automatically.</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={undoZone} disabled={!zonePoints.length} style={{ flex: 1, padding: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: zonePoints.length ? '#fff' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, cursor: zonePoints.length ? 'pointer' : 'not-allowed' }}>undo</button>
                      <button onClick={saveZone} disabled={zonePoints.length < 3} style={{ flex: 1, padding: 6, borderRadius: 6, background: zonePoints.length >= 3 ? YELLOW : 'rgba(255,255,255,0.08)', color: zonePoints.length >= 3 ? NAVY : 'rgba(255,255,255,0.25)', border: 'none', fontWeight: 700, fontSize: 10, cursor: zonePoints.length >= 3 ? 'pointer' : 'not-allowed' }}>save</button>
                      <button onClick={cancelZone} style={{ padding: '6px 7px', borderRadius: 6, background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                    </div>
                  </>
              }
              {zones.length > 0 && <>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginTop: 4 }}>Saved zones</div>
                {zones.map(z => (
                  <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 5px', background: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 1, background: z.color, flexShrink: 0, border: `1px solid ${z.color}` }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.label}</span>
                    <button onClick={() => deleteZone(z.id)} style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>×</button>
                  </div>
                ))}
              </>}
            </div>
          )}

          {/* On map list */}
          {sideTab === 'items' && (
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', overflowY: 'auto' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>On map ({overlays.length})</div>
              {overlays.map(o => {
                const ic = ICONS[o.icon] || ICONS.custom
                return (
                  <div key={o.id} onClick={() => { setEditId(o.id); mapObjRef.current?.panTo({ lat: o.lat, lng: o.lng }) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 5px', marginBottom: 2, background: editId === o.id ? 'rgba(254,203,0,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: 5, cursor: 'pointer', border: `1px solid ${editId === o.id ? 'rgba(254,203,0,0.3)' : 'transparent'}` }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{ic.emoji}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>)}
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
        {!loaded && <div style={{ position: 'absolute', inset: 0, background: '#0c1535', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading map…</div>}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {mode !== 'view' && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: YELLOW, color: NAVY, fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 20, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            {mode === 'place' ? (form.label.trim() ? `Click to place: ${form.label}` : 'Enter a name first')
              : mode === 'zone' ? `Drawing zone: ${zoneLabel} — ${zonePoints.length} pts (need ≥3)`
              : `Drawing route: ${routeLabel} — ${routePoints.length} pts`}
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
          onMapPan={pos => { if (mapObjRef.current) { mapObjRef.current.panTo(pos); mapObjRef.current.setZoom(19) } }}
          onW3wMove={async (pos, w3w) => {
            // Move the marker to the geocoded w3w position
            await supabase.from('map_overlays').update({ lat: pos.lat, lng: pos.lng, w3w }).eq('id', editOverlay.id)
            setOverlays(prev => prev.map(o => o.id === editOverlay.id ? { ...o, lat: pos.lat, lng: pos.lng, w3w } : o))
            if (mapObjRef.current) { mapObjRef.current.panTo(pos); mapObjRef.current.setZoom(19) }
          }}
        />
      )}
    </div>
  )
}
