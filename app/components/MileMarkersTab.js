'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MILE_MARKERS } from '../data'
import { Card, SectionHead, Tick, YELLOW, CYAN, NAVY, inputStyle, selectStyle } from './ui'

export default function MileMarkersTab() {
  const [volunteers,  setVolunteers]  = useState([])
  const [checkers,    setCheckers]    = useState({ c1: '', c2: '' })
  const [markerData,  setMarkerData]  = useState({})
  const [editW3w,     setEditW3w]     = useState({})

  useEffect(() => {
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })

    supabase.from('event_config').select('*').in('key', ['mile_checker_1', 'mile_checker_2']).then(({ data }) => {
      if (!data) return
      const c = {}
      data.forEach(r => { if (r.key === 'mile_checker_1') c.c1 = r.value; if (r.key === 'mile_checker_2') c.c2 = r.value })
      setCheckers(c)
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

  const setChecker = async (key, dbKey, value) => {
    setCheckers(prev => ({ ...prev, [key]: value }))
    await supabase.from('event_config').upsert({ key: dbKey, value }, { onConflict: 'key' })
  }

  const toggleDone = async (id) => {
    const cur = markerData[id]?.sunday_done || false
    const updated = { ...(markerData[id] || {}), marker_id: id, sunday_done: !cur }
    setMarkerData(prev => ({ ...prev, [id]: updated }))
    await supabase.from('mile_markers').upsert(updated, { onConflict: 'marker_id' })
  }

  const saveW3w = async (id, val) => {
    const clean = val.trim().replace(/^\/+/, '')
    const updated = { ...(markerData[id] || {}), marker_id: id, w3w: clean }
    setMarkerData(prev => ({ ...prev, [id]: updated }))
    setEditW3w(prev => ({ ...prev, [id]: false }))
    await supabase.from('mile_markers').upsert(updated, { onConflict: 'marker_id' })
  }

  const doneCount = MILE_MARKERS.filter(m => markerData[m.id]?.sunday_done).length

  return (
    <div>
      {/* Assigned checkers */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Sunday checkers" right="verify before race start" />
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { key: 'c1', dbKey: 'mile_checker_1', label: 'Checker 1' },
            { key: 'c2', dbKey: 'mile_checker_2', label: 'Checker 2' },
          ].map(slot => {
            const selected = volunteers.find(v => v.name === checkers[slot.key])
            return (
              <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', minWidth: 64 }}>{slot.label}</div>
                <select value={checkers[slot.key] || ''} onChange={e => setChecker(slot.key, slot.dbKey, e.target.value)}
                  style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— assign —</option>
                  {volunteers.map(v => <option key={v.id} value={v.name}>{v.name} · {v.phone}</option>)}
                </select>
                {selected && (
                  <a href={`tel:${selected.phone}`} style={{ color: CYAN, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>{selected.phone}</a>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ padding: '0 16px 12px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          Setup Saturday: Adolfas Kupliauskas + Robert Hutchinson
        </div>
      </Card>

      {/* Progress */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Sunday check" right={`${doneCount} / ${MILE_MARKERS.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {MILE_MARKERS.map(m => (
              <div key={m.id} style={{ flex: 1, height: 5, borderRadius: 3, background: markerData[m.id]?.sunday_done ? YELLOW : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>
      </Card>

      {/* Markers list */}
      <Card>
        {MILE_MARKERS.map((m, i) => {
          const d       = markerData[m.id] || {}
          const isDone  = d.sunday_done || false
          const w3w     = d.w3w
          const isEditW = editW3w[m.id]
          const isLast  = i === MILE_MARKERS.length - 1

          return (
            <div key={m.id} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)', opacity: isDone ? 0.4 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>{m.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {w3w && !isEditW ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a href={`https://w3w.co/${w3w}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, color: '#e74c3c', textDecoration: 'none', fontWeight: 500 }}>
                        ///{w3w}
                      </a>
                      <button onClick={() => setEditW3w(prev => ({ ...prev, [m.id]: true }))}
                        style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>edit</button>
                    </div>
                  ) : (
                    <input
                      autoFocus={isEditW}
                      defaultValue={w3w || ''}
                      placeholder="///what.three.words"
                      onBlur={e => { if (e.target.value.trim()) saveW3w(m.id, e.target.value); else setEditW3w(prev => ({ ...prev, [m.id]: false })) }}
                      style={{ ...inputStyle, fontSize: 12, padding: '5px 8px' }}
                    />
                  )}
                  {m.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{m.notes}</div>}
                </div>
                <Tick done={isDone} onClick={() => toggleDone(m.id)} />
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
