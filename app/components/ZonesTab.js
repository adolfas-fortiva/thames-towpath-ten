'use client'
import { useState } from 'react'
import { ZONES } from '../data'
import { useAssignments } from './useAssignments'
import { Card, SectionHead, Pill, Tick, PersonRow, AddRow, YELLOW, NAVY } from './ui'

const ALL_ROLE_IDS = [
  ...ZONES.map(z => z.leadRoleId),
  ...ZONES.flatMap(z => z.marshals.map(m => m.id))
]

export default function ZonesTab() {
  const [zoneFilter, setZoneFilter] = useState(0)
  const [expanded,   setExpanded]   = useState({})
  const [swapping,   setSwapping]   = useState({}) // { rowId: bool }

  const { asgn, volunteers, toggleArrived, removeAsgn, addAsgn, swapAsgn } = useAssignments(ALL_ROLE_IDS)

  const allMarshalAsgn = ZONES.flatMap(z => z.marshals.flatMap(m => asgn[m.id] || []))
  const arrivedCount   = allMarshalAsgn.filter(a => a.arrived).length
  const totalCount     = allMarshalAsgn.length
  const filtered       = zoneFilter === 0 ? ZONES : ZONES.filter(z => z.id === zoneFilter)

  return (
    <div>
      <Card style={{ marginBottom: 12 }}>
        <SectionHead title="Marshal arrivals" right={`${arrivedCount} / ${totalCount}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {allMarshalAsgn.map((a, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: a.arrived ? YELLOW : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>
          <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 3 }}>
            <div style={{ background: YELLOW, borderRadius: 4, height: 3, width: totalCount ? `${Math.round(arrivedCount / totalCount * 100)}%` : '0%', transition: 'width 0.4s' }} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Pill active={zoneFilter === 0} onClick={() => setZoneFilter(0)}>All</Pill>
        {ZONES.map(z => <Pill key={z.id} active={zoneFilter === z.id} onClick={() => setZoneFilter(z.id)}>Zone {z.id}</Pill>)}
      </div>

      {filtered.map(z => {
        const leads    = asgn[z.leadRoleId] || []
        const zTotal   = z.marshals.reduce((n, m) => n + (asgn[m.id] || []).length, 0)
        const zArrived = z.marshals.reduce((n, m) => n + (asgn[m.id] || []).filter(a => a.arrived).length, 0)

        return (
          <div key={z.id} style={{ marginBottom: 20 }}>
            <Card>
              <SectionHead title={z.name} right={`${zArrived} / ${zTotal}`} />
              {leads.map(p => (
                <PersonRow key={p.id} person={p} roleId={z.leadRoleId}
                  onToggle={toggleArrived} onRemove={removeAsgn}
                  swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
                  volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(z.leadRoleId, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
                />
              ))}
              <AddRow roleId={z.leadRoleId} volunteers={volunteers} onAdd={addAsgn} label="+ Add zone lead" />
            </Card>

            {z.marshals.map(pos => {
              const people = asgn[pos.id] || []
              const isExp  = expanded[pos.id]
              return (
                <Card key={pos.id}>
                  <div style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{pos.id}</span>
                    <a href={`https://w3w.co/${pos.w3w}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#e74c3c', textDecoration: 'none', fontWeight: 500 }}>///{pos.w3w}</a>
                  </div>
                  {people.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No one assigned</div>}
                  {people.map(p => (
                    <PersonRow key={p.id} person={p} roleId={pos.id}
                      onToggle={toggleArrived} onRemove={removeAsgn}
                      swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
                      volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(pos.id, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
                    />
                  ))}
                  <AddRow roleId={pos.id} volunteers={volunteers} onAdd={addAsgn} />
                  <button onClick={() => setExpanded(p => ({ ...p, [pos.id]: !p[pos.id] }))}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 16px 8px', fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {isExp ? '− hide instructions' : '+ instructions'}
                  </button>
                  {isExp && <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{pos.instructions}</div>}
                </Card>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
