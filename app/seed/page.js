'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'

const MARSHALS = [
  { name: 'M1',    w3w: 'clouds.cliff.action',   notes: 'Direct runners safely from field onto path and warn pedestrians if needed.', volunteers: [{ name: 'Joe Heale', phone: '07801488794', is_lead: true }] },
  { name: 'M2',    w3w: 'paper.ladder.twist',    notes: 'Direct runners off footpath onto grass to loop along top perimeter. Second time, direct onto footpath to footbridge. On return, direct from footpath onto grass towards top perimeter.', volunteers: [{ name: 'Phill Robinson', phone: '07967027563', is_lead: true }] },
  { name: 'M3',    w3w: 'once.fairly.beast',     notes: 'Direct runners straight (north) towards the perimeter. Runners who have done ODP Parkrun will expect to turn left — do not let them.', volunteers: [{ name: 'Jo Neville', phone: '07872055849', is_lead: true }] },
  { name: 'M4',    w3w: 'wink.wires.wipes',      notes: 'Direct runners along northern perimeter to the top NE corner of ODP.', volunteers: [{ name: 'Gary Mellish', phone: '07817653570', is_lead: true }, { name: 'Dave Brooks', phone: '', is_lead: false }, { name: 'Tom Orton', phone: '', is_lead: false }] },
  { name: 'M4.1',  w3w: 'snow.fairly.jumps',     notes: 'Corner marshal — direct runners south towards start/finish on outward leg. On return, direct around corner towards finish line.', volunteers: [{ name: 'Ciaran', phone: '07764926307', is_lead: true }] },
  { name: 'M5',    w3w: 'props.react.indeed',    notes: 'Funnel runners safely across the narrow footbridge. Shouting SINGLE FILE is helpful.', volunteers: [{ name: 'Helen Quinn', phone: '07779119018', is_lead: true }] },
  { name: 'M6',    w3w: 'amuse.wished.move',     notes: 'One each side of the footbridge. Direct single file then left onto towpath. Manage pedestrian crossings.', volunteers: [{ name: 'Edyta', phone: '07833388107', is_lead: true }, { name: 'Sarah Macintosh', phone: '07517917967', is_lead: false }] },
  { name: 'M7',    w3w: 'island.prom.libraries', notes: 'Direct runners clearly. Proactively manage pedestrian crossings. Prevent interference with runners.', volunteers: [{ name: 'Dave Cobb', phone: '07801445838', is_lead: true }] },
  { name: 'M7.1',  w3w: 'washed.tips.hype',      notes: 'Turning point — direct runners from Water Lane back towards the towpath.', volunteers: [{ name: 'Andy Bowen', phone: '07713987025', is_lead: true }, { name: 'Nick Mander', phone: '07702200708', is_lead: false }] },
  { name: 'M8',    w3w: 'silent.gums.window',    notes: 'Monitor Richmond Bridge Boat Club. Manage interactions with boats or club equipment crossing the runner route.', volunteers: [{ name: 'Rebecca Knight', phone: '07989449498', is_lead: true }] },
  { name: 'M9',    w3w: 'memory.tennis.pages',   notes: 'Oversee Richmond Rowing Boat Hire area. Keep route free from interference.', volunteers: [{ name: 'Naomi Thorogood', phone: '07814629357', is_lead: true }] },
  { name: 'M10',   w3w: 'error.gravel.point',    notes: 'Direct runners clearly and manage pedestrian crossing points along route.', volunteers: [{ name: 'David Larkam', phone: '07485004400', is_lead: true }] },
  { name: 'M11',   w3w: 'thus.paid.fuel',        notes: 'Clearly direct runners, manage pedestrian flow, especially near restaurants, ensuring a clear and safe route.', volunteers: [{ name: 'Kim Stephenson', phone: '07803157007', is_lead: true }] },
  { name: 'M12',   w3w: 'hope.counts.forget',    notes: 'Direct runners safely onto the left fork towards Eileen\'s cafe, proactively manage pedestrian crossings to ensure clear route passage. Turning point.', volunteers: [{ name: 'Alan Armstrong', phone: '07561573035', is_lead: true }] },
  { name: 'M13',   w3w: 'loaf.tube.trips',       notes: 'Clearly direct runners right towards the river, ensure pedestrian crossings are safely managed. On the return leg, clearly direct runners left past Eileen\'s cafe. Turning point.', volunteers: [{ name: 'Shaun', phone: '07708556351', is_lead: true }] },
  { name: 'M14',   w3w: 'booth.modes.fast',      notes: 'Direct runners, safely manage pedestrian crossings, and proactively keep route clear. Manage vehicles where necessary.', volunteers: [{ name: 'Tom Newman', phone: '07792281808', is_lead: true }, { name: 'David Boot', phone: '07533359142', is_lead: false }] },
  { name: 'M15',   w3w: 'sends.range.frost',     notes: 'Direct runners, manage pedestrian crossing safely, especially near busier sections. Possible pedestrians using Hammerton\'s Ferry.', volunteers: [{ name: 'Jon Scott Francis', phone: '07748141637', is_lead: true }] },
  { name: 'M16',   w3w: 'jars.relay.heads',      notes: 'Manage water station; safely control runners accessing water point, ensure no pedestrian interference.', volunteers: [{ name: 'Peter Hall', phone: '07968398947', is_lead: true }] },
  { name: 'M17',   w3w: 'jars.relay.heads',      notes: 'Assist water station operation, clearly direct runners for safe and efficient use.', volunteers: [{ name: 'Gary Robinson', phone: '07803601580', is_lead: true }] },
  { name: 'M18',   w3w: 'jars.relay.heads',      notes: 'Support water station operation, ensure clear runner access and no pedestrian interference.', volunteers: [{ name: 'Michelle Grimley', phone: '07739312417', is_lead: true }] },
  { name: 'M19',   w3w: 'jars.relay.heads',      notes: 'Assist in safely managing runners at the water station, keeping area clear and efficient.', volunteers: [{ name: 'Catherine', phone: '07749901618', is_lead: true }] },
  { name: 'M20',   w3w: 'like.villa.rested',     notes: 'Clearly direct runners, manage pedestrian crossing points proactively along route.', volunteers: [{ name: 'Susan Cargill', phone: '07823351392', is_lead: true }] },
  { name: 'M21',   w3w: 'jazzy.deaf.swing',      notes: 'Ensure runners are clearly directed, safely managing pedestrian crossings at key points.', volunteers: [{ name: 'Matt Priest', phone: '07768031776', is_lead: true }] },
  { name: 'M21.1', w3w: 'head.fears.tape',       notes: 'Ensure runners are clearly directed onto upper footpath, safely manage pedestrian crossings. Note runners will approach from the lower (riverside) footpath on the return loop.', volunteers: [{ name: 'Sybille Schorm', phone: '07962925311', is_lead: true }] },
  { name: 'M22',   w3w: 'drape.bars.spin',       notes: 'Direct runners safely, proactively manage pedestrian interactions along the route. This position can be on the grass between upper and lower paths covering both outward and return runners.', volunteers: [{ name: 'Ben Richmond', phone: '07910682463', is_lead: true }] },
  { name: 'M23',   w3w: 'bonus.dream.cure',      notes: 'Clearly manage the turning point; safely direct runners and ensure a smooth turnaround area.', volunteers: [{ name: 'Andy Orchard', phone: '07747788876', is_lead: true }, { name: 'Jodie', phone: '07737221443', is_lead: false }] },
]

