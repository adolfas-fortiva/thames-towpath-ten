'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { SUPPLIERS } from '../data'
import { Card, SectionHead, Tick, YELLOW, CYAN, inputStyle } from './ui'

export default function SuppliersTab() {
  const [arrived,   setArrived]   = useState({})
  const [overrides, setOverrides] = useState({})
  const [editing,   setEditing]   = useState({})

  useEffect(() => {
    supabase.from('arrivals').select('*').eq('entity_type', 'supplier').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.entity_id] = r.arrived })
      setArrived(map)
    })
    supabase.from('supplier_overrides').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(r => { map[r.supplier_id] = r })
      setOverrides(map)
    })
    const ch = supabase.channel('suppliers_ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arrivals' }, ({ new: r }) => {
        if (r.entity_type === 'supplier') setArrived(prev => ({ ...prev, [r.entity_id]: r.arrived }))
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const toggleArrived = async (id) => {
    const cur = arrived[id] || false
    setArrived(prev => ({ ...prev, [id]: !cur }))
    await supabase.from('arrivals').upsert({ entity_id: id, entity_type: 'supplier', arrived: !cur }, { onConflict: 'entity_id,entity_type' })
  }

  const saveOverride = async (id, field, value) => {
    const existing = overrides[id] || {}
    const updated  = { supplier_id: id, ...existing, [field]: value }
    setOverrides(prev => ({ ...prev, [id]: updated }))
    await supabase.from('supplier_overrides').upsert(updated, { onConflict: 'supplier_id' })
  }

  const doneCount = SUPPLIERS.filter(s => arrived[s.id]).length

  return (
    <div>
      <Card style={{ marginBottom: 14 }}>
        <SectionHead title="Suppliers on site" right={`${doneCount} / ${SUPPLIERS.length}`} />
        <div style={{ padding: '10px 16px 14px' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {SUPPLIERS.map(s => (
              <div key={s.id} style={{ flex: 1, height: 5, borderRadius: 3, background: arrived[s.id] ? YELLOW : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>
      </Card>

      {SUPPLIERS.map((s, i) => {
        const ov      = overrides[s.id] || {}
        const isEdit  = editing[s.id]
        const phone   = ov.phone || s.phone
        const isLast  = i === SUPPLIERS.length - 1

        return (
          <Card key={s.id} style={{ borderLeft: arrived[s.id] ? `3px solid ${YELLOW}` : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: arrived[s.id] ? '#22c55e' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{s.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 16 }}>{s.role} · by {s.by}</div>
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ fontSize: 13, color: CYAN, display: 'block', marginLeft: 16, marginTop: 2 }} onClick={e => e.stopPropagation()}>{phone}</a>
                )}
                {ov.email && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 16, marginTop: 2 }}>{ov.email}</div>}
                {ov.website && <a href={ov.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: CYAN, display: 'block', marginLeft: 16, marginTop: 2 }}>{ov.website}</a>}
                {ov.notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 16, marginTop: 2, fontStyle: 'italic' }}>{ov.notes}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => setEditing(p => ({ ...p, [s.id]: !p[s.id] }))}
                  style={{ fontSize: 11, color: isEdit ? YELLOW : 'rgba(255,255,255,0.3)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                  edit
                </button>
                <Tick done={arrived[s.id]} onClick={() => toggleArrived(s.id)} />
              </div>
            </div>

            {isEdit && (
              <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <input defaultValue={ov.phone || s.phone || ''} onBlur={e => saveOverride(s.id, 'phone', e.target.value)} placeholder="Phone" style={inputStyle} />
                <input defaultValue={ov.email || ''} onBlur={e => saveOverride(s.id, 'email', e.target.value)} placeholder="Email" style={inputStyle} />
                <input defaultValue={ov.website || ''} onBlur={e => saveOverride(s.id, 'website', e.target.value)} placeholder="Website" style={inputStyle} />
                <textarea defaultValue={ov.notes || ''} onBlur={e => saveOverride(s.id, 'notes', e.target.value)} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                <button onClick={() => setEditing(p => ({ ...p, [s.id]: false }))}
                  style={{ padding: '7px', borderRadius: 8, background: YELLOW, color: '#1B2869', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
