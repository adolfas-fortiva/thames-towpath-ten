'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { FIELD_SETUP, FIELD_TEAMS } from '../data'
import { useAssignments } from './useAssignments'
import { Card, SectionHead, Pill, Tick, PersonRow, AddRow, YELLOW, NAVY } from './ui'

const ALL_FIELD_IDS = FIELD_TEAMS.flatMap(t => [`${t.id}_LEAD`, `${t.id}_MEMBER`])

export default function FieldTab() {
  const [view,       setView]       = useState('setup')
  const [activeTeam, setActiveTeam] = useState(null)
  const [setupDone,  setSetupDone]  = useState({})
  const [swapping,   setSwapping]   = useState({})

  const { asgn, volunteers, toggleArrived, removeAsgn, addAsgn, swapAsgn } = useAssignments(ALL_FIELD_IDS)

  useEffect(() => {
    supabase.from('field_setup').select('*').then(({ data }) => {
      if (!data) return
      const map = {}; data.forEach(r => { map[r.item_id] = r.done }); setSetupDone(map)
    })
    const ch = supabase.channel('field_setup_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_setup' }, ({ new: r }) => setSetupDone(prev => ({ ...prev, [r.item_id]: r.done })))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const toggleSetup = async (id) => {
    const cur = setupDone[id] || false
    setSetupDone(prev => ({ ...prev, [id]: !cur }))
    await supabase.from('field_setup').upsert({ item_id: id, done: !cur }, { onConflict: 'item_id' })
  }

  const infra     = FIELD_SETUP.filter(f => f.type === 'infra')
  const field     = FIELD_SETUP.filter(f => f.type === 'field')
  const doneCount = FIELD_SETUP.filter(f => setupDone[f.id]).length
  const pct       = Math.round(doneCount / FIELD_SETUP.length * 100)
  const shown     = FIELD_TEAMS.filter(t => activeTeam === null || t.id === activeTeam)

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
            {FIELD_TEAMS.map(t => <Pill key={t.id} active={activeTeam === t.id} onClick={() => setActiveTeam(t.id)}>{t.role.split(' ')[0]}</Pill>)}
          </div>

          {shown.map(t => {
            const leads   = asgn[`${t.id}_LEAD`]   || []
            const members = asgn[`${t.id}_MEMBER`]  || []

            return (
              <div key={t.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 6px' }}>{t.role}</div>
                <Card>
                  {leads.map(p => (
                    <PersonRow key={p.id} person={p} roleId={`${t.id}_LEAD`}
                      onToggle={toggleArrived} onRemove={removeAsgn}
                      swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
                      volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(`${t.id}_LEAD`, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
                    />
                  ))}
                  {leads.length === 0 && <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No lead assigned</div>}
                  <AddRow roleId={`${t.id}_LEAD`} volunteers={volunteers} onAdd={addAsgn} label="+ Set lead" />

                  {(members.length > 0 || true) && <div style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }} />}
                  {members.map(p => (
                    <PersonRow key={p.id} person={p} roleId={`${t.id}_MEMBER`}
                      onToggle={toggleArrived} onRemove={removeAsgn}
                      swapOpen={!!swapping[p.id]} onSwapToggle={() => setSwapping(s => ({ ...s, [p.id]: !s[p.id] }))}
                      volunteers={volunteers} onSwap={(old, vol) => { swapAsgn(`${t.id}_MEMBER`, old, vol); setSwapping(s => ({ ...s, [old.id]: false })) }}
                    />
                  ))}
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