async function geocodeW3w(words) {
  const r = await fetch(`https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(words)}&key=F2VIPT0Q`)
  const d = await r.json()
  if (d.error || !d.coordinates) throw new Error(d.error?.message || 'Geocode failed')
  return { lat: d.coordinates.lat, lng: d.coordinates.lng }
}

export default function SeedPage() {
  const [log,      setLog]      = useState([])
  const [running,  setRunning]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [progress, setProgress] = useState(0)

  const addLog = (msg, ok = true) => setLog(prev => [...prev, { msg, ok }])

  const run = async () => {
    setRunning(true); setLog([]); setDone(false); setProgress(0)

    // Delete existing marshal overlays to avoid duplicates
    addLog('Removing existing marshal overlays…')
    const { data: existing } = await supabase.from('map_overlays').select('id,label').ilike('label', 'M%')
    if (existing?.length) {
      const ids = existing.filter(o => /^M\d/.test(o.label)).map(o => o.id)
      if (ids.length) await supabase.from('map_overlays').delete().in('id', ids)
      addLog(`Removed ${ids.length} existing marshal overlays`)
    }

    const total = MARSHALS.length
    const w3wCache = {}

    for (let i = 0; i < MARSHALS.length; i++) {
      const m = MARSHALS[i]
      setProgress(Math.round((i / total) * 100))

      try {
        // Geocode (cache duplicates like jars.relay.heads)
        let pos = w3wCache[m.w3w]
        if (!pos) {
          pos = await geocodeW3w(m.w3w)
          w3wCache[m.w3w] = pos
          // small offset for duplicate w3w positions so they don't stack
        }

        // Offset stacked markers slightly
        const sameW3w = MARSHALS.slice(0, i).filter(x => x.w3w === m.w3w).length
        const lat = pos.lat + sameW3w * 0.00005
        const lng = pos.lng + sameW3w * 0.00005

        const { data: ov, error: ovErr } = await supabase.from('map_overlays').insert({
          label:            m.name,
          icon:             'marshal',
          category:         'marshal',
          lat, lng,
          width_m:          2,
          height_m:         2,
          color:            '#f97316',
          rotation_degrees: 0,
          w3w:              m.w3w,
          notes:            m.notes,
          sort_order:       i + 100,
        }).select().single()

        if (ovErr) throw new Error(ovErr.message)

        // Insert volunteers as role_assignments
        for (let j = 0; j < m.volunteers.length; j++) {
          const v = m.volunteers[j]
          if (!v.name) continue
          await supabase.from('role_assignments').upsert({
            role_id:         `MAP_${ov.id}`,
            volunteer_name:  v.name,
            volunteer_phone: v.phone || null,
            is_lead:         v.is_lead,
            slot_order:      j,
          }, { onConflict: 'role_id,volunteer_name' })
        }

        addLog(`✓ ${m.name} — ${m.w3w} → ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      } catch (e) {
        addLog(`✗ ${m.name} — ${e.message}`, false)
      }

      // Throttle to avoid rate limiting
      await new Promise(r => setTimeout(r, 300))
    }

    setProgress(100)
    setDone(true)
    setRunning(false)
    addLog('Done! Go to the Map tab to see all marshals.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c1535', fontFamily: '-apple-system, sans-serif', padding: 32, color: '#fff' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Marshal Map Seeder</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            This page geocodes all 26 marshal positions using what3words and places them on the map with their assigned volunteers. Run it once — it takes about 30 seconds.
          </div>
        </div>

        {!running && !done && (
          <button onClick={run}
            style={{ padding: '14px 32px', borderRadius: 12, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 24 }}>
            Seed all 26 marshal positions
          </button>
        )}

        {running && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 8, marginBottom: 8 }}>
              <div style={{ background: YELLOW, borderRadius: 4, height: 8, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{progress}% — please wait…</div>
          </div>
        )}

        {done && (
          <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
            <a href="/" style={{ padding: '12px 24px', borderRadius: 10, background: YELLOW, color: NAVY, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>← Back to portal</a>
            <button onClick={run} style={{ padding: '12px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Run again</button>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
          {log.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)' }}>Log will appear here…</div>}
          {log.map((l, i) => (
            <div key={i} style={{ color: l.ok ? '#22c55e' : '#ef4444', marginBottom: 3 }}>{l.msg}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
