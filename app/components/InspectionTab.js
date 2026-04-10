'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { INSPECTION_ITEMS, CONDITIONS } from '../data'
import { Card, SectionHead, Pill, YELLOW, CYAN, inputStyle } from './ui'

export default function InspectionTab() {
  const [phase,  setPhase]  = useState('pre')
  const [conds,  setConds]  = useState({})
  const [notes,  setNotes]  = useState({})

  useEffect(() => {
    supabase.from('inspection').select('*').then(({ data }) => {
      if (!data) return
      const c = {}, n = {}
      data.forEach(r => {
        c[`${r.phase}_${r.item_id}`] = r.condition
        n[`${r.phase}_${r.item_id}`] = r.notes || ''
      })
      setConds(c); setNotes(n)
    })
  }, [])

  const setC = async (id, v) => {
    const key = `${phase}_${id}`
    setConds(prev => ({ ...prev, [key]: v }))
    await supabase.from('inspection').upsert({ phase, item_id: id, condition: v, notes: notes[key] || '' }, { onConflict: 'phase,item_id' })
  }
  const setN = async (id, v) => {
    const key = `${phase}_${id}`
    setNotes(prev => ({ ...prev, [key]: v }))
    await supabase.from('inspection').upsert({ phase, item_id: id, condition: conds[key] || '', notes: v }, { onConflict: 'phase,item_id' })
  }

  const allDone = INSPECTION_ITEMS.every(i => conds[`${phase}_${i.id}`])

  const sendEmail = () => {
    const lines = INSPECTION_ITEMS.map(i =>
      `${i.label}\nCondition: ${conds[`${phase}_${i.id}`] || 'Not assessed'}\nNotes: ${notes[`${phase}_${i.id}`] || '—'}`
    ).join('\n\n')
    const subj = `TTT 2026 Site Inspection — ${phase === 'pre' ? 'Pre-Event' : 'Post-Event'} — ${new Date().toLocaleDateString('en-GB')}`
    const body = `Thames Towpath Ten 2026\n${phase.toUpperCase()}-EVENT SITE INSPECTION\nDate: ${new Date().toLocaleDateString('en-GB')}\nInspected by: Adolfas Kupliauskas\n\n${lines}\n\n[Attach photos]`
    window.open(`mailto:richmond@theeventumbrella.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <Pill active={phase === 'pre'}  onClick={() => setPhase('pre')}>Pre-event</Pill>
        <Pill active={phase === 'post'} onClick={() => setPhase('post')}>Post-event</Pill>
      </div>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Email <span style={{ color: CYAN }}>richmond@theeventumbrella.com</span> before and after hire period. Attach photos separately.
        </div>
      </Card>

      {INSPECTION_ITEMS.map(item => (
        <Card key={item.id}>
          <SectionHead title={item.label} />
          <div style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{item.desc}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {CONDITIONS.map(opt => {
                const sel = conds[`${phase}_${item.id}`] === opt
                const red = opt === 'Unusable'
                return (
                  <button key={opt} onClick={() => setC(item.id, opt)}
                    style={{ fontSize: 11, padding: '5px 11px', borderRadius: 8, border: `1px solid ${sel ? (red ? '#ef4444' : YELLOW) : 'rgba(255,255,255,0.12)'}`, background: sel ? (red ? 'rgba(239,68,68,0.15)' : 'rgba(254,203,0,0.12)') : 'transparent', color: sel ? (red ? '#ef4444' : YELLOW) : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: sel ? 700 : 400 }}>
                    {opt}
                  </button>
                )
              })}
            </div>
            <textarea value={notes[`${phase}_${item.id}`] || ''} onChange={e => setN(item.id, e.target.value)}
              placeholder="Notes…"
              style={{ ...inputStyle, minHeight: 44, resize: 'vertical' }} />
          </div>
        </Card>
      ))}

      <button onClick={sendEmail} disabled={!allDone}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: allDone ? YELLOW : 'rgba(255,255,255,0.06)', color: allDone ? '#1B2869' : 'rgba(255,255,255,0.25)', border: `1px solid ${allDone ? YELLOW : 'rgba(255,255,255,0.1)'}`, fontSize: 14, fontWeight: 700, cursor: allDone ? 'pointer' : 'not-allowed', marginTop: 8 }}>
        {allDone ? 'Open email — send to Richmond' : 'Complete all sections to send'}
      </button>
    </div>
  )
}
