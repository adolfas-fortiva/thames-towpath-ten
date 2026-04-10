'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { PRIZE_CATEGORIES } from '../data'
import { Card, SectionHead, Pill, YELLOW, NAVY, CYAN } from './ui'

function formatTime(raw) {
  // strip non-digits
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

function TimeInput({ value, onChange, placeholder = 'MM:SS' }) {
  const [raw, setRaw] = useState(value || '')
  useEffect(() => { setRaw(value || '') }, [value])
  return (
    <input
      value={raw}
      onChange={e => {
        const f = formatTime(e.target.value)
        setRaw(f)
        onChange(f)
      }}
      placeholder={placeholder}
      maxLength={5}
      style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: YELLOW, outline: 'none', fontFamily: 'monospace', minWidth: 0 }}
    />
  )
}

export default function PrizesTab() {
  const sections   = PRIZE_CATEGORIES.map(s => s.section.split(' — ')[0])
  const [tab, setTab]             = useState(sections[0])
  const [entries, setEntries]     = useState({})
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
    const ch = supabase.channel('prizes_tab')
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

  const togglePresented = async (cat) => {
    const cur = presented[cat.id] || false
    setPresented(prev => ({ ...prev, [cat.id]: !cur }))
    for (let p = 1; p <= cat.places; p++) {
      await supabase.from('prizes').upsert({
        category_id: cat.id, place: p,
        winner_name: entries[`${cat.id}_${p}_name`] || '',
        winner_time: entries[`${cat.id}_${p}_time`] || '',
        presented: !cur
      }, { onConflict: 'category_id,place' })
    }
  }

  const activeSection = PRIZE_CATEGORIES.find(s => s.section.startsWith(tab))

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
        {sections.map(s => <Pill key={s} active={tab === s} onClick={() => setTab(s)}>{s}</Pill>)}
      </div>

      {activeSection && (
        <>
          {activeSection.note && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 10, paddingLeft: 4 }}>{activeSection.note}</div>
          )}
          {activeSection.categories.map(cat => (
            <Card key={cat.id} style={{ borderLeft: presented[cat.id] ? `3px solid ${YELLOW}` : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{cat.label}</span>
                <button onClick={() => togglePresented(cat)}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 10, border: `1px solid ${presented[cat.id] ? YELLOW : 'rgba(255,255,255,0.15)'}`, background: 'transparent', color: presented[cat.id] ? YELLOW : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontWeight: presented[cat.id] ? 700 : 400 }}>
                  {presented[cat.id] ? '✓ done' : 'mark done'}
                </button>
              </div>
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: cat.places }, (_, idx) => idx + 1).map(place => (
                  <div key={place} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {cat.places > 1 && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', minWidth: 14, flexShrink: 0 }}>{place}</span>
                    )}
                    <input
                      value={entries[`${cat.id}_${place}_name`] || ''}
                      onChange={e => save(cat.id, place, 'name', e.target.value)}
                      placeholder={cat.places > 1 ? `${place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'} — name` : 'Name'}
                      style={{ flex: 2, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#fff', outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
                    />
                    {activeSection.type !== 'spot' && (
                      <TimeInput
                        value={entries[`${cat.id}_${place}_time`] || ''}
                        onChange={v => save(cat.id, place, 'time', v)}
                      />
                    )}
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
