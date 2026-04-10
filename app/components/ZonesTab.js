'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { ZONES } from '../data'
import { Card, SectionHead, Pill, Tick } from './ui'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'

const ALL_ROLE_IDS = [
  ...ZONES.map(z => z.leadRoleId),
  ...ZONES.flatMap(z => z.marshals.map(m => m.id))
]

function PersonRow({ person, roleId, onRemove, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0, opacity: person.arrived ? 0.45 : 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{person.volunteer_name}</div>
        {person.volunteer_phone && (
          <a href={`tel:${person.volunteer_phone}`} style={{ fontSize: 12, color: CYAN, display: 'block', marginTop: 1 }}>{person.volunteer_phone}</a>
        )}
      </div>
      <button onClick={() => onRemove(person.id, roleId)}
        style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', lineHeight: 1, flexShrink: 0 }}>×</button>
      <Tick done={person.arrived} onClick={() => onToggle(person.id, person.arrived)} />
    </div>
  )
}

function AddRow({ roleId, volunteers, onAdd }) {
  const [open, setOpen]   = useState(false)
  const [volId, setVolId] = useState('')

  const doAdd = () => {
    if (!volId) return
    const vol = volunteers.find(v => v.id === volId)
    if (vol) onAdd(roleId, vol, () => { setOpen(false); setVolId('') })
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'block', width: '100%', padding: '7px 16px', textAlign: 'left', background: 'none', border: 'none', color: YELLOW, fontSize: 12, cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      + Add volunteer
    </button>
  )
  return (
    <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <select value={volId} onChange={e => setVolId(e.target.value)}
        style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
        <option value="">— select volunteer —</option>
        {volunteers.map(v => <option key={v.id} value={v.id}>{v.name} · {v.phone}</option>)}
      </select>
      <button onClick={doAdd} style={{ padding: '7px 14px', borderRadius: 8, background: YELLOW, color: NAVY, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Add</button>
      <button onClick={() => setOpen(false)} style={{ padding: '7px', borderRadius: 8, background: 'none', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, cursor: 'pointer' }}>✕</button>
    </div>
  )
}

export default function ZonesTab() {
  const [zoneFilter, setZoneFilter] = useState(0)
  const [expanded,   setExpanded]   = useState({})
  const [asgn,       setAsgn]       = useState({}) // { role_id: [rows] }
  const [volunteers, setVolunteers] = useState([])

  const loadAsgn = useCallback(async () => {
    const { data } = await supabase.from('role_assignments').select('*').in('role_id', ALL_ROLE_IDS).order('slot_order')
    if (!data) return
    const map = {}
    data.forEach(r => { if (!map[r.role_id]) map[r.role_id] = []; map[r.role_id].push(r) })
    setAsgn(map)
  }, [])

  useEffect(() => {
    loadAsgn()
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    const ch = supabase.channel('zone_asgn')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_assignments' }, loadAsgn)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadAsgn])

  const toggleArrived = async (rowId, current) => {
    setAsgn(prev => {
      const next = {}
      for (const k in prev) next[k] = prev[k].map(r => r.id === rowId ? { ...r, arrived: !current } : r)
      return next
    })
    await supabase.from('role_assignments').update({ arrived: !current }).eq('id', rowId)
  }

  const removeAsgn = async (rowId, roleId) => {
    setAsgn(prev => ({ ...prev, [roleId]: (prev[roleId] || []).filter(r => r.id !== rowId) }))
    await supabase.from('role_assignments').delete().eq('id', rowId)
  }

  const addAsgn = async (roleId, vol, onDone) => {
    const slotOrder = (asgn[roleId] || []).length
    const { data } = await supabase.from('role_assignments')
      .upsert({ role_id: roleId, volunteer_name: vol.name, volunteer_phone: vol.phone || null, slot_order: slotOrder }, { onConflict: 'role_id,volunteer_name' })
      .select().single()
    if (data) setAsgn(prev => {
      const existing = (prev[roleId] || []).filter(r => r.volunteer_name !== vol.name)
      return { ...prev, [roleId]: [...existing, data] }
    })
    onDone()
  }

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
        const leads        = asgn[z.leadRoleId] || []
        const zTotal       = z.marshals.reduce((n, m) => n + (asgn[m.id] || []).length, 0)
        const zArrived     = z.marshals.reduce((n, m) => n + (asgn[m.id] || []).filter(a => a.arrived).length, 0)

        return (
          <div key={z.id} style={{ marginBottom: 20 }}>
            {/* Zone lead */}
            <Card>
              <SectionHead title={z.name} right={`${zArrived} / ${zTotal}`} />
              <div style={{ paddingTop: 4 }}>
                {leads.map(p => <PersonRow key={p.id} person={p} roleId={z.leadRoleId} onRemove={removeAsgn} onToggle={toggleArrived} />)}
                <AddRow roleId={z.leadRoleId} volunteers={volunteers} onAdd={addAsgn} />
              </div>
            </Card>

            {/* Marshal positions */}
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
                  {people.length === 0 && (
                    <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No one assigned</div>
                  )}
                  {people.map(p => <PersonRow key={p.id} person={p} roleId={pos.id} onRemove={removeAsgn} onToggle={toggleArrived} />)}
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
