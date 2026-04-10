'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MILE_MARKERS } from '../data'
import { Card, SectionHead, Pill, Tick, YELLOW, CYAN, NAVY, selectStyle } from './ui'

const PHASES = [
  { id: 'setup',   label: 'Put up',  doneField: 'setup_done',   keys: ['mile_setup_1',   'mile_setup_2'],   desc: 'Saturday — place all mile markers' },
  { id: 'check',   label: 'Check',   doneField: 'sunday_done',  keys: ['mile_check_1',   'mile_check_2'],   desc: 'Sunday morning — verify all markers in place before race start' },
  { id: 'collect', label: 'Collect', doneField: 'collect_done', keys: ['mile_collect_1', 'mile_collect_2'], desc: 'After race — collect all markers' },
]

function CheckerSlot({ label, configKey, value, volunteers, onChange }) {
  const vol = volunteers.find(v => v.name === value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 70 }}>{label}</div>
      <select value={value || ''} onChange={e => onChange(configKey, e.target.value)} style={{ ...selectStyle, flex: 1 }}>
        <option value="">— assign —</option>
        {volunteers.map(v => <option key={v.id} value={v.name}>{v.name} · {v.phone}</option>)}
      </select>
      {vol && <a href={`tel:${vol.phone}`} style={{ color: CYAN, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>{vol.phone}</a>}
    </div>
  )
}

export default function MileMarkersTab() {
  const [phase,      setPhase]      = useState('setup')
  const [volunteers, setVolunteers] = useState([])
  const [checkers,   setCheckers]   = useState({})
  const [markerData, setMarkerData] = useState({})

  const activePhase = PHASES.find(p => p.id === phase)

  useEffect(() => {
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })

    const allKeys = PHASES.flatMap(p => p.keys)
    supabase.from('event_config').select('*').in('key', allKeys).then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.key] = r.value })
      setCheckers(map)
    })

    supabase.from('mile_markers').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.marker_id] = r })
      setMarkerData(map)
    })

    const ch = supabase.channel('miles_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mile_markers' }, ({ new: r }) => {
        setMarkerData(prev => ({ ...prev, [r.marker_id]: r }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const setChecker = async (key, value) => {
    setCheckers(prev => ({ ...prev, [key]: value }))
    await supabase.from('event_config').upsert({ key, value }, { onConflict: 'key' })
  }

  const toggleDone = async (markerId, doneField) => {
    const cur     = markerData[markerId]?.[doneField] || false
    const updated = { ...(markerData[markerId] || {}), marker_id: markerId, [doneField]: !cur }
    setMarkerData(prev => ({ ...prev, [markerId]: updated }))
    await supabase.from('mile_markers').upsert(updated, { onConflict: 'marker_id' })
  }

  const doneCount = MILE_MARKERS.filter(m => markerData[m.id]?.[activePhase.doneField]).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {PHASES.map(p => <Pill key={p.id} active={phase === p.id} onClick={() => setPhase(p.id)}>{p.label}</Pill>)}
      </div>

      {/* Assigned checkers for this phase */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title={`${activePhase.label} — assigned`} />
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{activePhase.desc}</div>
          {activePhase.keys.map((key, i) => (
            <CheckerSlot
              key={key}
              label={`Person ${i + 1}`}
              configKey={key}
              value={checkers[key] || ''}
              volunteers={volunteers}
              onChange={setChecker}
            />
          ))}
        </div>
      </Card>

      {/* Progress bar */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Progress" right={`${doneCount} / ${MILE_MARKERS.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {MILE_MARKERS.map(m => (
              <div key={m.id} style={{ flex: 1, height: 5, borderRadius: 3, background: markerData[m.id]?.[activePhase.doneField] ? YELLOW : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>
      </Card>

      {/* Markers */}
      <Card>
        {MILE_MARKERS.map((m, i) => {
          const d      = markerData[m.id] || {}
          const isDone = d[activePhase.doneField] || false
          const w3w    = d.w3w
          const isLast = i === MILE_MARKERS.length - 1

          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)', opacity: isDone ? 0.4 : 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>{m.label}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {w3w
                  ? <a href={`https://w3w.co/${w3w}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#e74c3c', fontWeight: 500, textDecoration: 'none' }}>///{w3w}</a>
                  : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No w3w — set in Locations</span>
                }
                {m.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{m.notes}</div>}
              </div>
              <Tick done={isDone} onClick={() => toggleDone(m.id, activePhase.doneField)} />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
