'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { PRIZE_CATEGORIES_V2 } from '../data'
import { Card, SectionHead, Pill, YELLOW, NAVY, CYAN } from './ui'

function formatTime(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

function TimeInput({ value, onChange }) {
  const [raw, setRaw] = useState(value || '')
  useEffect(() => setRaw(value || ''), [value])
  return (
    <input value={raw} onChange={e => { const f = formatTime(e.target.value); setRaw(f); onChange(f) }}
      placeholder="MM:SS" maxLength={5}
      style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: YELLOW, outline: 'none', fontFamily: 'monospace', minWidth: 0 }} />
  )
}

const PLACE_LABEL = ['1st', '2nd', '3rd']

export default function PrizesTab() {
  const sections = PRIZE_CATEGORIES_V2.map(s => s.section)
  const [tab,       setTab]       = useState(sections[0])
  const [entries,   setEntries]   = useState({})
  const [presented, setPresented] = useState({})

  useEffect(() => {
    supabase.from('prizes').select('*').then(({ data }) => {
      if (!data) return
      const e = {}, p = {}
      data.forEach(r => {
        e[`${r.category_id}_${r.place}_name`] = r.winner_name || ''
        e[`${r.category_id}_${r.place}_time`] = r.winner_time || ''
        if (r.presented) p[r.category_id] = true
      })
      setEntries(e); setPresented(p)
    })
    const ch = supabase.channel('prizes_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prizes' }, ({ new: r }) => {
        setEntries(prev => ({
          ...prev,
          [`${r.category_id}_${r.place}_name`]: r.winner_name || '',
          [`${r.category_id}_${r.place}_time`]: r.winner_time || '',
        }))
        if (r.presented) setPresented(prev => ({ ...prev, [r.category_id]: true }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const save = useCallback(async (catId, place, field, value) => {
    const winner_name = field === 'name' ? value : (entries[`${catId}_${place}_name`] || '')
    const winner_time = field === 'time' ? value : (entries[`${catId}_${place}_time`] || '')
    setEntries(prev => ({ ...prev, [`${catId}_${place}_${field}`]: value }))
    await supabase.from('prizes').upsert({ category_id: catId, place, winner_name, winner_time, presented: presented[catId] || false }, { onConflict: 'category_id,place' })
  }, [entries, presented])

  const togglePresented = async (group) => {
    const cur = presented[group.id] || false
    setPresented(prev => ({ ...prev, [group.id]: !cur }))
    for (let p = 1; p <= group.places; p++) {
      await supabase.from('prizes').upsert({
        category_id: group.id, place: p,
        winner_name: entries[`${group.id}_${p}_name`] || '',
        winner_time: entries[`${group.id}_${p}_time`] || '',
        presented: !cur
      }, { onConflict: 'category_id,place' })
    }
  }

  const activeSection = PRIZE_CATEGORIES_V2.find(s => s.section === tab)
  const isSpot = tab === 'Spot Prizes'

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Prize ceremony" />
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 14 }}>Geordie Clarke</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Prize giver assistant</div>
          </div>
          <a href="tel:07780541838" style={{ color: CYAN, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>07780 541 838</a>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {PRIZE_CATEGORIES_V2.map(s => (
          <Pill key={s.section} active={tab === s.section} onClick={() => setTab(s.section)}>
            {s.section}{s.timing ? ` ${s.timing}` : ''}
          </Pill>
        ))}
      </div>

      {activeSection && (
        <>
          {activeSection.note && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10, paddingLeft: 4 }}>{activeSection.note}</div>}

          {activeSection.groups.map(group => (
            <Card key={group.id} style={{ borderLeft: presented[group.id] ? `3px solid ${YELLOW}` : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{group.label}</span>
                <button onClick={() => togglePresented(group)}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 10, border: `1px solid ${presented[group.id] ? YELLOW : 'rgba(255,255,255,0.15)'}`, background: 'transparent', color: presented[group.id] ? YELLOW : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontWeight: presented[group.id] ? 700 : 400 }}>
                  {presented[group.id] ? '✓ done' : 'mark done'}
                </button>
              </div>
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: group.places }, (_, i) => i + 1).map(place => (
                  <div key={place} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {group.places > 1 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', minWidth: 24, flexShrink: 0 }}>{PLACE_LABEL[place - 1]}</span>}
                    <input value={entries[`${group.id}_${place}_name`] || ''} onChange={e => save(group.id, place, 'name', e.target.value)}
                      placeholder="Name"
                      style={{ flex: 2, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit', minWidth: 0 }} />
                    {!isSpot && <TimeInput value={entries[`${group.id}_${place}_time`] || ''} onChange={v => save(group.id, place, 'time', v)} />}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}
