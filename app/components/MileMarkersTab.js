'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MILE_MARKERS } from '../data'
import { Card, SectionHead, Pill, Tick, SwapDropdown, YELLOW, CYAN, inputStyle } from './ui'

const SETUP_TEAM = [
  { name: 'Adolfas Kupliauskas', phone: '07568361153' },
  { name: 'Robert Hutchinson', phone: '07720402420' },
]
const SUNDAY_TEAM = [
  { name: 'Nick Lines', phone: '07808935585' },
]
const ALL_CHECKERS = [...SETUP_TEAM, ...SUNDAY_TEAM]

export default function MileMarkersTab() {
  const [view, setView]         = useState('setup')
  const [markerData, setMarkerData] = useState({})
  const [swapping, setSwapping] = useState({})

  useEffect(() => {
    supabase.from('mile_markers').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.marker_id] = r })
      setMarkerData(map)
    })
    const ch = supabase.channel('mile_markers_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mile_markers' }, ({ new: r }) => {
        setMarkerData(prev => ({ ...prev, [r.marker_id]: r }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const upsert = async (id, patch) => {
    const existing = markerData[id] || {}
    const updated  = { marker_id: id, ...existing, ...patch }
    setMarkerData(prev => ({ ...prev, [id]: updated }))
    await supabase.from('mile_markers').upsert(updated, { onConflict: 'marker_id' })
  }

  const toggleDone = async (id, phase) => {
    const field = phase === 'setup' ? 'setup_done' : 'sunday_done'
    const cur   = markerData[id]?.[field] || false
    await upsert(id, { [field]: !cur })
  }

  const saveBy = async (id, phase, name) => {
    const field = phase === 'setup' ? 'setup_by' : 'sunday_by'
    await upsert(id, { [field]: name })
    setSwapping(prev => ({ ...prev, [`${id}_${phase}`]: false }))
  }

  const saveW3w = async (id, val) => {
    await upsert(id, { w3w: val })
  }

  const doneField = view === 'setup' ? 'setup_done' : 'sunday_done'
  const byField   = view === 'setup' ? 'setup_by'   : 'sunday_by'
  const doneCount = MILE_MARKERS.filter(m => markerData[m.id]?.[doneField]).length
  const defaultTeam = view === 'setup' ? SETUP_TEAM : SUNDAY_TEAM

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SectionHead title="Mile markers" right={`${doneCount} / ${MILE_MARKERS.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {MILE_MARKERS.map(m => (
              <div key={m.id} style={{ flex: 1, height: 5, borderRadius: 3, background: markerData[m.id]?.[doneField] ? YELLOW : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Pill active={view === 'setup'}  onClick={() => setView('setup')}>Setup — Saturday</Pill>
        <Pill active={view === 'sunday'} onClick={() => setView('sunday')}>Check — Sunday</Pill>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10, paddingLeft: 4 }}>
        {view === 'setup'
          ? 'Adolfas + Robert Hutchinson — place markers Saturday'
          : 'Nick Lines — verify all markers are in place before race start'}
      </div>

      {MILE_MARKERS.map((m, i) => {
        const d        = markerData[m.id] || {}
        const isDone   = d[doneField] || false
        const byName   = d[byField] || ''
        const swapKey  = `${m.id}_${view}`
        const isSwap   = swapping[swapKey]

        return (
          <Card key={m.id} style={{ borderLeft: isDone ? `3px solid ${YELLOW}` : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1B2869', background: YELLOW, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>{m.label}</span>
                  {byName && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>by {byName}</span>}
                </div>
                {d.w3w
                  ? <a href={`https://w3w.co/${d.w3w}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#e74c3c', display: 'block' }}>///{d.w3w}</a>
                  : <input
                      placeholder="///what.three.words"
                      defaultValue={d.w3w || ''}
                      onBlur={e => saveW3w(m.id, e.target.value.replace(/^\/+/, ''))}
                      style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', marginTop: 2 }}
                    />
                }
                {m.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{m.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => setSwapping(prev => ({ ...prev, [swapKey]: !prev[swapKey] }))}
                  style={{ fontSize: 11, color: isSwap ? YELLOW : 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  {byName ? byName.split(' ')[0] : 'assign'}
                </button>
                <Tick done={isDone} onClick={() => toggleDone(m.id, view)} />
              </div>
            </div>

            {isSwap && (
              <SwapDropdown
                currentName={byName || ''}
                allVolunteers={ALL_CHECKERS}
                usedNames={[]}
                onSave={name => saveBy(m.id, view, name)}
                onCancel={() => setSwapping(prev => ({ ...prev, [swapKey]: false }))}
              />
            )}
          </Card>
        )
      })}
    </div>
  )
}
