'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { FIELD_SETUP, FIELD_TEAMS } from '../data'
import { Card, SectionHead, Pill, Tick, SwapDropdown, YELLOW, CYAN } from './ui'

const ALL_FIELD_VOLUNTEERS = FIELD_TEAMS.flatMap(t => [
  { name: t.lead, phone: t.leadPhone || '', role: t.role },
  ...(t.members ? t.members.split(',').map(m => ({ name: m.trim().replace(/\s*\(.*?\)/, ''), phone: '', role: t.role })) : [])
]).filter(v => v.name)

export default function FieldTab() {
  const [view,    setView]    = useState('setup')
  const [done,    setDone]    = useState({})
  const [swapping, setSwapping] = useState({})
  const [teamSwaps, setTeamSwaps] = useState({})

  useEffect(() => {
    supabase.from('field_setup').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.item_id] = r.done })
      setDone(map)
    })
    supabase.from('arrivals').select('*').eq('entity_type', 'field_team').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.entity_id] = r.swap_name })
      setTeamSwaps(map)
    })
    const ch = supabase.channel('field_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_setup' }, ({ new: r }) => {
        setDone(prev => ({ ...prev, [r.item_id]: r.done }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const toggleSetup = async (id) => {
    const cur = done[id] || false
    setDone(prev => ({ ...prev, [id]: !cur }))
    await supabase.from('field_setup').upsert({ item_id: id, done: !cur }, { onConflict: 'item_id' })
  }

  const saveTeamSwap = async (teamId, name) => {
    setTeamSwaps(prev => ({ ...prev, [teamId]: name }))
    setSwapping(prev => ({ ...prev, [teamId]: false }))
    await supabase.from('arrivals').upsert({ entity_id: teamId, entity_type: 'field_team', arrived: false, swap_name: name }, { onConflict: 'entity_id,entity_type' })
  }

  const infra  = FIELD_SETUP.filter(f => f.type === 'infra')
  const field  = FIELD_SETUP.filter(f => f.type === 'field')
  const doneCount = FIELD_SETUP.filter(f => done[f.id]).length
  const pct    = Math.round(doneCount / FIELD_SETUP.length * 100)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Pill active={view === 'setup'}  onClick={() => setView('setup')}>Setup checklist</Pill>
        <Pill active={view === 'teams'}  onClick={() => setView('teams')}>Field teams</Pill>
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
                <div style={{ background: YELLOW, borderRadius: 4, height: 3, width: `${pct}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          </Card>

          {[{ label: 'Infrastructure', items: infra }, { label: 'Field & route', items: field }].map(g => (
            <div key={g.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 4px 6px' }}>{g.label}</div>
              <Card>
                {g.items.map((item, i) => {
                  const isDone = done[item.id]
                  return (
                    <div key={item.id} onClick={() => toggleSetup(item.id)} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12, cursor: 'pointer', borderBottom: i < g.items.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', opacity: isDone ? 0.35 : 1 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', textDecoration: isDone ? 'line-through' : 'none' }}>{item.label}</div>
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
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 8px' }}>Field & support teams</div>
          {FIELD_TEAMS.map(t => {
            const swapName = teamSwaps[t.id]
            const isSwap   = swapping[t.id]
            return (
              <Card key={t.id}>
                <div style={{ padding: '13px 16px', borderBottom: isSwap ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: YELLOW, marginBottom: 2 }}>{t.role}</div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                        {swapName || t.lead}
                        {swapName && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>↔ was {t.lead}</span>}
                      </div>
                      {t.leadPhone && <a href={`tel:${t.leadPhone}`} style={{ fontSize: 12, color: CYAN, display: 'block', marginTop: 2 }}>{t.leadPhone}</a>}
                      {t.members && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, lineHeight: 1.5 }}>{t.members}</div>}
                      {t.notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>{t.notes}</div>}
                    </div>
                    <button onClick={() => setSwapping(p => ({ ...p, [t.id]: !p[t.id] }))}
                      style={{ fontSize: 11, color: isSwap ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>
                      swap lead
                    </button>
                  </div>
                </div>
                {isSwap && (
                  <SwapDropdown
                    currentName={t.lead}
                    allVolunteers={ALL_FIELD_VOLUNTEERS}
                    usedNames={FIELD_TEAMS.map(ft => ({ name: teamSwaps[ft.id] || ft.lead, role: ft.role }))}
                    onSave={name => saveTeamSwap(t.id, name)}
                    onCancel={() => setSwapping(p => ({ ...p, [t.id]: false }))}
                  />
                )}
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}
