'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { FIELD_SETUP, FIELD_TEAMS } from '../data'
import { Card, SectionHead, Pill, Tick } from './ui'

const YELLOW = '#FECB00'
const NAVY   = '#1B2869'
const CYAN   = '#00B5E2'

const ALL_FIELD_ROLE_IDS = FIELD_TEAMS.flatMap(t => [`${t.id}_LEAD`, `${t.id}_MEMBER`])

function PersonRow({ person, roleId, onRemove, onToggle, isLead }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0, opacity: person.arrived ? 0.45 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLead && <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>LEAD</span>}
          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{person.volunteer_name}</span>
        </div>
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

function AddRow({ roleId, volunteers, onAdd, label = '+ Add volunteer' }) {
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
      {label}
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

export default function FieldTab() {
  const [view,       setView]       = useState('setup')
  const [activeTeam, setActiveTeam] = useState(null)
  const [setupDone,  setSetupDone]  = useState({})
  const [asgn,       setAsgn]       = useState({})
  const [volunteers, setVolunteers] = useState([])

  const loadAsgn = useCallback(async () => {
    const { data } = await supabase.from('role_assignments').select('*').in('role_id', ALL_FIELD_ROLE_IDS).order('slot_order')
    if (!data) return
    const map = {}
    data.forEach(r => { if (!map[r.role_id]) map[r.role_id] = []; map[r.role_id].push(r) })
    setAsgn(map)
  }, [])

  useEffect(() => {
    loadAsgn()
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })
    supabase.from('field_setup').select('*').then(({ data }) => {
      if (!data) return
      const map = {}; data.forEach(r => { map[r.item_id] = r.done }); setSetupDone(map)
    })
    const ch = supabase.channel('field_asgn')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_assignments' }, loadAsgn)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_setup' }, ({ new: r }) => setSetupDone(prev => ({ ...prev, [r.item_id]: r.done })))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadAsgn])

  const toggleSetup = async (id) => {
    const cur = setupDone[id] || false
    setSetupDone(prev => ({ ...prev, [id]: !cur }))
    await supabase.from('field_setup').upsert({ item_id: id, done: !cur }, { onConflict: 'item_id' })
  }

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

  const infra       = FIELD_SETUP.filter(f => f.type === 'infra')
  const field       = FIELD_SETUP.filter(f => f.type === 'field')
  const doneCount   = FIELD_SETUP.filter(f => setupDone[f.id]).length
  const pct         = Math.round(doneCount / FIELD_SETUP.length * 100)
  const shownTeams  = FIELD_TEAMS.filter(t => activeTeam === null || t.id === activeTeam)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Pill active={view === 'setup'} onClick={() => setView('setup')}>Setup checklist</Pill>
        <Pill active={view === 'teams'} onClick={() => setView('teams')}>Field teams</Pill>
      </div>

      {view === 'setup' && (
        <>
          <Card style={{ marginBottom: 14 }}>
            <SectionHead title="Old Deer Park — setup" right="06:30 on site" />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: YELLOW, lineHeight: 1 }}>{doneCount}</span>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>/ {FIELD_SETUP.length}</span>
              </div>
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 3 }}>
                <div style={{ background: YELLOW, height: 3, borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          </Card>
          {[{ label: 'Infrastructure', items: infra }, { label: 'Field & route', items: field }].map(g => (
            <div key={g.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 4px 6px' }}>{g.label}</div>
              <Card>
                {g.items.map((item, i) => {
                  const isDone = setupDone[item.id]
                  return (
                    <div key={item.id} onClick={() => toggleSetup(item.id)}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, cursor: 'pointer', borderBottom: i < g.items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', opacity: isDone ? 0.35 : 1 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', textDecoration: isDone ? 'line-through' : 'none' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.owner}</div>
                      </div>
                      <Tick done={isDone} onClick={() => toggleSetup(item.id)} />
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </>
      )}

      {view === 'teams' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Pill active={activeTeam === null} onClick={() => setActiveTeam(null)}>All</Pill>
            {FIELD_TEAMS.map(t => (
              <Pill key={t.id} active={activeTeam === t.id} onClick={() => setActiveTeam(t.id)}>
                {t.role.split(' ')[0]}
              </Pill>
            ))}
          </div>

          {shownTeams.map(t => {
            const leads   = asgn[`${t.id}_LEAD`]   || []
            const members = asgn[`${t.id}_MEMBER`]  || []
            return (
              <div key={t.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 6px' }}>{t.role}</div>
                <Card>
                  {leads.map(p => <PersonRow key={p.id} person={p} roleId={`${t.id}_LEAD`} onRemove={removeAsgn} onToggle={toggleArrived} isLead />)}
                  {leads.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No lead assigned</div>}
                  <AddRow roleId={`${t.id}_LEAD`} volunteers={volunteers} onAdd={addAsgn} label="+ Set lead" />

                  {members.length > 0 && <div style={{ borderTop: '2px solid rgba(255,255,255,0.08)', marginTop: 2 }} />}
                  {members.map(p => <PersonRow key={p.id} person={p} roleId={`${t.id}_MEMBER`} onRemove={removeAsgn} onToggle={toggleArrived} isLead={false} />)}
                  <AddRow roleId={`${t.id}_MEMBER`} volunteers={volunteers} onAdd={addAsgn} label="+ Add member" />

                  {t.notes && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.5 }}>{t.notes}</div>}
                </Card>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
