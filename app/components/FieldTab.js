'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { FIELD_SETUP, FIELD_TEAMS } from '../data'
import { Card, SectionHead, Pill, Tick, SwapDropdown, YELLOW, CYAN, NAVY } from './ui'

// Parse "Name (07xxx) , Name2 (07xxx)" into [{name, phone, id}]
function parseMembers(teamId, membersStr) {
  if (!membersStr) return []
  return membersStr.split(',').map((part, i) => {
    const phoneMatch = part.match(/\((\d[\d\s]{9,})\)/)
    const phone = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : ''
    const name  = part.replace(/\(.*?\)/g, '').replace(/–.*/, '').trim()
    return { id: `${teamId}_m${i}`, name, phone }
  }).filter(m => m.name)
}

export default function FieldTab() {
  const [view,       setView]       = useState('setup')
  const [activeTeam, setActiveTeam] = useState(null)
  const [done,       setDone]       = useState({})
  const [swapping,   setSwapping]   = useState({})
  const [swapData,   setSwapData]   = useState({})
  const [volunteers, setVolunteers] = useState([])

  useEffect(() => {
    supabase.from('volunteers').select('id,name,phone').order('name').then(({ data }) => { if (data) setVolunteers(data) })

    supabase.from('field_setup').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.item_id] = r.done })
      setDone(map)
    })

    supabase.from('arrivals').select('*').eq('entity_type', 'field_member').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.entity_id] = r.swap_name })
      setSwapData(map)
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

  const saveSwap = async (entityId, { name }) => {
    setSwapData(prev => ({ ...prev, [entityId]: name }))
    setSwapping(prev => ({ ...prev, [entityId]: false }))
    await supabase.from('arrivals').upsert({ entity_id: entityId, entity_type: 'field_member', arrived: false, swap_name: name }, { onConflict: 'entity_id,entity_type' })
  }

  const doneCount = FIELD_SETUP.filter(f => done[f.id]).length
  const pct = Math.round(doneCount / FIELD_SETUP.length * 100)
  const infra = FIELD_SETUP.filter(f => f.type === 'infra')
  const field = FIELD_SETUP.filter(f => f.type === 'field')

  // Collect all used names for duplicate detection
  const allUsed = FIELD_TEAMS.flatMap(t => {
    const members = parseMembers(t.id, t.members)
    return [
      { name: swapData[`${t.id}_lead`] || t.lead, role: `${t.role} lead` },
      ...members.map(m => ({ name: swapData[m.id] || m.name, role: t.role }))
    ]
  })

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
          {/* Team selector pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Pill active={activeTeam === null} onClick={() => setActiveTeam(null)}>All</Pill>
            {FIELD_TEAMS.map(t => <Pill key={t.id} active={activeTeam === t.id} onClick={() => setActiveTeam(t.id)}>{t.role.split(' ')[0]}</Pill>)}
          </div>

          {FIELD_TEAMS.filter(t => activeTeam === null || t.id === activeTeam).map(t => {
            const members     = parseMembers(t.id, t.members)
            const leadSwapKey = `${t.id}_lead`
            const isLeadSwap  = swapping[leadSwapKey]

            return (
              <div key={t.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 4px 6px' }}>{t.role}</div>
                <Card>
                  {/* Lead row */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, background: YELLOW, borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>LEAD</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{swapData[leadSwapKey] || t.lead}</span>
                        </div>
                        {t.leadPhone && <a href={`tel:${t.leadPhone}`} style={{ fontSize: 12, color: CYAN, display: 'block' }}>{t.leadPhone}</a>}
                        {swapData[leadSwapKey] && <div style={{ fontSize: 11, color: YELLOW, marginTop: 2 }}>↔ was {t.lead}</div>}
                      </div>
                      <button onClick={() => setSwapping(p => ({ ...p, [leadSwapKey]: !p[leadSwapKey] }))}
                        style={{ fontSize: 11, color: isLeadSwap ? YELLOW : 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
                        swap
                      </button>
                    </div>
                    {isLeadSwap && (
                      <SwapDropdown
                        currentName={t.lead}
                        volunteers={volunteers}
                        usedNames={allUsed}
                        onSave={v => saveSwap(leadSwapKey, v)}
                        onCancel={() => setSwapping(p => ({ ...p, [leadSwapKey]: false }))}
                      />
                    )}
                  </div>

                  {/* Member rows */}
                  {members.map((m, i) => {
                    const isSwap = swapping[m.id]
                    const isLast = i === members.length - 1
                    return (
                      <div key={m.id} style={{ borderBottom: isLast && !isSwap ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{swapData[m.id] || m.name}</div>
                            {m.phone && <a href={`tel:${m.phone}`} style={{ fontSize: 12, color: CYAN, display: 'block', marginTop: 1 }}>{m.phone}</a>}
                            {swapData[m.id] && <div style={{ fontSize: 11, color: YELLOW, marginTop: 2 }}>↔ was {m.name}</div>}
                          </div>
                          <button onClick={() => setSwapping(p => ({ ...p, [m.id]: !p[m.id] }))}
                            style={{ fontSize: 11, color: isSwap ? YELLOW : 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
                            swap
                          </button>
                        </div>
                        {isSwap && (
                          <SwapDropdown
                            currentName={m.name}
                            volunteers={volunteers}
                            usedNames={allUsed}
                            onSave={v => saveSwap(m.id, v)}
                            onCancel={() => setSwapping(p => ({ ...p, [m.id]: false }))}
                          />
                        )}
                      </div>
                    )
                  })}

                  {t.notes && (
                    <div style={{ padding: '8px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.5 }}>{t.notes}</div>
                  )}
                </Card>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
