'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { MILE_MARKERS } from '../data'
import { useAssignments } from './useAssignments'
import { Card, SectionHead, Pill, Tick, PersonRow, AddRow, YELLOW, NAVY } from './ui'

const PHASES = [
  { id: 'setup',   label: 'Put up',  roleId: 'MILES_SETUP',   doneField: 'setup_done',   desc: 'Saturday — place all mile markers' },
  { id: 'check',   label: 'Check',   roleId: 'MILES_CHECK',   doneField: 'sunday_done',  desc: 'Sunday morning — verify all markers in place before race start' },
  { id: 'collect', label: 'Collect', roleId: 'MILES_COLLECT', doneField: 'collect_done', desc: 'After race — collect all markers' },
]

export default function MileMarkersTab() {
  const [phase,      setPhase]      = useState('setup')
  const [markerData, setMarkerData] = useState({})
  const [swapping,   setSwapping]   = useState({})

  const activePhase = PHASES.find(p => p.id === phase)
  const allRoleIds  = PHASES.map(p => p.roleId)
  const { asgn, volunteers, toggleArrived, removeAsgn, addAsgn, swapAsgn } = useAssignments(allRoleIds)

  useEffect(() => {
    supabase.from('mile_markers').select('*').then(({ data }) => {
      if (!data) return
      const map = {}; data.forEach(r => { map[r.marker_id] = r }); setMarkerData(map)
    })
    const ch = supabase.channel('miles_markers_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mile_markers' }, ({ new: r }) => {
        setMarkerData(prev => ({ ...prev, [r.marker_id]: r }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const toggleDone = async (markerId) => {
    const cur     = markerData[markerId]?.[activePhase.doneField] || false
    const updated = { ...(markerData[markerId] || {}), marker_id: markerId, [activePhase.doneField]: !cur }
    setMarkerData(prev => ({ ...prev, [markerId]: updated }))
    await supabase.from('mile_markers').upsert(updated, { onConflict: 'marker_id' })
  }

  const checkers   = asgn[activePhase.roleId] || []
  const doneCount  = MILE_MARKERS.filter(m => markerData[m.id]?.[activePhase.doneField]).length

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {PHASES.map(p => <Pill key={p.id} active={phase === p.id} onClick={() => setPhase(p.id)}>{p.label}</Pill>)}
      </div>

      {/* Phase checkers */}
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title={`${activePhase.label} — assigned`} />
        <div style={{ padding: '8px 16px 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{activePhase.desc}</div>
        {checkers.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No one assigned</div>}
        {checkers.map(p => (
          <PersonRow key={p.id} person={p} roleId={activePhase.roleId}
            onToggle={toggleArrived} onRemove={removeAsgn}
            swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
            volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(activePhase.roleId, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
          />
        ))}
        <AddRow roleId={activePhase.roleId} volunteers={volunteers} onAdd={addAsgn} />
      </Card>

      {/* Progress */}
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

      {/* Marker list */}
      <Card>
        {MILE_MARKERS.map((m, i) => {
          const d      = markerData[m.id] || {}
          const isDone = d[activePhase.doneField] || false
          const w3w    = d.w3w
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, borderBottom: i < MILE_MARKERS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', opacity: isDone ? 0.4 : 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>{m.label}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {w3w
                  ? <a href={`https://w3w.co/${w3w}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#e74c3c', fontWeight: 500, textDecoration: 'none' }}>///{w3w}</a>
                  : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No w3w — set in Data → Locations</span>
                }
                {m.notes && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{m.notes}</div>}
              </div>
              <Tick done={isDone} onClick={() => toggleDone(m.id)} />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
